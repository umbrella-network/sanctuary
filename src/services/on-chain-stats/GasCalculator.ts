import { inject, injectable } from 'inversify';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { Logger } from 'winston';
import { GasCalculatorEvm } from './GasCalculatorEvm';
import { ChainsIds } from '../../types/ChainsIds';
import { BaseTransactionReceipt, GasCalculatorBase } from './GasCalculatorBase';
import { GasCalculatorRootstock } from './GasCalculatorRootstock';

@injectable()
export class GasCalculator {
  @inject('Logger') private logger!: Logger;

  @inject(GasCalculatorEvm) private gasCalculatorEvm: GasCalculatorEvm;
  @inject(GasCalculatorBase) private gasCalculatorBase: GasCalculatorBase;
  @inject(GasCalculatorRootstock) private gasCalculatorRootstock: GasCalculatorRootstock;

  apply(chainId: string, receipt: TransactionReceipt, tx: TransactionResponse): bigint {
    switch (chainId) {
      case ChainsIds.ROOTSTOCK:
        return this.gasCalculatorRootstock.apply(receipt, tx);

      case ChainsIds.BASE:
        return this.gasCalculatorBase.apply(receipt as BaseTransactionReceipt);
      //
      // case CHAIN_IDS.POLYGON:
      case ChainsIds.LINEA:
      case ChainsIds.POLYGON:
      case ChainsIds.ARBITRUM:
        return this.gasCalculatorEvm.apply(receipt);

      default:
        throw new Error(`[GasCalculator] ${chainId} not supported`);
    }
  }
}
