import { GitHubClient } from '../github';

describe('GitHubClient', () => {
  describe('parseRepo', () => {
    it('should parse valid repository strings', () => {
      const result = GitHubClient.parseRepo('owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should handle repositories with hyphens and underscores', () => {
      const result = GitHubClient.parseRepo('my-org/my_repo-name');
      expect(result).toEqual({ owner: 'my-org', repo: 'my_repo-name' });
    });

    it('should handle repositories with dots', () => {
      const result = GitHubClient.parseRepo('microsoft/vscode.dev');
      expect(result).toEqual({ owner: 'microsoft', repo: 'vscode.dev' });
    });

    it('should throw error for invalid format', () => {
      expect(() => GitHubClient.parseRepo('invalid')).toThrow('Repository must be in format "owner/repo"');
      expect(() => GitHubClient.parseRepo('too/many/parts')).toThrow('Repository must be in format "owner/repo"');
      expect(() => GitHubClient.parseRepo('')).toThrow('Repository must be in format "owner/repo"');
      expect(() => GitHubClient.parseRepo('/')).toThrow('Repository must be in format "owner/repo"');
    });

    it('should throw error for invalid characters', () => {
      expect(() => GitHubClient.parseRepo('owner$/repo')).toThrow('Invalid repository format');
      expect(() => GitHubClient.parseRepo('owner/repo@tag')).toThrow('Invalid repository format');
      expect(() => GitHubClient.parseRepo('owner/repo with spaces')).toThrow('Invalid repository format');
    });
  });

  describe('GitHubClient instance', () => {
    let client: GitHubClient;

    beforeEach(() => {
      client = new GitHubClient('test-agent/1.0.0', 5000);
    });

    it('should create instance with default values', () => {
      const defaultClient = new GitHubClient();
      expect(defaultClient).toBeInstanceOf(GitHubClient);
    });

    it('should create instance with custom values', () => {
      expect(client).toBeInstanceOf(GitHubClient);
    });

    // Note: Actual API tests would require network access or mocking
    // These would be better as integration tests
    it('should have rate limit method', () => {
      expect(typeof client.getRateLimit).toBe('function');
    });

    it('should have release methods', () => {
      expect(typeof client.getLatestRelease).toBe('function');
      expect(typeof client.getAllReleases).toBe('function');
      expect(typeof client.getReleaseByTag).toBe('function');
    });
  });
});