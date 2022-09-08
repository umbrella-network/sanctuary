import mongoose, { Schema, Document } from 'mongoose';
import { BlockStatus } from '@umb-network/toolbox/dist/types/BlockStatuses';

export interface IBlockChainData extends Document {
  chainId: string;
  chainAddress: string;
  anchor: number;
  status: BlockStatus;
  minter: string;
  createdAt: Date;
  updatedAt: Date;
  blockId: number;
}

const BlockChainDataSchema = new Schema(
  {
    _id: { type: String, required: true },
    anchor: { type: Number, required: true },
    status: { type: String, required: true },
    chainId: { type: String, required: true },
    chainAddress: { type: String, required: true, unique: false },
    minter: { type: String, required: true, unique: false },
    blockId: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

BlockChainDataSchema.index({ blockId: 1, chainId: 1 }, { unique: true });
BlockChainDataSchema.index({ anchor: -1 });
BlockChainDataSchema.index({ blockId: -1 });
BlockChainDataSchema.index({ status: 1 });

export default mongoose.model<IBlockChainData>('BlockChainData', BlockChainDataSchema);
