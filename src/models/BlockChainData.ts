import mongoose, { Schema, Document } from 'mongoose';

export interface IBlockChainData extends Document {
  chainId: string;
  chainAddress: string;
  anchor: number;
  minter: string;
  createdAt: Date;
  updatedAt: Date;
  blockId: number;
}

const BlockChainDataSchema = new Schema(
  {
    _id: { type: String, required: true },
    anchor: { type: Number, required: true },
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
BlockChainDataSchema.index({ chainId: 'text' });

export default mongoose.model<IBlockChainData>('BlockChainData', BlockChainDataSchema);
