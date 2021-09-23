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

    const [metrics, prices] = GasEstimator.gasMetricsForBlock(block);

    return GasEstimator.estimate({
      currentGasPrice: currentGasPrice.toNumber(),
      feeData,
      metrics,
      prices,
      minGasPrice,
      maxGasPrice,
    });
  }

  static printable(metrics: GasEstimation): string {
    return (
      `gasPrice: ${GasEstimator.formatGwei(metrics.gasPrice)} Gwei, ` +
      `maxPriorityFeePerGas: ${GasEstimator.formatGwei(metrics.maxPriorityFeePerGas)} Gwei, ` +
      `maxFeePerGas: ${GasEstimator.formatGwei(metrics.maxFeePerGas)} Gwei, ` +
      `min: ${GasEstimator.formatGwei(metrics.min)} Gwei, ` +
      `max: ${GasEstimator.formatGwei(metrics.max)} Gwei, ` +
      `avg: ${GasEstimator.formatGwei(metrics.avg)} Gwei`
    );
  }

  private static gasMetricsForBlock(block: BlockWithTransactions): [gasPriceMetrics: GasEstimation, prices: number[]] {
    const isTxType2 = !!block.baseFeePerGas;
    let min = Number.MAX_VALUE;
    let max = 0;
    let sum = 0;
    const prices: number[] = [];

    block.transactions.forEach(({ gasPrice }) => {
      if (!gasPrice) {
        return;
      }

      // gasPrice can se string or BN
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
      return [{ min: 0, max: 0, avg: 0, baseFeePerGas: 0, gasPrice: 0, isTxType2 }, []];
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
    ];
  }

  private static estimate = (params: EstimateParams): GasEstimation => {
    console.log('params.prices.length', params.prices.length);

    const minPrice = Math.min(Math.max(params.metrics.baseFeePerGas, params.minGasPrice), params.maxGasPrice);

    if (params.prices.length < 2) {
      return GasEstimator.makeGasEstimation(minPrice, params);
    }

    const gasPrice = params.metrics.isTxType2
      ? minPrice
      : GasEstimator.customEstimation(params.prices, params.minGasPrice, params.maxGasPrice);

    console.log('params.metrics.isTxType2', params.metrics.isTxType2);
    console.log('our estimation', GasEstimator.formatGwei(gasPrice));

    console.log('maxFeePerGas', GasEstimator.formatGwei(params.feeData.maxFeePerGas.toNumber()));
    console.log('gasPrice', GasEstimator.formatGwei(params.feeData.gasPrice.toNumber()));
    console.log('maxPriorityFeePerGas', GasEstimator.formatGwei(params.feeData.maxPriorityFeePerGas.toNumber()));

    return GasEstimator.makeGasEstimation(gasPrice, params);
  };

  private static customEstimation = (prices: number[], minGasPrice: number, maxGasPrice: number): number => {
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

    return Math.ceil(Math.min(maxGasPrice, Math.max(minGasPrice, estimatedPrice))) + 1;
  };

  private static makeGasEstimation(gasPrice: number, params: EstimateParams): GasEstimation {
    const { isTxType2 } = params.metrics;
    const maxPriorityFeePerGas = isTxType2 ? GasEstimator.calcMaxPriorityFeePerGas(params.feeData) : undefined;

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

  private static calcMaxPriorityFeePerGas = (feeData: FeeData): number => feeData.maxPriorityFeePerGas?.toNumber() || 0;

  private static formatGwei = (wei: number): number => Math.round((wei / 1e9) * 1e4) / 1e4;

  private static wei = (gwei: number): number => gwei * 1e9;
}
