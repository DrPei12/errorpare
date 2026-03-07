// ErrorPare - Context Reader for Code Snippets
// Reads source code context around error locations

import * as fs from 'fs/promises';
import * as path from 'path';
import type { StackFrame } from '../parsers/stack-trace.js';

export interface CodeSnippetLine {
  line: number;
  code: string;
  highlight: boolean;
}

export interface CodeContext {
  file: string;
  line: number;
  column?: number;
  snippet: CodeSnippetLine[];
}

export interface ContextReaderOptions {
  /** Number of context lines before and after the error line (default: 5) */
  contextLines?: number;
  /** Maximum file size to read in bytes (default: 1MB) */
  maxFileSize?: number;
  /** Project root directory for security validation */
  projectRoot?: string;
}

const DEFAULT_OPTIONS: Required<ContextReaderOptions> = {
  contextLines: 5,
  maxFileSize: 1024 * 1024, // 1MB
  projectRoot: process.cwd(),
};

/**
 * Check if a file is likely binary by reading first 4KB and checking for null bytes
 */
async function isBinaryFile(filePath: string): Promise<boolean> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(4096);
    const { bytesRead } = await fd.read(buffer, 0, 4096, 0);
    await fd.close();

    // Check for null bytes in the first chunk
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) return true;
    }
    return false;
  } catch {
    return true; // Treat unreadable files as binary
  }
}

function buildContextFromContent(
  frame: StackFrame,
  content: string,
  contextLines: number
): CodeContext | null {
  const lines = content.split('\n');

  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) {
    return null;
  }

  const targetLine = frame.line;
  if (targetLine < 1 || targetLine > lines.length) {
    return null;
  }

  const startLine = Math.max(1, targetLine - contextLines);
  const endLine = Math.min(lines.length, targetLine + contextLines);
  const snippet: CodeSnippetLine[] = [];

  for (let i = startLine; i <= endLine; i++) {
    snippet.push({
      line: i,
      code: lines[i - 1],
      highlight: i === targetLine,
    });
  }

  return {
    file: frame.file,
    line: targetLine,
    column: frame.column,
    snippet,
  };
}

/**
 * Validate that the file path is within the project root (security check)
 */
function isPathSafe(filePath: string, projectRoot: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedRoot = path.resolve(projectRoot);

  if (resolvedPath === resolvedRoot) {
    return false;
  }

  const relativePath = path.relative(resolvedRoot, resolvedPath);
  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
}

/**
 * Read context around a specific line in a file
 *
 * @param frame - Stack frame containing file path and line number
 * @param options - Configuration options
 * @returns CodeContext with snippet or null if file can't be read
 */
export async function readContext(
  frame: StackFrame,
  options: ContextReaderOptions = {}
): Promise<CodeContext | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const contextLines = Math.max(0, opts.contextLines);
  const maxFileSize = Math.max(0, opts.maxFileSize);
  const projectRoot = opts.projectRoot;

  try {
    if (typeof frame.sourceContent === 'string') {
      const inlineContext = buildContextFromContent(frame, frame.sourceContent, contextLines);
      if (inlineContext) {
        return inlineContext;
      }
    }

    // Validate file path for security
    if (!isPathSafe(frame.file, projectRoot)) {
      console.warn(`[ContextReader] Security: File ${frame.file} is outside project root`);
      return null;
    }

    // Check if file exists
    const stats = await fs.stat(frame.file).catch(() => null);
    if (!stats || !stats.isFile()) {
      return null;
    }

    // Check file size limit
    if (stats.size > maxFileSize) {
      console.warn(`[ContextReader] File ${frame.file} exceeds size limit (${maxFileSize} bytes)`);
      return null;
    }

    // Skip binary files
    if (await isBinaryFile(frame.file)) {
      return null;
    }

    // Read file content
    const content = await fs.readFile(frame.file, 'utf-8');
    const context = buildContextFromContent(frame, content, contextLines);
    if (!context) {
      console.warn(`[ContextReader] Line ${frame.line} out of bounds (file has ${content.split('\n').length} lines)`);
      return null;
    }

    return context;
  } catch (error) {
    console.warn(`[ContextReader] Failed to read context for ${frame.file}:${frame.line}:`, error);
    return null;
  }
}

/**
 * Read context for multiple stack frames
 *
 * @param frames - Array of stack frames
 * @param options - Configuration options
 * @returns Array of CodeContext objects (nulls filtered out)
 */
export async function readContexts(
  frames: StackFrame[],
  options: ContextReaderOptions = {}
): Promise<CodeContext[]> {
  const contexts = await Promise.all(
    frames.map(frame => readContext(frame, options))
  );
  return contexts.filter((ctx): ctx is CodeContext => ctx !== null);
}

/**
 * Format context snippet for display (text format)
 *
 * @param context - CodeContext to format
 * @returns Formatted string with line numbers
 */
export function formatContextSnippet(context: CodeContext): string {
  const lines: string[] = [];
  const maxLineNum = Math.max(...context.snippet.map(s => s.line));
  const lineNumWidth = maxLineNum.toString().length;

  for (const { line, code, highlight } of context.snippet) {
    const lineNum = line.toString().padStart(lineNumWidth, ' ');
    const prefix = highlight ? '> ' : '  ';
    lines.push(`${prefix}${lineNum} | ${code}`);
  }

  return lines.join('\n');
}

/**
 * Format context snippet for JSON output
 *
 * @param context - CodeContext to format
 * @returns Clean JSON-serializable object
 */
export function contextToJSON(context: CodeContext): Record<string, unknown> {
  return {
    file: context.file,
    line: context.line,
    ...(context.column !== undefined && { column: context.column }),
    snippet: context.snippet.map(({ line, code, highlight }) => ({
      line,
      code,
      highlight,
    })),
  };
}
