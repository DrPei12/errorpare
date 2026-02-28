// ErrorPare - LLM Analysis Module

import type { CompressionResult, LLMAnalysis } from '../../types/index.js';
import { getProvider, getAllModels, findModel, listModels, type LLMProvider, type LLMModel } from './providers.js';

export interface LLMConfig {
  provider: string;
  apiKey: string;
  model?: string;
  baseURL?: string;
}

const DEFAULT_PROVIDER = 'groq';
const DEFAULT_MODEL = 'llama-3.1-70b-versatile';

/**
 * LLM Analyzer for error root cause analysis
 */
export class LLMAnalyzer {
  private config: LLMConfig;
  private providerInfo?: LLMProvider;
  private modelInfo?: LLMModel;
  
  constructor(config: LLMConfig) {
    this.config = config;
    this.providerInfo = getProvider(config.provider);
    
    if (config.model) {
      const modelResult = findModel(config.model);
      if (modelResult) {
        this.modelInfo = modelResult.model;
      }
    }
  }
  
  /**
   * Analyze errors and provide root cause + suggestions
   */
  async analyze(compressionResult: CompressionResult): Promise<LLMAnalysis> {
    const prompt = this.buildPrompt(compressionResult);
    
    try {
      const response = await this.callLLM(prompt);
      return this.parseResponse(response);
    } catch (error: any) {
      return {
        rootCause: `Analysis failed: ${error.message}`,
        fix: 'Check API key and try again',
      };
    }
  }
  
  /**
   * Build prompt for LLM
   */
  private buildPrompt(result: CompressionResult): string {
    const errorsSummary = result.errors
      .slice(0, 5)
      .map(e => `- ${e.type}: ${e.message} (${e.count}x)`)
      .join('\n');
    
    return `You are an expert developer debugging errors. Analyze these compressed error messages and provide:

1. Root cause (one sentence)
2. Fix suggestion (one sentence)

Errors:
${errorsSummary}

Response format (JSON):
{
  "rootCause": "...",
  "fix": "..."
}`;
  }
  
  /**
   * Call LLM API
   */
  private async callLLM(prompt: string): Promise<string> {
    // Use dynamic import for fetch (ESM compatible)
    const { default: fetch } = await import('node-fetch');
    
    const baseURL = this.config.baseURL || this.providerInfo?.baseUrl || '';
    const model = this.config.model || DEFAULT_MODEL;
    
    if (!baseURL) {
      throw new Error(`Unknown provider: ${this.config.provider}`);
    }
    
    const response = await fetch(`${baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
        // Anthropic uses different header
        ...(this.config.provider === 'anthropic' ? {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json() as any;
    
    // Handle different response formats
    if (this.config.provider === 'anthropic') {
      return data.content?.[0]?.text || '';
    }
    
    return data.choices?.[0]?.message?.content || '';
  }
  
  /**
   * Parse LLM response
   */
  private parseResponse(response: string): LLMAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          rootCause: parsed.rootCause || 'Unknown',
          fix: parsed.fix || parsed.suggestion || 'No fix available',
        };
      }
    } catch {
      // Fallback to plain text
    }
    
    const lines = response.split('\n').filter(l => l.trim());
    return {
      rootCause: lines[0] || 'Analysis failed',
      fix: lines[1] || 'Check error details',
    };
  }
  
  /**
   * Get provider info
   */
  getProviderInfo(): LLMProvider | undefined {
    return this.providerInfo;
  }
  
  /**
   * Get model info
   */
  getModelInfo(): LLMModel | undefined {
    return this.modelInfo;
  }
}

/**
 * Create LLM analyzer from provider and API key
 */
export function createLLMAnalyzer(
  provider: string, 
  apiKey: string, 
  model?: string
): LLMAnalyzer {
  const providerInfo = getProvider(provider);
  
  const config: LLMConfig = {
    provider: provider.toLowerCase(),
    apiKey,
    model: model || DEFAULT_MODEL,
    baseURL: providerInfo?.baseUrl,
  };
  
  return new LLMAnalyzer(config);
}

/**
 * Get available providers
 */
export { getProvider, getAllModels, findModel, listModels } from './providers.js';
