// ErrorPare - LLM Analyzer (Phase 2)

import chalk from 'chalk';
import { LLMConfig } from '../../config/config-manager.js';

export interface AnalysisResult {
  rootCause: string;
  confidence: number;
  category: string;
  suggestion: string;
  codeFix?: string;
  relatedErrors?: string[];
  model: string;
  tokensUsed?: number;
}

export interface LLMProvider {
  name: string;
  analyze(errorText: string, config: LLMConfig): Promise<AnalysisResult>;
}

export class LLMAnalyzer {
  private config?: LLMConfig;

  constructor(config?: LLMConfig) {
    this.config = config;
  }

  setConfig(config: LLMConfig): void {
    this.config = config;
  }

  async analyze(errorText: string): Promise<AnalysisResult> {
    if (!this.config) {
      throw new Error('LLM configuration required. Run `errorpare init --analyze`');
    }

    const provider = this.getProvider(this.config.provider);
    if (!provider) {
      throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }

    try {
      console.log(chalk.gray(`📊 Analyzing with ${this.config.provider}/${this.config.model}...`));
      const result = await provider.analyze(errorText, this.config);
      return result;
    } catch (error) {
      throw new Error(`LLM analysis failed: ${(error as Error).message}`);
    }
  }

  private getProvider(providerName: string): LLMProvider | null {
    switch (providerName) {
      case 'openai':
        return new OpenAIProvider();
      case 'anthropic':
        return new AnthropicProvider();
      case 'bailian':
      case 'moonshot':
      case 'deepseek':
        return new OpenAICompatibleProvider(providerName);
      default:
        return null;
    }
  }

  quickAnalyze(errorText: string): AnalysisResult {
    const patterns: Array<{ pattern: RegExp; result: Partial<AnalysisResult> }> = [
      {
        pattern: /Cannot read propert(?:y|ies).*of undefined/i,
        result: {
          rootCause: 'Null/undefined reference - accessing property on undefined value',
          category: 'null-safety',
          suggestion: 'Add null check or use optional chaining (?.)',
          confidence: 0.9,
        },
      },
      {
        pattern: /Module not found|Cannot find module/i,
        result: {
          rootCause: 'Missing dependency - module/package not installed',
          category: 'module',
          suggestion: 'Run npm install <package-name> or check import path',
          confidence: 0.95,
        },
      },
      {
        pattern: /TypeError.*is not a function/i,
        result: {
          rootCause: 'Type error - calling non-function value as function',
          category: 'type-safety',
          suggestion: 'Check variable type and ensure it is a function',
          confidence: 0.85,
        },
      },
      {
        pattern: /SyntaxError/i,
        result: {
          rootCause: 'Syntax error - invalid code syntax',
          category: 'syntax',
          suggestion: 'Check indicated line for syntax issues',
          confidence: 0.8,
        },
      },
    ];

    for (const { pattern, result } of patterns) {
      if (pattern.test(errorText)) {
        return {
          rootCause: result.rootCause!,
          category: result.category!,
          suggestion: result.suggestion!,
          confidence: result.confidence!,
          model: 'local-rules',
        };
      }
    }

    return {
      rootCause: 'Unable to determine root cause with local rules',
      category: 'unknown',
      suggestion: 'Use --analyze flag with LLM configuration for detailed analysis',
      confidence: 0.3,
      model: 'local-rules',
    };
  }
}

class OpenAICompatibleProvider implements LLMProvider {
  constructor(readonly name: string) {}

  async analyze(errorText: string, config: LLMConfig): Promise<AnalysisResult> {
    const baseUrl = config.baseUrl || this.getDefaultBaseUrl(config.provider);
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: `You are an expert debugger. Analyze the error and provide:
1. rootCause: Brief explanation of what caused the error
2. category: One of [null-safety, type-safety, module, syntax, runtime, network, file-io, memory, permissions, other]
3. suggestion: Concrete fix recommendation
4. codeFix: Optional code snippet showing the fix

Respond in JSON format only.`,
          },
          {
            role: 'user',
            content: `Analyze this error:\n\n${errorText}`,
          },
        ],
        max_tokens: config.maxTokens || 2000,
        temperature: config.temperature || 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const parsed = JSON.parse(content);
    
    return {
      rootCause: parsed.rootCause || 'Unknown error',
      confidence: 0.8,
      category: parsed.category || 'unknown',
      suggestion: parsed.suggestion || 'Review the error and fix accordingly',
      codeFix: parsed.codeFix,
      model: config.model,
      tokensUsed: data.usage?.total_tokens,
    };
  }

  private getDefaultBaseUrl(provider: string): string {
    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      bailian: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      moonshot: 'https://api.moonshot.cn/v1',
      deepseek: 'https://api.deepseek.com/v1',
    };
    return urls[provider] || urls.openai;
  }
}

class OpenAIProvider extends OpenAICompatibleProvider {
  constructor() {
    super('openai');
  }
}

class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';

  async analyze(errorText: string, config: LLMConfig): Promise<AnalysisResult> {
    const url = `${config.baseUrl || 'https://api.anthropic.com'}/v1/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens || 2000,
        messages: [
          {
            role: 'user',
            content: `You are an expert debugger. Analyze this error and provide JSON response:

{
  "rootCause": "explanation",
  "category": "category",
  "suggestion": "fix recommendation",
  "codeFix": "optional code"
}

Error:
${errorText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API error (${response.status}): ${error}`);
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from LLM');
    }

    const parsed = JSON.parse(content);
    
    return {
      rootCause: parsed.rootCause || 'Unknown error',
      confidence: 0.8,
      category: parsed.category || 'unknown',
      suggestion: parsed.suggestion || 'Review the error and fix accordingly',
      codeFix: parsed.codeFix,
      model: config.model,
      tokensUsed: data.usage?.total_tokens,
    };
  }
}
