import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { BinaryMetadata, CacheEntry, Platform } from './types.js';

export class CacheManager {
  private cacheDir: string;

  constructor(cacheDir?: string) {
    this.cacheDir = cacheDir || path.join(os.homedir(), '.cache', 'gpx');
  }

  /**
   * Get cache directory path for a specific repo/version/platform
   */
  getCachePath(repo: string, version: string, platform: Platform): string {
    const [owner, repoName] = repo.split('/');
    const platformKey = `${platform.os}-${platform.arch}`;
    return path.join(this.cacheDir, owner, repoName, version, platformKey);
  }

  /**
   * Check if binary is cached
   */
  async isCached(repo: string, version: string, platform: Platform): Promise<boolean> {
    const cachePath = this.getCachePath(repo, version, platform);
    const metadataPath = path.join(cachePath, 'metadata.json');
    
    try {
      await fs.access(metadataPath);
      const metadata = await this.getMetadata(repo, version, platform);
      
      // Verify binary file exists
      if (metadata) {
        await fs.access(metadata.binaryPath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Cache a binary with metadata
   */
  async cacheBinary(
    repo: string,
    version: string,
    platform: Platform,
    binaryPath: string,
    originalFilename: string,
    checksum?: string
  ): Promise<string> {
    const cachePath = this.getCachePath(repo, version, platform);
    await fs.mkdir(cachePath, { recursive: true });

    // Determine binary name (prefer repo name over original filename)
    const [, repoName] = repo.split('/');
    const ext = process.platform === 'win32' ? '.exe' : '';
    const binaryName = this.guessBinaryName(originalFilename, repoName) + ext;
    const cachedBinaryPath = path.join(cachePath, binaryName);

    // Copy binary to cache
    await fs.copyFile(binaryPath, cachedBinaryPath);

    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      const stats = await fs.stat(cachedBinaryPath);
      await fs.chmod(cachedBinaryPath, stats.mode | parseInt('755', 8));
    }

    // Create metadata
    const metadata: BinaryMetadata = {
      repo,
      version,
      platform,
      binaryPath: cachedBinaryPath,
      installDate: new Date().toISOString(),
      checksum,
    };

    await this.saveMetadata(cachePath, metadata);

    // Update latest symlink
    await this.updateLatestSymlink(repo, version, platform);

    return cachedBinaryPath;
  }

  /**
   * Get cached binary path
   */
  async getCachedBinary(repo: string, version: string, platform: Platform): Promise<string | null> {
    const metadata = await this.getMetadata(repo, version, platform);
    if (!metadata) return null;

    try {
      await fs.access(metadata.binaryPath);
      
      // Update last used time
      await this.updateLastUsed(repo, version, platform);
      
      return metadata.binaryPath;
    } catch {
      return null;
    }
  }

  /**
   * Get latest cached version for a repo
   */
  async getLatestCached(repo: string, platform: Platform): Promise<string | null> {
    const [owner, repoName] = repo.split('/');
    const repoPath = path.join(this.cacheDir, owner, repoName);
    
    try {
      const latestPath = path.join(repoPath, 'latest');
      const stats = await fs.lstat(latestPath);
      
      if (stats.isSymbolicLink()) {
        const target = await fs.readlink(latestPath);
        const version = path.basename(target);
        
        // Verify the cached binary exists
        const binaryPath = await this.getCachedBinary(repo, version, platform);
        return binaryPath ? version : null;
      }
    } catch {
      // No latest symlink or invalid
    }

    // Fallback: find most recent version
    return this.findMostRecentVersion(repo, platform);
  }

  /**
   * Get metadata for cached binary
   */
  private async getMetadata(repo: string, version: string, platform: Platform): Promise<BinaryMetadata | null> {
    const cachePath = this.getCachePath(repo, version, platform);
    const metadataPath = path.join(cachePath, 'metadata.json');
    
    try {
      const content = await fs.readFile(metadataPath, 'utf8');
      return JSON.parse(content) as BinaryMetadata;
    } catch {
      return null;
    }
  }

  /**
   * Save metadata to cache
   */
  private async saveMetadata(cachePath: string, metadata: BinaryMetadata): Promise<void> {
    const metadataPath = path.join(cachePath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  }

  /**
   * Update latest symlink to point to new version
   */
  private async updateLatestSymlink(repo: string, version: string, platform: Platform): Promise<void> {
    const [owner, repoName] = repo.split('/');
    const repoPath = path.join(this.cacheDir, owner, repoName);
    const latestPath = path.join(repoPath, 'latest');
    const platformKey = `${platform.os}-${platform.arch}`;
    const targetPath = path.join(version, platformKey);

    try {
      // Remove existing symlink
      await fs.unlink(latestPath);
    } catch {
      // Ignore if doesn't exist
    }

    try {
      await fs.symlink(targetPath, latestPath, 'dir');
    } catch {
      // Symlinks might not work on all systems, that's ok
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(repo: string, version: string, platform: Platform): Promise<void> {
    const cachePath = this.getCachePath(repo, version, platform);
    const cacheEntryPath = path.join(cachePath, 'cache-entry.json');
    
    let entry: CacheEntry;
    try {
      const content = await fs.readFile(cacheEntryPath, 'utf8');
      entry = JSON.parse(content) as CacheEntry;
      entry.usageCount++;
    } catch {
      // Create new entry if doesn't exist
      const metadata = await this.getMetadata(repo, version, platform);
      if (!metadata) return;
      
      entry = {
        metadata,
        lastUsed: new Date().toISOString(),
        usageCount: 1,
      };
    }

    entry.lastUsed = new Date().toISOString();
    await fs.writeFile(cacheEntryPath, JSON.stringify(entry, null, 2), 'utf8');
  }

  /**
   * Find most recent cached version
   */
  private async findMostRecentVersion(repo: string, platform: Platform): Promise<string | null> {
    const [owner, repoName] = repo.split('/');
    const repoPath = path.join(this.cacheDir, owner, repoName);
    
    try {
      const versions = await fs.readdir(repoPath);
      const validVersions = [];

      for (const version of versions) {
        if (version === 'latest') continue;
        
        if (await this.isCached(repo, version, platform)) {
          const metadata = await this.getMetadata(repo, version, platform);
          if (metadata) {
            validVersions.push({
              version,
              installDate: new Date(metadata.installDate).getTime(),
            });
          }
        }
      }

      if (validVersions.length === 0) return null;

      // Sort by install date, most recent first
      validVersions.sort((a, b) => b.installDate - a.installDate);
      return validVersions[0].version;
    } catch {
      return null;
    }
  }

  /**
   * Guess binary name from filename and repo name
   */
  private guessBinaryName(filename: string, repoName: string): string {
    // Remove extension and version info
    let name = filename.replace(/\.(tar\.gz|zip|exe)$/, '');
    
    // If filename contains repo name, prefer that
    if (name.toLowerCase().includes(repoName.toLowerCase())) {
      return repoName;
    }

    // Extract potential binary name from complex filenames
    const parts = name.split(/[-_]/);
    
    // Look for the repo name in parts
    for (const part of parts) {
      if (part.toLowerCase() === repoName.toLowerCase()) {
        return repoName;
      }
    }

    // If no match, use repo name as fallback
    return repoName;
  }

  /**
   * List all cached repositories
   */
  async listCached(): Promise<Array<{ repo: string; versions: string[] }>> {
    const cached: Array<{ repo: string; versions: string[] }> = [];

    try {
      const owners = await fs.readdir(this.cacheDir);
      
      for (const owner of owners) {
        const ownerPath = path.join(this.cacheDir, owner);
        const repos = await fs.readdir(ownerPath);
        
        for (const repoName of repos) {
          const repoPath = path.join(ownerPath, repoName);
          const versions = await fs.readdir(repoPath);
          const validVersions = versions.filter(v => v !== 'latest');
          
          if (validVersions.length > 0) {
            cached.push({
              repo: `${owner}/${repoName}`,
              versions: validVersions,
            });
          }
        }
      }
    } catch {
      // Cache directory might not exist yet
    }

    return cached;
  }

  /**
   * Clean entire cache
   */
  async cleanAll(): Promise<void> {
    try {
      await fs.rmdir(this.cacheDir, { recursive: true });
    } catch {
      // Ignore if doesn't exist
    }
  }

  /**
   * Get cache directory size
   */
  async getCacheSize(): Promise<number> {
    try {
      return await this.getDirectorySize(this.cacheDir);
    } catch {
      return 0;
    }
  }

  private async getDirectorySize(dir: string): Promise<number> {
    let size = 0;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += await this.getDirectorySize(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        size += stats.size;
      }
    }
    
    return size;
  }
}