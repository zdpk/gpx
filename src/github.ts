import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { GitHubRelease } from './types.js';

export class GitHubClient {
  private client: AxiosInstance;

  constructor(userAgent: string = 'gpx/0.1.0', timeout: number = 30000) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      timeout,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': userAgent,
      },
    });

    // Add response interceptor for rate limit handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
          const resetTime = error.response.headers['x-ratelimit-reset'];
          const resetDate = new Date(parseInt(resetTime) * 1000);
          throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toLocaleString()}`);
        }
        throw error;
      }
    );
  }

  async getLatestRelease(owner: string, repo: string): Promise<GitHubRelease> {
    try {
      const response: AxiosResponse<GitHubRelease> = await this.client.get(
        `/repos/${owner}/${repo}/releases/latest`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found or has no releases`);
        }
        if (error.response?.status === 403) {
          throw new Error(`Access denied to ${owner}/${repo}. Repository may be private.`);
        }
        throw new Error(`GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  async getAllReleases(owner: string, repo: string, limit: number = 10): Promise<GitHubRelease[]> {
    try {
      const response: AxiosResponse<GitHubRelease[]> = await this.client.get(
        `/repos/${owner}/${repo}/releases`,
        { params: { per_page: limit } }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found`);
        }
        throw new Error(`GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  async getReleaseByTag(owner: string, repo: string, tag: string): Promise<GitHubRelease> {
    try {
      const response: AxiosResponse<GitHubRelease> = await this.client.get(
        `/repos/${owner}/${repo}/releases/tags/${tag}`
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Release ${tag} not found in ${owner}/${repo}`);
        }
        throw new Error(`GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Get repository information to validate it exists
   */
  async getRepository(owner: string, repo: string): Promise<{ name: string; full_name: string; private: boolean }> {
    try {
      const response = await this.client.get(`/repos/${owner}/${repo}`);
      return {
        name: response.data.name,
        full_name: response.data.full_name,
        private: response.data.private,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Repository ${owner}/${repo} not found`);
        }
        throw new Error(`GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }

  /**
   * Parse owner/repo string and validate format
   */
  static parseRepo(repoString: string): { owner: string; repo: string } {
    const parts = repoString.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Repository must be in format "owner/repo"');
    }
    
    const [owner, repo] = parts;
    
    // Basic validation for GitHub username/repo format
    const validPattern = /^[a-zA-Z0-9_.-]+$/;
    if (!validPattern.test(owner) || !validPattern.test(repo)) {
      throw new Error('Invalid repository format. Use alphanumeric characters, hyphens, underscores, and dots only.');
    }
    
    return { owner, repo };
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: Date }> {
    try {
      const response = await this.client.get('/rate_limit');
      const core = response.data.resources.core;
      return {
        limit: core.limit,
        remaining: core.remaining,
        reset: new Date(core.reset * 1000),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`GitHub API error: ${error.response?.status} ${error.response?.statusText}`);
      }
      throw error;
    }
  }
}