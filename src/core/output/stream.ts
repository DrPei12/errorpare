// ErrorPare - Streaming Output Module

import type { CompressionResult } from '../../types/index.js';

/**
 * Stream output to console with typewriter effect
 */
export class StreamOutput {
  private enabled: boolean;
  
  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }
  
  /**
   * Write line with optional streaming
   */
  write(line: string, stream: boolean = false): void {
    if (this.enabled && stream) {
      // Typewriter effect - write char by char
      process.stdout.write(line);
    } else {
      console.log(line);
    }
  }
  
  /**
   * Write multiple lines
   */
  writeLines(lines: string[], stream: boolean = false): void {
    for (const line of lines) {
      this.write(line, stream);
    }
  }
  
  /**
   * Write compression result in streaming format
   */
  writeCompressionResult(result: CompressionResult): void {
    const lines: string[] = [];
    
    // Header
    lines.push(`[ErrorPare] ${result.command} ${result.exitCode === 0 ? 'succeeded' : 'failed'} (exit code ${result.exitCode})`);
    
    if (result.compression.thirdPartyCollapsed) {
      lines.push(`[ErrorPare] Git-aware trimming: ${result.compression.thirdPartyCollapsed} third-party frames collapsed`);
    }
    
    lines.push(`[ErrorPare] Compression: ${Math.round(result.compression.rate * 100)}% (${result.compression.originalLines} → ${result.compression.compressedLines} lines)`);
    lines.push('');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    
    // Errors
    for (const error of result.errors) {
      lines.push(`[${error.count}x] ${error.type}: ${error.message}`);
      if (error.location) {
        lines.push(`  Location: ${error.location}`);
      }
      if (error.variables.length > 0) {
        lines.push(`  Variables: ${error.variables.map(v => `${v.name}=${v.value}`).join(', ')}`);
      }
      lines.push('');
    }
    
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('');
    lines.push(`Summary: ${result.summary}`);
    
    // Write all lines
    this.writeLines(lines, false);
  }
}

/**
 * Create default stream output
 */
export function createStreamOutput(): StreamOutput {
  return new StreamOutput(true);
}
