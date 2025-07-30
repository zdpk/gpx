import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as yaml from 'yaml';
import { Config } from './types.js';

export class ConfigManager {
  private configPath: string;
  private configDir: string;
  private cacheDir: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.config', 'gpx');
    this.configPath = path.join(this.configDir, 'config.yml');
    this.cacheDir = path.join(os.homedir(), '.cache', 'gpx');
  }

  async getConfig(): Promise<Config> {
    try {
      await this.ensureConfigDir();
      const configFile = await fs.readFile(this.configPath, 'utf8');
      const config = yaml.parse(configFile) as Config;
      return this.mergeWithDefaults(config);
    } catch (error) {
      // If config doesn't exist, create default
      const defaultConfig = this.getDefaultConfig();
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  async saveConfig(config: Config): Promise<void> {
    await this.ensureConfigDir();
    const configYaml = yaml.stringify(config);
    await fs.writeFile(this.configPath, configYaml, 'utf8');
  }

  getCacheDir(): string {
    return this.cacheDir;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configDir);
    } catch {
      await fs.mkdir(this.configDir, { recursive: true });
    }
  }

  private getDefaultConfig(): Config {
    return {
      cache: {
        maxVersionsPerRepo: 3,
        maxTotalSize: '2GB',
        lruInterval: '7d',
        updateCheckInterval: '24h',
        autoCleanup: true,
        autoExpandCache: true,
        expansionFactor: 2,
        maxAutoExpansions: 3,
      },
      network: {
        timeout: 30000,
        retries: 3,
        userAgent: 'gpx/0.1.0',
        maxConcurrentDownloads: 2,
      },
      behavior: {
        alwaysUseLatest: false,
        confirmUpdates: true,
        verbose: false,
        showProgressBar: true,
        colorOutput: true,
      },
      advanced: {
        checksumValidation: true,
        compressionLevel: 6,
        parallelExtraction: true,
        keepDownloadLogs: false,
        enableTelemetry: false,
      },
    };
  }

  private mergeWithDefaults(userConfig: Partial<Config>): Config {
    const defaults = this.getDefaultConfig();
    return {
      cache: { ...defaults.cache, ...userConfig.cache },
      network: { ...defaults.network, ...userConfig.network },
      behavior: { ...defaults.behavior, ...userConfig.behavior },
      advanced: { ...defaults.advanced, ...userConfig.advanced },
    };
  }
}