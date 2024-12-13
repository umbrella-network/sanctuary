import { ContractRegistry } from '@umb-network/toolbox';

export class RegistryContractExt extends ContractRegistry {
  getAddressByString = async (name: string): Promise<string> => {
    return this.getAddress(this.toBytes32(name));
  }

  toBytes32 = (str: string): string => {
    const bytes = Buffer.from(str).toString('hex');
    return `0x${bytes}`.padEnd(64, '0');
  };
}
