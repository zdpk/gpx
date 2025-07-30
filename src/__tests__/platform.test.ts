import { PlatformMatcher } from '../platform';
import { GitHubAsset } from '../types';

describe('PlatformMatcher', () => {
  describe('getCurrentPlatform', () => {
    it('should return normalized platform information', () => {
      const platform = PlatformMatcher.getCurrentPlatform();
      
      expect(platform).toHaveProperty('os');
      expect(platform).toHaveProperty('arch');
      expect(typeof platform.os).toBe('string');
      expect(typeof platform.arch).toBe('string');
    });
  });

  describe('findMatchingAsset', () => {
    const mockAssets: GitHubAsset[] = [
      {
        name: 'ripgrep-14.1.1-x86_64-apple-darwin.tar.gz',
        browser_download_url: 'https://example.com/darwin.tar.gz',
        size: 8425672,
        content_type: 'application/gzip',
      },
      {
        name: 'ripgrep-14.1.1-x86_64-unknown-linux-gnu.tar.gz', 
        browser_download_url: 'https://example.com/linux.tar.gz',
        size: 7234567,
        content_type: 'application/gzip',
      },
      {
        name: 'ripgrep-14.1.1-x86_64-pc-windows-msvc.zip',
        browser_download_url: 'https://example.com/windows.zip',
        size: 9876543,
        content_type: 'application/zip',
      },
      {
        name: 'source.tar.gz',
        browser_download_url: 'https://example.com/source.tar.gz',
        size: 1234567,
        content_type: 'application/gzip',
      },
      {
        name: 'ripgrep-14.1.1.sha256',
        browser_download_url: 'https://example.com/checksum',
        size: 64,
        content_type: 'text/plain',
      },
    ];

    it('should find matching asset for darwin x86_64', () => {
      const platform = { os: 'darwin', arch: 'x86_64' };
      const asset = PlatformMatcher.findMatchingAsset(mockAssets, platform);
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('ripgrep-14.1.1-x86_64-apple-darwin.tar.gz');
    });

    it('should find matching asset for linux x86_64', () => {
      const platform = { os: 'linux', arch: 'x86_64' };
      const asset = PlatformMatcher.findMatchingAsset(mockAssets, platform);
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('ripgrep-14.1.1-x86_64-unknown-linux-gnu.tar.gz');
    });

    it('should find matching asset for windows x86_64', () => {
      const platform = { os: 'windows', arch: 'x86_64' };
      const asset = PlatformMatcher.findMatchingAsset(mockAssets, platform);
      
      expect(asset).not.toBeNull();
      expect(asset?.name).toBe('ripgrep-14.1.1-x86_64-pc-windows-msvc.zip');
    });

    it('should return null for unsupported platform', () => {
      const platform = { os: 'unsupported', arch: 'unknown' };
      const asset = PlatformMatcher.findMatchingAsset(mockAssets, platform);
      
      expect(asset).toBeNull();
    });

    it('should ignore source code and checksum files', () => {
      const sourceOnlyAssets: GitHubAsset[] = [
        {
          name: 'source.tar.gz',
          browser_download_url: 'https://example.com/source.tar.gz',
          size: 1234567,
          content_type: 'application/gzip',
        },
        {
          name: 'checksums.sha256',
          browser_download_url: 'https://example.com/checksums.sha256',
          size: 256,
          content_type: 'text/plain',
        },
      ];

      const platform = { os: 'linux', arch: 'x86_64' };
      const asset = PlatformMatcher.findMatchingAsset(sourceOnlyAssets, platform);
      
      expect(asset).toBeNull();
    });
  });

  describe('getAvailablePlatforms', () => {
    const mockAssets: GitHubAsset[] = [
      {
        name: 'tool-v1.0.0-linux-amd64.tar.gz',
        browser_download_url: 'https://example.com/linux.tar.gz',
        size: 1000000,
        content_type: 'application/gzip',
      },
      {
        name: 'tool-v1.0.0-darwin-arm64.tar.gz',
        browser_download_url: 'https://example.com/darwin.tar.gz', 
        size: 1000000,
        content_type: 'application/gzip',
      },
      {
        name: 'tool-v1.0.0-windows-amd64.zip',
        browser_download_url: 'https://example.com/windows.zip',
        size: 1000000,
        content_type: 'application/zip',
      },
    ];

    it('should extract available platforms from asset names', () => {
      const platforms = PlatformMatcher.getAvailablePlatforms(mockAssets);
      
      expect(platforms).toContain('linux-amd64');
      expect(platforms).toContain('darwin-arm64');
      expect(platforms).toContain('windows-amd64');
      expect(platforms).toHaveLength(3);
    });
  });

  describe('isPlatformSupported', () => {
    const mockAssets: GitHubAsset[] = [
      {
        name: 'tool-linux-x86_64.tar.gz',
        browser_download_url: 'https://example.com/linux.tar.gz',
        size: 1000000,
        content_type: 'application/gzip',
      },
    ];

    it('should return true for supported platform', () => {
      const platform = { os: 'linux', arch: 'x86_64' };
      const isSupported = PlatformMatcher.isPlatformSupported(mockAssets, platform);
      
      expect(isSupported).toBe(true);
    });

    it('should return false for unsupported platform', () => {
      const platform = { os: 'freebsd', arch: 'x86_64' };
      const isSupported = PlatformMatcher.isPlatformSupported(mockAssets, platform);
      
      expect(isSupported).toBe(false);
    });
  });
});