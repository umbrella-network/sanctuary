import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Block, { IBlock } from '../models/Block';

@injectable()
class BlockSynchronizer {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;

  async apply(): Promise<void> {
    // figure out what the latest block height is
    // find or create the block in database
    //const anchor = Number(await this.blockchain.provider.getBlockNumber());
    const currentBlockHeight = Number(await this.chainContract.getBlockHeight());
    //this.logger.info(`Current block height: ${blockHeight} with anchor: ${anchor}`);

    const lookback = Math.max(currentBlockHeight - 100, 0);
    this.logger.info(`Synchronizing blocks starting at: ${lookback}`);

    for (let height = lookback; height < currentBlockHeight; height++) {
      let anchor = height * 8;
      // this.logger.info(`Block with height: ${height} and anchor: ${anchor}`);

      let block = await Block.findOneAndUpdate(
        {
          _id: `block::${height}`,
          height: height
        }, {
          anchor: anchor
        }, {
          new: true,
          upsert: true
        }
      );

      this.logger.info(`Block ${block.id} with height: ${height} and anchor: ${anchor} and status: ${block.status}`);

      if (!block.status) {
        this.logger.info(`New block detected: ${block.id}`);
        block.status = 'new';
        await block.save();
      }
    }

    /*
    let block = await Block.findOneAndUpdate(
      {
        height: Number(blockHeight)
      }, {
        anchor: anchor
      }, {
        new: true,
        upsert: true
      }
    );

    if (!block.status) {
      block.status = 'new';
      await block.save();
    }
    */
  }
}

export default BlockSynchronizer;
