import { describe, expect, it } from 'vitest';

import {
  getDefaultProviderSelection,
  getProviderCatalogEntries,
  getProviderCatalogEntry,
  getRoutingSummary,
  listProviderModelsByGroup,
} from '../core/model-config/catalog.js';

describe('Model config integration', () => {
  it('exposes provider catalog entries from the imported model package', () => {
    const providers = getProviderCatalogEntries();
    const providerIds = providers.map((provider) => provider.providerId);

    expect(providerIds).toContain('openai');
    expect(providerIds).toContain('anthropic');
    expect(providerIds).toContain('bailian');
    expect(providerIds).toContain('gemini');
  });

  it('keeps an ErrorPare-friendly default routing selection', () => {
    const defaultSelection = getDefaultProviderSelection();
    const routingSummary = getRoutingSummary();

    expect(defaultSelection).not.toBeNull();
    expect(defaultSelection?.providerId).toBe('bailian');
    expect(defaultSelection?.modelRef).toBe('bailian/qwen3.5-plus');
    expect(routingSummary.fallbackRefs).toContain('openai/gpt-5-mini');
  });

  it('returns curated recommended models for a provider', () => {
    const provider = getProviderCatalogEntry('openai');
    const recommendedModels = listProviderModelsByGroup('openai', 'recommended');

    expect(provider).toBeDefined();
    expect(provider?.envVar).toBe('ERRORPARE_OPENAI_API_KEY');
    expect(provider?.bestFor).toContain('tool use');
    expect(provider?.fallbackRefs.length).toBeGreaterThan(0);
    expect(recommendedModels.length).toBeGreaterThan(0);
    expect(
      recommendedModels.some(
        (model: { modelId: string }) => model.modelId === provider?.defaultModel,
      ),
    ).toBe(true);
  });
});
