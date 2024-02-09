import { injectable } from 'inversify';

import RegisteredContracts, { IRegisteredContracts } from '../models/RegisteredContracts';
import { ChainsIds } from '../types/ChainsIds';

@injectable()
export class RegisteredContractRepository {
  instanceId(chainId: string, contractName: string, address: string): string {
    return `${contractName}::${chainId}::${address}`;
  }

  async save(chainId: string, anchor: number, contractName: string, address: string): Promise<IRegisteredContracts> {
    return RegisteredContracts.findOneAndUpdate(
      {
        _id: this.instanceId(chainId, contractName, address),
      },
      {
        anchor,
        address,
        chainId,
        name: contractName,
      },
      {
        new: true,
        upsert: true,
      }
    );
  }

  async get(id: string): Promise<IRegisteredContracts> {
    return RegisteredContracts.findById(id);
  }

  async getAllContracts(chainId: ChainsIds, name: string): Promise<IRegisteredContracts[]> {
    return RegisteredContracts.find({ chainId, name }).exec();
  }

  async getLastSavedAnchor(chainId: ChainsIds): Promise<number | undefined> {
    const records = await RegisteredContracts.find({ chainId }).limit(1).sort({ anchor: -1 }).exec();
    return records[0] ? records[0].anchor : undefined;
  }
}
