import { ethers } from 'ethers';
import { abi } from '../../contracts/UmbrellaFeeds.json';
import { FeedsPriceData } from '../../types/UpdateInput';

export class DeviationHasherEvm {
  static apply(
    networkId: number,
    target: string,
    keys: string[],
    priceDatas: FeedsPriceData[]
  ): { msg: string; hash: string } {
    const testimony = ethers.utils.defaultAbiCoder.encode(
      ['uint256', 'address', ...this.priceDatasAbi()],
      [networkId, target, keys, priceDatas]
    );

    return { hash: ethers.utils.keccak256(testimony), msg: testimony };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static priceDatasAbi(): any {
    const submitAbi = abi.find((data: { name?: string }) => data?.name === 'update');

    if (!submitAbi) throw new Error('missing `update()` in ABI');

    const { inputs } = submitAbi;

    // [keys, priceDatas]
    return [inputs[0], inputs[1]];
  }
}
