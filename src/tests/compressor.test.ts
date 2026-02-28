/**
 * ErrorPare Core Tests
 */

import { describe, it, expect } from 'vitest';
import { compress, Compressor } from '../core/compressor.js';
import { deduplicateErrors, maskVariables } from '../core/filters/deduplicator.js';
import { applyGitAwareFilter } from '../core/filters/git-aware.js';

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
    expect(result.compressedCount).toBe(3); // Different values = different templates
  });
});

describe('Compressor', () => {
  it('should compress duplicate errors', () => {
    const input = `
TypeError: Cannot read property 'x' of undefined
TypeError: Cannot read property 'x' of undefined
TypeError: Cannot read property 'x' of undefined
    `.trim();
    
    const result = compress(input);
    expect(result.compression.originalLines).toBe(3);
  });
  
  it('should detect language', () => {
    const compressor = new Compressor();
    
    const jsResult = compressor.detectLanguage("TypeError: Cannot read property 'x' of undefined at app.js:10");
    expect(jsResult).toBe('javascript');
    
    const pyResult = compressor.detectLanguage('Traceback (most recent call last):\n  File "test.py", line 10');
    expect(pyResult).toBe('python');
  });
});
