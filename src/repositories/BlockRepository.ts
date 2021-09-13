import { injectable } from 'inversify';
import Block, { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';

type FindReplicatedBlockProps = {
  foreignChainId: string;
  offset: number;
  limit: number;
}

@injectable()
export class BlockRepository {
  findReplicatedBlocks = async(props: FindReplicatedBlockProps): Promise<IBlock[]> => {
    const { foreignChainId, offset, limit } = props;

    const foreignBlocks: IForeignBlock[] = await ForeignBlock
      .find({ foreignChainId })
      .skip(offset)
      .limit(limit)
      .sort({ blockId: -1 })
      .exec();

    const blockIds: number[] = foreignBlocks.map((fb) => fb.blockId);

    return await Block
      .find({ blockId: { $in: blockIds } })
      .sort({ blockId: -1 })
      .exec();
  }
}
