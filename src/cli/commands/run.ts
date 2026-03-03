// ErrorPare - CLI 'run' command (Phase 2: with --analyze support)

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { ConfigManager } from '../../core/config/config-manager.js';
import { RuleEngine } from '../../core/rules/rule-engine.js';
import { LLMAnalyzer } from '../../core/analysis/llm/llm-analyzer.js';

interface RunOptions {
  analyze?: boolean;
  local?: boolean;
  json?: boolean;
  output?: string;
}

export function createRunCommand(): Command {
  const command = new Command('run');
  
  command
    .description('Execute command with error compression and optional analysis')
    .argument('<command>', 'Command to execute')
    .option('-a, --analyze', 'Enable LLM-powered root cause analysis')
    .option('--local', 'Local compression only (no API calls)')
    .option('--json', 'Output in JSON format')
    .option('-o, --output <file>', 'Write output to file')
    .action(async (cmd: string, options: RunOptions) => {
      await runCommand(cmd, options);
    });
  
  return command;
}

async function runCommand(commandStr: string, options: RunOptions): Promise<void> {
  const configManager = new ConfigManager();
  const config = configManager.getConfig();
  
  // Check if analyze mode is requested but not configured
  if (options.analyze && !configManager.isLLMConfigured()) {
    console.log(chalk.yellow('⚠️  Analyze mode requires LLM configuration'));
    console.log(chalk.gray('   Run: errorpare init --analyze'));
    console.log('');
    console.log(chalk.gray('Falling back to local analysis...'));
    console.log('');
  }
  
  console.log(chalk.cyan('🦞 ErrorPare'));
  console.log(chalk.gray(`Executing: ${commandStr}`));
  console.log(chalk.gray(`Mode: ${options.analyze && configManager.isLLMConfigured() ? 'analyze' : 'compress'}`));
  console.log('');
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');
  
  // Execute command
  const result = await executeCommand(commandStr);
  
  if (result.success) {
    console.log(chalk.green('✅ Command succeeded'));
    if (result.output) {
      console.log(result.output);
    }
    return;
  }
  
  // Command failed - compress and analyze error
  console.log(chalk.red('❌ Command failed'));
  console.log('');
  
  const errorText = result.stderr || result.stdout;
  
  // Rule-based analysis
  const ruleEngine = new RuleEngine();
  const matches = ruleEngine.match(errorText);
  
  if (options.json) {
    // JSON output
    const output = {
      success: false,
      error: errorText,
      matches: matches.map(m => ({
        ruleId: m.rule.id,
        name: m.rule.name,
        category: m.rule.category,
        confidence: m.confidence,
        suggestion: m.rule.suggestion,
      })),
    };
    console.log(JSON.stringify(output, null, 2));
    return;
  }
  
  // Text output
  console.log(chalk.red('─'.repeat(50)));
  console.log(chalk.red('ERROR SUMMARY'));
  console.log(chalk.red('─'.repeat(50)));
  console.log('');
  
  if (matches.length > 0) {
    const topMatch = matches[0];
    console.log(chalk.yellow(`📍 ${topMatch.rule.name}`));
    console.log(chalk.gray(`   Category: ${topMatch.rule.category}`));
    console.log(chalk.gray(`   Confidence: ${(topMatch.confidence * 100).toFixed(0)}%`));
    console.log('');
    console.log(chalk.cyan('💡 Suggestion:'));
    console.log(chalk.gray(`   ${topMatch.rule.suggestion}`));
    console.log('');
    
    if (matches.length > 1) {
      console.log(chalk.gray(`   +${matches.length - 1} more match(es)`));
      console.log('');
    }
  }
  
  // LLM Analysis (if requested and configured)
  if (options.analyze && configManager.isLLMConfigured()) {
    console.log(chalk.gray('─'.repeat(50)));
    console.log('');
    
    try {
      const analyzer = new LLMAnalyzer(config.llm);
      const analysis = await analyzer.analyze(errorText);
      
      console.log(chalk.magenta('🤖 AI ANALYSIS'));
      console.log(chalk.magenta('─'.repeat(50)));
      console.log('');
      console.log(chalk.yellow('Root Cause:'));
      console.log(chalk.gray(`  ${analysis.rootCause}`));
      console.log('');
      console.log(chalk.yellow('Category:'));
      console.log(chalk.gray(`  ${analysis.category}`));
      console.log('');
      console.log(chalk.yellow('Suggestion:'));
      console.log(chalk.gray(`  ${analysis.suggestion}`));
      if (analysis.codeFix) {
        console.log('');
        console.log(chalk.yellow('Code Fix:'));
        console.log(chalk.gray(`  ${analysis.codeFix}`));
      }
      console.log('');
      console.log(chalk.gray(`Model: ${analysis.model}`));
      if (analysis.tokensUsed) {
        console.log(chalk.gray(`Tokens: ${analysis.tokensUsed}`));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  LLM analysis failed:'));
      console.log(chalk.gray(`   ${(error as Error).message}`));
      console.log('');
      console.log(chalk.gray('Falling back to rule-based analysis...'));
    }
  }
  
  console.log(chalk.gray('─'.repeat(50)));
  console.log('');
  console.log(chalk.gray('Full error output:'));
  console.log('');
  console.log(chalk.gray(errorText));
  console.log('');
  
  // Output to file if requested
  if (options.output) {
    const fs = await import('fs');
    fs.writeFileSync(options.output, errorText);
    console.log(chalk.green(`✅ Error output saved to: ${options.output}`));
  }
}

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  output: string;
  code: number;
}

function executeCommand(commandStr: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const [cmd, ...args] = commandStr.split(' ');
    const child = spawn(cmd, args, {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text);
    });
    
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      stderr += text;
      process.stderr.write(chalk.gray(text));
    });
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        stdout,
        stderr,
        output: stdout + stderr,
        code: code || 0,
      });
    });
    
    child.on('error', (error) => {
      resolve({
        success: false,
        stdout: '',
        stderr: error.message,
        output: error.message,
        code: 1,
      });
    });
  });
}
