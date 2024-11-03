import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import axios from 'axios';
import Settings from '../../types/Settings.js';
import { MappingRepository } from '../../repositories/MappingRepository';
import { FeedKeyRepository } from '../../repositories/FeedKeyRepository';

@injectable()
export class KeysUpdateService {
  @inject('Settings') private settings!: Settings;
  @inject('Logger') private logger!: Logger;
  @inject(MappingRepository) private mappingRepository: MappingRepository;
  @inject(FeedKeyRepository) private feedKeyRepository: FeedKeyRepository;

  private readonly SUCCESS_CODES = [200, 201, 301];
  private logPrefix = '[KeysUpdateService]';

  async apply(): Promise<void> {
    await this.processFeedFile(this.settings.app.layer1FeedFile);
    await this.processFeedFile(this.settings.app.feedsFile);
    await this.processFeedFile(this.settings.app.feedsOnChain);
  }

  private async processFeedFile(feedFile: string) {
    this.logger.debug(`${this.logPrefix} checking ${feedFile}`);

    const yaml = await this.downloadFile(feedFile);
    if (!yaml) return;

    const existingKeys = await this.feedKeyRepository.getAllByKey();
    const keys = this.extractKeys(yaml, existingKeys);

    if (keys.length == 0) {
      this.logger.debug(`${this.logPrefix} no new keys`);
      return;
    }

    this.logger.info(`${this.logPrefix} new keys: ${keys}`);
    await Promise.all(keys.map((key) => this.feedKeyRepository.save(key)));
  }

  private extractKeys(yaml: string, existingKeys: Record<string, string>): string[] {
    return yaml
      .split('\n')
      .filter((line) => line.length > 0)
      .filter((line) => line[0] != ' ' && line.split(':').length == 2)
      .map((line) => line.split(':')[0])
      .filter((key) => !existingKeys[key]);
  }

  private async downloadFile(feedFile: string): Promise<string | undefined> {
    if (!feedFile) {
      this.logger.warn(`${this.logPrefix} Skipping, no URL configured`);
      return;
    }

    this.logger.debug(`${this.logPrefix} layer1FeedFile: ${feedFile}`);

    const response = await axios.get(feedFile, { timeout: 3000 });

    if (!this.SUCCESS_CODES.includes(response.status)) {
      this.logger.error(`${this.logPrefix} Download Failed. HTTP Status: ${response.status}`);
      this.logger.error(`${this.logPrefix} HTTP Response: ${JSON.stringify(response)}`);
      return;
    }

    return response.data;
  }
}
