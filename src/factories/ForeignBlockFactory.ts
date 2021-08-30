import { injectable } from 'inversify';
import { uuid } from 'uuidv4';
import { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';

export type FromBlockProps = {
  block: IBlock;
  foreignChainId: string;
  anchor: number;
}

@injectable()
export class ForeignBlockFactory {
  fromBlock = (props: FromBlockProps): IForeignBlock => {
    const foreignBlock = new ForeignBlock();
    foreignBlock.id = uuid();
    foreignBlock.parentId = props.block.id;
    foreignBlock.blockId = props.block.blockId;
    foreignBlock.anchor = props.anchor;
    foreignBlock.foreignChainId = props.foreignChainId;
    return foreignBlock;
  }
}
