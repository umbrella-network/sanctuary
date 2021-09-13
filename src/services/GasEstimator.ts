import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { GasPriceMetrics } from '../types/GasPriceMetrics';
import { BigNumber, ethers } from 'ethers';

// TODO move this to SDK

export class GasEstimator {
  static async apply(
    provider: ethers.providers.Provider,
    minGasPrice: number,
    maxGasPrice: number
  ): Promise<GasPriceMetrics> {
    const block = await provider.getBlockWithTransactions('latest');
    const [metrics, prices] = GasEstimator.gasMetricsForBlock(block);

    metrics.estimation = GasEstimator.estimate(minGasPrice, maxGasPrice, metrics, prices);

    return metrics;
  }

  static printable(metrics: GasPriceMetrics): string {
    return `estimation: ${GasEstimator.toGwei(metrics.estimation)} Gwei, min: ${GasEstimator.toGwei(
      metrics.min
    )} Gwei, max: ${GasEstimator.toGwei(metrics.max)} Gwei, avg: ${GasEstimator.toGwei(metrics.avg)} Gwei`;
  }

  private static gasMetricsForBlock(block: BlockWithTransactions): [GasPriceMetrics, number[]] {
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
      return [{ min: 0, max: 0, avg: 0, estimation: 0 }, []];
    }

    return [{ min, max, avg: sum / prices.length, estimation: 0 }, prices];
  }

  private static estimate = (
    minGasPrice: number,
    maxGasPrice: number,
    metrics: GasPriceMetrics,
    prices: number[]
  ): number => {
    if (prices.length < 2) {
      return minGasPrice;
    }

    const sortedPrices = prices.sort();
    const bottomPrices = sortedPrices
      .slice(0, Math.ceil((sortedPrices.length - 1) * 0.9))
      .filter((p) => p >= minGasPrice);

    let sum = 0;
    bottomPrices.forEach((p) => {
      sum += p;
    });

    const avg = sum / bottomPrices.length;
    const estimatedPrice = bottomPrices.filter((p) => p < avg).pop();

    if (!estimatedPrice) {
      return minGasPrice;
    }

    return Math.ceil(Math.min(maxGasPrice, Math.max(minGasPrice, estimatedPrice))) + 1;
  };

  private static toGwei = (n: number): number => Math.round((n / 1e9) * 1e4) / 1e4;
}
