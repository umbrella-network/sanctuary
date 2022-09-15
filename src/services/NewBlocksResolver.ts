import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import newrelic from 'newrelic';
import { ABI, LeafValueCoder, loadFeeds } from '@umb-network/toolbox';
import { ChainContract } from '../contracts/ChainContract';
import { Contract, Event, EventFilter } from 'ethers';
import { BlockStatus, IEventBlock } from '../types/blocks';
import { ChainInstanceResolver } from './ChainInstanceResolver';
import { ChainStatus } from '../types/ChainStatus';
import Settings from '../types/Settings';
import { LogMint, LogVoter } from '../types/events';
import Block from '../models/Block';
import BlockChainData from '../models/BlockChainData';
import { CreateBatchRanges } from './CreateBatchRanges';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainContractRepository } from '../repositories/ChainContractRepository';
import { ChainsIds } from '../types/ChainsIds';
import LatestIdsProvider from './LatestIdsProvider';
import { FCDRepository } from '../repositories/FCDRepository';

@injectable()
class NewBlocksResolver {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainInstanceResolver) private chainInstanceResolver!: ChainInstanceResolver;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject(LatestIdsProvider) latestIdsProvider!: LatestIdsProvider;
  @inject(FCDRepository) private fcdRepository!: FCDRepository;

  apply = async (chainId: ChainsIds): Promise<void> => {
    if (chainId === ChainsIds.SOLANA) {
      this.logger.warn(`[${chainId}] NewBlocksResolver called for solana`);
      return;
    }

    // this.chainId = chainId;
    // this.blockchain = this.blockchainRepository.get(chainId);
    // this.chainInstanceResolver.setup(chainId);
    // this.chainContract = <ChainContract>this.chainContractRepository.get(chainId);

    const [chainStatus, [, lastAnchor]] = await Promise.all([
      this.chainContractRepository.get(chainId).resolveStatus<ChainStatus>(),
      this.latestIdsProvider.getLastSavedBlockIdAndStartAnchor(chainId),
    ]);

    await this.resolveBlockEvents(chainId, chainStatus, lastAnchor);
  };

  private resolveBlockEvents = async (
    chainId: ChainsIds,
    chainStatus: ChainStatus,
    lastAnchor: number
  ): Promise<void> => {
    const ranges = CreateBatchRanges.apply(
      lastAnchor,
      chainStatus.blockNumber.toNumber(),
      this.blockchainRepository.get(chainId).settings.scanBatchSize
    );

    this.logger.info(`[${chainId}] resolveBlockEvents(lastAnchor: ${lastAnchor}), ranges: ${ranges.length}`);

    // must be sync execution!
    for (const [batchFrom, batchTo] of ranges) {
      await this.resolveBatchOfEvents(chainId, batchFrom, batchTo);
    }
  };

  private resolveBatchOfEvents = async (chainId: ChainsIds, fromBlock: number, toBlock: number): Promise<void> => {
    const [logMintEvents, logVoteEvents] = await this.getChainLogsEvents(chainId, fromBlock, toBlock);

    if (!logMintEvents.length) {
      this.logger.warn(`[${chainId}] No logMintEvents for blocks ${fromBlock} - ${toBlock} (${logVoteEvents.length})`);
      return;
    }

    this.logger.info(`[${chainId}] Resolved ${logMintEvents.length} submits for blocks ${fromBlock} - ${toBlock}`);

    await Promise.allSettled([
      this.saveNewBlocks(
        chainId,
        (await this.processEvents(chainId, logMintEvents, logVoteEvents)).filter((e) => e != undefined)
      ),
      this.updateFCD(chainId),
    ]);
  };

  private getChainLogsEvents = async (
    chainId: ChainsIds,
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

    this.logger.info(`[${chainId}] Scanning for new blocks`, {
      fromBlock: fromBlockNumber,
      toBlock: toBlockNumber,
    });

    const chainsInstancesForIds = await this.chainInstanceResolver.byAnchor(chainId, anchors);
    const uniqueChainsInstances = this.chainInstanceResolver.uniqueInstances(chainsInstancesForIds);

    if (!uniqueChainsInstances.length) {
      this.noticeError(`[${chainId}] There is no Chain for anchors: ${fromBlockNumber} - ${toBlockNumber}`);
    }

    const chains: Contract[] = uniqueChainsInstances.map(
      (instance) => new Contract(instance.address, ABI.chainAbi, this.blockchainRepository.get(chainId).getProvider())
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

  private processEvents = async (
    chainId: ChainsIds,
    logMintEvents: Event[],
    logVoterEvents: Event[]
  ): Promise<IEventBlock[]> => {
    this.logger.error(`[${chainId}] processEvents ${logMintEvents.length}`);

    const logVotersByBlockId: Map<number, LogVoter[]> = new Map<number, LogVoter[]>();

    logVoterEvents.forEach((event) => {
      const logVoter = NewBlocksResolver.toLogVoter(event);
      const logs = logVotersByBlockId.has(logVoter.blockId) ? logVotersByBlockId.get(logVoter.blockId) : [];
      logs.push(NewBlocksResolver.toLogVoter(event));
      logVotersByBlockId.set(logVoter.blockId, logs);
    });

    const chain = this.chainContractRepository.get(chainId);

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
            const blockData = await chain.resolveBlockData(logMint.chain, logMint.blockId);

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

  private saveNewBlocks = async (chainId: ChainsIds, newBlocks: IEventBlock[]): Promise<void> => {
    this.logger.info(`[${chainId}] saveNewBlocks: ${newBlocks.length}`);

    await Promise.all(
      newBlocks.map(async (newBlock) => {
        const dataTimestamp = new Date(newBlock.dataTimestamp * 1000);
        this.logger.info(`[${chainId}] New block detected: ${newBlock.blockId}`);
        const mongoBlockId = `block::${newBlock.blockId}`;
        const mongoBlockDataId = `block::${chainId}::${newBlock.blockId}`;
        const existBlockChainData = await BlockChainData.find({ blockId: newBlock.blockId, chainId });
        this.logger.info(`[${chainId}] BlockChainData exist? `, existBlockChainData);

        if (existBlockChainData.length == 0) {
          try {
            this.logger.info(`[${chainId}] saving dispatched BlockChainData: ${newBlock.blockId}`);
            const exist = await Block.findOne({ blockId: newBlock.blockId }).exec();
            this.logger.info(`[${chainId}] new block exist? `, !!exist);

            if (exist) {
              await Block.create({
                _id: mongoBlockId,
                root: newBlock.root,
                blockId: newBlock.blockId,
                staked: newBlock.staked,
                power: newBlock.power,
                votes: newBlock.votes,
                voters: newBlock.voters,
                dataTimestamp,
                status: BlockStatus.Completed,
              });
            }

            await BlockChainData.create({
              _id: mongoBlockDataId,
              anchor: newBlock.anchor,
              chainId,
              chainAddress: newBlock.chainAddress,
              blockId: newBlock.blockId,
              minter: newBlock.minter,
              status: exist ? exist.status : BlockStatus.Completed,
              dataTimestamp,
            });

            this.logger.info(`[${chainId}] saving dispatched block: ${newBlock.blockId}`);
          } catch (e) {
            if (!e.message.includes('E11000')) {
              await Promise.allSettled([
                Block.deleteOne({ _id: mongoBlockId }),
                BlockChainData.deleteOne({ _id: mongoBlockDataId }),
              ]);

              this.noticeError(e);
            }
          }
        }
      })
    );
  };

  private updateFCD = async (chainId: ChainsIds): Promise<void> => {
    const fcdKeys: string[] = [...Object.keys(await loadFeeds(this.settings.app.feedsOnChain))];

    if (fcdKeys.length === 0) {
      return;
    }

    const chain = <ChainContract>this.chainContractRepository.get(chainId);
    const [values, timestamps] = await chain.resolveFCDs(chain.address(), fcdKeys);

    await Promise.all(
      values.map((value, i) => {
        if (timestamps[i] == 0) {
          return;
        }

        return this.fcdRepository.saveOrUpdate({
          key: fcdKeys[i],
          dataTimestamp: new Date(timestamps[i] * 1000),
          value: LeafValueCoder.decode(value.toHexString(), fcdKeys[i]),
          chainId,
        });
      })
    );
  };

  private noticeError = (err: string, meta?: Record<string, unknown>): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err, meta);
  };
}

export default NewBlocksResolver;
