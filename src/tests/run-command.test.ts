import { afterEach, describe, expect, it, vi } from 'vitest';

import { runCommand, type RunJsonOutput } from '../cli/commands/run.js';
import type { CompressionResult } from '../types/index.js';

const baseCompressionResult: CompressionResult = {
  success: false,
  exitCode: 1,
  command: 'npm run build',
  timing: {
    total: 10,
    compression: 6,
  },
  compression: {
    originalLines: 24,
    compressedLines: 2,
    rate: 0.5,
    uniqueErrors: 1,
  },
  errors: [
    {
      count: 3,
      type: 'Error',
      message: 'Primary failure',
      template: 'Error: Primary failure',
      variables: [],
      location: 'src/service.ts:18:4',
    },
  ],
  summary: '1 unique error from 3 occurrences. Most common: Error (3x)',
};

describe('run --json --analyze', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emits one machine-readable JSON document with LLM analysis', async () => {
    const stdout: string[] = [];
    let analyzerInput = '';
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await runCommand(
      'npm run build',
      { json: true, analyze: true, contextLines: '2' },
      {
        output: (text) => stdout.push(text),
        createConfigManager: () => ({
          getConfig: () => ({
            version: '2.1.0',
            mode: 'analyze',
            llm: {
              provider: 'deepseek',
              model: 'deepseek-chat',
              apiKey: 'test-key',
              baseUrl: 'https://api.deepseek.com/v1',
            },
            settings: {
              maxLines: 1000,
              gitAware: true,
              output: 'json',
              compressLevel: 'balanced',
            },
            rules: {
              enabled: true,
            },
          }),
          isLLMConfigured: () => true,
        }),
        executeCommand: async () => ({
          success: false,
          stdout: '',
          stderr: 'Error: Primary failure',
          output: 'Error: Primary failure',
          code: 1,
        }),
        createCompressor: () => ({
          compress: async () => baseCompressionResult,
          formatAsText: () => 'formatted output',
        }),
        createRuleEngine: () => ({
          match: () => [
            {
              rule: {
                id: 'ts-001',
                name: 'Primary failure',
                language: 'general',
                pattern: /Primary failure/,
                severity: 'error',
                category: 'runtime',
                description: 'Primary failure',
                suggestion: 'Fix it',
              },
              match: ['Primary failure'],
              confidence: 0.98,
            },
          ] as any,
        }),
        createAnalyzer: () => ({
          analyze: async (input: string) => {
            analyzerInput = input;
            console.log('this should never leak into JSON stdout');
            return {
              rootCause: 'Missing data contract',
              confidence: 0.91,
              category: 'runtime',
              suggestion: 'Add fallback handling',
              model: 'deepseek-chat',
              tokensUsed: 321,
            };
          },
        }),
      }
    );

    expect(stdout).toHaveLength(1);
    expect(consoleLogSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    const payload = JSON.parse(stdout[0]) as RunJsonOutput;
    expect(payload.mode).toBe('analyze');
    expect(payload.success).toBe(false);
    expect(payload.formatted).toBe('formatted output');
    expect(payload.matches).toEqual([
      {
        ruleId: 'ts-001',
        name: 'Primary failure',
        category: 'runtime',
        confidence: 0.98,
        suggestion: 'Fix it',
      },
    ]);
    expect(payload.llmAnalysis?.rootCause).toBe('Missing data contract');
    expect(payload.analysis).toEqual({
      requested: true,
      configured: true,
      attempted: true,
      succeeded: true,
      provider: 'deepseek',
      model: 'deepseek-chat',
      error: null,
    });
    expect(analyzerInput).toContain('ErrorPare rule hint:');
    expect(analyzerInput).toContain('Compressed errors:');
  });

  it('keeps JSON stable when analysis is requested but not configured', async () => {
    const stdout: string[] = [];

    await runCommand(
      'npm run build',
      { json: true, analyze: true },
      {
        output: (text) => stdout.push(text),
        createConfigManager: () => ({
          getConfig: () => ({
            version: '2.1.0',
            mode: 'basic',
            settings: {
              maxLines: 1000,
              gitAware: true,
              output: 'json',
              compressLevel: 'balanced',
            },
            rules: {
              enabled: true,
            },
          }),
          isLLMConfigured: () => false,
        }),
        executeCommand: async () => ({
          success: false,
          stdout: '',
          stderr: 'Error: Primary failure',
          output: 'Error: Primary failure',
          code: 1,
        }),
        createCompressor: () => ({
          compress: async () => baseCompressionResult,
          formatAsText: () => 'formatted output',
        }),
        createRuleEngine: () => ({
          match: () => [] as any,
        }),
      }
    );

    expect(stdout).toHaveLength(1);

    const payload = JSON.parse(stdout[0]) as RunJsonOutput;
    expect(payload.mode).toBe('compress');
    expect(payload.llmAnalysis).toBeNull();
    expect(payload.analysis).toEqual({
      requested: true,
      configured: false,
      attempted: false,
      succeeded: false,
      provider: null,
      model: null,
      error: 'LLM analysis requested but ErrorPare is not configured for analysis.',
    });
  });

  it('preserves quoted shell commands when using the real command executor', async () => {
    const stdout: string[] = [];

    await runCommand(
      `node -e "console.error('Quoted failure payload'); process.exit(1)"`,
      { json: true },
      {
        output: (text) => stdout.push(text),
        createConfigManager: () => ({
          getConfig: () => ({
            version: '2.1.0',
            mode: 'basic',
            settings: {
              maxLines: 1000,
              gitAware: true,
              output: 'json',
              compressLevel: 'balanced',
            },
            rules: {
              enabled: true,
            },
          }),
          isLLMConfigured: () => false,
        }),
        createCompressor: () => ({
          compress: async () => baseCompressionResult,
          formatAsText: () => 'formatted output',
        }),
        createRuleEngine: () => ({
          match: () => [] as any,
        }),
      }
    );

    expect(stdout).toHaveLength(1);

    const payload = JSON.parse(stdout[0]) as RunJsonOutput;
    expect(payload.success).toBe(false);
    expect(payload.command).toContain(`node -e "console.error('Quoted failure payload'); process.exit(1)"`);
    expect(payload.stderr).toContain('Quoted failure payload');
  });
});
