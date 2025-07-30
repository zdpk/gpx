#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { GPXRunner } from './runner.js';
import { ConfigManager } from './config.js';

const program = new Command();

program
  .name('gpx')
  .description('GitHub Package eXecutor - Run GitHub release binaries directly')
  .version('0.1.0');

// Main command: gpx owner/repo [args...]
program
  .argument('<repo>', 'GitHub repository in owner/repo format')
  .argument('[args...]', 'Arguments to pass to the binary')
  .option('--no-cache', 'Skip cache, always download')
  .option('--update', 'Force update check')
  .option('--verbose', 'Enable verbose output')
  .option('--timeout <ms>', 'Network timeout in milliseconds')
  .action(async (repo: string, args: string[], options) => {
    try {
      const runner = new GPXRunner();
      await runner.run(repo, args, options);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Config commands
const configCmd = program
  .command('config')
  .description('Configuration management');

configCmd
  .command('list')
  .description('Show current configuration')
  .action(async () => {
    try {
      const configManager = new ConfigManager();
      const config = await configManager.getConfig();
      console.log(chalk.blue('Current configuration:'));
      console.log(JSON.stringify(config, null, 2));
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

configCmd
  .command('path')
  .description('Show configuration file path')
  .action(() => {
    const configManager = new ConfigManager();
    console.log(configManager.getConfigPath());
  });

// Cache commands
const cacheCmd = program
  .command('cache')
  .description('Cache management');

cacheCmd
  .command('dir')
  .description('Show cache directory path')
  .action(() => {
    const configManager = new ConfigManager();
    console.log(configManager.getCacheDir());
  });

cacheCmd
  .command('clean')
  .description('Clean cache directory')
  .option('--dry-run', 'Show what would be deleted without actually deleting')
  .action(async (options) => {
    try {
      const runner = new GPXRunner();
      await runner.cleanCache(options.dryRun);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Global error handler
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled Rejection:'), reason);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log(chalk.yellow('\nOperation cancelled by user'));
  process.exit(0);
});

program.parse();