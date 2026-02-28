// ErrorPare - Git-Aware Stack Frame Filter

import { THIRD_PARTY_PATTERNS, STACK_TRACE_PATTERNS } from '../../utils/constants.js';
import type { StackFrame, ProgrammingLanguage } from '../../types/index.js';

export interface GitAwareOptions {
  projectRoot: string;
  language: ProgrammingLanguage;
}

/**
 * Detects if a path is from a third-party framework/library
 */
export function isThirdPartyPath(path: string, projectRoot: string): boolean {
  // Normalize path separators
  const normalizedPath = path.replace(/\\/g, '/');
  
  // Check if it's a relative path from project
  if (projectRoot && normalizedPath.startsWith(projectRoot)) {
    const relativePath = normalizedPath.slice(projectRoot.length);
    return THIRD_PARTY_PATTERNS.some(pattern => 
      relativePath.includes(pattern)
    );
  }
  
  // Direct third-party path detection
  return THIRD_PARTY_PATTERNS.some(pattern => 
    normalizedPath.includes(pattern)
  );
}

/**
 * Extracts framework/library name from path
 */
export function extractFrameworkName(path: string): string {
  const normalizedPath = path.replace(/\\/g, '/');
  
  for (const [pattern, name] of Object.entries({
    'node_modules/express': 'express',
    'node_modules/react': 'react',
    'node_modules/vue': 'vue',
    'node_modules/next': 'next',
    'node_modules/nuxt': 'nuxt',
    'node_modules/webpack': 'webpack',
    'node_modules/vite': 'vite',
    'node_modules/esbuild': 'esbuild',
    'node_modules/typescript': 'typescript',
    'site-packages/django': 'django',
    'site-packages/flask': 'flask',
    'site-packages/requests': 'requests',
    '.cargo/registry/src': 'cargo',
    '/usr/include/c++': 'gcc',
  })) {
    if (normalizedPath.includes(pattern)) {
      return name;
    }
  }
  
  // Extract package name from node_modules
  const nodeModulesMatch = normalizedPath.match(/node_modules\/(@[^\/]+\/[^\/]+|[^\/]+)/);
  if (nodeModulesMatch) {
    return nodeModulesMatch[1];
  }
  
  return 'third-party';
}

/**
 * Parses a stack trace line and extracts frame information
 */
export function parseStackFrame(line: string, language: ProgrammingLanguage): StackFrame | null {
  // JavaScript/TypeScript: at functionName (file:line:col) or at file:line:col
  if (language === 'typescript' || language === 'javascript') {
    const match = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (match) {
      return {
        method: match[1] || undefined,
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      };
    }
  }
  
  // Python: File "path", line N, in function
  if (language === 'python') {
    const match = line.match(/File\s+"(.+?)",\s+line\s+(\d+)(?:,\s+in\s+(.+?))?/);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2], 10),
        method: match[3] || undefined,
        column: 0,
      };
    }
  }
  
  // Java: at package.Class.method(File:line)
  if (language === 'java') {
    const match = line.match(/at\s+(.+?)\((.+?):(\d+)\)/);
    if (match) {
      return {
        method: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
        column: 0,
      };
    }
  }
  
  // Rust: at file:line:col
  if (language === 'rust') {
    const match = line.match(/^\s*\d+:\s*(.+?)\s+at\s+(.+?):(\d+):(\d+)$/m);
    if (match) {
      return {
        method: match[1],
        file: match[2],
        line: parseInt(match[3], 10),
        column: parseInt(match[4], 10),
      };
    }
  }
  
  return null;
}

/**
 * Collapses consecutive third-party stack frames into a single summary line
 */
export function collapseThirdPartyFrames(
  lines: string[],
  options: GitAwareOptions
): { collapsed: string[]; hiddenCount: number } {
  const result: string[] = [];
  let hiddenCount = 0;
  let currentThirdParty: { count: number; framework: string } | null = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    const frame = parseStackFrame(trimmedLine, options.language);
    
    if (frame && isThirdPartyPath(frame.file, options.projectRoot)) {
      // This is a third-party frame
      hiddenCount++;
      
      const framework = extractFrameworkName(frame.file);
      
      if (currentThirdParty && currentThirdParty.framework === framework) {
        currentThirdParty.count++;
      } else {
        // Close previous third-party group
        if (currentThirdParty) {
          result.push(
            `<Third-party: ${currentThirdParty.count} hidden frames from ${currentThirdParty.framework}>`
          );
        }
        currentThirdParty = { count: 1, framework };
      }
    } else {
      // This is a business code frame
      if (currentThirdParty) {
        result.push(
          `<Third-party: ${currentThirdParty.count} hidden frames from ${currentThirdParty.framework}>`
        );
        currentThirdParty = null;
      }
      result.push(trimmedLine);
    }
  }
  
  // Don't forget the last group
  if (currentThirdParty) {
    result.push(
      `<Third-party: ${currentThirdParty.count} hidden frames from ${currentThirdParty.framework}>`
    );
  }
  
  return { collapsed: result, hiddenCount };
}

/**
 * Main function to apply Git-aware filtering
 */
export function applyGitAwareFilter(
  input: string,
  options: GitAwareOptions
): { filtered: string; stats: { hiddenFrames: number } } {
  const lines = input.split('\n');
  const { collapsed, hiddenCount } = collapseThirdPartyFrames(lines, options);
  
  return {
    filtered: collapsed.join('\n'),
    stats: { hiddenFrames: hiddenCount },
  };
}
