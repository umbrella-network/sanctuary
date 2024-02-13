import { injectable } from 'inversify';
import { TransactionReceipt } from '@ethersproject/providers';
import { BigNumber } from 'ethers';

export interface BaseTransactionReceipt extends TransactionReceipt {
  l1Fee: BigNumber;
}

@injectable()
export class GasCalculatorBase {
  apply(receipt: BaseTransactionReceipt): bigint {
    const gasUsed = BigNumber.from(receipt.gasUsed).toBigInt();
    const gasPrice = BigNumber.from(receipt.effectiveGasPrice).toBigInt();

    if (!receipt.l1Fee) throw new Error(`[GasCalculatorBase] receipt missing l1Fee for ${receipt.transactionHash}`);

    const l1Fee = BigNumber.from(receipt.l1Fee).toBigInt();

    return gasUsed * gasPrice + l1Fee;
  }
}
