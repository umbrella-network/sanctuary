import { inject, injectable } from 'inversify';
import { TransactionReceipt } from '@ethersproject/providers';
import { Logger } from 'winston';
import { GasCalculatorEvm } from './GasCalculatorEvm';
import { ChainsIds } from '../../types/ChainsIds';
import { BaseTransactionReceipt, GasCalculatorBase } from './GasCalculatorBase';

@injectable()
export class GasCalculator {
  @inject('Logger') private logger!: Logger;

  @inject(GasCalculatorEvm) private gasCalculatorEvm: GasCalculatorEvm;
  @inject(GasCalculatorBase) private gasCalculatorBase: GasCalculatorBase;

  apply(chainId: string, receipt: TransactionReceipt): bigint {
    switch (chainId) {
      // case CHAIN_IDS.ROOTSTOCK_SBX:
      //   return rootstockCalculator(receipt);
      case 'base':
        return this.gasCalculatorBase.apply(receipt as BaseTransactionReceipt);
      //
      // case CHAIN_IDS.POLYGON:
      case 'linea':
      case ChainsIds.POLYGON:
      case ChainsIds.ARBITRUM:
        return this.gasCalculatorEvm.apply(receipt);

      default:
        throw new Error(`[GasCalculator] ${chainId} not supported`);
    }
  }
}
