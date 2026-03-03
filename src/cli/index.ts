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
  .description('AI 报错压缩工具 - 让 Claude/Gemini 更高效')
  .version(ERRORPARE_VERSION);

// Add commands
program.addCommand(createRunCommand());
program.addCommand(createInitCommand());
program.addCommand(createCompressCommand());
program.addCommand(createConfigCommand());

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
