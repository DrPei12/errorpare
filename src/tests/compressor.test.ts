/**
 * ErrorPare Core Tests
 */

import { describe, it, expect } from 'vitest';
import stripAnsi from 'strip-ansi';
import { compress, Compressor, formatHighlightedSnippet } from '../core/compressor.js';
import { deduplicateErrors, maskVariables } from '../core/filters/deduplicator.js';

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

  it('should detect language', () => {
    const compressor = new Compressor();

    const jsResult = compressor.detectLanguage("TypeError: Cannot read property 'x' of undefined at app.js:10");
    expect(jsResult).toBe('javascript');

    const pyResult = compressor.detectLanguage('Traceback (most recent call last):\n  File "test.py", line 10');
    expect(pyResult).toBe('python');
  });

  it('should preserve context for merged errors', async () => {
    const file = '/mnt/d/Desktop/ErrorPare/src/tests/fixtures/context-merge.ts';
    const compressor = new Compressor({ contextLines: 1, projectRoot: '/mnt/d/Desktop/ErrorPare' });

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
});

describe('formatHighlightedSnippet', () => {
  it('should render aligned snippet text with markers', () => {
    const lines = formatHighlightedSnippet(
      [
        { line: 9, code: 'const answer = 42;', highlight: false },
        { line: 10, code: 'return answer;', highlight: true },
      ],
      'typescript'
    ).map(line => stripAnsi(line));

    expect(lines[0]).toBe('     9 | const answer = 42;');
    expect(lines[1]).toBe('>   10 | return answer;');
  });

  it('should apply ANSI colors to markers and keywords', () => {
    const [formatted] = formatHighlightedSnippet(
      [{ line: 3, code: 'return value;', highlight: true }],
      'typescript'
    );

    expect(formatted).toContain('\u001B[');
    expect(formatted).not.toBe(stripAnsi(formatted));
  });
});
