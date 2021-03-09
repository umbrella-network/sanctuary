import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Block from '../models/Block';
import LeavesSynchronizer from '../services/LeavesSynchronizer';

@injectable()
class BlockSynchronizer {
  @inject('Logger') private logger!: Logger;
  @inject(ChainContract) private chainContract!: ChainContract;
  @inject(LeavesSynchronizer) private leavesSynchronizer!: LeavesSynchronizer;

  async apply(): Promise<void> {
    const currentBlockHeight = (await this.chainContract.getBlockHeight()).toNumber();
    const lookback = Math.max(currentBlockHeight - 10, 0);
    this.logger.info(`Synchronizing blocks starting at: ${lookback} and current height: ${currentBlockHeight}`);

    for (let height = lookback; height < currentBlockHeight; height++) {
      const minedBlock = await this.chainContract.blocks(height);
      const timestamp = new Date(minedBlock.timestamp.toNumber() * 1000);

      const block = await Block.findOneAndUpdate(
        {
          _id: `block::${height}`,
          height: height,
        },
        {
          anchor: minedBlock.anchor.toString(),
          timestamp,
        },
        {
          new: true,
          upsert: true,
        }
      );

      this.logger.debug(
        `Block ${block.id} with height: ${height} and anchor: ${block.anchor} and timestamp: ${block.timestamp} and status: ${block.status}`
      );

      if (!block.status) {
        this.logger.info(`New block detected: ${block.id}`);
        block.status = 'new';
        await block.save();
      } else if (block.status == 'new') {
        if (block.height < currentBlockHeight) {
          await this.syncFinished(block.id);
        } else {
          this.logger.info(`Block is not just finished: ${block.id}`);
        }
      } else if (block.status == 'completed') {
        this.logger.info(`Synchronizing leaves for completed block: ${currentBlockHeight}`);
        const success = await this.leavesSynchronizer.apply(block.id);

        if (success) {
          block.status = 'finalized';
          await block.save();
        }
        if (success === null) {
          block.status = 'failed';
          await block.save();
        }
      }
    }
  }

  private async syncFinished(id: string): Promise<void> {
    const block = await Block.findOne({ _id: id });
    const height = block.height;
    const sideBlock = await this.chainContract.blocks(height);
    const voters = await this.chainContract.getBlockVoters(height);
    const votes = await this.getVotes(height, voters);
    let status;

    this.logger.info(`Syncing finished side block with votes: ${JSON.stringify([...votes.entries()])}`);

    if (sideBlock.root == '0x0000000000000000000000000000000000000000000000000000000000000000') {
      status = 'failed';
    } else {
      status = 'completed';
    }

    this.logger.info(`Block ${height} has finished: ${sideBlock} with status: ${status}`);

    await block.updateOne({
      status: status,
      root: sideBlock.root,
      minter: sideBlock.minter,
      staked: sideBlock.staked.toString(),
      power: sideBlock.power.toString(),
      voters: voters,
      votes,
    });
  }

  private async getVotes(blockHeight: number, voters: string[]): Promise<Map<string, string>> {
    const votes: string[] = await Promise.all(
      voters.map(async (voter) => {
        const vote = await this.chainContract.getBlockVotes(blockHeight, voter);
        return vote.toString();
      })
    );

    const votesMap = new Map<string, string>();

    voters.forEach((voter, i) => {
      votesMap.set(voter, votes[i]);
    });

    return votesMap;
  }
}

export default BlockSynchronizer;
