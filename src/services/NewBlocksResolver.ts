import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import { ABI } from '@umb-network/toolbox';
import { ChainContract } from '../contracts/ChainContract';
import { Contract, Event, EventFilter } from 'ethers';
import { BlockStatus, IEventBlock } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import Settings from '../types/Settings';
import { LogMint, LogVoter } from '../types/events';
import Block, { IBlock } from '../models/Block';
import BlockSynchronizer from './BlockSynchronizer';
import { CreateBatchRanges } from './CreateBatchRanges';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ChainsIds } from '../types/ChainsIds';
import { Blockchain } from '../lib/Blockchain';

@injectable()
class NewBlocksResolver {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(BlockSynchronizer) blockSynchronizer!: BlockSynchronizer;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;

  private blockchain!: Blockchain;
  private chainContract!: ChainContract;
  private chainId!: string;

  apply = async (chainId: string): Promise<void> => {
    if (chainId === ChainsIds.SOLANA) {
      return;
    }

    this.chainId = chainId;
    this.blockchain = this.blockchainRepository.get(chainId);
    this.chainInstanceResolver.setup(chainId);
    this.chainContract = <ChainContract>this.chainContractRepository.get(chainId);

    const [chainStatus, [, lastAnchor]] = await Promise.all([
      this.chainContract.resolveStatus<ChainStatus>(),
      this.blockSynchronizer.getLastSavedBlockIdAndStartAnchor(),
    ]);

    await this.resolveBlockEvents(chainStatus, lastAnchor);
  };

  private resolveBlockEvents = async (chainStatus: ChainStatus, lastAnchor: number): Promise<void> => {
    const ranges = CreateBatchRanges.apply(
      lastAnchor,
      chainStatus.blockNumber.toNumber(),
      this.blockchain.settings.scanBatchSize
    );

    this.logger.info(`[${this.chainId}] resolveBlockEvents(lastAnchor: ${lastAnchor}), ranges: ${ranges.length}`);

    // must be sync execution!
    for (const [batchFrom, batchTo] of ranges) {
      await this.resolveBatchOfEvents(batchFrom, batchTo);
    }
  };

  private resolveBatchOfEvents = async (fromBlock: number, toBlock: number): Promise<void> => {
    const [logMintEvents, logVoteEvents] = await this.getChainLogsEvents(fromBlock, toBlock);

    if (!logMintEvents.length) {
      this.logger.warn(
        `[${this.chainId}] No logMintEvents for blocks ${fromBlock} - ${toBlock} (${logVoteEvents.length})`
      );
      return;
    }

    this.logger.info(`[${this.chainId}] Resolved ${logMintEvents.length} submits for blocks ${fromBlock} - ${toBlock}`);
    await this.saveNewBlocks((await this.processEvents(logMintEvents, logVoteEvents)).filter((e) => e != undefined));
  };

  private getChainLogsEvents = async (
    fromBlockNumber: number,
    toBlockNumber: number
  ): Promise<[logMint: Event[], logVote: Event[]]> => {
    if (fromBlockNumber >= toBlockNumber) {
      return [[], []];
    }

    const anchors: number[] = [];

    for (let i = fromBlockNumber; i < toBlockNumber; i++) {
      anchors.push(i);
    }

    this.logger.info(`[${this.chainId}] Scanning for new blocks`, {
      fromBlock: fromBlockNumber,
      toBlock: toBlockNumber,
    });

    const chainsInstancesForIds = await this.chainInstanceResolver.byAnchor(anchors);
    const uniqueChainsInstances = this.chainInstanceResolver.uniqueInstances(chainsInstancesForIds);

    if (!uniqueChainsInstances.length) {
      this.noticeError(`[${this.chainId}] There is no Chain for anchors: ${fromBlockNumber} - ${toBlockNumber}`);
    }

    const chains: Contract[] = uniqueChainsInstances.map(
      (instance) => new Contract(instance.address, ABI.chainAbi, this.blockchain.getProvider())
    );

    return Promise.all([
      this.getChainsLogMintEvents(chains, fromBlockNumber, toBlockNumber),
      this.getChainsLogVoterEvents(chains, fromBlockNumber, toBlockNumber),
    ]);
  };

  private getChainsLogMintEvents = async (chains: Contract[], fromBlock: number, toBlock: number): Promise<Event[]> => {
    const filter = chains[0].filters.LogMint();
    return this.getChainsEvents(chains, filter, fromBlock, toBlock);
  };

  private getChainsLogVoterEvents = async (
    chains: Contract[],
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> => {
    const filter = await chains[0].filters.LogVoter();
    return this.getChainsEvents(chains, filter, fromBlock, toBlock);
  };

  private getChainsEvents = async (
    chains: Contract[],
    filter: EventFilter,
    fromBlock: number,
    toBlock: number
  ): Promise<Event[]> => {
    const events = await Promise.all(chains.map((chain) => chain.queryFilter(filter, fromBlock, toBlock)));
    return events.flatMap((e: Event[]) => e);
  };

  private processEvents = async (logMintEvents: Event[], logVoterEvents: Event[]): Promise<IEventBlock[]> => {
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
          try {
            const logMint = NewBlocksResolver.toLogMint(event);
            const logVoters = logVotersByBlockId.get(logMint.blockId);

            if (!logVoters) {
              this.logger.error(`LogVoters does not exist for blockId ${logMint.blockId}`);
              return undefined;
            }

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
          } catch (e) {
            this.noticeError(e, { ...event });
            return undefined;
          }
        })
    );
  };

  private static toLogMint = (event: Event): LogMint => {
    return {
      chain: event.address,
      minter: event.args[0],
      blockId: event.args[1].toNumber(),
      staked: event.args[2],
      power: event.args[3],
    };
  };

  private static toLogVoter = (event: Event): LogVoter => {
    return {
      blockId: event.args[0].toNumber(),
      voter: event.args[1],
      vote: event.args[2],
    };
  };

  // TODO adjust to new DB
  private saveNewBlocks = async (newBlocks: IEventBlock[]): Promise<IBlock[]> => {
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
  };

  private noticeError = (err: string, meta?: Record<string, unknown>): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err, meta);
  };
}

export default NewBlocksResolver;
