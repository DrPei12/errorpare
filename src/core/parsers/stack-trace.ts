// ErrorPare - Multi-language Stack Trace Parser

import type { ProgrammingLanguage } from '../../types/index.js';

export interface ParsedStackTrace {
  type: string;
  message: string;
  frames: StackFrame[];
  raw: string;
}

export interface StackFrame {
  file: string;
  line: number;
  column?: number;
  method?: string;
  isThirdParty: boolean;
}

/**
 * Parse stack trace based on language
 */
export function parseStackTrace(content: string, language: ProgrammingLanguage): ParsedStackTrace {
  // First detect language if unknown
  const detectedLang = language === 'unknown' ? detectLanguage(content) : language;
  
  switch (detectedLang) {
    case 'python':
      return parsePythonTrace(content);
    case 'javascript':
    case 'typescript':
      return parseJavaScriptTrace(content);
    case 'java':
      return parseJavaTrace(content);
    case 'go':
      return parseGoTrace(content);
    case 'rust':
      return parseRustTrace(content);
    default:
      return parseGenericError(content);
  }
}

/**
 * Detect language from stack trace content
 */
function detectLanguage(content: string): ProgrammingLanguage {
  if (content.includes('Traceback (most recent call last)')) return 'python';
  if (content.includes('at ') && content.includes('.js:')) return 'javascript';
  if (content.includes('at ') && content.includes('.ts:')) return 'typescript';
  if (content.includes('at ') && content.includes('.java:')) return 'java';
  if (content.includes('panic:') || content.includes('goroutine')) return 'go';
  if (content.includes('thread ') && content.includes('has overflowed')) return 'rust';
  return 'unknown';
}

/**
 * Parse Python traceback as a single unit
 * Groups consecutive traceback lines together and extracts proper error type
 */
function parsePythonTrace(content: string): ParsedStackTrace {
  const lines = content.split('\n');
  let type = 'Error';
  let message = '';
  const frames: StackFrame[] = [];
  
  // Extract error type and message from the last error line (most specific)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const errorMatch = line.match(/^(\w+Error|\w+Exception):\s*(.*)/);
    if (errorMatch) {
      type = errorMatch[1];
      message = errorMatch[2];
      break;
    }
  }
  
  // Parse frames - group consecutive File "..." lines as one stack trace
  let currentFrame: { file: string; line: number; method?: string } | null = null;
  
  for (const line of lines) {
    // Match Python stack frame: File "path", line N, in method
    const frameMatch = line.match(/^\s*File\s+"(.+?)",\s+line\s+(\d+)(?:,\s+in\s+(\w+))?/);
    if (frameMatch) {
      if (currentFrame) {
        // Push previous frame
        frames.push({
          file: currentFrame.file,
          line: currentFrame.line,
          method: currentFrame.method,
          isThirdParty: isThirdParty(currentFrame.file),
        });
      }
      currentFrame = {
        file: frameMatch[1],
        line: parseInt(frameMatch[2], 10),
        method: frameMatch[3],
      };
    }
  }
  
  // Push last frame if exists
  if (currentFrame) {
    frames.push({
      file: currentFrame.file,
      line: currentFrame.line,
      method: currentFrame.method,
      isThirdParty: isThirdParty(currentFrame.file),
    });
  }
  
  // If no frames parsed, treat whole content as single error
  if (frames.length === 0) {
    return {
      type,
      message: content.trim(),
      frames: [],
      raw: content,
    };
  }
  
  return { type, message, frames, raw: content };
}

/**
 * Split multiple Python tracebacks in content into individual blocks
 * This enables proper deduplication of repeated Python errors
 */
export function splitPythonTracebacks(content: string): string[] {
  const blocks: string[] = [];
  const lines = content.split('\n');
  
  let currentBlock: string[] = [];
  let inTraceback = false;
  
  for (const line of lines) {
    // Start of a new traceback
    if (line.includes('Traceback (most recent call last)')) {
      inTraceback = true;
      // If we have a previous block, save it first
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
      }
      currentBlock = [line];
      continue;
    }
    
    // End of traceback (empty line or new traceback indicator)
    if (inTraceback && (line.trim() === '' || line.includes('Traceback'))) {
      if (currentBlock.length > 1) { // Has content beyond the Traceback line
        blocks.push(currentBlock.join('\n'));
      }
      // Start new block if it's a new traceback
      if (line.includes('Traceback')) {
        currentBlock = [line];
      } else {
        inTraceback = false;
        currentBlock = [];
      }
      continue;
    }
    
    if (inTraceback) {
      currentBlock.push(line);
    } else if (line.trim()) {
      // Non-traceback lines (e.g., error message)
      currentBlock.push(line);
    }
  }
  
  // Don't forget the last block
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n'));
  }
  
  return blocks;
}

/**
 * Parse JavaScript/TypeScript stack trace
 */
function parseJavaScriptTrace(content: string): ParsedStackTrace {
  const lines = content.split('\n');
  let type = 'Error';
  let message = '';
  const frames: StackFrame[] = [];
  
  // Extract error type and message from first line
  const firstLine = lines[0].trim();
  const errorMatch = firstLine.match(/^(TypeError|ReferenceError|SyntaxError|Error|RangeError):\s*(.*)/);
  if (errorMatch) {
    type = errorMatch[1];
    message = errorMatch[2];
  }
  
  // Parse frames
  for (const line of lines) {
    const frameMatch = line.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (frameMatch) {
      frames.push({
        method: frameMatch[1],
        file: frameMatch[2],
        line: parseInt(frameMatch[3], 10),
        column: parseInt(frameMatch[4], 10),
        isThirdParty: isThirdParty(frameMatch[2]),
      });
    }
  }
  
  if (frames.length === 0) {
    return { type, message: firstLine, frames: [], raw: content };
  }
  
  return { type, message, frames, raw: content };
}

/**
 * Parse Java stack trace
 */
function parseJavaTrace(content: string): ParsedStackTrace {
  const lines = content.split('\n');
  let type = 'Exception';
  let message = '';
  const frames: StackFrame[] = [];
  
  for (const line of lines) {
    // Exception type and message
    const excMatch = line.match(/^(\w+(?:Exception|Error)):\s*(.*)/);
    if (excMatch) {
      type = excMatch[1];
      message = excMatch[2];
    }
    
    // Stack frame
    const frameMatch = line.match(/at\s+(.+?)\((.+?):(\d+)\)/);
    if (frameMatch) {
      frames.push({
        method: frameMatch[1],
        file: frameMatch[2],
        line: parseInt(frameMatch[3], 10),
        isThirdParty: isThirdParty(frameMatch[2]),
      });
    }
  }
  
  return { type, message, frames, raw: content };
}

/**
 * Parse Go stack trace
 */
function parseGoTrace(content: string): ParsedStackTrace {
  const lines = content.split('\n');
  let type = 'panic';
  let message = '';
  const frames: StackFrame[] = [];
  
  for (const line of lines) {
    // Panic message
    const panicMatch = line.match(/^panic:\s*(.*)/);
    if (panicMatch) {
      message = panicMatch[1];
    }
    
    // Frame
    const frameMatch = line.match(/^\s*(\d+):\s*(.+?)\s+(.+?):(\d+):?(\d+)?/);
    if (frameMatch) {
      frames.push({
        method: frameMatch[2],
        file: frameMatch[3],
        line: parseInt(frameMatch[4], 10),
        column: frameMatch[5] ? parseInt(frameMatch[5], 10) : undefined,
        isThirdParty: isThirdParty(frameMatch[3]),
      });
    }
  }
  
  return { type, message, frames, raw: content };
}

/**
 * Parse Rust stack trace
 */
function parseRustTrace(content: string): ParsedStackTrace {
  const lines = content.split('\n');
  let type = 'panic';
  let message = '';
  const frames: StackFrame[] = [];
  
  for (const line of lines) {
    // Panic message
    const panicMatch = line.match(/^thread\s+'.+?'\s+panicked\s+at\s+'([^']+)'/);
    if (panicMatch) {
      message = panicMatch[1];
    }
    
    // Frame
    const frameMatch = line.match(/^\s*(\d+):\s*(.+?)\s+at\s+(.+?):(\d+):(\d+)/);
    if (frameMatch) {
      frames.push({
        method: frameMatch[2],
        file: frameMatch[3],
        line: parseInt(frameMatch[4], 10),
        column: parseInt(frameMatch[5], 10),
        isThirdParty: isThirdParty(frameMatch[3]),
      });
    }
  }
  
  return { type, message, frames, raw: content };
}

/**
 * Generic error parsing
 */
function parseGenericError(content: string): ParsedStackTrace {
  const firstLine = content.split('\n')[0].trim();
  const errorMatch = firstLine.match(/^(\w+(?:Error|Exception)):\s*(.*)/);
  
  return {
    type: errorMatch ? errorMatch[1] : 'Error',
    message: errorMatch ? errorMatch[2] : firstLine,
    frames: [],
    raw: content,
  };
}

/**
 * Check if path is third-party
 */
function isThirdParty(path: string): boolean {
  const patterns = [
    'node_modules',
    'site-packages',
    '.cargo/registry',
    '.cache',
    'vendor/bundle',
    '/usr/lib',
    '/System/Library',
  ];
  
  return patterns.some(p => path.includes(p));
}

/**
 * Convert parsed stack trace to compressed format
 */
export function stackTraceToCompressed(
  parsed: ParsedStackTrace,
  language: ProgrammingLanguage
): string {
  const parts: string[] = [];
  
  // Add error type and message
  if (parsed.type && parsed.message) {
    parts.push(`${parsed.type}: ${parsed.message}`);
  } else if (parsed.type) {
    parts.push(parsed.type);
  }
  
  // Add business code frames (filter out third-party)
  const businessFrames = parsed.frames.filter(f => !f.isThirdParty);
  
  if (businessFrames.length > 0) {
    parts.push('');
    for (const frame of businessFrames) {
      const location = frame.method 
        ? `${frame.method} (${frame.file}:${frame.line})`
        : `${frame.file}:${frame.line}`;
      parts.push(`  at ${location}`);
    }
  }
  
  // Add third-party summary
  const thirdPartyCount = parsed.frames.filter(f => f.isThirdParty).length;
  if (thirdPartyCount > 0) {
    parts.push(`  ... ${thirdPartyCount} more frames from third-party code`);
  }
  
  return parts.join('\n');
}
