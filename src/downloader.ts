import axios from 'axios';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as tar from 'tar';
import * as yauzl from 'yauzl';
import { GitHubAsset } from './types.js';

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percentage: number;
  speed: number; // bytes per second
}

export class Downloader {
  private timeout: number;
  private retries: number;

  constructor(timeout: number = 30000, retries: number = 3) {
    this.timeout = timeout;
    this.retries = retries;
  }

  /**
   * Download an asset to a temporary file
   */
  async downloadAsset(
    asset: GitHubAsset,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'gpx-'));
    const tempFile = path.join(tempDir, asset.name);

    let attempt = 0;
    while (attempt < this.retries) {
      try {
        await this.downloadWithProgress(asset.browser_download_url, tempFile, onProgress);
        return tempFile;
      } catch (error) {
        attempt++;
        if (attempt >= this.retries) {
          // Clean up temp file on final failure
          try {
            await fs.unlink(tempFile);
            await fs.rmdir(tempDir);
          } catch {
            // Ignore cleanup errors
          }
          throw error;
        }
        // Wait before retry with exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    throw new Error('Download failed after all retries');
  }

  /**
   * Download file with progress tracking
   */
  private async downloadWithProgress(
    url: string,
    filePath: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream',
      timeout: this.timeout,
      headers: {
        'User-Agent': 'gpx/0.1.0',
      },
    });

    const totalSize = parseInt(response.headers['content-length'] || '0', 10);
    let downloadedSize = 0;
    const startTime = Date.now();

    const writer = require('fs').createWriteStream(filePath);

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        downloadedSize += chunk.length;
        
        if (onProgress && totalSize > 0) {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = elapsed > 0 ? downloadedSize / elapsed : 0;
          
          onProgress({
            downloaded: downloadedSize,
            total: totalSize,
            percentage: (downloadedSize / totalSize) * 100,
            speed,
          });
        }
      });

      response.data.on('error', reject);
      writer.on('error', reject);
      writer.on('close', resolve);

      response.data.pipe(writer);
    });
  }

  /**
   * Extract archive to destination directory
   */
  async extractArchive(archivePath: string, destDir: string): Promise<void> {
    await fs.mkdir(destDir, { recursive: true });

    const ext = path.extname(archivePath).toLowerCase();
    
    if (ext === '.gz' || archivePath.endsWith('.tar.gz')) {
      await this.extractTarGz(archivePath, destDir);
    } else if (ext === '.zip') {
      await this.extractZip(archivePath, destDir);
    } else {
      throw new Error(`Unsupported archive format: ${ext}`);
    }
  }

  /**
   * Extract tar.gz archive
   */
  private async extractTarGz(archivePath: string, destDir: string): Promise<void> {
    await tar.extract({
      file: archivePath,
      cwd: destDir,
      // Don't strip directories - some archives like zoxide are flat
    });
  }

  /**
   * Extract zip archive
   */
  private async extractZip(archivePath: string, destDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
      yauzl.open(archivePath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          reject(err);
          return;
        }

        if (!zipfile) {
          reject(new Error('Failed to open zip file'));
          return;
        }

        zipfile.readEntry();

        zipfile.on('entry', (entry) => {
          const fileName = entry.fileName;
          const outputPath = path.join(destDir, fileName);

          if (/\/$/.test(fileName)) {
            // Directory entry
            fs.mkdir(outputPath, { recursive: true })
              .then(() => zipfile.readEntry())
              .catch(reject);
          } else {
            // File entry
            zipfile.openReadStream(entry, (err, readStream) => {
              if (err) {
                reject(err);
                return;
              }

              if (!readStream) {
                reject(new Error('Failed to create read stream'));
                return;
              }

              // Ensure directory exists
              fs.mkdir(path.dirname(outputPath), { recursive: true })
                .then(() => {
                  const writeStream = require('fs').createWriteStream(outputPath);
                  readStream.pipe(writeStream);
                  
                  writeStream.on('close', () => {
                    zipfile.readEntry();
                  });
                  
                  writeStream.on('error', reject);
                })
                .catch(reject);
            });
          }
        });

        zipfile.on('end', resolve);
        zipfile.on('error', reject);
      });
    });
  }

  /**
   * Calculate file checksum
   */
  async calculateChecksum(filePath: string, algorithm: string = 'sha256'): Promise<string> {
    const hash = crypto.createHash(algorithm);
    const stream = require('fs').createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('error', reject);
      stream.on('data', (chunk: Buffer) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }

  /**
   * Find executable files in directory
   */
  async findExecutables(dir: string): Promise<string[]> {
    const executables: string[] = [];
    
    console.log(`Scanning directory for executables: ${dir}`);
    
    // Debug: show all files in the directory
    try {
      const allFiles = await fs.readdir(dir, { withFileTypes: true });
      console.log('All files in directory:');
      allFiles.forEach(file => {
        console.log(`  ${file.isDirectory() ? 'DIR' : 'FILE'}: ${file.name}`);
      });
    } catch (e) {
      console.log('Error listing directory:', e);
    }
    
    const scan = async (currentDir: string): Promise<void> => {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            const ext = path.extname(fullPath).toLowerCase();
            const basename = path.basename(fullPath).toLowerCase();
            
            console.log(`Checking file: ${entry.name} (ext: ${ext})`);
            
            // Check if file is executable (Unix permissions)
            if (process.platform !== 'win32') {
              // Skip obviously non-executable files
              if (ext === '.md' || ext === '.txt' || ext === '.json' || ext === '.yml' || ext === '.yaml' || 
                  ext === '.xml' || ext === '.html' || ext === '.css' || ext === '.js' || ext === '.ts' ||
                  ext === '.py' || ext === '.sh' || ext === '.bash' || ext === '.fish' || ext === '.zsh' ||
                  ext === '.1' || ext === '.2' || ext === '.3' || ext === '.4' || ext === '.5' ||
                  basename.startsWith('readme') || basename.startsWith('license') || 
                  basename.startsWith('changelog') || basename.startsWith('copying')) {
                console.log(`Skipping non-executable file: ${entry.name}`);
                continue;
              }
              
              if (stats.mode & parseInt('111', 8)) { // Check execute permissions
                console.log(`Found executable (has permissions): ${entry.name}`);
                executables.push(fullPath);
              } else {
                // Only make potentially executable files executable (binaries without extension)
                if (ext === '' || ext === '.bin') {
                  console.log(`Making executable: ${entry.name}`);
                  await this.makeExecutable(fullPath);
                  executables.push(fullPath);
                } else {
                  console.log(`Skipping file without execute permission: ${entry.name}`);
                }
              }
            } else {
              // On Windows, check file extension
              if (ext === '.exe' || ext === '.bat' || ext === '.cmd') {
                executables.push(fullPath);
              }
            }
          } catch {
            // Ignore stat errors
          }
        }
      }
    };

    await scan(dir);
    return executables;
  }

  /**
   * Make file executable (Unix/Linux/macOS)
   */
  async makeExecutable(filePath: string): Promise<void> {
    if (process.platform !== 'win32') {
      const stats = await fs.stat(filePath);
      await fs.chmod(filePath, stats.mode | parseInt('755', 8));
    }
  }

  /**
   * Clean up temporary files
   */
  async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
        // Try to remove parent directory if empty
        const parentDir = path.dirname(filePath);
        try {
          await fs.rmdir(parentDir);
        } catch {
          // Ignore if directory is not empty
        }
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}