import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import ValidatorRegistryContract from '../contracts/ValidatorRegistryContract';
import Blockchain from '../lib/Blockchain';
import Block, { IBlock } from '../models/Block';
import LeavesSynchronizer from '../services/LeavesSynchronizer';
import Settings from 'src/types/Settings';

@injectable()
class BlockSynchronizer {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(ValidatorRegistryContract) validatorRegistryContract!: ValidatorRegistryContract;
  @inject(LeavesSynchronizer) leavesSynchronizer!: LeavesSynchronizer;

  async apply(): Promise<void> {
    const interval = Number(await this.chainContract.getInterval());
    const currentBlockHeight = (await this.chainContract.getBlockHeight()).toNumber();
    const lookback = Math.max(currentBlockHeight - 10, 0);
    this.logger.info(`Synchronizing blocks starting at: ${lookback} and current height: ${currentBlockHeight}`);

    for (let height = lookback; height < currentBlockHeight; height++) {
      let anchor = height * interval;
      let anchorBlock = await this.blockchain.provider.getBlock(anchor);

      if (!anchorBlock) { 
        this.logger.error(`No such block: ${anchor}`);
        continue;
      }

      let timestamp = new Date(anchorBlock.timestamp * 1000);

      let block = await Block.findOneAndUpdate(
        {
          _id: `block::${height}`,
          height: height
        }, {
          anchor: anchor,
          timestamp: timestamp
        }, {
          new: true,
          upsert: true
        }
      );

      this.logger.debug(`Block ${block.id} with height: ${height} and anchor: ${anchor} and timestamp: ${block.timestamp} and status: ${block.status}`);

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
        } if (success === null) {
          block.status = 'failed';
          await block.save();
        }
      }
    }
  }

  async syncFinished(id: String): Promise<void> {
    let block = await Block.findOne({_id: id});
    const height = block.height;
    const sideBlock = await this.chainContract.blocks(height);
    const voters = await this.chainContract.getBlockVoters(height);
    let status;

    this.logger.info(`Syncing finished side block with voters: ${voters}`);

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
      staked: sideBlock.staked,
      power: sideBlock.power,
      voters: voters
    });
  }
}

export default BlockSynchronizer;
