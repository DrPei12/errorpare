import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const {
  createUserModelProfileClientMock,
  resolveTenantProviderCredentialsMock,
  runOnboardingCliMock,
} = vi.hoisted(() => ({
  createUserModelProfileClientMock: vi.fn(),
  resolveTenantProviderCredentialsMock: vi.fn(),
  runOnboardingCliMock: vi.fn(),
}));

vi.mock('model-catlog-builder', () => ({
  createUserModelProfileClient: createUserModelProfileClientMock,
  resolveTenantProviderCredentials: resolveTenantProviderCredentialsMock,
  runOnboardingCli: runOnboardingCliMock,
}));

import {
  buildErrorPareLlmConfigFromOnboarding,
  createErrorPareModelCatalogPaths,
  runErrorPareAnalyzeOnboarding,
} from '../core/model-config/onboarding.js';

describe('model-catalog onboarding integration', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('maps a model-catalog Google selection into an ErrorPare Gemini config', async () => {
    createUserModelProfileClientMock.mockReturnValue({
      getPrimaryModel: () => ({
        ref: 'google/gemini-3.1-pro-preview',
        providerId: 'google',
        modelId: 'gemini-3.1-pro-preview',
        displayName: 'Gemini 3.1 Pro Preview',
      }),
    });
    resolveTenantProviderCredentialsMock.mockResolvedValue({
      providerId: 'google',
      credentials: {
        apiKey: 'test-google-key',
      },
    });

    const llmConfig = await buildErrorPareLlmConfigFromOnboarding({
      tenantId: 'default',
      paths: {
        storageRoot: 'D:/tmp/errorpare-model-catalog',
        userModelProfilePath: 'D:/tmp/errorpare-model-catalog/tenants/default/user-model-profile.json',
      },
      userModelProfile: {
        schema: 'model-catlog-builder/user-model-profile',
      },
    });

    expect(llmConfig.provider).toBe('gemini');
    expect(llmConfig.model).toBe('gemini-3.1-pro-preview');
    expect(llmConfig.apiKey).toBe('test-google-key');
    expect(llmConfig.modelRef).toBe('google/gemini-3.1-pro-preview');
    expect(llmConfig.source).toBe('model-catalog');
    expect(llmConfig.sourceProviderId).toBe('google');
  });

  it('runs embedded onboarding with the curated provider allowlist and writes seed snapshots', async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'errorpare-model-catalog-'));

    createUserModelProfileClientMock.mockReturnValue({
      getPrimaryModel: () => ({
        ref: 'deepseek/deepseek-chat',
        providerId: 'deepseek',
        modelId: 'deepseek-chat',
        displayName: 'DeepSeek Chat',
      }),
    });
    resolveTenantProviderCredentialsMock.mockResolvedValue({
      providerId: 'deepseek',
      credentials: {
        apiKey: 'test-deepseek-key',
      },
    });
    runOnboardingCliMock.mockResolvedValue({
      ok: true,
      tenantId: 'default',
      userModelProfile: {
        schema: 'model-catlog-builder/user-model-profile',
      },
    });

    const result = await runErrorPareAnalyzeOnboarding({
      storageRoot: tempRoot,
      providerId: 'deepseek',
    });

    expect(result.llmConfig.provider).toBe('deepseek');
    expect(result.llmConfig.model).toBe('deepseek-chat');
    expect(runOnboardingCliMock).toHaveBeenCalledTimes(1);
    expect(runOnboardingCliMock.mock.calls[0]?.[0]).toMatchObject({
      routeRole: 'model',
      providerId: 'deepseek',
      storageMode: 'json',
      allowedProviderIds: [
        'openai',
        'anthropic',
        'openrouter',
        'google',
        'qwen',
        'deepseek',
        'moonshotai',
        'moonshot',
      ],
    });

    const seededCatalogPath = path.join(tempRoot, 'generated', 'errorpare-model-catalog.json');
    const seededRoutingPath = path.join(tempRoot, 'generated', 'errorpare-model-routing.config.json');
    expect(await fs.stat(seededCatalogPath)).toBeTruthy();
    expect(await fs.stat(seededRoutingPath)).toBeTruthy();
  });

  it('creates deterministic storage paths for the embedded model-catalog runtime', () => {
    const paths = createErrorPareModelCatalogPaths({
      storageRoot: 'D:/tmp/errorpare-model-catalog',
      tenantId: 'User One',
    });

    expect(paths.tenantId).toBe('user-one');
    expect(paths.catalogPath).toBe(path.join('D:/tmp/errorpare-model-catalog', 'generated', 'errorpare-model-catalog.json'));
    expect(paths.userModelProfilePath).toBe(
      path.join('D:/tmp/errorpare-model-catalog', 'tenants', 'user-one', 'user-model-profile.json'),
    );
  });
});
