// ErrorPare - Multi-Provider LLM Integration

import type { CompressionResult, LLMAnalysis } from '../../types/index.js';

export interface LLMProvider {
  name: string;
  baseUrl: string;
  models: LLMModel[];
}

export interface LLMModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
  cost: {
    input: number;
    output: number;
  };
}

/**
 * Built-in provider configurations (similar to OpenClaw)
 */
export const LLM_PROVIDERS: Record<string, LLMProvider> = {
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', contextWindow: 128000, maxTokens: 8192, cost: { input: 0, output: 0 } },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', contextWindow: 8192, maxTokens: 4096, cost: { input: 0, output: 0 } },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', contextWindow: 32768, maxTokens: 4096, cost: { input: 0, output: 0 } },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', contextWindow: 64000, maxTokens: 4096, cost: { input: 0.14, output: 0.28 } },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', contextWindow: 16000, maxTokens: 4096, cost: { input: 0.14, output: 0.28 } },
    ],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, maxTokens: 16384, cost: { input: 2.5, output: 10 } },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, maxTokens: 16384, cost: { input: 0.15, output: 0.6 } },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, maxTokens: 4096, cost: { input: 10, output: 30 } },
    ],
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, maxTokens: 8192, cost: { input: 3, output: 15 } },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', contextWindow: 200000, maxTokens: 4096, cost: { input: 15, output: 75 } },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000, maxTokens: 4096, cost: { input: 0.25, output: 1.25 } },
    ],
  },
  azure: {
    name: 'Azure OpenAI',
    baseUrl: '${AZURE_OPENAI_ENDPOINT}/openai/deployments/${DEPLOYMENT_NAME}',
    models: [
      { id: 'gpt-4', name: 'GPT-4', contextWindow: 8000, maxTokens: 4096, cost: { input: 0, output: 0 } },
      { id: 'gpt-35-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16000, maxTokens: 4096, cost: { input: 0, output: 0 } },
    ],
  },
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
 * List available models (formatted for display)
 */
export function listModels(): string {
  let output = 'Available Models:\n\n';
  
  for (const [providerName, provider] of Object.entries(LLM_PROVIDERS)) {
    output += `${provider.name} (${providerName}):\n`;
    for (const model of provider.models) {
      output += `  - ${model.id}: ${model.name} (${(model.contextWindow / 1000).toFixed(0)}K ctx)\n`;
    }
    output += '\n';
  }
  
  return output;
}
