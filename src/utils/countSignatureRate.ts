import { SignatureRate } from '../types/SignatureRate';
import { TCount } from '../types/analytics/Metrics';

const DEFAULT_PARTICIPATION_RATE = 0;

export const countSignatureRate = (voters: TCount[], numberOfBlocks: number): SignatureRate[] => {
  return voters.map(({ _id, count }) => ({
    _id,
    participationRate: calculateParticipationRate(count, numberOfBlocks),
  }));
};

const calculateParticipationRate = (count: number, numberOfBlocks: number): number => {
  return numberOfBlocks === 0 ? DEFAULT_PARTICIPATION_RATE : Math.round((count / numberOfBlocks) * 10000) / 100;
};
