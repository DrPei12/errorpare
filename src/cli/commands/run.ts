// ErrorPare - CLI 'run' command

import { Command } from 'commander';
import { CommandExecutor, SimpleCommandExecutor } from '../../core/executor/command-executor.js';
import { Compressor } from '../../core/compressor.js';
import type { ErrorPareOptions } from '../../types/index.js';
import { findProjectRoot as getProjectRoot } from '../../utils/git.js';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

interface RunOptions {
  lang?: string;
  local?: boolean;
  analyze?: boolean;
  json?: boolean;
  maxLines?: number;
  debug?: boolean;
  projectRoot?: string;
}

export function createRunCommand(): Command {
  const command = new Command('run');
  
  command
    .description('Execute a command with error compression')
    .argument('<command>', 'Command to execute')
    .option('-l, --lang <language>', 'Target language (typescript, python, go, java, rust, cpp)')
    .option('--local', 'Local compression only (no LLM API)', false)
    .option('--analyze', 'Enable LLM analysis (requires API key)', false)
    .option('--json', 'Output in JSON format', false)
    .option('--max-lines <number>', 'Maximum lines to keep', '1000')
    .option('--debug', 'Enable debug output', false)
    .option('-C, --project-root <directory>', 'Project root directory')
    .action(async (cmd: string, options: RunOptions) => {
      await executeWithCompression(cmd, options);
    });
  
  return command;
}

async function executeWithCompression(cmd: string, options: RunOptions): Promise<void> {
  const startTime = Date.now();
  
  // Parse options
  const maxLines = parseInt(String(options.maxLines) || '1000', 10);
  const projectRoot = options.projectRoot || getProjectRoot();
  const language = options.lang as ErrorPareOptions['language'];
  
  if (options.debug) {
    console.log(chalk.gray(`[ErrorPare] Executing: ${cmd}`));
    console.log(chalk.gray(`[ErrorPare] Project root: ${projectRoot}`));
    console.log(chalk.gray(`[ErrorPare] Language: ${language || 'auto-detect'}`));
  }
  
  // Execute command
  let executor: CommandExecutor | SimpleCommandExecutor;
  let result: { stdout: string; stderr: string; exitCode: number };
  
  try {
    // Try PTY first, fallback to simple
    executor = new CommandExecutor({ cwd: projectRoot });
    result = await executor.execute(cmd);
  } catch {
    // Fallback to simple executor
    if (options.debug) {
      console.log(chalk.gray('[ErrorPare] Falling back to simple executor'));
    }
    executor = new SimpleCommandExecutor();
    result = await executor.execute(cmd, projectRoot);
  }
  
  // Combine stdout and stderr for compression
  const errorOutput = result.stderr || result.stdout;
  
  if (options.debug) {
    console.log(chalk.gray(`[ErrorPare] Exit code: ${result.exitCode}`));
    console.log(chalk.gray(`[ErrorPare] Output length: ${errorOutput.length} chars`));
  }
  
  // Compress errors
  const compressorOptions: ErrorPareOptions = {
    maxLines,
    gitAware: true,
    language: language as any,
    projectRoot,
    output: options.json ? 'json' : 'text',
  };
  
  const compressor = new Compressor(compressorOptions);
  const compressed = compressor.compress(errorOutput, cmd, result.exitCode);
  
  const totalTime = Date.now() - startTime;
  
  // Output results
  if (options.json) {
    console.log(JSON.stringify({
      ...compressed,
      timing: {
        ...compressed.timing,
        total: totalTime,
      },
    }, null, 2));
  } else {
    // Text output
    if (result.exitCode !== 0) {
      console.log(compressor.formatAsText(compressed));
    } else {
      // Success - just pass through
      console.log(result.stdout);
    }
  }
  
  // Exit with original code
  process.exit(result.exitCode);
}

/**
 * Find project root by looking for package.json, Cargo.toml, etc.
 */
function findProjectRoot(): string {
  let current = process.cwd();
  const root = path.parse(current).root;
  
  while (current !== root) {
    const markers = [
      'package.json',
      'Cargo.toml',
      'go.mod',
      'pom.xml',
      'build.gradle',
      '.git',
      'pyproject.toml',
      'requirements.txt',
    ];
    
    for (const marker of markers) {
      if (fs.existsSync(path.join(current, marker))) {
        return current;
      }
    }
    
    current = path.dirname(current);
  }
  
  return process.cwd();
}
