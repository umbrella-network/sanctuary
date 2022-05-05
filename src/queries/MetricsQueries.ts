import { injectable } from 'inversify';
import Block from '../models/Block';
import Leaf from '../models/Leaf';
import { TCount } from '../types/analytics/Metrics';

@injectable()
export class MetricsQueries {
  async getVotersCount({ startDate, endDate }: { startDate: Date; endDate: Date }): Promise<TCount[]> {
    const votersCount = await Block.aggregate<TCount>([
      {
        $match: {
          dataTimestamp: {
            $gte: startDate,
            $lt: endDate,
          },
          status: 'finalized',
        },
      },
      {
        $project: {
          voters: '$voters',
        },
      },
      {
        $unwind: {
          path: '$voters',
          preserveNullAndEmptyArrays: false,
        },
      },
      {
        $group: {
          _id: '$voters',
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    return votersCount;
  }

  async getKeysCount(startBlockNumber: number, endBlockNumber: number): Promise<TCount[]> {
    const feedCount = await Leaf.aggregate<TCount>([
      {
        $match: {
          blockId: {
            $gte: startBlockNumber,
            $lte: endBlockNumber,
          },
        },
      },
      {
        $project: {
          key: '$key',
          blockId: '$blockId',
        },
      },
      {
        $group: {
          _id: '$key',
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    return feedCount;
  }
}
