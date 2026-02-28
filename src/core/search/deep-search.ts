// ErrorPare - Deep Search Module (Simplified)

import type { CompressionResult } from '../../types/index.js';

export interface SearchResult {
  query: string;
  summary: string;
  sources: Source[];
  recommendations: string[];
  analyzedAt: Date;
}

export interface Source {
  title: string;
  url: string;
  snippet: string;
}

export interface DeepSearchOptions {
  provider: 'tavily' | 'brave' | 'openai';
  apiKey: string;
  model?: string;
  maxSources?: number;
}

/**
 * Deep Search for error analysis
 * Uses web search + LLM to find solutions
 */
export class DeepSearch {
  private apiKey: string;
  private maxSources: number;
  
  constructor(options: DeepSearchOptions) {
    this.apiKey = options.apiKey;
    this.maxSources = options.maxSources || 5;
  }
  
  /**
   * Execute deep search on query
   */
  async search(query: string): Promise<SearchResult> {
    const sources = await this.webSearch(query);
    const summary = this.generateSummary(query, sources);
    
    return {
      query,
      summary,
      sources,
      recommendations: this.extractRecommendations(summary),
      analyzedAt: new Date(),
    };
  }
  
  /**
   * Search with compression result
   */
  async searchWithCompression(compressionResult: CompressionResult): Promise<SearchResult> {
    const keyError = compressionResult.errors[0];
    const query = `${keyError.type}: ${keyError.message}`;
    return this.search(query);
  }
  
  /**
   * Web search implementation
   */
  private async webSearch(query: string): Promise<Source[]> {
    // Try Tavily first
    try {
      return await this.tavilySearch(query);
    } catch {
      // Fallback to Brave
      try {
        return await this.braveSearch(query);
      } catch {
        return [];
      }
    }
  }
  
  /**
   * Tavily Search
   */
  private async tavilySearch(query: string): Promise<Source[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: this.apiKey,
        query,
        max_results: this.maxSources,
      }),
    });
    
    const data = await response.json() as { results?: Array<{ title: string; url: string; content: string }> };
    const results = data.results || [];
    
    return results.slice(0, this.maxSources).map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.content || '',
    }));
  }
  
  /**
   * Brave Search
   */
  private async braveSearch(query: string): Promise<Source[]> {
    const response = await fetch('https://api.search.brave.com/res/v1/web/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ q: query, count: this.maxSources }),
    });
    
    const data = await response.json() as { web?: { results?: Array<{ title: string; url: string; description: string }> } };
    const results = data.web?.results || [];
    
    return results.slice(0, this.maxSources).map(r => ({
      title: r.title || '',
      url: r.url || '',
      snippet: r.description || '',
    }));
  }
  
  /**
   * Generate summary from sources
   */
  private generateSummary(query: string, sources: Source[]): string {
    if (sources.length === 0) {
      return `No search results found for: ${query}`;
    }
    
    const topSources = sources.slice(0, 3).map(s => `- ${s.title}: ${s.snippet?.slice(0, 100)}...`).join('\n');
    
    return `Found ${sources.length} sources for "${query}":\n\n${topSources}`;
  }
  
  /**
   * Extract recommendations from summary
   */
  private extractRecommendations(summary: string): string[] {
    const recommendations: string[] = [];
    
    if (summary.includes('undefined')) recommendations.push('Check if variable is defined before access');
    if (summary.includes('null')) recommendations.push('Add null check or use optional chaining');
    if (summary.includes('async')) recommendations.push('Ensure await is used for async operations');
    if (summary.includes('import')) recommendations.push('Verify import paths are correct');
    
    return recommendations;
  }
}

/**
 * Create deep search from environment
 */
export function createDeepSearch(): DeepSearch | null {
  const apiKey = process.env.TAVILY_API_KEY || process.env.BRAVE_API_KEY;
  
  if (!apiKey) return null;
  
  const provider = process.env.TAVILY_API_KEY ? 'tavily' : 'brave';
  
  return new DeepSearch({ provider, apiKey });
}
