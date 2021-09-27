import { inject, injectable } from 'inversify';
import { Logger } from 'winston';
import ChainInstance, { IChainInstance } from '../models/ChainInstance';
import newrelic from 'newrelic';

@injectable()
export class ChainInstanceResolver {
  @inject('Logger') private logger!: Logger;

  private chainId!: string;

  setup(chainId: string): ChainInstanceResolver {
    this.chainId = chainId;
    return this;
  }

  async byAnchor(anchors: number[]): Promise<(IChainInstance | undefined)[]> {
    const sortedInstances = await this.sortedChainInstances();

    const found = anchors
      .map((anchor) => sortedInstances.find((chainInstance) => chainInstance.anchor <= anchor));

    this.checkIfFound(found, anchors);
    return found;
  }

  private checkIfFound = (found: (IChainInstance | undefined)[], ids: number[]) => {
    found.forEach((instance, i) => {
      !instance && this.noticeError(`Can't resolve chain instance for id: ${ids[i]}`);
    });
  };

  private sortedChainInstances = async (): Promise<IChainInstance[]> => {
    const chainInstances: IChainInstance[] = await ChainInstance.find({ chainId: this.chainId });
    return chainInstances.sort((a, b) => this.sortDesc(a, b));
  };

  uniqueInstances = (chainsInstances: IChainInstance[]): IChainInstance[] => {
    const uniqueInstances: Map<string, IChainInstance> = new Map<string, IChainInstance>();

    chainsInstances
      .filter((instance) => !!instance)
      .forEach((instance) => {
        if (uniqueInstances.has(instance.address)) {
          return;
        }

        uniqueInstances.set(instance.address, instance);
      });

    return [...uniqueInstances.entries()].flatMap(([, a]) => a).sort(this.sortDesc);
  };

  private sortDesc = (a: IChainInstance, b: IChainInstance): number =>
    a.anchor === b.anchor ? b.blocksCountOffset - a.blocksCountOffset : b.anchor - a.anchor;

  private noticeError = (err: string): void => {
    newrelic.noticeError(Error(err));
    this.logger.error(err);
  };
}
