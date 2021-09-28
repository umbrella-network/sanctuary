import { injectable } from 'inversify';
import FCD, { IFCD } from '../models/FCD';

export interface FCDFactoryProps {
  key: string;
  value: number | string;
  dataTimestamp: Date;
  chainId: string;
}

@injectable()
export class FCDFactory {
  create(props: FCDFactoryProps): IFCD {
    const fcd = new FCD();
    fcd._id = FCDFactory.makeId(props.chainId, props.key);
    fcd.key = props.key;
    fcd.value = props.value;
    fcd.chainId = props.chainId;
    fcd.dataTimestamp = props.dataTimestamp;
    return fcd;
  }

  static makeId(chainId: string, key: string): string {
    return `${chainId}::${key}`;
  }
}
