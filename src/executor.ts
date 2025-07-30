import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';

export interface ExecutionOptions {
  args: string[];
  cwd?: string;
  env?: Record<string, string>;
  stdio?: 'inherit' | 'pipe' | 'ignore';
}

export class BinaryExecutor {
  /**
   * Execute a binary with given arguments
   */
  async execute(binaryPath: string, options: ExecutionOptions): Promise<number> {
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: options.stdio || 'inherit',
      };

      const child = spawn(binaryPath, options.args, spawnOptions);

      child.on('error', (error) => {
        if (error.message.includes('ENOENT')) {
          reject(new Error(`Binary not found or not executable: ${binaryPath}`));
        } else if (error.message.includes('EACCES')) {
          reject(new Error(`Permission denied executing binary: ${binaryPath}`));
        } else {
          reject(new Error(`Failed to execute binary: ${error.message}`));
        }
      });

      child.on('close', (code) => {
        resolve(code || 0);
      });

      // Handle process termination signals
      process.on('SIGINT', () => {
        child.kill('SIGINT');
      });

      process.on('SIGTERM', () => {
        child.kill('SIGTERM');
      });
    });
  }

  /**
   * Execute a binary and capture output
   */
  async executeWithOutput(
    binaryPath: string, 
    options: ExecutionOptions
  ): Promise<{ code: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const spawnOptions: SpawnOptions = {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: 'pipe',
      };

      const child = spawn(binaryPath, options.args, spawnOptions);
      
      let stdout = '';
      let stderr = '';

      if (child.stdout) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });
      }

      if (child.stderr) {
        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('error', (error) => {
        reject(new Error(`Failed to execute binary: ${error.message}`));
      });

      child.on('close', (code) => {
        resolve({
          code: code || 0,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
        });
      });
    });
  }

  /**
   * Validate that a binary is executable
   */
  async validateBinary(binaryPath: string): Promise<boolean> {
    try {
      const result = await this.executeWithOutput(binaryPath, { 
        args: ['--version'].concat(process.platform === 'win32' ? [] : ['2>/dev/null', '||', 'echo', 'OK']) 
      });
      
      // If we get any response (even error), the binary is at least executable
      return result.code !== 127; // 127 = command not found
    } catch (error) {
      // Check if it's a permission or not found error
      if (error instanceof Error) {
        return !error.message.includes('ENOENT') && !error.message.includes('EACCES');
      }
      return false;
    }
  }

  /**
   * Get binary version if supported
   */
  async getBinaryVersion(binaryPath: string): Promise<string | null> {
    const versionFlags = ['--version', '-v', '-V', 'version'];
    
    for (const flag of versionFlags) {
      try {
        const result = await this.executeWithOutput(binaryPath, { args: [flag] });
        
        if (result.code === 0 && (result.stdout || result.stderr)) {
          const output = result.stdout || result.stderr;
          const lines = output.split('\n');
          
          // Return first non-empty line that might contain version info
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && (trimmed.includes('.') || /\d/.test(trimmed))) {
              return trimmed;
            }
          }
        }
      } catch {
        // Try next flag
        continue;
      }
    }
    
    return null;
  }

  /**
   * Check if binary supports help
   */
  async getBinaryHelp(binaryPath: string): Promise<string | null> {
    const helpFlags = ['--help', '-h', 'help'];
    
    for (const flag of helpFlags) {
      try {
        const result = await this.executeWithOutput(binaryPath, { args: [flag] });
        
        if ((result.code === 0 || result.code === 1) && (result.stdout || result.stderr)) {
          return result.stdout || result.stderr;
        }
      } catch {
        // Try next flag
        continue;
      }
    }
    
    return null;
  }

  /**
   * Ensure binary has execute permissions (Unix-like systems)
   */
  async ensureExecutable(binaryPath: string): Promise<void> {
    if (process.platform === 'win32') {
      return; // Windows doesn't use Unix permissions
    }

    const { promises: fs } = require('fs');
    
    try {
      const stats = await fs.stat(binaryPath);
      const hasExecutePermission = (stats.mode & parseInt('111', 8)) !== 0;
      
      if (!hasExecutePermission) {
        await fs.chmod(binaryPath, stats.mode | parseInt('755', 8));
      }
    } catch (error) {
      throw new Error(`Failed to set execute permissions: ${error}`);
    }
  }
}