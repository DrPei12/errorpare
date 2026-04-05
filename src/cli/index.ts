#!/usr/bin/env node

// ErrorPare - CLI Entry Point (Phase 2)

import { Command } from 'commander';
import chalk from 'chalk';
import { createRunCommand } from './commands/run.js';
import { createInitCommand } from './commands/init.js';
import { createCompressCommand } from './commands/compress.js';
import { createConfigCommand } from './commands/config.js';
import { ERRORPARE_VERSION } from '../utils/constants.js';

const program = new Command();

program
  .name('errorpare')
  .description('Compress noisy stderr into model-friendly debugging output')
  .version(ERRORPARE_VERSION);

program.addCommand(createRunCommand());
program.addCommand(createInitCommand());
program.addCommand(createCompressCommand());
program.addCommand(createConfigCommand());

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled rejection:'), reason);
  process.exit(1);
});

program.parse();
