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

  async apply(): Promise<void> {
    const yaml = await this.downloadFile();
    if (!yaml) return;

    const existingKeys = await this.feedKeyRepository.getAllByKey();
    const keys = this.extractKeys(yaml, existingKeys);

    if (keys.length == 0) {
      this.logger.debug('[KeysUpdateService] no new keys');
      return;
    }

    this.logger.info(`[KeysUpdateService] new keys: ${keys}`);
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

  private async downloadFile(): Promise<string | undefined> {
    const layer1FeedFile = this.settings.app.layer1FeedFile;

    if (!layer1FeedFile) {
      this.logger.warn('[KeysUpdateService] Skipping, no URL configured');
      return;
    }

    this.logger.debug(`[KeysUpdateService] layer1FeedFile: ${layer1FeedFile}`);

    const response = await axios.get(layer1FeedFile, { timeout: 3000 });

    if (!this.SUCCESS_CODES.includes(response.status)) {
      this.logger.error(`[KeysUpdateService] Download Failed. HTTP Status: ${response.status}`);
      this.logger.error(`[KeysUpdateService] HTTP Response: ${JSON.stringify(response)}`);
      return;
    }

    return response.data;
  }
}
