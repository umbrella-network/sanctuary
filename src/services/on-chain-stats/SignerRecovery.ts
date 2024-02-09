import { ethers } from 'ethers';
import { UpdateData } from '../../types/UpdateInput';
import { DeviationHasherEvm } from './DeviationHasherEvm';

export class SignersRecoveryEvm {
  static apply(networkId: number, target: string, txdata: UpdateData): string[] {
    const { keys, priceDatas, signatures } = txdata;
    const { hash } = DeviationHasherEvm.apply(networkId, target, keys, priceDatas);

    const newDataHash = ethers.utils.hashMessage(Buffer.from(hash.replace('0x', ''), 'hex'));
    return signatures.map((s) => ethers.utils.recoverAddress(newDataHash, s)).map((addr) => addr.toLowerCase());
  }
}
