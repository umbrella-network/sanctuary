import { injectable } from 'inversify';
import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';

@injectable()
export class GasCalculatorEvm {
  apply(receipt: TransactionReceipt): bigint {
    if (!receipt.gasUsed) {
      throw new Error(`Invalid gasUsed for ${receipt.transactionHash}`);
    }

    if (!receipt.effectiveGasPrice) {
      throw new Error(`Invalid gasPrice for ${receipt.transactionHash}`);
    }

    const gasUsed = BigNumber.from(receipt.gasUsed).toBigInt();
    const gasPrice = BigNumber.from(receipt.effectiveGasPrice).toBigInt();

    return gasUsed * gasPrice;
  }
}
