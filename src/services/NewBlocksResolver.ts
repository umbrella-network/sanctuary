import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import { ABI } from '@umb-network/toolbox';
import ChainContract from '../contracts/ChainContract';
import { Contract, Event, EventFilter } from 'ethers';
import { BlockStatus, IEventBlock } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import { LogMint, LogVoter } from '../types/events';
import Block, { IBlock } from '../models/Block';
import BlockSynchronizer from './BlockSynchronizer';

@injectable()
class NewBlocksResolver {
  @inject('Logger') private logger!: Logger;
  @inject(Blockchain) private blockchain!: Blockchain;
  @inject('Settings') settings!: Settings;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;

  async apply(): Promise<void> {
    const [[, chainStatus], [, lastAnchor]] = await Promise.all([
      this.chainContract.resolveStatus(),
      BlockSynchronizer.getLastSavedBlockIdAndStartAnchor(),
    ]);

    const [logMintEvents, logVoteEvents] = await this.resolveBatchOfEvents(chainStatus, lastAnchor);

    if (!logMintEvents.length) {
      this.logger.info('No blocks since anchor', { lastAnchor });
      return;
    }

    await this.saveNewBlocks(await this.processEvents(logMintEvents, logVoteEvents));
  }

  private async resolveBatchOfEvents(
    chainStatus: ChainStatus,
    lastAnchor: number
  ): Promise<[logMint: Event[], logVote: Event[]]> {
    let logMintEvents: Event[];
    let logVoteEvents: Event[];
    let lastCheckedAnchor = lastAnchor;

    do {
      [logMintEvents, logVoteEvents, lastCheckedAnchor] = await this.getChainLogsEvents(
        lastCheckedAnchor,
        chainStatus.blockNumber.toNumber()
      );
    } while (!logMintEvents.length && chainStatus.blockNumber.gt(lastCheckedAnchor));

    return [logMintEvents, logVoteEvents];
  }

  private async getChainLogsEvents(
    fromBlock: number,
    currentBlock: number
  ): Promise<[logMint: Event[], logVote: Event[], lastCheckedAnchor: number]> {
    if (fromBlock >= currentBlock) {
      return [[], [], currentBlock];
    }

    const { scanBatchSize } = this.settings.blockchain;

    const toBlockNumber = currentBlock - fromBlock > scanBatchSize ? fromBlock + scanBatchSize : currentBlock;

    const anchors: number[] = [];

    for (let i = fromBlock; i < toBlockNumber; i++) {
      anchors.push(i);
    }

    this.logger.info('Scanning for new blocks', { fromBlock, toBlock: toBlockNumber });

    const chainsInstancesForIds = await this.chainInstanceResolver.byAnchor(anchors);
    const uniqueChainsInstances = this.chainInstanceResolver.uniqueInstances(chainsInstancesForIds);

    if (!uniqueChainsInstances.length) {
      this.noticeError(`There is no Chain for anchors: ${fromBlock} - ${toBlockNumber}`);
    }

    const chains: Contract[] = uniqueChainsInstances.map(
      (instance) => new Contract(instance.address, ABI.chainAbi, this.blockchain.provider)
    );

    return Promise.all([
      this.getChainsLogMintEvents(chains, fromBlock, toBlockNumber),
      this.getChainsLogVoterEvents(chains, fromBlock, toBlockNumber),
      toBlockNumber,
    ]);
  }

  private async getChainsLogMintEvents(chains: Contract[], fromBlock: number, toBlock: number): Promise<Event[]> {
    const filter = chains[0].filters.LogMint();
    return this.getChainsEvents(chains, filter, fromBlock, toBlock);
  }

  private async getChainsLogVoterEvents(chains: Contract[], fromBlock: number, toBlock: number): Promise<Event[]> {
    const filter = await chains[0].filters.LogVoter();
    return this.getChainsEvents(chains, filter, fromBlock, toBlock);
  }

  private async getChainsEvents(
    chains: Contract[],
    filter: EventFilter,
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> {
    const events = await Promise.all(chains.map((chain) => chain.queryFilter(filter, fromBlock, toBlock)));
    return events.flatMap((e: Event[]) => e);
  }

  private async processEvents(logMintEvents: Event[], logVoterEvents: Event[]): Promise<IEventBlock[]> {
    const logVotersByBlockId: Map<number, LogVoter[]> = new Map<number, LogVoter[]>();

    logVoterEvents.forEach((event) => {
      const logVoter = NewBlocksResolver.toLogVoter(event);
      const logs = logVotersByBlockId.has(logVoter.blockId) ? logVotersByBlockId.get(logVoter.blockId) : [];
      logs.push(NewBlocksResolver.toLogVoter(event));
      logVotersByBlockId.set(logVoter.blockId, logs);
    });

    return Promise.all(
      logMintEvents
        .sort((a, b) => b.blockNumber - a.blockNumber)
        .map(async (event) => {
          const logMint = NewBlocksResolver.toLogMint(event);
          const logVoters = logVotersByBlockId.get(logMint.blockId);
          const votes: Map<string, string> = new Map<string, string>();
          const blockData = await this.chainContract.resolveBlockData(logMint.chain, logMint.blockId);

          logVoters.forEach((logVoter) => {
            votes.set(logVoter.voter, logVoter.vote.toString());
          });

          return {
            dataTimestamp: blockData.dataTimestamp,
            root: blockData.root,
            anchor: event.blockNumber,
            blockId: logMint.blockId,
            chainAddress: event.address,
            minter: logMint.minter,
            power: logMint.power.toString(),
            staked: logMint.staked.toString(),
            voters: logVoters.map((v) => v.voter),
            votes,
          };
        })
    );
  }

  private static toLogMint(event: Event): LogMint {
    return {
      chain: event.address,
      minter: event.args[0],
      blockId: event.args[1].toNumber(),
      staked: event.args[2],
      power: event.args[3],
    };
  }

  private static toLogVoter(event: Event): LogVoter {
    return {
      blockId: event.args[0].toNumber(),
      voter: event.args[1],
      vote: event.args[2],
    };
  }

  private async saveNewBlocks(newBlocks: IEventBlock[]): Promise<IBlock[]> {
    return Promise.all(
      newBlocks.map(async (newBlock) => {
        const dataTimestamp = new Date(newBlock.dataTimestamp * 1000);
        this.logger.info(`New block detected: ${newBlock.blockId}`);

        try {
          return await Block.create({
            _id: `block::${newBlock.blockId}`,
            chainAddress: newBlock.chainAddress,
            root: newBlock.root,
            blockId: newBlock.blockId,
            minter: newBlock.minter,
            staked: newBlock.staked,
            power: newBlock.power,
            anchor: newBlock.anchor,
            votes: newBlock.votes,
            voters: newBlock.voters,
            dataTimestamp: dataTimestamp,
            status: BlockStatus.Completed,
          });
        } catch (e) {
          if (!e.message.includes('E11000')) {
            this.noticeError(e);
          }
        }
      })
    );
  }

  private noticeError(err: string): void {
    newrelic.noticeError(Error(err));
    this.logger.error(err);
  }
}

export default NewBlocksResolver;
