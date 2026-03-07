// ErrorPare - CLI 'run' command (Phase 2: with compression + analysis)

import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { ConfigManager } from '../../core/config/config-manager.js';
import { RuleEngine } from '../../core/rules/rule-engine.js';
import { LLMAnalyzer } from '../../core/analysis/llm/llm-analyzer.js';
import { Compressor } from '../../core/compressor.js';

interface RunOptions {
  analyze?: boolean;
  local?: boolean;
  json?: boolean;
  output?: string;
  noCompress?: boolean;
  contextLines?: number;
}

export function createRunCommand(): Command {
  const command = new Command('run');
  
  command
    .description('Execute command with error compression and optional analysis')
    .argument('<command>', 'Command to execute')
    .option('-a, --analyze', 'Enable LLM-powered root cause analysis')
    .option('--local', 'Local compression only (no API calls)')
    .option('--json', 'Output in JSON format')
    .option('--no-compress', 'Skip compression, show raw output')
    .option('-o, --output <file>', 'Write output to file')
    .option('--context-lines <n>', 'Show N lines of code context around errors (0 to disable, max 20)', '0')
    .action(async (cmd: string, options: RunOptions) => {
      await runCommand(cmd, options);
    });
  
  return command;
}

async function runCommand(commandStr: string, options: RunOptions): Promise<void> {
  const configManager = new ConfigManager();
  const config = configManager.getConfig();
  
  console.log(chalk.cyan('🦞 ErrorPare'));
  console.log(chalk.gray(`Executing: ${commandStr}`));
  console.log(chalk.gray(`Mode: ${options.analyze && configManager.isLLMConfigured() ? 'analyze' : 'compress'}`));
  console.log('');
  
  const result = await executeCommandSilent(commandStr);
  
  if (result.success) {
    console.log(chalk.green('✅ Command succeeded'));
    if (result.output && result.output.trim()) {
      console.log(result.output);
    }
    return;
  }
  
  const errorText = result.stderr || result.stdout;
  
  if (!errorText.trim()) {
    console.log(chalk.yellow('⚠️  Command failed with no output'));
    console.log(chalk.gray(`Exit code: ${result.code}`));
    return;
  }
  
  // Smart compression with optional context appending
  const contextLinesValue = typeof options.contextLines === 'string' ? options.contextLines : '0';
  const parsedContextLines = Number.parseInt(contextLinesValue, 10);
  const contextLines = Number.isNaN(parsedContextLines) ? 0 : parsedContextLines;
  const compressor = new Compressor({
    gitAware: config.settings.gitAware,
    contextLines: contextLines > 0 ? Math.min(contextLines, 20) : 0,
    projectRoot: process.cwd(),
  });
  
  const compressResult = await compressor.compress(errorText, commandStr, result.code);
  const compressedOutput = compressor.formatAsText(compressResult);
  const compressionStats = {
    originalLines: compressResult.compression.originalLines,
    compressedLines: compressResult.compression.compressedLines,
    uniqueErrors: compressResult.compression.uniqueErrors,
    thirdPartyCollapsed: compressResult.compression.thirdPartyCollapsed,
  };
  
  const ruleEngine = new RuleEngine();
  const matches = ruleEngine.match(errorText);
  
  if (options.json) {
    const output = {
      success: false,
      exitCode: result.code,
      command: commandStr,
      compression: compressResult.compression,
      summary: compressResult.summary,
      errors: compressResult.errors,
      formatted: compressedOutput,
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
  
  console.log(chalk.red('❌ Command failed'));
  console.log('');
  console.log(chalk.red('═'.repeat(60)));
  console.log(chalk.red('📊 ERROR SUMMARY'));
  console.log(chalk.red('═'.repeat(60)));
  console.log('');
  
  if (compressionStats) {
    const reduction = compressionStats.originalLines > 0 
      ? Math.round((1 - compressionStats.compressedLines / compressionStats.originalLines) * 100)
      : 0;
    console.log(chalk.green(`📦 Compression: ${compressionStats.originalLines} → ${compressionStats.compressedLines} lines (${reduction}% reduction)`));
    if (compressionStats.thirdPartyCollapsed && compressionStats.thirdPartyCollapsed > 0) {
      console.log(chalk.green(`🌳 Third-party frames collapsed: ${compressionStats.thirdPartyCollapsed}`));
    }
    console.log(chalk.green(`🎯 Unique errors: ${compressionStats.uniqueErrors}`));
    console.log('');
  }
  
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
      const otherCategories = [...new Set(matches.slice(1).map(m => m.rule.category))];
      if (otherCategories.length > 0) {
        console.log(chalk.gray(`   +${matches.length - 1} more match(es) in categories: ${otherCategories.join(', ')}`));
      } else {
        console.log(chalk.gray(`   +${matches.length - 1} more match(es)`));
      }
      console.log('');
    }
  }
  
  if (options.analyze && configManager.isLLMConfigured()) {
    console.log(chalk.magenta('─'.repeat(60)));
    console.log(chalk.magenta('🤖 AI ROOT CAUSE ANALYSIS'));
    console.log(chalk.magenta('─'.repeat(60)));
    console.log('');
    
    try {
      const analyzer = new LLMAnalyzer(config.llm);
      const analysis = await analyzer.analyze(errorText);
      
      console.log(chalk.yellow('Root Cause:'));
      console.log(chalk.white(`  ${analysis.rootCause}`));
      console.log('');
      console.log(chalk.yellow('Category:'));
      console.log(chalk.white(`  ${analysis.category}`));
      console.log('');
      console.log(chalk.yellow('Fix Recommendation:'));
      console.log(chalk.white(`  ${analysis.suggestion}`));
      if (analysis.codeFix) {
        console.log('');
        console.log(chalk.yellow('Code Fix:'));
        const codeFix = typeof analysis.codeFix === 'string' ? analysis.codeFix : JSON.stringify(analysis.codeFix, null, 2);
        console.log(chalk.gray(codeFix.split('\n').map(l => `  ${l}`).join('\n')));
      }
      console.log('');
      console.log(chalk.gray(`Model: ${analysis.model} • Tokens: ${analysis.tokensUsed || 'N/A'}`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  LLM analysis failed:'));
      console.log(chalk.gray(`   ${(error as Error).message}`));
    }
  }
  
  console.log(chalk.gray('─'.repeat(60)));
  console.log(chalk.gray('📄 COMPRESSED ERROR OUTPUT'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log('');
  console.log(chalk.white(compressedOutput));
  console.log('');
  
  if (options.output) {
    const fs = await import('fs');
    fs.writeFileSync(options.output, compressedOutput);
    console.log(chalk.green(`✅ Saved to: ${options.output}`));
  }
}

interface CompressionStats {
  originalLines: number;
  compressedLines: number;
  uniqueErrors: number;
  thirdPartyCollapsed: number;
}

function smartCompress(errorText: string, options: { gitAware?: boolean }): { compressedOutput: string; compressionStats: CompressionStats } {
  const lines = errorText.split('\n');
  const originalLines = lines.length;
  
  // Third-party patterns to collapse
  const thirdPartyPatterns = [
    'node_modules',
    'site-packages',
    '.cargo/registry',
    '__pycache__',
    'node:internal',
    'node:module',
  ];
  
  const compressedLines: string[] = [];
  let inThirdParty = false;
  let thirdPartyCount = 0;
  let collapsedFrames = 0;
  
  for (const line of lines) {
    const isThirdParty = thirdPartyPatterns.some(p => line.includes(p));
    
    if (isThirdParty) {
      if (!inThirdParty) {
        inThirdParty = true;
        collapsedFrames = 1;
      } else {
        collapsedFrames++;
      }
      thirdPartyCount++;
    } else {
      if (inThirdParty && collapsedFrames > 0) {
        compressedLines.push(chalk.gray(`  [...${collapsedFrames} third-party frames collapsed]`));
        inThirdParty = false;
        collapsedFrames = 0;
      }
      compressedLines.push(line);
    }
  }
  
  if (inThirdParty && collapsedFrames > 0) {
    compressedLines.push(chalk.gray(`  [...${collapsedFrames} third-party frames collapsed]`));
  }
  
  // Deduplicate similar error lines
  const errorPattern = /^(src\/[^(]+)\((\d+),(\d+)\):\s*(error\s+\w+):\s*(.+)$/;
  const errorMap = new Map<string, { count: number; locations: string[] }>();
  
  const finalLines: string[] = [];
  const outputLines: string[] = [];
  
  for (const line of compressedLines) {
    const match = line.match(errorPattern);
    if (match) {
      const [, file, lineNum, col, errorType, message] = match;
      const key = `${errorType}: ${message}`;
      if (errorMap.has(key)) {
        const existing = errorMap.get(key)!;
        existing.count++;
        existing.locations.push(`${file}:${lineNum}`);
      } else {
        errorMap.set(key, { count: 1, locations: [`${file}:${lineNum}`] });
      }
    } else {
      outputLines.push(line);
    }
  }
  
  // Output deduplicated errors
  for (const [key, data] of errorMap.entries()) {
    const locs = data.locations.length <= 3 
      ? data.locations.join(', ')
      : `${data.locations.slice(0, 3).join(', ')} (+${data.locations.length - 3} more)`;
    outputLines.push(`${chalk.yellow(`[${data.count}x]`)} ${key}`);
    outputLines.push(chalk.gray(`    Locations: ${locs}`));
  }
  
  const compressedOutput = outputLines.join('\n');
  const compressedLineCount = outputLines.length;
  
  return {
    compressedOutput,
    compressionStats: {
      originalLines,
      compressedLines: compressedLineCount,
      uniqueErrors: errorMap.size,
      thirdPartyCollapsed: thirdPartyCount,
    },
  };
}

interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  output: string;
  code: number;
}

function executeCommandSilent(commandStr: string): Promise<CommandResult> {
  return new Promise((resolve) => {
    const [cmd, ...args] = commandStr.split(' ');
    const child = spawn(cmd, args, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
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
