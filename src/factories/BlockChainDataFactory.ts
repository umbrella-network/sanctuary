import { uuid } from 'uuidv4';
import { inject, injectable } from 'inversify';
import { IBlock } from '../models/Block';
import BlockChainData, { IBlockChainData } from '../models/BlockChainData';
import { BlockchainRepository } from '../repositories/BlockchainRepository';
import { ChainsIds, NonEvmChainsIds } from '../types/ChainsIds';

export type FromBlockProps = {
  block: IBlock;
  chainId: string;
  anchor: number;
  chainAddress: string;
};

@injectable()
export class BlockChainDataFactory {
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  fromBlock(props: FromBlockProps): IBlockChainData {
    const blockChainData = new BlockChainData();
    blockChainData._id = uuid();
    blockChainData.chainId = props.chainId;
    blockChainData.blockId = props.block.blockId;
    blockChainData.anchor = props.anchor;
    blockChainData.chainAddress = props.chainAddress;
    blockChainData.status = props.block.status;

    if (NonEvmChainsIds.includes(<ChainsIds>props.chainId)) {
      blockChainData.minter = this.blockchainRepository.getGeneric(props.chainId).wallet.address;
    } else {
      blockChainData.minter = this.blockchainRepository.get(props.chainId).wallet.address;
    }

    return blockChainData;
  }
}
