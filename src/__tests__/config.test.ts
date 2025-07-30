import { ConfigManager } from '../config';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock fs for testing
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = path.join(os.tmpdir(), 'gpx-test-config');
    configManager = new ConfigManager();
  });

  describe('getConfig', () => {
    it('should return default config when file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT'));
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const config = await configManager.getConfig();

      expect(config).toHaveProperty('cache');
      expect(config).toHaveProperty('network');
      expect(config).toHaveProperty('behavior');
      expect(config).toHaveProperty('advanced');
      
      expect(config.cache.maxVersionsPerRepo).toBe(3);
      expect(config.cache.maxTotalSize).toBe('2GB');
      expect(config.network.timeout).toBe(30000);
      expect(config.behavior.alwaysUseLatest).toBe(false);
    });

    it('should parse existing config file', async () => {
      const mockConfigContent = `
cache:
  maxVersionsPerRepo: 5
  maxTotalSize: 4GB
network:
  timeout: 60000
behavior:
  verbose: true
advanced:
  checksumValidation: false
`;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockConfigContent);

      const config = await configManager.getConfig();

      expect(config.cache.maxVersionsPerRepo).toBe(5);
      expect(config.cache.maxTotalSize).toBe('4GB');
      expect(config.network.timeout).toBe(60000);
      expect(config.behavior.verbose).toBe(true);
      expect(config.advanced.checksumValidation).toBe(false);
    });

    it('should merge partial config with defaults', async () => {
      const mockConfigContent = `
cache:
  maxVersionsPerRepo: 10
network:
  timeout: 45000
`;

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockConfigContent);

      const config = await configManager.getConfig();

      // Custom values
      expect(config.cache.maxVersionsPerRepo).toBe(10);
      expect(config.network.timeout).toBe(45000);
      
      // Default values should be preserved
      expect(config.cache.maxTotalSize).toBe('2GB');
      expect(config.behavior.alwaysUseLatest).toBe(false);
      expect(config.advanced.checksumValidation).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('should save config to YAML format', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      const config = {
        cache: {
          maxVersionsPerRepo: 5,
          maxTotalSize: '4GB',
          lruInterval: '7d',
          updateCheckInterval: '24h',
          autoCleanup: true,
          autoExpandCache: true,
          expansionFactor: 2,
          maxAutoExpansions: 3,
        },
        network: {
          timeout: 60000,
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

      await configManager.saveConfig(config);

      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();

      const writeCall = mockFs.writeFile.mock.calls[0];
      expect(writeCall[1]).toContain('maxVersionsPerRepo: 5');
      expect(writeCall[1]).toContain('maxTotalSize: 4GB');
      expect(writeCall[1]).toContain('timeout: 60000');
    });
  });

  describe('path methods', () => {
    it('should return correct cache directory path', () => {
      const cacheDir = configManager.getCacheDir();
      expect(cacheDir).toContain('.cache');
      expect(cacheDir).toContain('gpx');
    });

    it('should return correct config file path', () => {
      const configPath = configManager.getConfigPath();
      expect(configPath).toContain('.config');
      expect(configPath).toContain('gpx');
      expect(configPath).toEndWith('config.yml');
    });
  });
});