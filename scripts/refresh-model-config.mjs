import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDefaultModelRoutingConfig } from 'model-catlog-builder';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const sourceCatalogPath = path.resolve(
  projectRoot,
  '..',
  'Model-catlog-builder',
  'output',
  'model-catalog.generated.json',
);

const outputDir = path.resolve(projectRoot, 'src', 'core', 'model-config', 'generated');
const outputCatalogPath = path.join(outputDir, 'errorpare-model-catalog.json');
const outputRoutingPath = path.join(outputDir, 'errorpare-model-routing.config.json');

const PACKAGE_PROVIDER_MAPPINGS = [
  {
    sourceProviderId: 'openai',
    providerId: 'openai',
    displayName: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    envVar: 'ERRORPARE_OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'OpenAI GPT 系列模型',
  },
  {
    sourceProviderId: 'anthropic',
    providerId: 'anthropic',
    displayName: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    envVar: 'ERRORPARE_ANTHROPIC_API_KEY',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude 系列模型',
  },
  {
    sourceProviderId: 'openrouter',
    providerId: 'openrouter',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    envVar: 'ERRORPARE_OPENROUTER_API_KEY',
    keyUrl: 'https://openrouter.ai/keys',
    description: '一个 Key 接多家模型，适合快速试用和对比',
  },
  {
    sourceProviderId: 'google',
    providerId: 'gemini',
    displayName: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    envVar: 'ERRORPARE_GEMINI_API_KEY',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    description: 'Google Gemini 系列模型',
  },
  {
    sourceProviderId: 'qwen',
    providerId: 'bailian',
    displayName: '阿里云百炼 (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    envVar: 'ERRORPARE_BAILIAN_API_KEY',
    keyUrl: 'https://bailian.console.aliyun.com/#/api-key',
    description: '阿里云百炼平台，支持 Qwen 系列模型',
  },
];

const LEGACY_PROVIDERS = [
  {
    providerId: 'moonshot',
    displayName: 'Moonshot (Kimi)',
    auth: {
      strategy: 'apiKey',
      fields: [
        {
          id: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-moonshot-...',
        },
      ],
      helpText: 'Create an API key in the Moonshot Console.',
    },
    discovery: {
      mode: 'static-registry',
      supportsManualAllowlist: true,
    },
    collections: {
      recommendedIds: ['kimi-k2.5', 'kimi-k2', 'moonshot-v1-32k'],
      autoRecommendedIds: [],
      latestIds: ['kimi-k2.5', 'kimi-k2', 'moonshot-v1-128k', 'moonshot-v1-32k'],
      previewIds: [],
      deprecatedIds: [],
      hiddenIds: [],
    },
    availabilitySource: 'errorpare-legacy',
    officialSources: [],
    sources: ['errorpare-legacy'],
    modelCount: 4,
    models: [
      createLegacyModel('kimi-k2.5', 'Kimi K2.5', 256000, 8192, 0.6, 2.5, ['text', 'vision', 'tools'], '2025-01-01'),
      createLegacyModel('kimi-k2', 'Kimi K2', 256000, 8192, 0.5, 2.0, ['text', 'vision', 'tools'], '2024-11-01'),
      createLegacyModel('moonshot-v1-128k', 'Moonshot V1 128K', 131072, 8192, 1.0, 3.0, ['text', 'tools'], '2024-01-01'),
      createLegacyModel('moonshot-v1-32k', 'Moonshot V1 32K', 32768, 8192, 0.5, 2.5, ['text', 'tools'], '2024-01-01'),
    ],
    errorpare: {
      envVar: 'ERRORPARE_MOONSHOT_API_KEY',
      keyUrl: 'https://platform.moonshot.cn/console/api-keys',
      description: 'Moonshot Kimi 系列模型',
      baseUrl: 'https://api.moonshot.cn/v1',
      sourceProviderId: 'moonshot',
      analysisAdapter: 'openai-compatible',
      supportsAnalysis: true,
    },
  },
  {
    providerId: 'deepseek',
    displayName: 'DeepSeek',
    auth: {
      strategy: 'apiKey',
      fields: [
        {
          id: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: 'sk-deepseek-...',
        },
      ],
      helpText: 'Create an API key in the DeepSeek Platform.',
    },
    discovery: {
      mode: 'static-registry',
      supportsManualAllowlist: true,
    },
    collections: {
      recommendedIds: ['deepseek-chat', 'deepseek-reasoner'],
      autoRecommendedIds: [],
      latestIds: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
      previewIds: [],
      deprecatedIds: [],
      hiddenIds: [],
    },
    availabilitySource: 'errorpare-legacy',
    officialSources: [],
    sources: ['errorpare-legacy'],
    modelCount: 3,
    models: [
      createLegacyModel('deepseek-chat', 'DeepSeek Chat', 64000, 8192, 0.14, 0.28, ['text', 'tools'], '2024-01-01'),
      createLegacyModel('deepseek-reasoner', 'DeepSeek Reasoner', 131072, 65536, 0.28, 0.42, ['text', 'reasoning'], '2025-01-01'),
      createLegacyModel('deepseek-coder', 'DeepSeek Coder', 16000, 4096, 0.14, 0.28, ['text', 'tools'], '2024-01-01'),
    ],
    errorpare: {
      envVar: 'ERRORPARE_DEEPSEEK_API_KEY',
      keyUrl: 'https://platform.deepseek.com/api_keys',
      description: 'DeepSeek Chat / Reasoner',
      baseUrl: 'https://api.deepseek.com/v1',
      sourceProviderId: 'deepseek',
      analysisAdapter: 'openai-compatible',
      supportsAnalysis: true,
    },
  },
];

async function main() {
  const sourceCatalog = JSON.parse(await fs.readFile(sourceCatalogPath, 'utf8'));
  const sourceProviderMap = new Map(
    (sourceCatalog.providers || []).map((provider) => [provider.providerId, provider]),
  );

  const providers = PACKAGE_PROVIDER_MAPPINGS.map((mapping) => {
    const sourceProvider = sourceProviderMap.get(mapping.sourceProviderId);
    if (!sourceProvider) {
      throw new Error(`Source provider not found in catalog: ${mapping.sourceProviderId}`);
    }

    return adaptProvider(sourceProvider, mapping);
  }).concat(LEGACY_PROVIDERS);

  const catalog = {
    generatedAt: new Date().toISOString(),
    sourceStatus: {
      integration: {
        status: 'ok',
        sourceCatalogPath,
        generatedAt: new Date().toISOString(),
      },
    },
    providers,
  };

  const routingConfig = buildDefaultModelRoutingConfig(catalog, {
    providerIds: providers.map((provider) => provider.providerId),
  });

  routingConfig.generatedAt = new Date().toISOString();
  routingConfig.updatedAt = routingConfig.generatedAt;
  routingConfig.notes = [
    'Generated for ErrorPare from Model-catlog-builder normalized catalog.',
    'Provider IDs are adapted to ErrorPare naming so the existing CLI can keep simple config values.',
    'Primary/fallback refs are curated for ErrorPare analyze mode, not for broad multi-agent routing.',
  ];

  const preferredPrimary = [
    'bailian/qwen3.5-plus',
    'openai/gpt-5-mini',
    'anthropic/claude-sonnet-4-6',
  ].find((ref) => routingConfig.agents.defaults.models.includes(ref));

  if (preferredPrimary) {
    routingConfig.agents.defaults.model.primary = preferredPrimary;
    routingConfig.agents.defaults.model.fallbacks = uniqueRefs([
      'openai/gpt-5-mini',
      'anthropic/claude-sonnet-4-6',
      'deepseek/deepseek-chat',
    ]).filter((ref) => ref !== preferredPrimary && routingConfig.agents.defaults.models.includes(ref));
  }

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outputCatalogPath, JSON.stringify(catalog, null, 2) + '\n', 'utf8');
  await fs.writeFile(outputRoutingPath, JSON.stringify(routingConfig, null, 2) + '\n', 'utf8');

  console.log(`Wrote catalog: ${outputCatalogPath}`);
  console.log(`Wrote routing: ${outputRoutingPath}`);
  console.log(`Providers: ${providers.map((provider) => provider.providerId).join(', ')}`);
}

function adaptProvider(sourceProvider, mapping) {
  return {
    ...sourceProvider,
    providerId: mapping.providerId,
    displayName: mapping.displayName,
    auth: {
      strategy: 'apiKey',
      fields: [
        {
          id: 'apiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          placeholder: `${mapping.envVar.toLowerCase()}...`,
        },
      ],
      helpText: `Set ${mapping.envVar} or generate one from ${mapping.keyUrl}.`,
    },
    discovery: {
      ...sourceProvider.discovery,
      errorpareImportedFrom: mapping.sourceProviderId,
    },
    models: (sourceProvider.models || []).map((model) => ({
      ...model,
      displayName: normalizeDisplayName(model.displayName),
    })),
    errorpare: {
      envVar: mapping.envVar,
      keyUrl: mapping.keyUrl,
      description: mapping.description,
      baseUrl: mapping.baseUrl,
      sourceProviderId: mapping.sourceProviderId,
      analysisAdapter:
        mapping.providerId === 'anthropic'
          ? 'anthropic'
          : mapping.providerId === 'gemini'
            ? 'gemini'
            : 'openai-compatible',
      supportsAnalysis: true,
    },
  };
}

function createLegacyModel(modelId, displayName, contextWindow, maxOutputTokens, inputUsdPer1M, outputUsdPer1M, capabilities, releaseDate) {
  return {
    modelId,
    displayName,
    family: modelId.split('-').slice(0, 2).join('-'),
    vendorId: null,
    stage: 'stable',
    releaseDate,
    lastUpdated: releaseDate,
    contextWindow,
    maxOutputTokens,
    capabilities,
    pricing: {
      unit: 'usd_per_1m_tokens',
      inputUsdPer1M,
      outputUsdPer1M,
    },
    modalities: {
      input: ['text'],
      output: ['text'],
    },
    tags: [],
    recommended: false,
    hidden: false,
    availabilityConfidence: 'legacy-static',
    isLatestAlias: false,
    isLatestStableRelease: false,
    pinnedTargetModelId: null,
    sources: ['errorpare-legacy'],
  };
}

function normalizeDisplayName(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function uniqueRefs(values) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const ref = String(value || '').trim();
    if (!ref || seen.has(ref)) {
      continue;
    }

    seen.add(ref);
    result.push(ref);
  }

  return result;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
