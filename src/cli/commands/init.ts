// ErrorPare - CLI 'init' command

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { CONFIG_FILES } from '../../utils/constants.js';

interface InitOptions {
  force?: boolean;
}

export function createInitCommand(): Command {
  const command = new Command('init');
  
  command
    .description('Initialize ErrorPare integration files for AI tools')
    .option('-f, --force', 'Overwrite existing files')
    .action(async (options: InitOptions) => {
      await initializeErrorPare(options);
    });
  
  return command;
}

async function initializeErrorPare(options: InitOptions): Promise<void> {
  const projectRoot = process.cwd();
  const created: string[] = [];
  const skipped: string[] = [];
  
  // .errorparerc (ErrorPare config)
  const errorpareRcPath = path.join(projectRoot, CONFIG_FILES.ERRORPARERC);
  if (!fs.existsSync(errorpareRcPath) || options.force) {
    fs.writeFileSync(errorpareRcPath, JSON.stringify({
      version: '1.0.0',
      settings: {
        maxLines: 1000,
        gitAware: true,
        output: 'text',
      },
    }, null, 2));
    created.push(CONFIG_FILES.ERRORPARERC);
  } else {
    skipped.push(CONFIG_FILES.ERRORPARERC);
  }
  
  // .cursorrules (Cursor)
  const cursorRulesPath = path.join(projectRoot, CONFIG_FILES.CURSOR);
  if (!fs.existsSync(cursorRulesPath) || options.force) {
    fs.writeFileSync(cursorRulesPath, `# ErrorPare Integration

## Rules
- When running build/test commands, ALWAYS use \`errorpare run "..."\` instead of direct commands
- Example: Use \`errorpare run "npm run build"\` instead of \`npm run build\`
- This provides compressed error context, reducing token usage by 60-90%

## Commands
- errorpare run "<command>" - Execute with error compression
- errorpare run "<command>" --analyze - Execute with LLM analysis
- errorpare run "<command>" --local - Local compression only (no API)
- errorpare run "<command>" --json - Output in JSON format
`);
    created.push(CONFIG_FILES.CURSOR);
  } else {
    skipped.push(CONFIG_FILES.CURSOR);
  }
  
  // .claude.md (Claude Code)
  const claudeMdPath = path.join(projectRoot, CONFIG_FILES.CLAUDE);
  if (!fs.existsSync(claudeMdPath) || options.force) {
    fs.writeFileSync(claudeMdPath, `# ErrorPare Integration

When you need to run build or test commands, use ErrorPare to compress errors:

GOOD: \`errorpare run "npm run build"\`
BAD:  \`npm run build\`

ErrorPare automatically:
1. Collapses third-party stack frames (node_modules, etc.)
2. Deduplicates similar errors
3. Masks variables (IPs, paths, UUIDs)
4. Optionally runs LLM analysis

This reduces token usage by 60-90% and gives you cleaner error context.
`);
    created.push(CONFIG_FILES.CLAUDE);
  } else {
    skipped.push(CONFIG_FILES.CLAUDE);
  }
  
  // Output results
  console.log('');
  
  if (created.length > 0) {
    console.log(chalk.green('✅ Created:'));
    for (const file of created) {
      console.log(chalk.green(`   ${file}`));
    }
  }
  
  if (skipped.length > 0) {
    console.log(chalk.yellow('⏭️  Skipped (already exists):'));
    for (const file of skipped) {
      console.log(chalk.yellow(`   ${file}`));
    }
  }
  
  console.log('');
  console.log(chalk.cyan('Next steps:'));
  console.log(chalk.cyan('1. Restart your AI assistant'));
  console.log(chalk.cyan('2. ErrorPare will now automatically compress errors before analysis'));
  console.log('');
}
