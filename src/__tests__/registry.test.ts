import { RegistryManager } from '../registry';
import { Platform } from '../types';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('RegistryManager', () => {
  let tempDir: string;
  let registryManager: RegistryManager;

  beforeEach(async () => {
    // Create temporary directory for testing
    tempDir = path.join(os.tmpdir(), 'gpx-test-' + Date.now());
    await fs.mkdir(tempDir, { recursive: true });
    
    registryManager = new RegistryManager(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Basic operations', () => {
    it('should create empty registry on first load', async () => {
      const registry = await registryManager.load();
      
      expect(registry.version).toBe('1.0');
      expect(registry.entries).toEqual({});
      expect(registry.lastUpdated).toBeDefined();
    });

    it('should save and load registry', async () => {
      const platform: Platform = { os: 'linux', arch: 'x86_64' };
      
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      // Clear cache and reload
      registryManager.clearCache();
      const registry = await registryManager.load();
      
      expect(registry.entries['rg']).toBeDefined();
      expect(registry.entries['rg'].repo).toBe('BurntSushi/ripgrep');
      expect(registry.entries['rg'].version).toBe('v14.1.1');
    });

    it('should return correct registry path', () => {
      const expectedPath = path.join(tempDir, 'registry.json');
      expect(registryManager.getRegistryPath()).toBe(expectedPath);
    });
  });

  describe('Entry management', () => {
    const platform: Platform = { os: 'linux', arch: 'x86_64' };

    it('should add binary entry', async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      const entry = await registryManager.getEntry('rg');
      expect(entry).not.toBeNull();
      expect(entry!.repo).toBe('BurntSushi/ripgrep');
      expect(entry!.binaryName).toBe('rg');
      expect(entry!.version).toBe('v14.1.1');
      expect(entry!.platform).toEqual(platform);
    });

    it('should add both binary name and repo name mappings', async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      const rgEntry = await registryManager.getEntry('rg');
      const ripgrepEntry = await registryManager.getEntry('ripgrep');
      
      expect(rgEntry).toEqual(ripgrepEntry);
      expect(rgEntry!.repo).toBe('BurntSushi/ripgrep');
    });

    it('should handle binary name same as repo name', async () => {
      await registryManager.addEntry('docker', 'docker/docker', 'v20.10.0', platform);
      
      const entry = await registryManager.getEntry('docker');
      expect(entry).not.toBeNull();
      expect(entry!.repo).toBe('docker/docker');
    });

    it('should update existing entry', async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.2', platform);
      
      const entry = await registryManager.getEntry('rg');
      expect(entry!.version).toBe('v14.1.2');
    });

    it('should remove entry', async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      const removed = await registryManager.removeEntry('rg');
      expect(removed).toBe(true);
      
      const entry = await registryManager.getEntry('rg');
      expect(entry).toBeNull();
      
      // Both mappings should be removed
      const ripgrepEntry = await registryManager.getEntry('ripgrep');
      expect(ripgrepEntry).toBeNull();
    });

    it('should return false when removing non-existent entry', async () => {
      const removed = await registryManager.removeEntry('nonexistent');
      expect(removed).toBe(false);
    });

    it('should check if entry exists', async () => {
      expect(await registryManager.hasEntry('rg')).toBe(false);
      
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      expect(await registryManager.hasEntry('rg')).toBe(true);
      expect(await registryManager.hasEntry('ripgrep')).toBe(true);
    });

    it('should update last used timestamp', async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      const originalEntry = await registryManager.getEntry('rg');
      const originalLastUsed = originalEntry!.lastUsed;
      
      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));
      
      await registryManager.updateLastUsed('rg');
      
      const updatedEntry = await registryManager.getEntry('rg');
      expect(updatedEntry!.lastUsed).not.toBe(originalLastUsed);
    });
  });

  describe('Listing and searching', () => {
    const platform: Platform = { os: 'linux', arch: 'x86_64' };

    beforeEach(async () => {
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      await registryManager.addEntry('fd', 'sharkdp/fd', 'v8.5.0', platform);
      await registryManager.addEntry('bat', 'sharkdp/bat', 'v0.22.0', platform);
    });

    it('should list all entries without duplicates', async () => {
      const entries = await registryManager.listEntries();
      
      expect(entries).toHaveLength(3);
      
      const repos = entries.map(e => e.repo).sort();
      expect(repos).toEqual([
        'BurntSushi/ripgrep',
        'sharkdp/bat',
        'sharkdp/fd'
      ]);
    });

    it('should find entries by repository', async () => {
      const sharkdpEntries = await registryManager.findByRepo('sharkdp/fd');
      
      expect(sharkdpEntries).toHaveLength(1);
      expect(sharkdpEntries[0].binaryName).toBe('fd');
    });

    it('should return empty array for non-existent repository', async () => {
      const entries = await registryManager.findByRepo('nonexistent/repo');
      expect(entries).toHaveLength(0);
    });

    it('should return correct statistics', async () => {
      const stats = await registryManager.getStats();
      
      expect(stats.totalEntries).toBe(3);
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('Error handling and recovery', () => {
    const platform: Platform = { os: 'linux', arch: 'x86_64' };

    it('should handle corrupted registry file', async () => {
      // First create a valid registry
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      // Corrupt the registry file
      const registryPath = registryManager.getRegistryPath();
      await fs.writeFile(registryPath, 'invalid json', 'utf8');
      
      // Clear cache to force reload
      registryManager.clearCache();
      
      // Should create new registry
      const registry = await registryManager.load();
      expect(registry.entries).toEqual({});
    });

    it('should restore from backup when registry is corrupted', async () => {
      // Create a valid registry
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      const registryPath = registryManager.getRegistryPath();
      const backupPath = `${registryPath}.backup`;
      
      // Simulate backup exists
      const validRegistry = await fs.readFile(registryPath, 'utf8');
      await fs.writeFile(backupPath, validRegistry, 'utf8');
      
      // Corrupt main registry
      await fs.writeFile(registryPath, 'invalid json', 'utf8');
      
      // Clear cache to force reload
      registryManager.clearCache();
      
      // Should restore from backup
      const registry = await registryManager.load();
      expect(registry.entries['rg']).toBeDefined();
    });

    it('should repair registry by removing invalid entries', async () => {
      // Create a valid registry first
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      // Manually inject invalid entry
      const registry = await registryManager.load();
      registry.entries['invalid'] = { invalid: 'data' } as any;
      
      const removedCount = await registryManager.repairRegistry();
      
      expect(removedCount).toBe(1);
      
      const cleanedRegistry = await registryManager.load();
      expect(cleanedRegistry.entries['invalid']).toBeUndefined();
      expect(cleanedRegistry.entries['rg']).toBeDefined();
    });

    it('should restore from backup manually', async () => {
      // Create initial registry
      await registryManager.addEntry('rg', 'BurntSushi/ripgrep', 'v14.1.1', platform);
      
      // Create backup manually  
      const registryPath = registryManager.getRegistryPath();
      const backupPath = `${registryPath}.backup`;
      await fs.copyFile(registryPath, backupPath);
      
      // Corrupt main registry
      await fs.writeFile(registryPath, 'corrupted', 'utf8');
      registryManager.clearCache();
      
      // Restore from backup
      const restored = await registryManager.restoreFromBackup();
      expect(restored).toBe(true);
      
      // Verify restoration
      const entry = await registryManager.getEntry('rg');
      expect(entry).not.toBeNull();
      expect(entry!.repo).toBe('BurntSushi/ripgrep');
    });
  });
});