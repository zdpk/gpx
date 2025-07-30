import * as os from 'os';
import { Platform, GitHubAsset } from './types.js';

export class PlatformMatcher {
  /**
   * Get current platform information
   */
  static getCurrentPlatform(): Platform {
    const platform = os.platform();
    const arch = os.arch();

    return {
      os: this.normalizeOS(platform),
      arch: this.normalizeArch(arch),
    };
  }

  /**
   * Normalize Node.js platform names to common naming conventions
   */
  private static normalizeOS(platform: string): string {
    switch (platform) {
      case 'darwin':
        return 'darwin';
      case 'linux':
        return 'linux';
      case 'win32':
        return 'windows';
      default:
        return platform;
    }
  }

  /**
   * Normalize Node.js architecture names to common naming conventions
   */
  private static normalizeArch(arch: string): string {
    switch (arch) {
      case 'x64':
        return 'x86_64';
      case 'arm64':
        return 'aarch64';
      case 'ia32':
        return 'i686';
      case 'arm':
        return 'armv7';
      default:
        return arch;
    }
  }

  /**
   * Find the best matching asset for the current platform
   */
  static findMatchingAsset(assets: GitHubAsset[], platform: Platform = this.getCurrentPlatform()): GitHubAsset | null {
    // Define platform patterns to match
    const osPatterns = this.getOSPatterns(platform.os);
    const archPatterns = this.getArchPatterns(platform.arch);

    // Score each asset based on how well it matches
    const scoredAssets = assets
      .map(asset => ({
        asset,
        score: this.scoreAsset(asset, osPatterns, archPatterns),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredAssets.length > 0 ? scoredAssets[0].asset : null;
  }

  /**
   * Get all possible OS patterns for matching
   */
  private static getOSPatterns(os: string): string[] {
    switch (os) {
      case 'darwin':
        return ['darwin', 'apple-darwin', 'macos', 'osx'];
      case 'linux':
        return ['linux', 'linux-gnu', 'linux-musl', 'unknown-linux-gnu', 'unknown-linux-musl'];
      case 'windows':
        return ['windows', 'win', 'pc-windows-msvc', 'pc-windows-gnu'];
      default:
        return [os];
    }
  }

  /**
   * Get all possible architecture patterns for matching
   */
  private static getArchPatterns(arch: string): string[] {
    switch (arch) {
      case 'x86_64':
        return ['x86_64', 'amd64', 'x64'];
      case 'aarch64':
        return ['aarch64', 'arm64'];
      case 'i686':
        return ['i686', '386', 'i386', 'x86'];
      case 'armv7':
        return ['armv7', 'arm'];
      default:
        return [arch];
    }
  }

  /**
   * Score an asset based on how well it matches the platform
   */
  private static scoreAsset(asset: GitHubAsset, osPatterns: string[], archPatterns: string[]): number {
    const filename = asset.name.toLowerCase();
    
    // Skip source code archives
    if (filename.includes('source') || filename === 'source.tar.gz' || filename === 'source.zip') {
      return 0;
    }

    let score = 0;

    // Check OS match
    const osMatch = osPatterns.some(pattern => filename.includes(pattern.toLowerCase()));
    if (!osMatch) return 0; // Must match OS

    score += 10; // Base score for OS match

    // Check architecture match
    const archMatch = archPatterns.some(pattern => filename.includes(pattern.toLowerCase()));
    if (archMatch) {
      score += 10;
    }

    // Prefer binary archives over installers
    if (filename.endsWith('.tar.gz') || filename.endsWith('.zip')) {
      score += 5;
    }

    // Prefer specific formats
    if (filename.endsWith('.tar.gz')) {
      score += 2; // Slightly prefer tar.gz for Unix-like systems
    }

    // Penalize checksums and signatures
    if (filename.includes('sha256') || filename.includes('sig') || filename.includes('asc')) {
      return 0;
    }

    // Penalize development/debug builds
    if (filename.includes('debug') || filename.includes('dev')) {
      score -= 5;
    }

    return score;
  }

  /**
   * Get all available platforms from assets
   */
  static getAvailablePlatforms(assets: GitHubAsset[]): string[] {
    const platforms = new Set<string>();

    for (const asset of assets) {
      const filename = asset.name.toLowerCase();
      
      // Skip non-binary assets
      if (filename.includes('source') || filename.includes('sha256') || 
          filename.includes('sig') || filename.includes('asc')) {
        continue;
      }

      // Extract platform information
      const parts = filename.split(/[-_]/);
      for (let i = 0; i < parts.length - 1; i++) {
        const current = parts[i];
        const next = parts[i + 1];
        
        // Look for OS-arch patterns
        if (this.isOSPattern(current) && this.isArchPattern(next)) {
          platforms.add(`${current}-${next}`);
        }
      }
    }

    return Array.from(platforms).sort();
  }

  private static isOSPattern(part: string): boolean {
    const osPatterns = ['darwin', 'linux', 'windows', 'win', 'macos', 'osx', 'apple'];
    return osPatterns.some(os => part.includes(os));
  }

  private static isArchPattern(part: string): boolean {
    const archPatterns = ['x86_64', 'amd64', 'x64', 'aarch64', 'arm64', 'i686', '386', 'armv7', 'arm'];
    return archPatterns.some(arch => part.includes(arch));
  }

  /**
   * Validate if current platform is supported by available assets
   */
  static isPlatformSupported(assets: GitHubAsset[], platform: Platform = this.getCurrentPlatform()): boolean {
    return this.findMatchingAsset(assets, platform) !== null;
  }
}