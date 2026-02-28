// ErrorPare - CLI Entry Point

import { Command } from 'commander';
import chalk from 'chalk';
import { createRunCommand } from './commands/run.js';
import { createInitCommand } from './commands/init.js';
import { createCompressCommand } from './commands/compress.js';
import { ERRORPARE_VERSION } from '../utils/constants.js';

const program = new Command();

program
  .name('errorpare')
  .description('AI报错压缩工具 - 让Claude/Gemini更高效')
  .version(ERRORPARE_VERSION);

// Add commands
program.addCommand(createRunCommand());
program.addCommand(createInitCommand());
program.addCommand(createCompressCommand());

// Handle errors
process.on('uncaughtException', (error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('Unhandled rejection:'), reason);
  process.exit(1);
});

// Parse and execute
program.parse();
