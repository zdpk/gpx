export interface GitHubRelease {
  tag_name: string;
  name: string;
  published_at: string;
  assets: GitHubAsset[];
}

export interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
  content_type: string;
}

export interface Platform {
  os: string;
  arch: string;
}

export interface BinaryMetadata {
  repo: string;
  version: string;
  platform: Platform;
  binaryPath: string;
  installDate: string;
  checksum?: string | undefined;
}

export interface CacheEntry {
  metadata: BinaryMetadata;
  lastUsed: string;
  usageCount: number;
}

export interface Config {
  cache: {
    maxVersionsPerRepo: number;
    maxTotalSize: string;
    lruInterval: string;
    updateCheckInterval: string;
    autoCleanup: boolean;
    autoExpandCache: boolean;
    expansionFactor: number;
    maxAutoExpansions: number;
  };
  network: {
    timeout: number;
    retries: number;
    userAgent: string;
    maxConcurrentDownloads: number;
  };
  behavior: {
    alwaysUseLatest: boolean;
    confirmUpdates: boolean;
    verbose: boolean;
    showProgressBar: boolean;
    colorOutput: boolean;
  };
  advanced: {
    checksumValidation: boolean;
    compressionLevel: number;
    parallelExtraction: boolean;
    keepDownloadLogs: boolean;
    enableTelemetry: boolean;
  };
}