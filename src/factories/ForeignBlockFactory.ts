import { uuid } from 'uuidv4';
import { inject, injectable } from 'inversify';
import { IBlock } from '../models/Block';
import ForeignBlock, { IForeignBlock } from '../models/ForeignBlock';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainsIds, NonEvmChainsIds } from '../types/ChainsIds';

export type FromBlockProps = {
  block: IBlock;
  foreignChainId: string;
  anchor: number;
  chainAddress: string;
};

@injectable()
export class ForeignBlockFactory {
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  fromBlock(props: FromBlockProps): IForeignBlock {
    const foreignBlock = new ForeignBlock();
    foreignBlock._id = uuid();
    foreignBlock.foreignChainId = props.foreignChainId;
    foreignBlock.blockId = props.block.blockId;
    foreignBlock.anchor = props.anchor;
    foreignBlock.chainAddress = props.chainAddress;
    if (NonEvmChainsIds.includes(<ChainsIds>props.foreignChainId)) {
      foreignBlock.minter = this.blockchainRepository.getGeneric(props.foreignChainId).wallet.address;
    } else {
      foreignBlock.minter = this.blockchainRepository.get(props.foreignChainId).wallet.address;
    }

    return foreignBlock;
  }
}
