import { inject, injectable } from 'inversify';
import { TransactionReceipt, TransactionResponse } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { Logger } from 'winston';

@injectable()
export class GasCalculatorRootstock {
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[GasCalculatorRootstock]';

  apply(receipt: TransactionReceipt, tx: TransactionResponse): bigint {
    if (!receipt.gasUsed) {
      throw new Error(`${this.logPrefix} Invalid gasUsed for ${receipt.transactionHash}`);
    }

    if (!receipt.effectiveGasPrice && !tx.gasPrice) {
      throw new Error(`${this.logPrefix} Invalid effectiveGasPrice for ${receipt.transactionHash}`);
    }

    const gasUsed = BigNumber.from(receipt.gasUsed).toBigInt();
    const gasPrice = BigNumber.from(receipt.effectiveGasPrice ?? tx.gasPrice).toBigInt();

    this.logger.debug(`${this.logPrefix} ${tx.hash}: ${gasUsed} * ${gasPrice} = ${gasUsed * gasPrice}`);

    return gasUsed * gasPrice;
  }
}
