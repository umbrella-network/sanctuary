import { injectable } from 'inversify';
import { uuid } from 'uuidv4';
import { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';

export type FromBlockProps = {
  block: IBlock;
  foreignChainId: string;
}

@injectable()
export class ForeignBlockFactory {
  fromBlock = (props: FromBlockProps): IForeignBlock => {
    const foreignBlock = new ForeignBlock();
    foreignBlock.id = uuid();
    foreignBlock.parentId = props.block.id;
    foreignBlock.foreignChainId = props.foreignChainId;
    return foreignBlock;
  }
}
