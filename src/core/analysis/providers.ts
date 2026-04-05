// ErrorPare - Multi-Provider LLM Integration
// Auto-generated from LiteLLM model registry
// Last updated: 2026-03-05

export interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  cost: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  capabilities: {
    vision: boolean;
    functionCalling: boolean;
    reasoning?: boolean;
  };
  /** Model release date or version identifier */
  releaseDate?: string;
  /** Whether this is the recommended default model */
  isDefault?: boolean;
  /** Model tier: economy, balanced, premium */
  tier: 'economy' | 'balanced' | 'premium';
}

export interface LLMProvider {
  name: string;
  baseUrl: string;
  models: LLMModel[];
  /** API key environment variable name */
  apiKeyEnv: string;
  /** Whether provider supports custom base URL */
  supportsCustomBaseUrl?: boolean;
}

/**
 * Parse model ID to extract version/date information
 * Supports formats like:
 * - gpt-4o-2024-08-06 (date suffix)
 * - claude-3-5-sonnet-20241022 (date in name)
 * - o3-mini (version only)
 * - gemini-2.5-flash (semver)
 */
function parseModelVersion(modelId: string): {
  version: string;
  date?: string;
  isLatest: boolean;
} {
  // Extract date patterns: 2024-08-06, 20241022, 2025-04-16
  const dateMatch = modelId.match(/(20\d{2})[-]?(\d{2})[-]?(\d{2})/);
  const date = dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : undefined;

  // Extract version patterns: v3, 2.5, 4o, etc.
  const versionMatch = modelId.match(/(\d+\.?\d*|[vV]\d+)/);
  const version = versionMatch ? versionMatch[1] : '1';

  // Consider latest if released within last 6 months or has "latest" in name
  const isLatest: boolean = modelId.includes('latest') ||
    (!!date && new Date(date) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000));

  return { version, date, isLatest };
}

/**
 * Sort models by version (newest first)
 */
function sortModelsByVersion(models: LLMModel[]): LLMModel[] {
  return [...models].sort((a, b) => {
    const aInfo = parseModelVersion(a.id);
    const bInfo = parseModelVersion(b.id);

    // Prioritize models with dates
    if (aInfo.date && bInfo.date) {
      return bInfo.date.localeCompare(aInfo.date);
    }
    if (aInfo.date) return -1;
    if (bInfo.date) return 1;

    // Fall back to version comparison
    return bInfo.version.localeCompare(aInfo.version, undefined, { numeric: true });
  });
}

/**
 * Get top N latest models for a provider
 */
export function getLatestModels(providerName: string, count: number = 5): LLMModel[] {
  const provider = LLM_PROVIDERS[providerName.toLowerCase()];
  if (!provider) return [];
  return sortModelsByVersion(provider.models).slice(0, count);
}

/**
 * Built-in provider configurations (synced from LiteLLM)
 */
export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'ERRORPARE_OPENAI_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxTokens: 16384,
        cost: { input: 2.5, output: 10 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2024-08-06',
        isDefault: true,
        tier: 'premium'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        contextWindow: 128000,
        maxTokens: 16384,
        cost: { input: 0.15, output: 0.6 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2024-07-18',
        tier: 'economy'
      },
      {
        id: 'o3-mini',
        name: 'o3 Mini',
        contextWindow: 200000,
        maxTokens: 100000,
        cost: { input: 1.1, output: 4.4 },
        capabilities: { vision: false, functionCalling: true, reasoning: true },
        releaseDate: '2025-01-31',
        tier: 'balanced'
      },
      {
        id: 'o3',
        name: 'o3',
        contextWindow: 200000,
        maxTokens: 100000,
        cost: { input: 2.0, output: 8.0 },
        capabilities: { vision: true, functionCalling: true, reasoning: true },
        releaseDate: '2025-01-31',
        tier: 'premium'
      },
      {
        id: 'o4-mini',
        name: 'o4 Mini',
        contextWindow: 200000,
        maxTokens: 100000,
        cost: { input: 1.1, output: 4.4 },
        capabilities: { vision: true, functionCalling: true, reasoning: true },
        releaseDate: '2025-04-16',
        tier: 'balanced'
      }
    ]
  },

  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ERRORPARE_ANTHROPIC_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        contextWindow: 200000,
        maxTokens: 8192,
        cost: { input: 3, output: 15 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2024-10-22',
        isDefault: true,
        tier: 'balanced'
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        contextWindow: 200000,
        maxTokens: 4096,
        cost: { input: 15, output: 75 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2024-02-29',
        tier: 'premium'
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        contextWindow: 200000,
        maxTokens: 4096,
        cost: { input: 0.25, output: 1.25 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2024-03-07',
        tier: 'economy'
      },
      {
        id: 'claude-sonnet-4-6',
        name: 'Claude Sonnet 4.6',
        contextWindow: 200000,
        maxTokens: 64000,
        cost: { input: 3, output: 15 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2025-02-05',
        tier: 'premium'
      },
      {
        id: 'claude-opus-4-6-20260205',
        name: 'Claude Opus 4.6',
        contextWindow: 1000000,
        maxTokens: 128000,
        cost: { input: 5, output: 25 },
        capabilities: { vision: true, functionCalling: true },
        releaseDate: '2026-02-05',
        tier: 'premium'
      }
    ]
  },

  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'ERRORPARE_DEEPSEEK_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        contextWindow: 64000,
        maxTokens: 8192,
        cost: { input: 0.14, output: 0.28 },
        capabilities: { vision: false, functionCalling: true },
        isDefault: true,
        tier: 'economy'
      },
      {
        id: 'deepseek-coder',
        name: 'DeepSeek Coder',
        contextWindow: 16000,
        maxTokens: 4096,
        cost: { input: 0.14, output: 0.28 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'balanced'
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek Reasoner',
        contextWindow: 131072,
        maxTokens: 65536,
        cost: { input: 0.28, output: 0.42 },
        capabilities: { vision: false, functionCalling: false, reasoning: true },
        tier: 'balanced'
      }
    ]
  },

  moonshot: {
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKeyEnv: 'ERRORPARE_MOONSHOT_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'kimi-k2.5',
        name: 'Kimi K2.5',
        contextWindow: 256000,
        maxTokens: 8192,
        cost: { input: 0.6, output: 2.5 },
        capabilities: { vision: true, functionCalling: true },
        isDefault: true,
        tier: 'balanced'
      },
      {
        id: 'kimi-k2',
        name: 'Kimi K2',
        contextWindow: 256000,
        maxTokens: 8192,
        cost: { input: 0.5, output: 2.0 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'balanced'
      },
      {
        id: 'moonshot-v1-8k',
        name: 'Moonshot V1 8K',
        contextWindow: 8192,
        maxTokens: 4096,
        cost: { input: 0.2, output: 2.0 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'moonshot-v1-32k',
        name: 'Moonshot V1 32K',
        contextWindow: 32768,
        maxTokens: 8192,
        cost: { input: 0.5, output: 2.5 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'balanced'
      },
      {
        id: 'moonshot-v1-128k',
        name: 'Moonshot V1 128K',
        contextWindow: 131072,
        maxTokens: 8192,
        cost: { input: 1.0, output: 3.0 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'premium'
      }
    ]
  },

  bailian: {
    name: 'Bailian (Qwen)',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    apiKeyEnv: 'ERRORPARE_BAILIAN_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'qwen-plus',
        name: 'Qwen Plus',
        contextWindow: 131072,
        maxTokens: 8192,
        cost: { input: 0.8, output: 2.0 },
        capabilities: { vision: true, functionCalling: true },
        isDefault: true,
        tier: 'balanced'
      },
      {
        id: 'qwen-max',
        name: 'Qwen Max',
        contextWindow: 32768,
        maxTokens: 8192,
        cost: { input: 2.0, output: 6.0 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'premium'
      },
      {
        id: 'qwen-turbo',
        name: 'Qwen Turbo',
        contextWindow: 131072,
        maxTokens: 4096,
        cost: { input: 0.3, output: 0.6 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'qwen-coder-plus',
        name: 'Qwen Coder Plus',
        contextWindow: 131072,
        maxTokens: 8192,
        cost: { input: 0.6, output: 1.8 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'balanced'
      },
      {
        id: 'qwen-vl-plus',
        name: 'Qwen VL Plus',
        contextWindow: 32768,
        maxTokens: 4096,
        cost: { input: 1.0, output: 2.5 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'balanced'
      }
    ]
  },

  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'ERRORPARE_GROQ_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B',
        contextWindow: 128000,
        maxTokens: 32768,
        cost: { input: 0.59, output: 0.79 },
        capabilities: { vision: false, functionCalling: true },
        isDefault: true,
        tier: 'balanced'
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B',
        contextWindow: 8192,
        maxTokens: 4096,
        cost: { input: 0.05, output: 0.08 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'mixtral-8x7b-32768',
        name: 'Mixtral 8x7B',
        contextWindow: 32768,
        maxTokens: 4096,
        cost: { input: 0.24, output: 0.24 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'gemma2-9b-it',
        name: 'Gemma 2 9B',
        contextWindow: 8192,
        maxTokens: 4096,
        cost: { input: 0.2, output: 0.2 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'qwen-2.5-32b',
        name: 'Qwen 2.5 32B',
        contextWindow: 128000,
        maxTokens: 8192,
        cost: { input: 0.29, output: 0.59 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'balanced'
      }
    ]
  },

  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'ERRORPARE_GEMINI_API_KEY',
    supportsCustomBaseUrl: false,
    models: [
      {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        contextWindow: 1048576,
        maxTokens: 8192,
        cost: { input: 0.1, output: 0.4 },
        capabilities: { vision: true, functionCalling: true },
        isDefault: true,
        tier: 'balanced'
      },
      {
        id: 'gemini-2.0-pro',
        name: 'Gemini 2.0 Pro',
        contextWindow: 2097152,
        maxTokens: 8192,
        cost: { input: 1.25, output: 10 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'premium'
      },
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        contextWindow: 1048576,
        maxTokens: 8192,
        cost: { input: 0.075, output: 0.3 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'economy'
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        contextWindow: 2097152,
        maxTokens: 8192,
        cost: { input: 1.25, output: 5 },
        capabilities: { vision: true, functionCalling: true },
        tier: 'premium'
      },
      {
        id: 'gemma-3-27b-it',
        name: 'Gemma 3 27B',
        contextWindow: 131072,
        maxTokens: 8192,
        cost: { input: 0, output: 0 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'economy'
      }
    ]
  },

  azure: {
    name: 'Azure OpenAI',
    baseUrl: '${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}',
    apiKeyEnv: 'AZURE_OPENAI_API_KEY',
    supportsCustomBaseUrl: true,
    models: [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        contextWindow: 128000,
        maxTokens: 4096,
        cost: { input: 0, output: 0 },
        capabilities: { vision: true, functionCalling: true },
        isDefault: true,
        tier: 'premium'
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        maxTokens: 4096,
        cost: { input: 0, output: 0 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'premium'
      },
      {
        id: 'gpt-35-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16384,
        maxTokens: 4096,
        cost: { input: 0, output: 0 },
        capabilities: { vision: false, functionCalling: true },
        tier: 'balanced'
      }
    ]
  }
};

/**
 * Get all available providers
 */
export function getProviders(): LLMProvider[] {
  return Object.values(LLM_PROVIDERS);
}

/**
 * Get provider by name
 */
export function getProvider(name: string): LLMProvider | undefined {
  return LLM_PROVIDERS[name.toLowerCase()];
}

/**
 * Get all models from all providers
 */
export function getAllModels(): { provider: string; model: LLMModel }[] {
  const models: { provider: string; model: LLMModel }[] = [];

  for (const [providerName, provider] of Object.entries(LLM_PROVIDERS)) {
    for (const model of provider.models) {
      models.push({ provider: providerName, model });
    }
  }

  return models;
}

/**
 * Find model by ID across all providers
 */
export function findModel(modelId: string): { provider: string; model: LLMModel } | undefined {
  for (const [providerName, provider] of Object.entries(LLM_PROVIDERS)) {
    const model = provider.models.find(m => m.id === modelId);
    if (model) {
      return { provider: providerName, model };
    }
  }
  return undefined;
}

/**
 * Get recommended model for a provider based on tier preference
 */
export function getRecommendedModel(
  providerName: string,
  preferredTier: 'economy' | 'balanced' | 'premium' = 'balanced'
): LLMModel | undefined {
  const provider = LLM_PROVIDERS[providerName.toLowerCase()];
  if (!provider) return undefined;

  // First try to find default model
  const defaultModel = provider.models.find(m => m.isDefault);
  if (defaultModel) return defaultModel;

  // Then try preferred tier
  const tierMatch = provider.models.find(m => m.tier === preferredTier);
  if (tierMatch) return tierMatch;

  // Fall back to any model
  return provider.models[0];
}

/**
 * List available models (formatted for display)
 */
export function listModels(): string {
  let output = 'Available Models:\n\n';

  for (const [providerName, provider] of Object.entries(LLM_PROVIDERS)) {
    output += `${provider.name} (${providerName}):\n`;
    for (const model of provider.models) {
      const defaultMarker = model.isDefault ? ' [default]' : '';
      const tierLabel =
        model.tier === 'economy' ? '[economy]' : model.tier === 'premium' ? '[premium]' : '[balanced]';
      output += `  ${tierLabel} ${model.id}: ${model.name} (${(model.contextWindow / 1000).toFixed(0)}K ctx)${defaultMarker}\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * List providers with their latest models
 */
export function listLatestModels(): string {
  let output = 'Latest Models by Provider:\n\n';

  for (const [providerName, provider] of Object.entries(LLM_PROVIDERS)) {
    const latest = getLatestModels(providerName, 3);
    if (latest.length === 0) continue;

    output += `${provider.name}:\n`;
    latest.forEach((model, i) => {
      const date = parseModelVersion(model.id).date || 'latest';
      output += `  ${i + 1}. ${model.name} (${date}) - $${model.cost.input}/M in, $${model.cost.output}/M out\n`;
    });
    output += '\n';
  }

  return output;
}
