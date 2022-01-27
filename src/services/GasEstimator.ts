import { BlockWithTransactions, FeeData } from '@ethersproject/abstract-provider';
import { BigNumber, ethers } from 'ethers';

// TODO move this to SDK

type TxType2GasEstimation = {
  baseFeePerGas: number;
  gasPrice: number;
  maxPriorityFeePerGas?: number | undefined;
  maxFeePerGas?: number | undefined;
};

export interface GasEstimation extends TxType2GasEstimation {
  isTxType2: boolean;
  min: number;
  max: number;
  avg: number;
}

type EstimateParams = {
  currentGasPrice: number;
  feeData: FeeData;
  minGasPrice: number;
  maxGasPrice: number;
  metrics: GasEstimation;
  prices: number[];
  maxPriorityFees: number[];
};

export class GasEstimator {
  static async apply(
    provider: ethers.providers.Provider,
    minGasPrice: number,
    maxGasPrice: number
  ): Promise<GasEstimation> {
    const [block, currentGasPrice, feeData] = await Promise.all([
      provider.getBlockWithTransactions('latest'),
      provider.getGasPrice(),
      provider.getFeeData(),
    ]);

    const [metrics, prices, maxPriorityFees] = GasEstimator.gasMetricsForBlock(block);

    return GasEstimator.estimate({
      currentGasPrice: currentGasPrice.toNumber(),
      feeData,
      metrics,
      prices,
      minGasPrice,
      maxGasPrice,
      maxPriorityFees,
    });
  }

  static printable(metrics: GasEstimation): string {
    const { gasPrice, maxPriorityFeePerGas, maxFeePerGas, min, max, avg, isTxType2, baseFeePerGas } = metrics;

    return (
      `isTxType2: ${isTxType2 ? 'yes' : 'no'}, ` +
      `gasPrice: ${GasEstimator.formatGwei(gasPrice)} Gwei, ` +
      `baseFeePerGas: ${GasEstimator.formatGwei(baseFeePerGas)} Gwei, ` +
      `maxPriorityFee: ${maxPriorityFeePerGas ? GasEstimator.formatGwei(maxPriorityFeePerGas) : '-'} Gwei, ` +
      `maxFee: ${maxFeePerGas ? GasEstimator.formatGwei(maxFeePerGas) : '-'} Gwei, ` +
      `min: ${GasEstimator.formatGwei(min)} Gwei, ` +
      `max: ${GasEstimator.formatGwei(max)} Gwei, ` +
      `avg: ${GasEstimator.formatGwei(avg)} Gwei`
    );
  }

  private static gasMetricsForBlock(
    block: BlockWithTransactions
  ): [gasPriceMetrics: GasEstimation, prices: number[], maxPriorityFees: number[]] {
    const isTxType2 = !!block.baseFeePerGas;
    let min = Number.MAX_VALUE;
    let max = 0;
    let sum = 0;
    const prices: number[] = [];
    const fees: number[] = [];

    block.transactions.forEach((tx) => {
      const { gasPrice, maxPriorityFeePerGas } = tx;

      if (!gasPrice) {
        return;
      }

      if (maxPriorityFeePerGas) {
        fees.push(maxPriorityFeePerGas.toNumber());
      }

      // gasPrice can be string or BN
      const gas = BigNumber.from(gasPrice).toNumber();
      prices.push(gas);
      sum += gas;

      if (gas > 0 && gas < min) {
        min = gas;
      }

      if (gas > max) {
        max = gas;
      }
    });

    if (!prices.length) {
      return [{ min: 0, max: 0, avg: 0, baseFeePerGas: 0, gasPrice: 0, isTxType2 }, [], []];
    }

    return [
      {
        isTxType2,
        min,
        max,
        avg: sum / prices.length,
        gasPrice: 0,
        baseFeePerGas: block.baseFeePerGas?.toNumber() || 0,
      },
      prices,
      fees,
    ];
  }

  private static estimate = (params: EstimateParams): GasEstimation => {
    const minPrice = Math.min(Math.max(params.metrics.baseFeePerGas, params.minGasPrice), params.maxGasPrice);

    if (params.prices.length < 2) {
      return GasEstimator.makeGasEstimation(minPrice, params);
    }

    const gasPrice = params.metrics.isTxType2 ? minPrice : GasEstimator.customEstimation(params);

    return GasEstimator.makeGasEstimation(gasPrice, params);
  };

  private static customEstimation = (params: EstimateParams): number => {
    const { prices, minGasPrice, maxGasPrice, metrics } = params;

    const sortedPrices = prices.sort(); // from lower -> higher
    const bottomPrices = sortedPrices
      .slice(0, Math.ceil((sortedPrices.length - 1) * 0.9)) // ignore top 10% of higher prices
      .filter((p) => p >= minGasPrice); // ignore prices lower than our minimum

    let sum = 0;
    bottomPrices.forEach((p) => {
      sum += p;
    });

    const avg = sum / bottomPrices.length;
    const estimatedPrice = bottomPrices.filter((p) => p < avg).pop(); // get price that is in a middle

    if (!estimatedPrice) {
      return minGasPrice;
    }

    return Math.ceil(Math.min(maxGasPrice, Math.max(minGasPrice, estimatedPrice, metrics.avg))) + 1;
  };

  private static makeGasEstimation(gasPrice: number, params: EstimateParams): GasEstimation {
    const { isTxType2 } = params.metrics;

    const maxPriorityFeePerGas = isTxType2
      ? GasEstimator.calcMaxPriorityFeePerGas(params.maxPriorityFees, params.feeData)
      : undefined;

    return {
      ...params.metrics,
      gasPrice,
      maxPriorityFeePerGas,
      maxFeePerGas: isTxType2
        ? GasEstimator.calcMaxFeePerGas(gasPrice, maxPriorityFeePerGas, params.maxGasPrice)
        : undefined,
    };
  }

  //  Doubling the Base Fee when calculating the Max Fee ensures that your transaction
  //  will remain marketable for six consecutive 100% full blocks.
  private static calcMaxFeePerGas = (baseFee: number, maxPriorityFee: number, maxGasPrice: number): number =>
    Math.min(maxGasPrice, 2 * baseFee + maxPriorityFee);

  private static calcMaxPriorityFeePerGas = (fees: number[], feeData: FeeData): number => {
    const minFee = feeData.maxPriorityFeePerGas ? feeData.maxPriorityFeePerGas.toNumber() : 2.5;
    const sortedFees = fees.sort(); // from lower -> higher

    const bottomFees = sortedFees
      .slice(0, Math.ceil((sortedFees.length - 1) * 0.8)) // ignore top % of higher prices
      .filter((p) => p >= minFee); // ignore prices lower than our minimum

    let sum = 0;

    bottomFees.forEach((p) => {
      sum += p;
    });

    const avg = sum / bottomFees.length;
    const estimatedFee = bottomFees.filter((p) => p < avg).pop(); // get price that is in a middle
    return Math.ceil(estimatedFee);
  };

  private static formatGwei = (wei: number): number => Math.round((wei / 1e9) * 1e4) / 1e4;

  private static wei = (gwei: number): number => gwei * 1e9;
}
