/**
 * ErrorPare Core Tests
 */

import { describe, expect, it } from 'vitest';
import path from 'path';
import stripAnsi from 'strip-ansi';

import { compress, Compressor, formatHighlightedSnippet } from '../core/compressor.js';
import { deduplicateErrors, maskVariables } from '../core/filters/deduplicator.js';
import { RuleEngine } from '../core/rules/rule-engine.js';
import type { CompressionResult } from '../types/index.js';

describe('maskVariables', () => {
  it('should mask IP addresses', () => {
    const { masked, variables } = maskVariables('Error at 192.168.1.1');
    expect(masked).toContain('<IP>');
    expect(variables.some(v => v.type === 'ip')).toBe(true);
  });

  it('should mask UUIDs', () => {
    const { masked } = maskVariables('Error with uuid 550e8400-e29b-41d4-a716-446655440000');
    expect(masked).toContain('<UUID>');
  });

  it('should preserve npm missing script names for actionable diagnostics', () => {
    const { masked, variables } = maskVariables('npm error Missing script: "definitely-does-not-exist"');

    expect(masked).toContain('"definitely-does-not-exist"');
    expect(variables.some(variable => variable.value === 'definitely-does-not-exist')).toBe(false);
  });
});

describe('deduplicateErrors', () => {
  it('should deduplicate similar errors', () => {
    const errors = [
      "TypeError: Cannot read property 'x' of undefined",
      "TypeError: Cannot read property 'y' of undefined",
      "TypeError: Cannot read property 'z' of undefined",
    ];

    const result = deduplicateErrors(errors, 'javascript');
    expect(result.originalCount).toBe(3);
    expect(result.compressedCount).toBe(3);
  });
});

describe('Compressor', () => {
  it('should compress duplicate errors', async () => {
    const input = `
TypeError: Cannot read property 'x' of undefined
TypeError: Cannot read property 'x' of undefined
TypeError: Cannot read property 'x' of undefined
    `.trim();

    const result = await compress(input);
    expect(result.compression.originalLines).toBe(3);
  });

  it('should ignore structured business logs and keep the real JS error message', async () => {
    const input = `
[invoice-sync] tenant=acme-eu stage=recipient-build attempt=1
[invoice-sync] tenant=acme-eu stage=recipient-build severity=error
Error: CRM payload contract violated: billing contact must expose at least one deliverable email after enrichment
    at pickDeliverableEmail (dist/nightly-invoice-sync.js:13:11)
    at buildInvoiceRecipient (dist/nightly-invoice-sync.js:18:17)
    at syncTenant (dist/nightly-invoice-sync.js:29:21)

[invoice-sync] tenant=globex-us stage=recipient-build attempt=1
[invoice-sync] tenant=globex-us stage=recipient-build severity=error
Error: CRM payload contract violated: billing contact must expose at least one deliverable email after enrichment
    at pickDeliverableEmail (dist/nightly-invoice-sync.js:13:11)
    at buildInvoiceRecipient (dist/nightly-invoice-sync.js:18:17)
    at syncTenant (dist/nightly-invoice-sync.js:29:21)

[invoice-sync] tenant=initech-apac stage=recipient-build attempt=1
[invoice-sync] tenant=initech-apac stage=recipient-build severity=error
Error: CRM payload contract violated: billing contact must expose at least one deliverable email after enrichment
    at pickDeliverableEmail (dist/nightly-invoice-sync.js:13:11)
    at buildInvoiceRecipient (dist/nightly-invoice-sync.js:18:17)
    at syncTenant (dist/nightly-invoice-sync.js:29:21)

[invoice-sync] completed with 3 tenant failures
    `.trim();

    const result = await compress(input, { language: 'javascript' });

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].count).toBe(3);
    expect(result.errors[0].message).toContain('CRM payload contract violated');
    expect(result.errors[0].message).not.toContain('tenant=');
    expect(result.errors[0].message).not.toContain('completed with 3 tenant failures');
    expect(result.summary).toContain('1 unique errors from 3 occurrences');
  });

  it('uses the same compression percentage in data and formatted output', async () => {
    const input = [
      'npm error Missing script: "definitely-does-not-exist"',
      'npm error',
      'npm error To see a list of scripts, run:',
      'npm error   npm run',
      'npm error A complete log of this run can be found in:',
      'npm error   C:\\Users\\lenovo\\AppData\\Local\\npm-cache\\_logs\\debug.log',
    ].join('\n');

    const result = await compress(input);
    const formatted = stripAnsi(new Compressor().formatAsText(result));

    expect(result.compression.compressedLines).toBe(1);
    expect(result.compression.rate).toBeCloseTo(5 / 6, 5);
    expect(formatted).toContain('Compression: 83% (6 -> 1 lines)');
  });

  it('should detect language', () => {
    const compressor = new Compressor();

    const jsResult = compressor.detectLanguage("TypeError: Cannot read property 'x' of undefined at app.js:10");
    expect(jsResult).toBe('javascript');

    const pyResult = compressor.detectLanguage('Traceback (most recent call last):\n  File "test.py", line 10');
    expect(pyResult).toBe('python');
  });

  it('should preserve context for merged errors', async () => {
    const projectRoot = process.cwd();
    const file = path.join(projectRoot, 'src', 'tests', 'fixtures', 'context-merge.ts');
    const compressor = new Compressor({ contextLines: 1, projectRoot });

    const mergedErrors = (compressor as any).mergeErrors([
      {
        count: 1,
        type: 'TypeError',
        message: "Cannot read property 'x' of undefined",
        template: "TypeError: Cannot read property '<ID>' of undefined",
        location: `${file}:3`,
        variables: [],
      },
      {
        count: 1,
        type: 'TypeError',
        message: "Cannot read property 'x' of undefined",
        template: "TypeError: Cannot read property '<ID>' of undefined",
        location: `${file}:3`,
        variables: [],
      },
    ]);

    const frameMap = new Map([
      [
        "TypeError: Cannot read property '<ID>' of undefined",
        { file, line: 3, column: 5, isThirdParty: false },
      ],
    ]);

    await (compressor as any).enrichErrorsWithContext(mergedErrors, frameMap, 1);

    expect(mergedErrors).toHaveLength(1);
    expect(mergedErrors[0].count).toBe(2);
    expect(mergedErrors[0].context?.file).toContain('context-merge.ts');
    expect(mergedErrors[0].context?.line).toBe(3);
  });

  it('formats text output with ASCII separators and labels', () => {
    const compressor = new Compressor();
    const result: CompressionResult = {
      success: false,
      exitCode: 1,
      command: 'npm run build',
      timing: {
        total: 12,
        compression: 8,
      },
      compression: {
        originalLines: 12,
        compressedLines: 2,
        rate: 0.5,
        uniqueErrors: 1,
        thirdPartyCollapsed: 4,
        sourceMappedFrames: 2,
      },
      errors: [
        {
          count: 2,
          type: 'TypeError',
          message: 'Cannot read property email of undefined',
          template: 'TypeError: Cannot read property <ID> of undefined',
          variables: [],
          location: 'src/app.ts:10:5',
          originalLocation: 'dist/app.js:44:9',
          suggestion: 'Add a null check before reading email.',
        },
      ],
      summary: '1 unique errors from 2 occurrences. Most common: TypeError (2x)',
    };

    const formatted = stripAnsi(compressor.formatAsText(result));

    expect(formatted).toContain('Compression: 50% (12 -> 2 lines)');
    expect(formatted).toContain('Suggestion: Add a null check before reading email.');
    expect(formatted).not.toContain('\u2192');
    expect(formatted).not.toContain('\u2550');
  });

  it('omits the execution status line when no command is provided', () => {
    const compressor = new Compressor();
    const result: CompressionResult = {
      success: false,
      exitCode: 1,
      command: '',
      timing: {
        total: 8,
        compression: 5,
      },
      compression: {
        originalLines: 4,
        compressedLines: 1,
        rate: 0.75,
        uniqueErrors: 1,
      },
      errors: [
        {
          count: 1,
          type: 'RuntimeError',
          message: 'Synthetic failure',
          template: 'RuntimeError: Synthetic failure',
          variables: [],
        },
      ],
      summary: '1 unique errors from 1 occurrences. Most common: RuntimeError (1x)',
    };

    const formatted = stripAnsi(compressor.formatAsText(result));

    expect(formatted).toContain('[ErrorPare] Compression: 75% (4 -> 1 lines)');
    expect(formatted).not.toContain('[ErrorPare]  failed');
  });
});

describe('RuleEngine', () => {
  it('classifies npm missing script failures as command errors', () => {
    const engine = new RuleEngine();
    const matches = engine.match('npm error Missing script: "definitely-does-not-exist"');

    expect(matches[0]?.rule.id).toBe('gen-006');
    expect(matches[0]?.rule.category).toBe('command');
  });
});

describe('formatHighlightedSnippet', () => {
  it('should render aligned snippet text with markers', () => {
    const lines = formatHighlightedSnippet(
      [
        { line: 9, code: 'const answer = 42;', highlight: false },
        { line: 10, code: 'return answer;', highlight: true },
      ],
      'typescript',
    ).map(line => stripAnsi(line));

    expect(lines[0]).toBe('     9 | const answer = 42;');
    expect(lines[1]).toBe('>   10 | return answer;');
  });

  it('should apply ANSI colors to markers and keywords', () => {
    const [formatted] = formatHighlightedSnippet([{ line: 3, code: 'return value;', highlight: true }], 'typescript');

    expect(formatted).toContain('\u001B[');
    expect(formatted).not.toBe(stripAnsi(formatted));
  });
});
