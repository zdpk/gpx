import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Registry, RegistryEntry, Platform } from './types.js';

export class RegistryManager {
  private registryPath: string;
  private registry: Registry | null = null;

  constructor(cacheDir?: string) {
    const baseCacheDir = cacheDir || path.join(os.homedir(), '.cache', 'gpx');
    this.registryPath = path.join(baseCacheDir, 'registry.json');
  }

  /**
   * Get the registry file path
   */
  getRegistryPath(): string {
    return this.registryPath;
  }

  /**
   * Load registry from file or create empty one
   */
  async load(): Promise<Registry> {
    if (this.registry) {
      return this.registry;
    }

    try {
      const content = await fs.readFile(this.registryPath, 'utf8');
      this.registry = JSON.parse(content) as Registry;
      
      // Validate registry structure
      if (!this.isValidRegistry(this.registry)) {
        throw new Error('Invalid registry format');
      }
      
      return this.registry;
    } catch (error) {
      // Try to recover from backup
      try {
        const backupPath = `${this.registryPath}.backup`;
        const backupContent = await fs.readFile(backupPath, 'utf8');
        const backupRegistry = JSON.parse(backupContent) as Registry;
        
        if (this.isValidRegistry(backupRegistry)) {
          console.warn('Registry corrupted, restored from backup');
          this.registry = backupRegistry;
          await this.save(); // Save restored registry
          return this.registry;
        }
      } catch (backupError) {
        // Backup also failed or doesn't exist
      }

      // Create new registry if file doesn't exist or is invalid
      if (error instanceof Error && !error.message.includes('ENOENT')) {
        console.warn(`Registry invalid or corrupted, creating new one: ${error.message}`);
      }
      
      this.registry = this.createEmptyRegistry();
      await this.save();
      return this.registry;
    }
  }

  /**
   * Save registry to file with backup mechanism
   */
  async save(): Promise<void> {
    if (!this.registry) {
      return;
    }

    this.registry.lastUpdated = new Date().toISOString();
    
    // Ensure directory exists
    const registryDir = path.dirname(this.registryPath);
    await fs.mkdir(registryDir, { recursive: true });

    const backupPath = `${this.registryPath}.backup`;
    const tempPath = `${this.registryPath}.tmp`;

    try {
      // Create backup if registry exists
      try {
        await fs.access(this.registryPath);
        await fs.copyFile(this.registryPath, backupPath);
      } catch {
        // No existing registry to backup
      }

      // Write to temporary file first
      await fs.writeFile(
        tempPath, 
        JSON.stringify(this.registry, null, 2), 
        'utf8'
      );

      // Verify the temp file is valid JSON
      const tempContent = await fs.readFile(tempPath, 'utf8');
      JSON.parse(tempContent);

      // Atomically replace the registry file
      await fs.rename(tempPath, this.registryPath);
      
      // Clean up old backup (keep only the most recent)
      try {
        const oldBackupPath = `${this.registryPath}.backup.old`;
        await fs.access(oldBackupPath);
        await fs.unlink(oldBackupPath);
      } catch {
        // No old backup to clean
      }

    } catch (error) {
      // Clean up temp file on error
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      
      throw new Error(`Failed to save registry: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add or update a binary entry
   */
  async addEntry(binaryName: string, repo: string, version: string, platform: Platform): Promise<void> {
    const registry = await this.load();
    
    const entry: RegistryEntry = {
      repo,
      binaryName,
      version,
      installDate: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      platform,
    };

    registry.entries[binaryName] = entry;
    
    // Also add repo name mapping for convenience
    const [, repoName] = repo.split('/');
    if (repoName && repoName !== binaryName) {
      registry.entries[repoName] = entry;
    }

    await this.save();
  }

  /**
   * Get entry by binary name
   */
  async getEntry(binaryName: string): Promise<RegistryEntry | null> {
    const registry = await this.load();
    return registry.entries[binaryName] || null;
  }

  /**
   * Remove entry by binary name
   */
  async removeEntry(binaryName: string): Promise<boolean> {
    const registry = await this.load();
    const entry = registry.entries[binaryName];
    
    if (!entry) {
      return false;
    }

    // Remove both binary name and repo name mappings
    delete registry.entries[binaryName];
    
    const [, repoName] = entry.repo.split('/');
    if (repoName && repoName !== binaryName && registry.entries[repoName] === entry) {
      delete registry.entries[repoName];
    }

    await this.save();
    return true;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(binaryName: string): Promise<void> {
    const registry = await this.load();
    const entry = registry.entries[binaryName];
    
    if (entry) {
      entry.lastUsed = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * List all entries
   */
  async listEntries(): Promise<RegistryEntry[]> {
    const registry = await this.load();
    
    // Deduplicate entries (since we store both binary and repo name mappings)
    const uniqueEntries = new Map<string, RegistryEntry>();
    
    for (const entry of Object.values(registry.entries)) {
      uniqueEntries.set(entry.repo, entry);
    }
    
    return Array.from(uniqueEntries.values());
  }

  /**
   * Check if binary exists in registry
   */
  async hasEntry(binaryName: string): Promise<boolean> {
    const registry = await this.load();
    return binaryName in registry.entries;
  }

  /**
   * Find entries by repository
   */
  async findByRepo(repo: string): Promise<RegistryEntry[]> {
    const registry = await this.load();
    
    return Object.values(registry.entries).filter(entry => entry.repo === repo);
  }

  /**
   * Get registry statistics
   */
  async getStats(): Promise<{ totalEntries: number; lastUpdated: string }> {
    const registry = await this.load();
    const uniqueRepos = new Set(Object.values(registry.entries).map(e => e.repo));
    
    return {
      totalEntries: uniqueRepos.size,
      lastUpdated: registry.lastUpdated,
    };
  }

  /**
   * Create empty registry
   */
  private createEmptyRegistry(): Registry {
    return {
      version: '1.0',
      entries: {},
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Clear the in-memory cache to force reload
   */
  clearCache(): void {
    this.registry = null;
  }

  /**
   * Validate registry structure
   */
  private isValidRegistry(registry: any): registry is Registry {
    return (
      registry &&
      typeof registry === 'object' &&
      typeof registry.version === 'string' &&
      typeof registry.entries === 'object' &&
      typeof registry.lastUpdated === 'string'
    );
  }

  /**
   * Restore registry from backup
   */
  async restoreFromBackup(): Promise<boolean> {
    try {
      const backupPath = `${this.registryPath}.backup`;
      const backupContent = await fs.readFile(backupPath, 'utf8');
      const backupRegistry = JSON.parse(backupContent) as Registry;
      
      if (this.isValidRegistry(backupRegistry)) {
        this.registry = backupRegistry;
        await this.save();
        return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Repair registry by removing invalid entries
   */
  async repairRegistry(): Promise<number> {
    const registry = await this.load();
    let removedCount = 0;
    
    const validEntries: Record<string, RegistryEntry> = {};
    
    for (const [key, entry] of Object.entries(registry.entries)) {
      if (this.isValidRegistryEntry(entry)) {
        validEntries[key] = entry;
      } else {
        removedCount++;
      }
    }
    
    registry.entries = validEntries;
    await this.save();
    
    return removedCount;
  }

  /**
   * Validate registry entry structure
   */
  private isValidRegistryEntry(entry: any): entry is RegistryEntry {
    return (
      entry &&
      typeof entry === 'object' &&
      typeof entry.repo === 'string' &&
      typeof entry.binaryName === 'string' &&
      typeof entry.version === 'string' &&
      typeof entry.installDate === 'string' &&
      typeof entry.lastUsed === 'string' &&
      entry.platform &&
      typeof entry.platform.os === 'string' &&
      typeof entry.platform.arch === 'string'
    );
  }
}