// ErrorPare - Enhanced Deduplicator (Phase 2 - Fixed)

import { VARIABLE_PATTERNS, ERROR_TYPE_PATTERNS } from '../../utils/constants.js';
import type { CompressedError, Variable, ProgrammingLanguage } from '../../types/index.js';

export interface DeduplicationResult {
  errors: CompressedError[];
  originalCount: number;
  compressedCount: number;
  rate: number;
}

/**
 * Masks variables in a string (IP, UUID, Hex, path, numbers, strings)
 * Returns both the masked version and the extracted variables
 */
export function maskVariables(line: string): { masked: string; variables: Variable[] } {
  const variables: Variable[] = [];
  
  let masked = line;
  
  // Mask IP addresses
  masked = masked.replace(VARIABLE_PATTERNS.IP, (match) => {
    variables.push({ name: 'ip', value: match, type: 'ip' });
    return '<IP>';
  });
  
  // Mask UUIDs
  masked = masked.replace(VARIABLE_PATTERNS.UUID, (match) => {
    variables.push({ name: 'uuid', value: match, type: 'uuid' });
    return '<UUID>';
  });
  
  // Mask Hex numbers
  masked = masked.replace(VARIABLE_PATTERNS.HEX, (match) => {
    variables.push({ name: 'hex', value: match, type: 'hex' });
    return '<HEX>';
  });
  
  // Mask generic strings/quoted values (like "value A", "value B")
  masked = masked.replace(/"([^"]+)"/g, (match, p1) => {
    // Skip if it looks like a file path or known pattern
    if (p1.includes('/') || p1.includes('\\') || p1.includes('.py') || p1.includes('.js')) {
      return match;
    }
    variables.push({ name: 'string', value: p1, type: 'identifier' });
    return '<STRING>';
  });
  
  // Mask file paths (simplified)
  masked = masked.replace(/\/([a-zA-Z0-9_-]+\/)*([a-zA-Z0-9_-]+\.[a-zA-Z]+)/g, (match) => {
    variables.push({ name: 'path', value: match, type: 'path' });
    return '<PATH>';
  });
  
  // Mask numbers that look like IDs (but not line numbers in stack traces)
  masked = masked.replace(/\b(\d{4,})\b/g, (match) => {
    // Skip if it looks like a line number (common stack trace pattern)
    if (/:\d+$/.test(masked.replace(match, '')) || /line\s+\d+/i.test(masked.replace(match, ''))) {
      return match;
    }
    variables.push({ name: 'number', value: match, type: 'number' });
    return '<NUM>';
  });
  
  return { masked, variables };
}

/**
 * Extracts error type from a line
 */
export function extractErrorType(line: string): string {
  for (const [type, pattern] of Object.entries(ERROR_TYPE_PATTERNS)) {
    const match = line.match(pattern);
    if (match) {
      return type;
    }
  }
  return 'Error';
}

/**
 * Creates a template key from an error line
 * The template is the masked version that enables grouping similar errors
 */
export function createTemplateKey(line: string): string {
  // First mask variables
  const { masked } = maskVariables(line);
  
  // Normalize whitespace
  const normalized = masked.replace(/\s+/g, ' ').trim();
  
  return normalized;
}

/**
 * Groups similar error lines together
 * Enhanced to properly merge errors with same template but different variable values
 */
export function deduplicateErrors(lines: string[], language: ProgrammingLanguage): DeduplicationResult {
  const errorMap = new Map<string, CompressedError>();
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('<Third-party')) {
      continue;
    }
    
    const templateKey = createTemplateKey(trimmed);
    const errorType = extractErrorType(trimmed);
    const { masked, variables } = maskVariables(trimmed);
    
    if (errorMap.has(templateKey)) {
      const existing = errorMap.get(templateKey)!;
      existing.count++;
      
      // Merge variables - collect ALL unique variable values from similar errors
      for (const v of variables) {
        // Check if variable with same name but different value exists
        const existingVar = existing.variables.find(ev => ev.name === v.name);
        if (existingVar) {
          // Variable exists - add new value if different
          if (!existingVar.value.includes(v.value) && existingVar.value !== v.value) {
            existingVar.value = `${existingVar.value}, ${v.value}`;
          }
        } else {
          // New variable - add it
          existing.variables.push({ ...v });
        }
      }
      
      // Update location if different
      const newLocation = extractLocation(trimmed, language);
      if (newLocation && newLocation !== existing.location) {
        existing.location = `${existing.location}, ${newLocation}`;
      }
    } else {
      errorMap.set(templateKey, {
        count: 1,
        type: errorType,
        message: masked,
        template: templateKey,
        location: extractLocation(trimmed, language),
        variables: variables,
      });
    }
  }
  
  const errors = Array.from(errorMap.values());
  const originalCount = lines.filter(l => l.trim() && !l.startsWith('<Third-party')).length;
  const compressedCount = errors.length;
  const rate = originalCount > 0 ? (originalCount - compressedCount) / originalCount : 0;
  
  return {
    errors,
    originalCount,
    compressedCount,
    rate,
  };
}

/**
 * Extracts file location from error line
 */
function extractLocation(line: string, language: ProgrammingLanguage): string | undefined {
  // Try to find file:line pattern for different languages
  const patterns: Record<string, RegExp> = {
    javascript: /(?:at\s+)?([^\s]+\.(?:js|ts|jsx|tsx)):?(\d+)?/,
    typescript: /(?:at\s+)?([^\s]+\.(?:js|ts|jsx|tsx)):?(\d+)?/,
    python: /File\s+"(.+?)",\s+line\s+(\d+)/,
    java: /at\s+(.+?)\((.+?):(\d+)\)/,
    go: /(.+?):(\d+):?(\d+)?/,
    rust: /(.+?):(\d+):(\d+)/,
    cpp: /(.+?):(\d+):?(\d+)?/,
    ruby: /(.+?):(\d+):?(\d+)?/,
    php: /(.+?):(\d+):?(\d+)?/,
    csharp: /(.+?)\.(\w+)\((\d+)\)/,
    unknown: /(?:at\s+)?([^\s]+\.(?:js|ts|py|go|rs|java|cpp|rb|php|cs)):?(\d+)?/,
  };
  
  const pattern = patterns[language] || patterns.unknown;
  const match = line.match(pattern);
  
  if (match) {
    const file = match[1];
    const lineNum = match[2];
    return lineNum ? `${file}:${lineNum}` : file;
  }
  
  return undefined;
}

/**
 * Simple line limiter - keeps only the last N lines
 */
export function limitLines(input: string, maxLines: number = 1000): string {
  const lines = input.split('\n');
  if (lines.length <= maxLines) {
    return input;
  }
  return lines.slice(-maxLines).join('\n');
}
