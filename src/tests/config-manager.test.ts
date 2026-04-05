import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ConfigManager } from '../core/config/config-manager.js';

describe('ConfigManager', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads config files that start with a UTF-8 BOM', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'errorpare-config-'));
    const configPath = path.join(tempDir, 'config.json');

    fs.writeFileSync(
      configPath,
      '\uFEFF{"version":"2.1.0","mode":"analyze","llm":{"provider":"deepseek","model":"deepseek-chat","apiKey":"test-key"},"settings":{"maxLines":42,"gitAware":false,"output":"json","compressLevel":"fast"},"rules":{"enabled":true}}',
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const manager = new ConfigManager(configPath);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(manager.getConfig().mode).toBe('analyze');
    expect(manager.getConfig().settings.maxLines).toBe(42);
    expect(manager.getConfig().llm?.provider).toBe('deepseek');
  });

  it('migrates legacy DeepSeek model IDs to deepseek-chat on load', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'errorpare-config-'));
    const configPath = path.join(tempDir, 'config.json');

    fs.writeFileSync(
      configPath,
      '{"version":"2.1.0","mode":"analyze","llm":{"provider":"deepseek","model":"deepseek-v3.2","apiKey":"test-key"},"settings":{"maxLines":1000,"gitAware":true,"output":"text","compressLevel":"balanced"},"rules":{"enabled":true}}',
    );

    const manager = new ConfigManager(configPath);

    expect(manager.getConfig().llm?.provider).toBe('deepseek');
    expect(manager.getConfig().llm?.model).toBe('deepseek-chat');
  });
});
