// ErrorPare - CLI 'run' command (Phase 2: with compression + analysis)

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { ConfigManager, type ErrorPareConfig } from '../../core/config/config-manager.js';
import { RuleEngine } from '../../core/rules/rule-engine.js';
import { LLMAnalyzer, type AnalysisResult } from '../../core/analysis/llm/llm-analyzer.js';
import { Compressor } from '../../core/compressor.js';
import type { CompressionResult } from '../../types/index.js';

interface RunOptions {
  analyze?: boolean;
  local?: boolean;
  json?: boolean;
  output?: string;
  noCompress?: boolean;
  contextLines?: string | number;
}

type RunMode = 'compress' | 'analyze';

interface RunRuleMatch {
  ruleId: string;
  name: string;
  category: string;
  confidence: number;
  suggestion: string;
}

export interface RunAnalysisState {
  requested: boolean;
  configured: boolean;
  attempted: boolean;
  succeeded: boolean;
  provider: string | null;
  model: string | null;
  error: string | null;
}

export interface RunJsonOutput {
  success: boolean;
  exitCode: number;
  command: string;
  mode: RunMode;
  message: string | null;
  stdout: string;
  stderr: string;
  output: string;
  compression: CompressionResult['compression'] | null;
  summary: string | null;
  errors: CompressionResult['errors'];
  formatted: string | null;
  matches: RunRuleMatch[];
  llmAnalysis: AnalysisResult | null;
  analysis: RunAnalysisState;
}

interface RunConfigManagerLike {
  getConfig(): ErrorPareConfig;
  isLLMConfigured(): boolean;
}

interface RunCompressorLike {
  compress(input: string, command?: string, exitCode?: number): Promise<CompressionResult>;
  formatAsText(result: CompressionResult): string;
}

interface RunAnalyzerLike {
  analyze(errorText: string): Promise<AnalysisResult>;
}

interface RunCommandDependencies {
  createConfigManager?: () => RunConfigManagerLike;
  createRuleEngine?: () => Pick<RuleEngine, 'match'>;
  createCompressor?: (
    options: ConstructorParameters<typeof Compressor>[0]
  ) => RunCompressorLike;
  createAnalyzer?: (
    config: NonNullable<ErrorPareConfig['llm']>
  ) => RunAnalyzerLike;
  executeCommand?: (commandStr: string) => Promise<CommandResult>;
  output?: (text: string) => void;
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

function parseContextLines(value: RunOptions['contextLines']): number {
  const parsed =
    typeof value === 'number'
      ? value
      : Number.parseInt(value ?? '0', 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.min(parsed, 20);
}

function mapRuleMatches(matches: ReturnType<RuleEngine['match']>): RunRuleMatch[] {
  return matches.map(match => ({
    ruleId: match.rule.id,
    name: match.rule.name,
    category: match.rule.category,
    confidence: match.confidence,
    suggestion: match.rule.suggestion,
  }));
}

function createRunAnalysisState(params: {
  requested: boolean;
  configured: boolean;
  attempted: boolean;
  succeeded: boolean;
  llmConfig?: ErrorPareConfig['llm'];
  error?: string | null;
}): RunAnalysisState {
  const { requested, configured, attempted, succeeded, llmConfig, error } = params;

  return {
    requested,
    configured,
    attempted,
    succeeded,
    provider: llmConfig?.provider ?? null,
    model: llmConfig?.model ?? null,
    error:
      error ??
      (requested && !configured
        ? 'LLM analysis requested but ErrorPare is not configured for analysis.'
        : null),
  };
}

function buildAnalysisInput(
  rawErrorText: string,
  compression: CompressionResult,
  matches: ReturnType<RuleEngine['match']>,
): string {
  const sections: string[] = [];

  const topMatch = matches[0];
  if (topMatch) {
    sections.push(
      [
        'ErrorPare rule hint:',
        `- name: ${topMatch.rule.name}`,
        `- category: ${topMatch.rule.category}`,
        `- description: ${topMatch.rule.description}`,
        `- suggestion: ${topMatch.rule.suggestion}`,
      ].join('\n'),
    );
  }

  if (compression.errors.length > 0) {
    const compressedErrors = compression.errors
      .slice(0, 3)
      .map(error => {
        const countLabel = error.count > 1 ? ` (${error.count}x)` : '';
        return `- ${error.type}: ${error.message}${countLabel}`;
      })
      .join('\n');

    sections.push(`Compressed errors:\n${compressedErrors}`);
  }

  sections.push(`Raw error output:\n${rawErrorText}`);
  return sections.join('\n\n');
}

export function createRunJsonOutput(params: {
  mode: RunMode;
  command: string;
  result: CommandResult;
  message?: string | null;
  compression?: CompressionResult | null;
  formatted?: string | null;
  matches?: RunRuleMatch[];
  llmAnalysis?: AnalysisResult | null;
  analysis: RunAnalysisState;
}): RunJsonOutput {
  const {
    mode,
    command,
    result,
    message = null,
    compression = null,
    formatted = null,
    matches = [],
    llmAnalysis = null,
    analysis,
  } = params;

  return {
    success: result.success,
    exitCode: result.code,
    command,
    mode,
    message,
    stdout: result.stdout,
    stderr: result.stderr,
    output: result.output,
    compression: compression?.compression ?? null,
    summary: compression?.summary ?? null,
    errors: compression?.errors ?? [],
    formatted,
    matches,
    llmAnalysis,
    analysis,
  };
}

async function withConsoleSilenced<T>(
  task: () => Promise<T> | T,
  methods: Array<'log' | 'warn'>
): Promise<T> {
  const originalMethods = new Map<'log' | 'warn', typeof console.log>();

  for (const method of methods) {
    originalMethods.set(method, console[method]);
    console[method] = (() => undefined) as typeof console.log;
  }

  try {
    return await task();
  } finally {
    for (const method of methods) {
      const original = originalMethods.get(method);
      if (original) {
        console[method] = original;
      }
    }
  }
}

function emitStructuredOutput(
  payload: RunJsonOutput,
  outputFile: string | undefined,
  emit: (text: string) => void
): void {
  const serialized = JSON.stringify(payload, null, 2);

  if (outputFile) {
    fs.writeFileSync(outputFile, serialized);
  }

  emit(serialized);
}

export async function runCommand(
  commandStr: string,
  options: RunOptions,
  dependencies: RunCommandDependencies = {}
): Promise<void> {
  const jsonMode = Boolean(options.json);
  const emitOutput = dependencies.output ?? ((text: string) => console.log(text));
  const createConfigManager = dependencies.createConfigManager ?? (() => new ConfigManager());
  const configManager = jsonMode
    ? await withConsoleSilenced(() => createConfigManager(), ['warn'])
    : createConfigManager();
  const config = configManager.getConfig();
  const llmConfigured = configManager.isLLMConfigured();
  const analysisRequested = Boolean(options.analyze);
  const analysisEnabled = analysisRequested && llmConfigured;
  const mode: RunMode = analysisEnabled ? 'analyze' : 'compress';
  
  if (!jsonMode) {
    console.log(chalk.cyan('ErrorPare'));
    console.log(chalk.gray(`Executing: ${commandStr}`));
    console.log(chalk.gray(`Mode: ${mode}`));
    console.log('');
  }
  
  const executeCommand = dependencies.executeCommand ?? executeCommandSilent;
  const result = await executeCommand(commandStr);
  
  if (result.success) {
    if (jsonMode) {
      emitStructuredOutput(
        createRunJsonOutput({
          mode,
          command: commandStr,
          result,
          message: 'Command succeeded',
          analysis: createRunAnalysisState({
            requested: analysisRequested,
            configured: llmConfigured,
            attempted: false,
            succeeded: false,
            llmConfig: config.llm,
          }),
        }),
        options.output,
        emitOutput
      );
      return;
    }

    console.log(chalk.green('Command succeeded'));
    if (result.output && result.output.trim()) {
      console.log(result.output);
    }
    return;
  }
  
  const errorText = result.stderr || result.stdout;
  
  if (!errorText.trim()) {
    if (jsonMode) {
      emitStructuredOutput(
        createRunJsonOutput({
          mode,
          command: commandStr,
          result,
          message: 'Command failed with no output',
          analysis: createRunAnalysisState({
            requested: analysisRequested,
            configured: llmConfigured,
            attempted: false,
            succeeded: false,
            llmConfig: config.llm,
          }),
        }),
        options.output,
        emitOutput
      );
      return;
    }

    console.log(chalk.yellow('Command failed with no output'));
    console.log(chalk.gray(`Exit code: ${result.code}`));
    return;
  }
  
  const contextLines = parseContextLines(options.contextLines);
  const createCompressor = dependencies.createCompressor ?? (compressorOptions => new Compressor(compressorOptions));
  const compressor = createCompressor({
    gitAware: config.settings.gitAware,
    contextLines,
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
  
  const createRuleEngine = dependencies.createRuleEngine ?? (() => new RuleEngine());
  const ruleEngine = createRuleEngine();
  const matches = ruleEngine.match(errorText);
  const mappedMatches = mapRuleMatches(matches);
  let llmAnalysis: AnalysisResult | null = null;
  let analysisError: string | null = null;
  let analysisAttempted = false;
  const analysisInput = buildAnalysisInput(errorText, compressResult, matches);

  if (analysisEnabled) {
    analysisAttempted = true;
    try {
      const createAnalyzer = dependencies.createAnalyzer ?? (llmConfig => new LLMAnalyzer(llmConfig));
      const analyzer = createAnalyzer(config.llm!);
      llmAnalysis = jsonMode
        ? await withConsoleSilenced(() => analyzer.analyze(analysisInput), ['log'])
        : await analyzer.analyze(analysisInput);
    } catch (error) {
      analysisError = (error as Error).message;
    }
  }

  const analysisState = createRunAnalysisState({
    requested: analysisRequested,
    configured: llmConfigured,
    attempted: analysisAttempted,
    succeeded: llmAnalysis !== null,
    llmConfig: config.llm,
    error: analysisError,
  });

  if (jsonMode) {
    emitStructuredOutput(
      createRunJsonOutput({
        mode,
        command: commandStr,
        result,
        compression: compressResult,
        formatted: compressedOutput,
        matches: mappedMatches,
        llmAnalysis,
        analysis: analysisState,
      }),
      options.output,
      emitOutput
    );
    return;
  }
  
  console.log(chalk.red('Command failed'));
  console.log('');
  console.log(chalk.red('='.repeat(60)));
  console.log(chalk.red('ERROR SUMMARY'));
  console.log(chalk.red('='.repeat(60)));
  console.log('');
  
  if (compressionStats) {
    const reduction = Math.round(compressResult.compression.rate * 100);
    console.log(chalk.green(`Compression: ${compressionStats.originalLines} -> ${compressionStats.compressedLines} lines (${reduction}% reduction)`));
    if (compressionStats.thirdPartyCollapsed && compressionStats.thirdPartyCollapsed > 0) {
      console.log(chalk.green(`Third-party frames collapsed: ${compressionStats.thirdPartyCollapsed}`));
    }
    console.log(chalk.green(`Unique errors: ${compressionStats.uniqueErrors}`));
    console.log('');
  }
  
  if (matches.length > 0) {
    const topMatch = matches[0];
    console.log(chalk.yellow(topMatch.rule.name));
    console.log(chalk.gray(`   Category: ${topMatch.rule.category}`));
    console.log(chalk.gray(`   Confidence: ${(topMatch.confidence * 100).toFixed(0)}%`));
    console.log('');
    console.log(chalk.cyan('Suggestion:'));
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
  
  if (analysisEnabled && llmAnalysis) {
    console.log(chalk.magenta('-'.repeat(60)));
    console.log(chalk.magenta('AI ROOT CAUSE ANALYSIS'));
    console.log(chalk.magenta('-'.repeat(60)));
    console.log('');
    console.log(chalk.yellow('Root Cause:'));
    console.log(chalk.white(`  ${llmAnalysis.rootCause}`));
    console.log('');
    console.log(chalk.yellow('Category:'));
    console.log(chalk.white(`  ${llmAnalysis.category}`));
    console.log('');
    console.log(chalk.yellow('Fix Recommendation:'));
    console.log(chalk.white(`  ${llmAnalysis.suggestion}`));
    if (llmAnalysis.codeFix) {
      console.log('');
      console.log(chalk.yellow('Code Fix:'));
      console.log(chalk.gray(llmAnalysis.codeFix.split('\n').map(line => `  ${line}`).join('\n')));
    }
    console.log('');
    console.log(chalk.gray(`Model: ${llmAnalysis.model} - Tokens: ${llmAnalysis.tokensUsed || 'N/A'}`));
  } else if (analysisError) {
    console.log(chalk.yellow('LLM analysis failed:'));
    console.log(chalk.gray(`   ${analysisError}`));
  }
  
  console.log(chalk.gray('-'.repeat(60)));
  console.log(chalk.gray('COMPRESSED ERROR OUTPUT'));
  console.log(chalk.gray('-'.repeat(60)));
  console.log('');
  console.log(chalk.white(compressedOutput));
  console.log('');
  
  if (options.output) {
    fs.writeFileSync(options.output, compressedOutput);
    console.log(chalk.green(`Saved to: ${options.output}`));
  }
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
    const child = spawn(commandStr, {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
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
