import chalk from 'chalk';
import { GitHubClient } from './github.js';
import { PlatformMatcher } from './platform.js';
import { Downloader, DownloadProgress } from './downloader.js';
import { CacheManager } from './cache.js';
import { BinaryExecutor } from './executor.js';
import { ConfigManager } from './config.js';
import { Config, Platform } from './types.js';
import * as path from 'path';

export interface RunOptions {
  noCache?: boolean;
  update?: boolean;
  verbose?: boolean;
  timeout?: string;
}

export class GPXRunner {
  private github: GitHubClient;
  private downloader: Downloader;
  private cache: CacheManager;
  private executor: BinaryExecutor;
  private configManager: ConfigManager;
  private config: Config | null = null;

  constructor() {
    this.configManager = new ConfigManager();
    this.cache = new CacheManager(this.configManager.getCacheDir());
    this.executor = new BinaryExecutor();
    
    // These will be initialized with config
    this.github = new GitHubClient();
    this.downloader = new Downloader();
  }

  /**
   * Main entry point for running a GitHub binary
   */
  async run(repoString: string, args: string[], options: RunOptions): Promise<void> {
    await this.ensureConfig();
    
    if (options.verbose) {
      console.log(chalk.blue('Running with options:'), options);
    }

    // Parse repository
    const { owner, repo } = GitHubClient.parseRepo(repoString);
    const fullRepo = `${owner}/${repo}`;

    if (options.verbose) {
      console.log(chalk.blue(`Repository: ${fullRepo}`));
    }

    // Get current platform
    const platform = PlatformMatcher.getCurrentPlatform();
    if (options.verbose) {
      console.log(chalk.blue(`Platform: ${platform.os}-${platform.arch}`));
    }

    let binaryPath: string | null = null;

    // Check cache first (unless --no-cache or --update)
    if (!options.noCache && !options.update) {
      binaryPath = await this.getCachedBinary(fullRepo, platform, Boolean(options.verbose));
    }

    // Download if not cached or update requested
    if (!binaryPath) {
      binaryPath = await this.downloadAndCache(fullRepo, platform, Boolean(options.verbose));
    }

    // Execute the binary
    if (options.verbose) {
      console.log(chalk.blue(`Executing: ${binaryPath} ${args.join(' ')}`));
    }

    try {
      const exitCode = await this.executor.execute(binaryPath, { args });
      process.exit(exitCode);
    } catch (error) {
      throw new Error(`Execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean cache
   */
  async cleanCache(dryRun: boolean = false): Promise<void> {
    const cached = await this.cache.listCached();
    
    if (cached.length === 0) {
      console.log(chalk.yellow('Cache is empty'));
      return;
    }

    const cacheSize = await this.cache.getCacheSize();
    const sizeMB = (cacheSize / 1024 / 1024).toFixed(2);

    console.log(chalk.blue(`Cache contains ${cached.length} repositories (${sizeMB} MB)`));
    
    if (dryRun) {
      console.log(chalk.yellow('Dry run mode - showing what would be deleted:'));
      for (const item of cached) {
        console.log(`  ${item.repo} (${item.versions.length} versions)`);
      }
    } else {
      console.log(chalk.yellow('Cleaning entire cache...'));
      await this.cache.cleanAll();
      console.log(chalk.green('Cache cleaned successfully'));
    }
  }

  /**
   * Get cached binary if available
   */
  private async getCachedBinary(repo: string, platform: Platform, verbose: boolean): Promise<string | null> {
    // Try to get latest cached version
    const latestVersion = await this.cache.getLatestCached(repo, platform);
    
    if (latestVersion) {
      const binaryPath = await this.cache.getCachedBinary(repo, latestVersion, platform);
      
      if (binaryPath) {
        if (verbose) {
          console.log(chalk.green(`Found cached binary: ${latestVersion}`));
        }
        
        // Ensure it's still executable
        await this.executor.ensureExecutable(binaryPath);
        return binaryPath;
      }
    }

    if (verbose) {
      console.log(chalk.yellow('No cached binary found'));
    }
    
    return null;
  }

  /**
   * Download and cache binary
   */
  private async downloadAndCache(repo: string, platform: Platform, verbose: boolean): Promise<string> {
    if (verbose) {
      console.log(chalk.blue('Fetching latest release...'));
    }

    // Get latest release
    const [owner, repoName] = repo.split('/');
    const release = await this.github.getLatestRelease(owner, repoName);
    
    if (verbose) {
      console.log(chalk.blue(`Found release: ${release.tag_name}`));
    }

    // Find matching asset
    const asset = PlatformMatcher.findMatchingAsset(release.assets, platform);
    
    if (!asset) {
      const availablePlatforms = PlatformMatcher.getAvailablePlatforms(release.assets);
      throw new Error(
        `No compatible binary found for ${platform.os}-${platform.arch}\n` +
        `Available platforms: ${availablePlatforms.join(', ')}`
      );
    }

    if (verbose) {
      console.log(chalk.blue(`Downloading: ${asset.name}`));
    }

    // Download with progress
    const tempFile = await this.downloader.downloadAsset(asset, (progress: DownloadProgress) => {
      if (this.config?.behavior.showProgressBar) {
        this.showProgress(progress);
      }
    });

    console.log(''); // New line after progress

    // Extract to temporary directory
    const tempDir = path.dirname(tempFile);
    const extractDir = path.join(tempDir, 'extracted');
    
    if (verbose) {
      console.log(chalk.blue('Extracting archive...'));
    }
    
    await this.downloader.extractArchive(tempFile, extractDir);

    // Find executable
    const executables = await this.downloader.findExecutables(extractDir);
    
    if (verbose) {
      console.log(chalk.blue(`Found ${executables.length} executable(s):`));
      executables.forEach(exe => {
        console.log(chalk.blue(`  - ${path.basename(exe)}`));
      });
    }
    
    if (executables.length === 0) {
      throw new Error('No executable files found in archive');
    }

    // Choose the best executable (prefer one that matches repo name)
    const bestExecutable = this.chooseBestExecutable(executables, repoName);
    
    if (verbose) {
      console.log(chalk.blue(`Selected executable: ${path.basename(bestExecutable)}`));
    }

    // Calculate checksum if validation is enabled
    let checksum: string | undefined;
    if (this.config?.advanced.checksumValidation) {
      checksum = await this.downloader.calculateChecksum(bestExecutable);
    }

    // Cache the binary
    const cachedPath = await this.cache.cacheBinary(
      repo,
      release.tag_name,
      platform,
      bestExecutable,
      asset.name,
      checksum
    );

    // Cleanup temp files
    await this.downloader.cleanup([tempFile]);

    console.log(chalk.green(`✅ Cached ${repo} ${release.tag_name}`));
    
    return cachedPath;
  }

  /**
   * Choose the best executable from available options
   */
  private chooseBestExecutable(executables: string[], repoName: string): string {
    if (executables.length === 1) {
      return executables[0];
    }

    // Prefer executable that matches repo name exactly (not prefixed with underscore)
    for (const exe of executables) {
      const ext = path.extname(exe);
      const baseName = path.basename(exe, ext);
      if (baseName.toLowerCase() === repoName.toLowerCase() && ext === '' && !baseName.startsWith('_')) {
        return exe;
      }
    }

    // Then prefer executable that matches repo name and has no extension (likely the main binary)
    for (const exe of executables) {
      const ext = path.extname(exe);
      const baseName = path.basename(exe, ext);
      if (baseName.toLowerCase() === repoName.toLowerCase() && ext === '') {
        return exe;
      }
    }

    // Prefer executable that matches repo name and is not a man page or script/source file
    for (const exe of executables) {
      const ext = path.extname(exe);
      if (ext === '.1' || ext === '.bash' || ext === '.fish' || ext === '.zsh' || ext === '.elv' || ext === '.nu' || ext === '.ts' || ext === '.md') continue; // Skip man pages, shell scripts, TypeScript source files, and markdown files

      const baseName = path.basename(exe, ext);
      if (baseName.toLowerCase() === repoName.toLowerCase()) {
        return exe;
      }
    }

    // Prefer executable in bin/ directory
    for (const exe of executables) {
      if (exe.includes('/bin/') || exe.includes('\\bin\\')) {
        return exe;
      }
    }

    // Return first executable as fallback
    return executables[0];
  }

  /**
   * Show download progress
   */
  private showProgress(progress: DownloadProgress): void {
    const percentage = Math.round(progress.percentage);
    const downloaded = this.formatBytes(progress.downloaded);
    const total = this.formatBytes(progress.total);
    const speed = this.formatBytes(progress.speed);

    const barLength = 40;
    const filledLength = Math.round((barLength * progress.percentage) / 100);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);

    process.stdout.write(
      `\r📦 ${bar} ${percentage}% | ${downloaded}/${total} | ${speed}/s`
    );
  }

  /**
   * Format bytes to human readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Ensure configuration is loaded
   */
  private async ensureConfig(): Promise<void> {
    if (!this.config) {
      this.config = await this.configManager.getConfig();
      
      // Reinitialize components with config
      this.github = new GitHubClient(
        this.config.network.userAgent,
        this.config.network.timeout
      );
      
      this.downloader = new Downloader(
        this.config.network.timeout,
        this.config.network.retries
      );
    }
  }
}