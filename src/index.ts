// Main exports for the GPX library
export { GPXRunner } from './runner.js';
export { GitHubClient } from './github.js';
export { PlatformMatcher } from './platform.js';
export { Downloader } from './downloader.js';
export { CacheManager } from './cache.js';
export { BinaryExecutor } from './executor.js';
export { ConfigManager } from './config.js';

// Type exports
export type {
  GitHubRelease,
  GitHubAsset,
  Platform,
  BinaryMetadata,
  CacheEntry,
  Config,
  Registry,
  RegistryEntry,
  PackageInfo,
} from './types.js';