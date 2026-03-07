// ErrorPare - Context Reader Tests

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  readContext,
  readContexts,
  formatContextSnippet,
  contextToJSON,
  type CodeContext,
} from './context-reader.js';
import type { StackFrame } from '../parsers/stack-trace.js';

describe('Context Reader', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'errorpare-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('readContext', () => {
    it('should read context around a specific line', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1} content`);
      await fs.writeFile(testFile, lines.join('\n'));

      const frame: StackFrame = {
        file: testFile,
        line: 10,
        column: 5,
        method: 'testMethod',
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });

      expect(context).not.toBeNull();
      expect(context!.file).toBe(testFile);
      expect(context!.line).toBe(10);
      expect(context!.column).toBe(5);
      expect(context!.snippet).toHaveLength(11);

      const highlightedLines = context!.snippet.filter(s => s.highlight);
      expect(highlightedLines).toHaveLength(1);
      expect(highlightedLines[0].line).toBe(10);
      expect(highlightedLines[0].code).toBe('Line 10 content');
    });

    it('should handle start of file (line < contextLines)', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
      await fs.writeFile(testFile, lines.join('\n'));

      const frame: StackFrame = {
        file: testFile,
        line: 2,
        isThirdParty: false,
      };

      const context = await readContext(frame, {
        contextLines: 5,
        projectRoot: tempDir,
      });

      expect(context).not.toBeNull();
      expect(context!.snippet[0].line).toBe(1);
      expect(context!.snippet[context!.snippet.length - 1].line).toBe(7);
    });

    it('should handle end of file', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`);
      await fs.writeFile(testFile, lines.join('\n'));

      const frame: StackFrame = {
        file: testFile,
        line: 9,
        isThirdParty: false,
      };

      const context = await readContext(frame, {
        contextLines: 5,
        projectRoot: tempDir,
      });

      expect(context).not.toBeNull();
      expect(context!.snippet[context!.snippet.length - 1].line).toBe(10);
    });

    it('should return null for non-existent file', async () => {
      const frame: StackFrame = {
        file: path.join(tempDir, 'non-existent.ts'),
        line: 10,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should return null for file outside project root (security)', async () => {
      const frame: StackFrame = {
        file: '/etc/passwd',
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should return null for directory traversal attempt', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      await fs.writeFile(testFile, 'content');

      const frame: StackFrame = {
        file: path.join(tempDir, '..', '..', 'etc', 'passwd'),
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should block sibling path prefix bypass', async () => {
      const siblingDir = `${tempDir}-sibling`;
      await fs.mkdir(siblingDir, { recursive: true });
      const siblingFile = path.join(siblingDir, 'outside.ts');
      await fs.writeFile(siblingFile, 'export const leaked = true;');

      const frame: StackFrame = {
        file: siblingFile,
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should return null for binary files', async () => {
      const testFile = path.join(tempDir, 'binary.bin');
      await fs.writeFile(testFile, Buffer.from([0x00, 0x01, 0x02, 0x03]));

      const frame: StackFrame = {
        file: testFile,
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should return null for oversized files', async () => {
      const testFile = path.join(tempDir, 'large.ts');
      await fs.writeFile(testFile, 'x'.repeat(128));

      const frame: StackFrame = {
        file: testFile,
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, {
        projectRoot: tempDir,
        maxFileSize: 64,
      });

      expect(context).toBeNull();
    });

    it('should return null for line number out of bounds', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      await fs.writeFile(testFile, 'Line 1\nLine 2');

      const frame: StackFrame = {
        file: testFile,
        line: 100,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should reject zero or negative line numbers', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      await fs.writeFile(testFile, 'Line 1\nLine 2');

      const zeroLine = await readContext({ file: testFile, line: 0, isThirdParty: false }, { projectRoot: tempDir });
      const negativeLine = await readContext({ file: testFile, line: -3, isThirdParty: false }, { projectRoot: tempDir });

      expect(zeroLine).toBeNull();
      expect(negativeLine).toBeNull();
    });

    it('should respect custom contextLines option', async () => {
      const testFile = path.join(tempDir, 'test.ts');
      const lines = Array.from({ length: 20 }, (_, i) => `Line ${i + 1}`);
      await fs.writeFile(testFile, lines.join('\n'));

      const frame: StackFrame = {
        file: testFile,
        line: 10,
        isThirdParty: false,
      };

      const context = await readContext(frame, {
        contextLines: 3,
        projectRoot: tempDir,
      });

      expect(context).not.toBeNull();
      expect(context!.snippet).toHaveLength(7);
    });

    it('should support zero context lines with only the target line', async () => {
      const testFile = path.join(tempDir, 'single-context.ts');
      const lines = Array.from({ length: 5 }, (_, i) => `Line ${i + 1}`);
      await fs.writeFile(testFile, lines.join('\n'));

      const context = await readContext(
        {
          file: testFile,
          line: 3,
          isThirdParty: false,
        },
        {
          contextLines: 0,
          projectRoot: tempDir,
        }
      );

      expect(context).not.toBeNull();
      expect(context!.snippet).toEqual([{ line: 3, code: 'Line 3', highlight: true }]);
    });

    it('should handle empty files', async () => {
      const testFile = path.join(tempDir, 'empty.ts');
      await fs.writeFile(testFile, '');

      const frame: StackFrame = {
        file: testFile,
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).toBeNull();
    });

    it('should handle single-line files', async () => {
      const testFile = path.join(tempDir, 'single.ts');
      await fs.writeFile(testFile, 'only line');

      const frame: StackFrame = {
        file: testFile,
        line: 1,
        isThirdParty: false,
      };

      const context = await readContext(frame, { projectRoot: tempDir });
      expect(context).not.toBeNull();
      expect(context!.snippet).toHaveLength(1);
      expect(context!.snippet[0].highlight).toBe(true);
    });
  });

  describe('readContexts', () => {
    it('should read contexts for multiple frames', async () => {
      const file1 = path.join(tempDir, 'file1.ts');
      const file2 = path.join(tempDir, 'file2.ts');

      await fs.writeFile(file1, Array.from({ length: 10 }, (_, i) => `File1 Line ${i + 1}`).join('\n'));
      await fs.writeFile(file2, Array.from({ length: 10 }, (_, i) => `File2 Line ${i + 1}`).join('\n'));

      const frames: StackFrame[] = [
        { file: file1, line: 5, isThirdParty: false },
        { file: file2, line: 3, isThirdParty: false },
      ];

      const contexts = await readContexts(frames, { projectRoot: tempDir });

      expect(contexts).toHaveLength(2);
      expect(contexts[0].file).toBe(file1);
      expect(contexts[1].file).toBe(file2);
    });

    it('should filter out null contexts', async () => {
      const file1 = path.join(tempDir, 'file1.ts');
      await fs.writeFile(file1, 'Line 1\nLine 2');

      const frames: StackFrame[] = [
        { file: file1, line: 1, isThirdParty: false },
        { file: path.join(tempDir, 'non-existent.ts'), line: 1, isThirdParty: false },
      ];

      const contexts = await readContexts(frames, { projectRoot: tempDir });

      expect(contexts).toHaveLength(1);
      expect(contexts[0].file).toBe(file1);
    });
  });

  describe('formatContextSnippet', () => {
    it('should format snippet with proper alignment', () => {
      const context: CodeContext = {
        file: '/test.ts',
        line: 10,
        snippet: [
          { line: 8, code: 'line 8', highlight: false },
          { line: 9, code: 'line 9', highlight: false },
          { line: 10, code: 'line 10', highlight: true },
          { line: 11, code: 'line 11', highlight: false },
        ],
      };

      const formatted = formatContextSnippet(context);
      const lines = formatted.split('\n');

      expect(lines[0]).toBe('   8 | line 8');
      expect(lines[1]).toBe('   9 | line 9');
      expect(lines[2]).toBe('> 10 | line 10');
      expect(lines[3]).toBe('  11 | line 11');
    });

    it('should handle large line numbers', () => {
      const context: CodeContext = {
        file: '/test.ts',
        line: 1000,
        snippet: [
          { line: 999, code: 'prev', highlight: false },
          { line: 1000, code: 'current', highlight: true },
        ],
      };

      const formatted = formatContextSnippet(context);
      const lines = formatted.split('\n');

      expect(lines[0]).toBe('   999 | prev');
      expect(lines[1]).toBe('> 1000 | current');
    });
  });

  describe('contextToJSON', () => {
    it('should convert context to JSON-serializable object', () => {
      const context: CodeContext = {
        file: '/test.ts',
        line: 10,
        column: 5,
        snippet: [
          { line: 9, code: 'prev', highlight: false },
          { line: 10, code: 'current', highlight: true },
        ],
      };

      const json = contextToJSON(context);

      expect(json).toEqual({
        file: '/test.ts',
        line: 10,
        column: 5,
        snippet: [
          { line: 9, code: 'prev', highlight: false },
          { line: 10, code: 'current', highlight: true },
        ],
      });
    });

    it('should omit column if undefined', () => {
      const context: CodeContext = {
        file: '/test.ts',
        line: 10,
        snippet: [{ line: 10, code: 'line', highlight: true }],
      };

      const json = contextToJSON(context);

      expect(json.column).toBeUndefined();
      expect(json).not.toHaveProperty('column');
    });
  });
});
