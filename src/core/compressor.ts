// ErrorPare - Main Compressor

import { applyGitAwareFilter } from './filters/git-aware.js';
import { deduplicateErrors, limitLines } from './filters/deduplicator.js';
import { parseStackTrace, stackTraceToCompressed, splitPythonTracebacks, type ParsedStackTrace } from './parsers/stack-trace.js';
import type { CompressionResult, ErrorPareOptions, ProgrammingLanguage } from '../types/index.js';
import { DEFAULT_OPTIONS } from '../types/index.js';

export { Drain3Miner } from './filters/drain3.js';
export { parseStackTrace, stackTraceToCompressed, splitPythonTracebacks } from './parsers/stack-trace.js';

export class Compressor {
  private options: ErrorPareOptions;
  
  constructor(options: ErrorPareOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  detectLanguage(content: string): ProgrammingLanguage {
    const lowerContent = content.toLowerCase();
    
    if (/\b(?:at\s+[^\s]+\s*\([^)]*:\d+:\d+\))/i.test(content) ||
        content.includes('.js:') || content.includes('.ts:')) {
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
    const lines = normalized.split('\n').filter(l => l.trim());
    
    // Use deduplicateErrors to get proper masking and variables
    const { errors } = deduplicateErrors(lines, language);
    const mainError = errors[0] || { message: normalized, template: normalized, variables: [] };
    
    const errorType = parsed.type || 'Error';
    
    const firstBusinessFrame = parsed.frames.find((f: any) => !f.isThirdParty);
    const location = firstBusinessFrame 
      ? `${firstBusinessFrame.file}:${firstBusinessFrame.line}`
      : (parsed.frames[0] ? `${parsed.frames[0].file}:${parsed.frames[0].line}` : undefined);
    
    return {
      count: 1,
      type: errorType,
      message: mainError.message.replace(/^Error: /, ''),
      template: mainError.template,
      variables: mainError.variables,
      location,
    };
  }
  
  compress(input: string, command?: string, exitCode: number = 0): CompressionResult {
    const startTime = Date.now();
    const options = this.options;
    
    const limited = options.maxLines ? limitLines(input, options.maxLines) : input;
    const originalLines = limited.split('\n').length;
    const language = options.language || this.detectLanguage(limited);
    
    let filtered = limited;
    let thirdPartyCollapsed = 0;
    
    if (options.gitAware) {
      const projectRoot = options.projectRoot || process.cwd();
      const { filtered: gitFiltered, stats } = applyGitAwareFilter(limited, { projectRoot, language });
      filtered = gitFiltered;
      thirdPartyCollapsed = stats.hiddenFrames;
    }
    
    const dedupStart = Date.now();
    let parsedStackTraces: ParsedStackTrace[] = [];
    let thirdPartyCount = 0;
    
    if (language === 'python') {
      const tracebackBlocks = splitPythonTracebacks(filtered);
      for (const block of tracebackBlocks) {
        const parsed = parseStackTrace(block, language);
        if (parsed.frames.length > 0 || parsed.type !== 'Error' || parsed.message) {
          parsedStackTraces.push(parsed);
          thirdPartyCount += parsed.frames.filter(f => f.isThirdParty).length;
        }
      }
    } else {
      const blocks = filtered.split(/(?:\n\n+|\n(?=panic:|Exception|Error:))/);
      for (const block of blocks) {
        if (!block.trim()) continue;
        const parsed = parseStackTrace(block.trim(), language);
        if (parsed.frames.length > 0 || parsed.type !== 'Error' || parsed.message) {
          parsedStackTraces.push(parsed);
          thirdPartyCount += parsed.frames.filter(f => f.isThirdParty).length;
        }
      }
      if (parsedStackTraces.length === 0) {
        parsedStackTraces.push(parseStackTrace(filtered, language));
      }
    }
    
    if (thirdPartyCount > 0) thirdPartyCollapsed = thirdPartyCount;
    
    const compressedErrors: CompressionResult['errors'] = [];
    for (const parsed of parsedStackTraces) {
      compressedErrors.push(this.compressStackTrace(parsed, language));
    }
    
    const mergedErrors = this.mergeErrors(compressedErrors);
    const compressionTime = Date.now() - dedupStart;
    const totalOriginal = parsedStackTraces.length || 1;
    const rate = totalOriginal > 0 ? Math.max(0, (totalOriginal - mergedErrors.length) / totalOriginal) : 0;
    const summary = this.buildSummary(mergedErrors, originalLines, thirdPartyCollapsed);
    const totalTime = Date.now() - startTime;
    
    return {
      success: exitCode === 0,
      exitCode,
      command: command || '',
      timing: { total: totalTime, compression: compressionTime },
      compression: {
        originalLines,
        compressedLines: mergedErrors.length,
        rate,
        uniqueErrors: mergedErrors.length,
        thirdPartyCollapsed: thirdPartyCollapsed > 0 ? thirdPartyCollapsed : undefined,
      },
      errors: mergedErrors,
      summary,
    };
  }
  
  private mergeErrors(errors: CompressionResult['errors']): CompressionResult['errors'] {
    const errorMap = new Map<string, CompressionResult['errors'][0]>();
    
    for (const error of errors) {
      const key = error.template || error.message.substring(0, 100);
      
      if (errorMap.has(key)) {
        const existing = errorMap.get(key)!;
        existing.count += error.count;
        
        for (const v of error.variables) {
          const existingVar = existing.variables.find(ev => ev.name === v.name);
          if (existingVar) {
            if (!existingVar.value.includes(v.value)) {
              existingVar.value = `${existingVar.value}, ${v.value}`;
            }
          } else {
            existing.variables.push({ ...v });
          }
        }
        
        if (error.location && error.location !== existing.location) {
          if (!existing.location?.includes(error.location)) {
            existing.location = `${existing.location}, ${error.location}`;
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
      const totalCount = errors.reduce((sum, e) => sum + e.count, 0);
      const topError = errors.sort((a, b) => b.count - a.count)[0];
      parts.push(`${errors.length} unique errors from ${totalCount} occurrences`);
      parts.push(`Most common: ${topError.type} (${topError.count}x)`);
    } else {
      parts.push('No errors found');
    }
    return parts.join('. ');
  }
  
  formatAsText(result: CompressionResult): string {
    const lines: string[] = [];
    lines.push(`[ErrorPare] ${result.command} ${result.exitCode === 0 ? 'succeeded' : 'failed'} (exit code ${result.exitCode})`);
    if (result.compression.thirdPartyCollapsed) {
      lines.push(`[ErrorPare] Git-aware trimming: ${result.compression.thirdPartyCollapsed} third-party frames collapsed`);
    }
    lines.push(`[ErrorPare] Compression: ${Math.round(result.compression.rate * 100)}% (${result.compression.originalLines} → ${result.compression.compressedLines} lines)`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    for (const error of result.errors) {
      lines.push(`[${error.count}x] ${error.type}: ${error.message}`);
      if (error.location) lines.push(`  Location: ${error.location}`);
      if (error.variables.length > 0) {
        lines.push(`  Variables: ${error.variables.map(v => `${v.name}=${v.value}`).join(', ')}`);
      }
      if (error.suggestion) lines.push(`  → ${error.suggestion}`);
      lines.push('');
    }
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Summary: ${result.summary}`);
    return lines.join('\n');
  }
}

export function compress(input: string, options?: ErrorPareOptions): CompressionResult {
  const compressor = new Compressor(options);
  return compressor.compress(input);
}
