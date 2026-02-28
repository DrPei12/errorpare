// ErrorPare - Drain3 Algorithm Implementation
// Based on IBM Drain3: https://github.com/logpai/Drain3

import type { CompressedError, Variable, ProgrammingLanguage } from '../../types/index.js';

export interface Drain3Config {
  /** Depth of parse tree */
  depth: number;
  /** Maximum number of tokens in a log message */
  maxTokens: number;
  /** Similarity threshold for merging */
  similarityThreshold: number;
  /** Extra delimiter characters */
  extraDelimiters: string[];
}

const DEFAULT_CONFIG: Drain3Config = {
  depth: 4,
  maxTokens: 50,
  similarityThreshold: 0.5,
  extraDelimiters: [],
};

/**
 * Drain3 Template Miner
 * Extracts log templates from error messages
 */
export class Drain3Miner {
  private config: Drain3Config;
  private clusters: Map<string, Drain3Cluster> = new Map();
  private clusterIdCounter: number = 1;

  constructor(config: Partial<Drain3Config> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add a log message to learn its template
   */
  addLogMessage(message: string): { template: string; clusterId: number; parameters: Variable[] } {
    const tokens = this.tokenize(message);
    
    // Find matching cluster or create new one
    let bestCluster: Drain3Cluster | null = null;
    let bestScore = 0;

    for (const cluster of this.clusters.values()) {
      const score = this.calculateSimilarity(tokens, cluster.tokens);
      if (score > bestScore && score >= this.config.similarityThreshold) {
        bestScore = score;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      // Merge with existing cluster
      bestCluster.count++;
      const params = this.extractParameters(tokens, bestCluster.tokens);
      bestCluster.parameters = this.mergeParameters(bestCluster.parameters, params);
      return {
        template: this.reconstructTemplate(bestCluster.tokens),
        clusterId: bestCluster.id,
        parameters: bestCluster.parameters,
      };
    } else {
      // Create new cluster
      const clusterId = this.clusterIdCounter++;
      const cluster: Drain3Cluster = {
        id: clusterId,
        tokens: tokens,
        count: 1,
        parameters: this.extractParameters(tokens, tokens),
      };
      this.clusters.set(String(clusterId), cluster);
      return {
        template: this.reconstructTemplate(tokens),
        clusterId,
        parameters: cluster.parameters,
      };
    }
  }

  /**
   * Tokenize a message into tokens
   */
  private tokenize(message: string): string[] {
    // Remove ANSI codes
    const cleaned = message.replace(/\x1b\[[0-9;]*m/g, '');
    
    // Split by whitespace and common delimiters
    const delimiters = [...this.config.extraDelimiters, ' ', '\t', '\n', '(', ')', '[', ']', '{', '}', ',', ';', ':', '"', "'", '=', '<', '>'];
    const tokens: string[] = [];
    let currentToken = '';
    
    for (const char of cleaned) {
      if (delimiters.includes(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
      } else {
        currentToken += char;
      }
    }
    if (currentToken) {
      tokens.push(currentToken);
    }

    // Limit tokens
    return tokens.slice(0, this.config.maxTokens);
  }

  /**
   * Calculate similarity between two token sequences
   */
  private calculateSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    let matches = 0;
    const set2 = new Set(tokens2);
    
    for (const token of tokens1) {
      if (set2.has(token) || this.isVariable(token)) {
        matches++;
      }
    }
    
    return matches / Math.max(tokens1.length, tokens2.length);
  }

  /**
   * Check if token is a variable placeholder
   */
  private isVariable(token: string): boolean {
    return token === '<*>' || token.startsWith('<') && token.endsWith('>');
  }

  /**
   * Extract parameters from tokens based on template
   */
  private extractParameters(tokens: string[], templateTokens: string[]): Variable[] {
    const params: Variable[] = [];
    
    for (let i = 0; i < tokens.length && i < templateTokens.length; i++) {
      if (this.isVariable(templateTokens[i]) && !this.isVariable(tokens[i])) {
        const varType = this.detectVariableType(tokens[i]);
        params.push({
          name: `param${params.length + 1}`,
          value: tokens[i],
          type: varType,
        });
      }
    }
    
    return params;
  }

  /**
   * Detect the type of a variable value
   */
  private detectVariableType(value: string): Variable['type'] {
    // IP address
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(value)) {
      return 'ip';
    }
    // UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return 'uuid';
    }
    // Hex
    if (/^0x[0-9a-fA-F]+$/.test(value)) {
      return 'hex';
    }
    // Number
    if (/^\d+$/.test(value)) {
      return 'number';
    }
    // Path
    if (/^[\/\\]/.test(value) || value.includes('/') || value.includes('\\')) {
      return 'path';
    }
    return 'identifier';
  }

  /**
   * Merge parameters from multiple messages
   */
  private mergeParameters(existing: Variable[], newParams: Variable[]): Variable[] {
    const merged = [...existing];
    for (const param of newParams) {
      if (!merged.find(p => p.value === param.value)) {
        merged.push(param);
      }
    }
    return merged;
  }

  /**
   * Reconstruct template from tokens
   */
  private reconstructTemplate(tokens: string[]): string {
    return tokens.map(token => {
      if (this.isVariable(token)) {
        return '<*>';
      }
      return token;
    }).join(' ');
  }

  /**
   * Get all clusters
   */
  getClusters(): Drain3Cluster[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get cluster by ID
   */
  getCluster(id: number): Drain3Cluster | undefined {
    return this.clusters.get(String(id));
  }

  /**
   * Get statistics
   */
  getStatistics(): { clusterCount: number; totalMessages: number } {
    let totalMessages = 0;
    for (const cluster of this.clusters.values()) {
      totalMessages += cluster.count;
    }
    return {
      clusterCount: this.clusters.size,
      totalMessages,
    };
  }
}

export interface Drain3Cluster {
  id: number;
  tokens: string[];
  count: number;
  parameters: Variable[];
}

/**
 * Process errors with Drain3 algorithm
 */
export function processWithDrain3(
  lines: string[],
  language: ProgrammingLanguage
): { errors: CompressedError[]; statistics: any } {
  const miner = new Drain3Miner();
  const errorMap = new Map<string, CompressedError>();

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const result = miner.addLogMessage(line);
    const key = result.template;
    
    if (errorMap.has(key)) {
      const existing = errorMap.get(key)!;
      existing.count++;
      existing.variables = miner.getCluster(result.clusterId)?.parameters || [];
    } else {
      errorMap.set(key, {
        count: 1,
        type: extractErrorType(line),
        message: result.template,
        template: result.template,
        variables: result.parameters,
      });
    }
  }

  const errors = Array.from(errorMap.values());
  const totalOriginal = lines.filter(l => l.trim()).length;
  const compressedCount = errors.length;
  const rate = totalOriginal > 0 ? (totalOriginal - compressedCount) / totalOriginal : 0;

  return {
    errors,
    statistics: {
      originalCount: totalOriginal,
      compressedCount,
      rate,
      ...miner.getStatistics(),
    },
  };
}

function extractErrorType(line: string): string {
  const patterns = [
    { type: 'TypeError', regex: /TypeError:/i },
    { type: 'ReferenceError', regex: /ReferenceError:/i },
    { type: 'SyntaxError', regex: /SyntaxError:/i },
    { type: 'Error', regex: /^Error:/i },
    { type: 'ZeroDivisionError', regex: /ZeroDivisionError:/i },
    { type: 'NullPointerException', regex: /NullPointerException/i },
    { type: 'RuntimeError', regex: /RuntimeError:/i },
  ];

  for (const { type, regex } of patterns) {
    if (regex.test(line)) {
      return type;
    }
  }
  return 'Error';
}
