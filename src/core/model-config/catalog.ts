import catalog from './generated/errorpare-model-catalog.json';
import routingConfig from './generated/errorpare-model-routing.config.json';

type CatalogProvider = (typeof catalog.providers)[number];
type CatalogModel = CatalogProvider['models'][number];

interface ListedProvider {
  providerId: string;
  displayName: string;
}

interface ListedModelsResult {
  providerId: string;
  group: 'recommended' | 'latest' | 'all';
  models: CatalogModel[];
}

interface ProviderSetupInfo {
  strategy: string;
  fields: Array<{
    id: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
  }>;
  helpText: string;
}

interface RoutingProviderConfig {
  displayName?: string;
  defaultPrimary?: string;
  defaultFallbacks?: string[];
  allowlist?: string[];
  pickerGroup?: 'recommended' | 'latest' | 'all';
}

interface ResolvedRoutingProvider {
  providerId: string;
  displayName: string;
  defaultPrimary: string | null;
  defaultPrimaryModel: CatalogModel | null;
  defaultPrimaryModelId: string | null;
  defaultFallbackRefs: string[];
}

interface ResolvedRoutingSummary {
  primaryRef: string | null;
  fallbackRefs: string[];
}

interface ProviderGuidance {
  bestFor: string;
  tradeoff: string;
}

interface ProviderPresentation {
  displayName?: string;
  description?: string;
}

const routingProviders = routingConfig.providers as Record<string, RoutingProviderConfig>;

const resolvedRouting = {
  summary: {
    primaryRef: routingConfig.agents?.defaults?.model?.primary ?? null,
    fallbackRefs: routingConfig.agents?.defaults?.model?.fallbacks ?? [],
  } satisfies ResolvedRoutingSummary,
  providers: Object.entries(routingProviders).map(([providerId, providerConfig]) => {
    const defaultPrimary = providerConfig.defaultPrimary ?? null;
    const defaultPrimaryModel = defaultPrimary ? findModelByRef(defaultPrimary) : null;

    return {
      providerId,
      displayName: providerConfig.displayName ?? findCatalogProvider(providerId)?.displayName ?? providerId,
      defaultPrimary,
      defaultPrimaryModel,
      defaultPrimaryModelId: defaultPrimaryModel?.modelId ?? null,
      defaultFallbackRefs: providerConfig.defaultFallbacks ?? [],
    } satisfies ResolvedRoutingProvider;
  }),
};

const PROVIDER_GUIDANCE: Record<string, ProviderGuidance> = {
  openai: {
    bestFor: 'general stability, tool use, and a safe default for most teams',
    tradeoff: 'strong results, but the higher-end models can get expensive quickly',
  },
  anthropic: {
    bestFor: 'code analysis, long context, and deeper root-cause investigation',
    tradeoff: 'quality is high, but latency and cost are usually higher than budget options',
  },
  bailian: {
    bestFor: 'teams that want a strong default in mainland China with Qwen models',
    tradeoff: 'best regional fit, but model naming and account setup are less familiar globally',
  },
  moonshot: {
    bestFor: 'teams that want Kimi models with long context and a simple API-key flow',
    tradeoff: 'solid for Chinese-language workflows, but the ecosystem is narrower than OpenAI or Anthropic',
  },
  deepseek: {
    bestFor: 'cost-conscious code analysis and reasoning-heavy fallback routes',
    tradeoff: 'great value, but output quality can vary more between chat and reasoner models',
  },
  openrouter: {
    bestFor: 'trying multiple model families quickly without wiring each provider separately',
    tradeoff: 'very flexible, but the model list is large enough that allowlists matter',
  },
  gemini: {
    bestFor: 'Google ecosystem users who want large context windows and multimodal support',
    tradeoff: 'capabilities are broad, but the model lineup is less intuitive than a single-model default',
  },
};

const PROVIDER_PRESENTATION: Record<string, ProviderPresentation> = {
  bailian: {
    displayName: 'Bailian (Qwen)',
    description: 'Alibaba Cloud Bailian platform with Qwen-family models',
  },
};

export interface ErrorPareProviderCatalogEntry {
  providerId: string;
  displayName: string;
  description: string;
  envVar: string;
  keyUrl: string;
  baseUrl: string;
  authType: 'api_key' | 'oauth';
  defaultModel: string;
  defaultModelRef: string | null;
  recommendedModels: CatalogModel[];
  latestModels: CatalogModel[];
  supportsAnalysis: boolean;
  analysisAdapter: string;
  source: string;
  bestFor: string;
  tradeoff: string;
  fallbackRefs: string[];
}

export function getProviderCatalogEntries(): ErrorPareProviderCatalogEntry[] {
  const listedProviders = listProviders();
  const defaultProviderId = resolvedRouting.summary.primaryRef?.split('/')[0] || null;

  return listedProviders
    .map((listedProvider) => buildProviderCatalogEntry(listedProvider))
    .filter((entry): entry is ErrorPareProviderCatalogEntry => entry !== null)
    .sort((left, right) => {
      if (left.providerId === defaultProviderId) {
        return -1;
      }
      if (right.providerId === defaultProviderId) {
        return 1;
      }
      return left.displayName.localeCompare(right.displayName);
    });
}

export function getProviderCatalogEntry(providerId: string): ErrorPareProviderCatalogEntry | undefined {
  return getProviderCatalogEntries().find((entry) => entry.providerId === providerId);
}

export function getDefaultProviderSelection(): {
  providerId: string;
  model: string;
  modelRef: string;
} | null {
  const primaryRef = resolvedRouting.summary.primaryRef;
  if (!primaryRef) {
    return null;
  }

  const [providerId, ...modelParts] = primaryRef.split('/');
  const model = modelParts.join('/');

  if (!providerId || !model) {
    return null;
  }

  return {
    providerId,
    model,
    modelRef: primaryRef,
  };
}

export function listProviderModelsByGroup(
  providerId: string,
  group: 'recommended' | 'latest' | 'all' = 'recommended',
): CatalogModel[] {
  return listModels(providerId, { group })?.models || [];
}

export function getRoutingSummary() {
  return resolvedRouting.summary;
}

export function getModelRoutingForProvider(providerId: string) {
  return resolvedRouting.providers.find((provider) => provider.providerId === providerId) || null;
}

export function getProviderSetupInfo(providerId: string) {
  const providerSetup = getProviderSetup(providerId);
  const entry = getProviderCatalogEntry(providerId);

  if (!providerSetup || !entry) {
    return null;
  }

  return {
    ...providerSetup,
    errorpare: {
      envVar: entry.envVar,
      keyUrl: entry.keyUrl,
      description: entry.description,
      defaultModel: entry.defaultModel,
      baseUrl: entry.baseUrl,
    },
  };
}

function listProviders(): ListedProvider[] {
  return catalog.providers.map((provider) => ({
    providerId: provider.providerId,
    displayName: getProviderPresentation(provider.providerId).displayName ?? provider.displayName,
  }));
}

function listModels(
  providerId: string,
  options: { group?: 'recommended' | 'latest' | 'all' } = {},
): ListedModelsResult | null {
  const provider = findCatalogProvider(providerId);
  if (!provider) {
    return null;
  }

  const group = options.group ?? 'recommended';

  const ids = (() => {
    if (group === 'all') {
      return provider.models.map((model) => model.modelId);
    }

    if (group === 'latest') {
      return provider.collections.latestIds ?? [];
    }

    return provider.collections.recommendedIds?.length
      ? provider.collections.recommendedIds
      : provider.models.filter((model) => model.recommended).map((model) => model.modelId);
  })();

  const models = ids
    .map((modelId) => provider.models.find((model) => model.modelId === modelId) ?? null)
    .filter((model): model is CatalogModel => model !== null);

  return {
    providerId,
    group,
    models,
  };
}

function getProviderSetup(providerId: string): ProviderSetupInfo | null {
  const provider = findCatalogProvider(providerId);
  if (!provider) {
    return null;
  }

  return {
    strategy: provider.auth?.strategy ?? 'apiKey',
    fields: provider.auth?.fields ?? [],
    helpText: provider.auth?.helpText ?? '',
  };
}

function buildProviderCatalogEntry(listedProvider: ListedProvider): ErrorPareProviderCatalogEntry | null {
  const fullProvider = findCatalogProvider(listedProvider.providerId);
  if (!fullProvider) {
    return null;
  }

  const routingProvider = getModelRoutingForProvider(listedProvider.providerId);
  const providerGuidance = getProviderGuidance(listedProvider.providerId);
  const recommendedModels = listProviderModelsByGroup(listedProvider.providerId, 'recommended');
  const latestModels = listProviderModelsByGroup(listedProvider.providerId, 'latest');
  const defaultModel =
    routingProvider?.defaultPrimaryModelId ||
    recommendedModels[0]?.modelId ||
    latestModels[0]?.modelId ||
    fullProvider.models[0]?.modelId ||
    '';

  return {
    providerId: listedProvider.providerId,
    displayName: listedProvider.displayName,
    description:
      getProviderPresentation(listedProvider.providerId).description ||
      fullProvider.errorpare?.description ||
      listedProvider.displayName,
    envVar: fullProvider.errorpare?.envVar || '',
    keyUrl: fullProvider.errorpare?.keyUrl || '',
    baseUrl: fullProvider.errorpare?.baseUrl || inferBaseUrl(fullProvider),
    authType: 'api_key',
    defaultModel,
    defaultModelRef: routingProvider?.defaultPrimary || null,
    recommendedModels,
    latestModels,
    supportsAnalysis: fullProvider.errorpare?.supportsAnalysis !== false,
    analysisAdapter: fullProvider.errorpare?.analysisAdapter || 'openai-compatible',
    source: fullProvider.availabilitySource || 'unknown',
    bestFor: providerGuidance.bestFor,
    tradeoff: providerGuidance.tradeoff,
    fallbackRefs: routingProvider?.defaultFallbackRefs || [],
  };
}

function findCatalogProvider(providerId: string): CatalogProvider | undefined {
  return catalog.providers.find((provider) => provider.providerId === providerId);
}

function findModelByRef(modelRef: string): CatalogModel | null {
  const [providerId, ...modelParts] = modelRef.split('/');
  const provider = providerId ? findCatalogProvider(providerId) : undefined;
  const modelId = modelParts.join('/');

  if (!provider || !modelId) {
    return null;
  }

  return provider.models.find((model) => model.modelId === modelId) ?? null;
}

function inferBaseUrl(provider: CatalogProvider): string {
  return provider.errorpare?.baseUrl || provider.discovery?.officialListEndpoint || '';
}

function getProviderGuidance(providerId: string): ProviderGuidance {
  return (
    PROVIDER_GUIDANCE[providerId] || {
      bestFor: 'teams that want a configurable provider without hardcoding models in the app',
      tradeoff: 'you may want to review the default route before using it in production',
    }
  );
}

function getProviderPresentation(providerId: string): ProviderPresentation {
  return PROVIDER_PRESENTATION[providerId] || {};
}
