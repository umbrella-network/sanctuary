import { injectable } from 'inversify';
import Block from '../models/Block';

export type TVoterQuantity = {
  _id: string;
  count: number;
};

@injectable()
export class MetricsRepository {
  async getVotersCount({ startDate, endDate }: { startDate: Date; endDate: Date }): Promise<TVoterQuantity[]> {
    const votersCount = await Block.aggregate<TVoterQuantity>([
      {
        $match: {
          dataTimestamp: {
            $gte: startDate,
            $lt: endDate,
          },
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
}
