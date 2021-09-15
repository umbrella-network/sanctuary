import { injectable, interfaces } from 'inversify';
import ChainContract from '../contracts/ChainContract';
import Context = interfaces.Context;

export type ChainContractProvider = (chainId?: string) => Promise<ChainContract>;

@injectable()
export class ChainContractFactory {
  static getProvider = (context: Context): ChainContractProvider => {
    return async (chainId?: string): Promise<ChainContract> => {
      const contract = context.container.get(ChainContract);
      if (!chainId) return contract;

      contract.setChainId(chainId);
      return contract;
    };
  }
}