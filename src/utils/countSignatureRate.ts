import { SignatureRate } from '../types/SignatureRate';
import { TCount } from '../types/analytics/Metrics';

export const countSignatureRate = (voters: TCount[], numberOfBlocks: number): SignatureRate[] => {
  return voters.map(({ _id, count }) => ({
    _id,
    participationRate: parseFloat((count / numberOfBlocks).toFixed(2)) * 100,
  }));
};
