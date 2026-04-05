// ErrorPare - Main Compressor

import chalk from 'chalk';
import { readContexts } from './context/context-reader.js';
import { applyGitAwareFilter } from './filters/git-aware.js';
import { deduplicateErrors, limitLines } from './filters/deduplicator.js';
import {
  parseStackTrace,
  splitPythonTracebacks,
  stackTraceToCompressed,
  type ParsedStackTrace,
  type StackFrame,
} from './parsers/stack-trace.js';
import {
  SourceMapResolver,
  getFrameDisplayLocation,
  getFrameGeneratedLocation,
} from './source-maps/source-map-resolver.js';
import type { CompressedError, CompressionResult, ErrorPareOptions, ProgrammingLanguage } from '../types/index.js';
import { DEFAULT_OPTIONS } from '../types/index.js';

export { Drain3Miner } from './filters/drain3.js';
export { parseStackTrace, stackTraceToCompressed, splitPythonTracebacks } from './parsers/stack-trace.js';
export { readContexts } from './context/context-reader.js';

const snippetChalk = new chalk.Instance({ level: 1 });

const JAVASCRIPT_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
  'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'private', 'protected',
  'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'type', 'typeof',
  'undefined', 'var', 'void', 'while', 'yield', 'from', 'as', 'readonly', 'declare', 'module',
]);

const PYTHON_KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else',
  'except', 'False', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'None',
  'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'True', 'try', 'while', 'with', 'yield',
]);

const ACTIONABLE_ERROR_PATTERN =
  /(?:^|[\s\]])(?:(?:\w+(?:Error|Exception))|panic|fatal|error|exception|failed|failure|denied|invalid|unable)\b[:\s-]/i;
const BRACKETED_LOG_PATTERN = /^\[[^\]]+\]\s*/;
const TIMESTAMPED_LOG_PATTERN = /^(?:\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}|\d{2}:\d{2}:\d{2}(?:[.,]\d+)?)/;
const LOG_LEVEL_PATTERN = /^(?:trace|debug|info|notice|warn|warning)\b[:\s-]/i;
const STRUCTURED_FIELD_PATTERN = /\b[a-zA-Z_][\w.-]*=[^\s]+/g;
const PROGRESS_LOG_PATTERN =
  /\b(?:attempt|completed|completing|finished|retry|retrying|running|starting|started|stage|step|tenant|worker|job|task)\b/i;
const TEXT_DIVIDER = '-'.repeat(63);

function getErrorMergeKey(error: Pick<CompressedError, 'template' | 'message'>): string {
  return error.template || error.message.substring(0, 100);
}

function getKeywordSet(language: ProgrammingLanguage): Set<string> {
  if (language === 'python') {
    return PYTHON_KEYWORDS;
  }

  return JAVASCRIPT_KEYWORDS;
}

function highlightCode(code: string, language: ProgrammingLanguage): string {
  const keywords = getKeywordSet(language);

  return code.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, token => {
    if (!keywords.has(token)) {
      return token;
    }

    return snippetChalk.blueBright(token);
  });
}

function isNoiseOnlyBlock(block: string, parsed: ParsedStackTrace): boolean {
  if (parsed.frames.length > 0 || parsed.type !== 'Error') {
    return false;
  }

  const [firstLineRaw = ''] = block.split('\n');
  const firstLine = firstLineRaw.trim();
  if (!firstLine) {
    return true;
  }

  if (ACTIONABLE_ERROR_PATTERN.test(firstLine)) {
    return false;
  }

  const structuredFields = firstLine.match(STRUCTURED_FIELD_PATTERN) ?? [];
  if (structuredFields.length >= 2) {
    return true;
  }

  const hasLogPrefix =
    BRACKETED_LOG_PATTERN.test(firstLine) ||
    TIMESTAMPED_LOG_PATTERN.test(firstLine) ||
    LOG_LEVEL_PATTERN.test(firstLine);

  return hasLogPrefix && (structuredFields.length >= 1 || PROGRESS_LOG_PATTERN.test(firstLine));
}

export function formatHighlightedSnippet(
  snippet: CodeSnippetLike[],
  language: ProgrammingLanguage = 'unknown',
): string[] {
  if (snippet.length === 0) {
    return [];
  }

  const maxLineNum = Math.max(...snippet.map(line => line.line));
  const lineNumWidth = Math.max(4, maxLineNum.toString().length);

  return snippet.map(snippetLine => {
    const marker = snippetLine.highlight ? snippetChalk.red('>') : snippetChalk.gray(' ');
    const lineNum = snippetChalk.cyan(String(snippetLine.line).padStart(lineNumWidth, ' '));
    const separator = snippetChalk.gray(' | ');
    const code = highlightCode(snippetLine.code, language);
    return `${marker} ${lineNum}${separator}${code}`;
  });
}

interface CodeSnippetLike {
  line: number;
  code: string;
  highlight: boolean;
}

export class Compressor {
  private options: ErrorPareOptions;
  private sourceMapResolver: SourceMapResolver;

  constructor(options: ErrorPareOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.sourceMapResolver = new SourceMapResolver({
      projectRoot: this.options.projectRoot || process.cwd(),
    });
  }

  detectLanguage(content: string): ProgrammingLanguage {
    const lowerContent = content.toLowerCase();

    if (/\b(?:at\s+[^\s]+\s*\([^)]*:\d+:\d+\))/i.test(content) || content.includes('.js:') || content.includes('.ts:')) {
      return content.includes('.ts:') ? 'typescript' : 'javascript';
    }
    if (lowerContent.includes('traceback') || /File\s+"[^"]+",\s+line\s+\d+/.test(content)) {
      return 'python';
    }
    if (lowerContent.includes('panic:') || lowerContent.includes('goroutine')) {
      return 'go';
    }
    if (lowerContent.includes('exception') || /at\s+[a-zA-Z0-9_]+\([a-zA-Z0-9_]+\.java:\d+\)/.test(content)) {
      return 'java';
    }
    if (content.includes('.rs:') || lowerContent.includes('cargo')) {
      return 'rust';
    }
    if (lowerContent.includes('c++') || /error:\s*/i.test(content)) {
      return 'cpp';
    }
    return 'unknown';
  }

  private compressStackTrace(parsed: ParsedStackTrace, language: ProgrammingLanguage): CompressionResult['errors'][0] {
    const normalized = stackTraceToCompressed(parsed, language);
    const lines = normalized.split('\n').filter(line => line.trim());

    const { errors } = deduplicateErrors(lines, language);
    const mainError = errors[0] || { message: normalized, template: normalized, variables: [] };

    const errorType = parsed.type || 'Error';

    const firstBusinessFrame = parsed.frames.find((frame: any) => !frame.isThirdParty);
    const displayFrame = firstBusinessFrame || parsed.frames[0];
    const location = displayFrame ? getFrameDisplayLocation(displayFrame) : undefined;
    const originalLocation = displayFrame ? getFrameGeneratedLocation(displayFrame) : undefined;

    return {
      count: 1,
      type: errorType,
      message: mainError.message.replace(/^Error: /, ''),
      template: mainError.template,
      variables: mainError.variables,
      location,
      originalLocation,
    };
  }

  async compress(input: string, command?: string, exitCode: number = 0): Promise<CompressionResult> {
    const startTime = Date.now();
    const options = this.options;

    const limited = options.maxLines ? limitLines(input, options.maxLines) : input;
    const originalLines = limited.split('\n').length;
    const language = options.language || this.detectLanguage(limited);
    const shouldRestoreSourceMaps =
      options.sourceMaps !== false && (language === 'javascript' || language === 'typescript' || language === 'unknown');

    let filtered = limited;
    let thirdPartyCollapsed = 0;

    if (options.gitAware && !shouldRestoreSourceMaps) {
      const projectRoot = options.projectRoot || process.cwd();
      const { filtered: gitFiltered, stats } = applyGitAwareFilter(limited, { projectRoot, language });
      filtered = gitFiltered;
      thirdPartyCollapsed = stats.hiddenFrames;
    }

    const dedupStart = Date.now();
    const parsedStackTraces: ParsedStackTrace[] = [];
    let thirdPartyCount = 0;
    let sourceMappedFrames = 0;

    if (language === 'python') {
      const tracebackBlocks = splitPythonTracebacks(filtered);
      for (const block of tracebackBlocks) {
        const parsed = parseStackTrace(block, language);
        if (!isNoiseOnlyBlock(block, parsed) && (parsed.frames.length > 0 || parsed.type !== 'Error' || parsed.message)) {
          parsedStackTraces.push(parsed);
          thirdPartyCount += parsed.frames.filter(frame => frame.isThirdParty).length;
        }
      }
    } else {
      const blocks = filtered.split(/(?:\n\n+|\n(?=panic:|Exception|Error:))/);
      for (const block of blocks) {
        if (!block.trim()) continue;
        const parsed = parseStackTrace(block.trim(), language);
        if (!isNoiseOnlyBlock(block, parsed) && (parsed.frames.length > 0 || parsed.type !== 'Error' || parsed.message)) {
          parsedStackTraces.push(parsed);
          thirdPartyCount += parsed.frames.filter(frame => frame.isThirdParty).length;
        }
      }
      if (parsedStackTraces.length === 0) {
        const fallbackParsed = parseStackTrace(filtered, language);
        if (!isNoiseOnlyBlock(filtered, fallbackParsed)) {
          parsedStackTraces.push(fallbackParsed);
        }
      }
    }

    if (shouldRestoreSourceMaps) {
      for (const parsed of parsedStackTraces) {
        const restored = await this.sourceMapResolver.restoreParsedStackTrace(parsed);
        sourceMappedFrames += restored.restoredFrames;
      }
    }

    if (thirdPartyCount > 0) thirdPartyCollapsed = thirdPartyCount;

    const compressedErrors: CompressionResult['errors'] = [];
    const mergeKeyToFrame = new Map<string, StackFrame>();

    for (const parsed of parsedStackTraces) {
      const compressedError = this.compressStackTrace(parsed, language);
      compressedErrors.push(compressedError);

      const relevantFrame = parsed.frames.find(frame => !frame.isThirdParty) || parsed.frames[0];
      const mergeKey = getErrorMergeKey(compressedError);
      if (relevantFrame && !mergeKeyToFrame.has(mergeKey)) {
        mergeKeyToFrame.set(mergeKey, relevantFrame);
      }
    }

    const mergedErrors = this.mergeErrors(compressedErrors);

    const contextLines = Math.min(Math.max(0, options.contextLines ?? 5), 20);
    if (contextLines > 0) {
      await this.enrichErrorsWithContext(mergedErrors, mergeKeyToFrame, contextLines);
    }

    const compressionTime = Date.now() - dedupStart;
    const compressedLines = mergedErrors.length;
    const rate =
      originalLines > 0 ? Math.max(0, (originalLines - compressedLines) / originalLines) : 0;
    const summary = this.buildSummary(mergedErrors, originalLines, thirdPartyCollapsed);
    const totalTime = Date.now() - startTime;

    return {
      success: exitCode === 0,
      exitCode,
      command: command || '',
      timing: { total: totalTime, compression: compressionTime },
      compression: {
        originalLines,
        compressedLines,
        rate,
        uniqueErrors: mergedErrors.length,
        thirdPartyCollapsed: thirdPartyCollapsed > 0 ? thirdPartyCollapsed : undefined,
        sourceMappedFrames: sourceMappedFrames > 0 ? sourceMappedFrames : undefined,
      },
      errors: mergedErrors,
      summary,
    };
  }

  private async enrichErrorsWithContext(
    errors: CompressedError[],
    mergeKeyToFrame: Map<string, StackFrame>,
    contextLines: number,
  ): Promise<void> {
    const projectRoot = this.options.projectRoot || process.cwd();
    const pendingFrames = errors
      .map(error => ({
        error,
        frame: mergeKeyToFrame.get(getErrorMergeKey(error)),
      }))
      .filter((entry): entry is { error: CompressedError; frame: StackFrame } => entry.frame !== undefined);

    if (pendingFrames.length === 0) {
      return;
    }

    const contexts = await Promise.all(
      pendingFrames.map(({ frame }) =>
        readContexts([frame], {
          projectRoot,
          contextLines,
        }).then(results => results[0] ?? null),
      ),
    );

    pendingFrames.forEach(({ error }, index) => {
      const context = contexts[index];
      if (context) {
        error.context = context;
      }
    });
  }

  private mergeErrors(errors: CompressionResult['errors']): CompressionResult['errors'] {
    const errorMap = new Map<string, CompressionResult['errors'][0]>();

    for (const error of errors) {
      const key = getErrorMergeKey(error);

      if (errorMap.has(key)) {
        const existing = errorMap.get(key)!;
        existing.count += error.count;

        for (const variable of error.variables) {
          const existingVar = existing.variables.find(entry => entry.name === variable.name);
          if (existingVar) {
            if (!existingVar.value.includes(variable.value)) {
              existingVar.value = `${existingVar.value}, ${variable.value}`;
            }
          } else {
            existing.variables.push({ ...variable });
          }
        }

        if (error.location && error.location !== existing.location) {
          if (!existing.location?.includes(error.location)) {
            existing.location = `${existing.location}, ${error.location}`;
          }
        }

        if (error.originalLocation && error.originalLocation !== existing.originalLocation) {
          if (!existing.originalLocation?.includes(error.originalLocation)) {
            existing.originalLocation = existing.originalLocation
              ? `${existing.originalLocation}, ${error.originalLocation}`
              : error.originalLocation;
          }
        }
      } else {
        errorMap.set(key, { ...error });
      }
    }

    return Array.from(errorMap.values());
  }

  private buildSummary(errors: CompressionResult['errors'], originalLines: number, thirdPartyCollapsed: number): string {
    const parts: string[] = [];
    if (thirdPartyCollapsed > 0) parts.push(`${thirdPartyCollapsed} third-party frames collapsed`);
    if (errors.length > 0) {
      const totalCount = errors.reduce((sum, error) => sum + error.count, 0);
      const topError = [...errors].sort((a, b) => b.count - a.count)[0];
      parts.push(`${errors.length} unique errors from ${totalCount} occurrences`);
      parts.push(`Most common: ${topError.type} (${topError.count}x)`);
    } else {
      parts.push('No errors found');
    }
    return parts.join('. ');
  }

  formatAsText(result: CompressionResult): string {
    const lines: string[] = [];
    const language = this.options.language || 'unknown';

    if (result.command.trim()) {
      lines.push(
        `[ErrorPare] ${result.command} ${result.exitCode === 0 ? 'succeeded' : 'failed'} (exit code ${result.exitCode})`,
      );
    }
    if (result.compression.thirdPartyCollapsed) {
      lines.push(`[ErrorPare] Git-aware trimming: ${result.compression.thirdPartyCollapsed} third-party frames collapsed`);
    }
    if (result.compression.sourceMappedFrames) {
      lines.push(`[ErrorPare] Source maps restored: ${result.compression.sourceMappedFrames} frame(s)`);
    }
    lines.push(
      `[ErrorPare] Compression: ${Math.round(result.compression.rate * 100)}% (${result.compression.originalLines} -> ${result.compression.compressedLines} lines)`,
    );
    lines.push('');
    lines.push(TEXT_DIVIDER);
    lines.push('');
    for (const error of result.errors) {
      lines.push(`[${error.count}x] ${error.type}: ${error.message}`);
      if (error.location) lines.push(`  Location: ${error.location}`);
      if (error.originalLocation) lines.push(`  Generated: ${error.originalLocation}`);
      if (error.variables.length > 0) {
        lines.push(`  Variables: ${error.variables.map(variable => `${variable.name}=${variable.value}`).join(', ')}`);
      }
      if (error.suggestion) lines.push(`  Suggestion: ${error.suggestion}`);

      if (error.context && error.context.snippet.length > 0) {
        lines.push('');
        lines.push('  Code Context:');
        lines.push(`  ${error.context.file}:${error.context.line}`);
        lines.push('  ```');
        for (const highlightedLine of formatHighlightedSnippet(error.context.snippet, language)) {
          lines.push(`  ${highlightedLine}`);
        }
        lines.push('  ```');
      }

      lines.push('');
    }
    lines.push(TEXT_DIVIDER);
    lines.push('');
    lines.push(`Summary: ${result.summary}`);
    return lines.join('\n');
  }
}

export async function compress(input: string, options?: ErrorPareOptions): Promise<CompressionResult> {
  const compressor = new Compressor(options);
  return compressor.compress(input);
}
