// ErrorPare - Configuration Manager (Phase 2)

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';

export interface LLMConfig {
  provider: 'openai' | 'anthropic' | 'bailian' | 'moonshot' | 'deepseek' | 'custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface RuleConfig {
  enabled: boolean;
  customRules?: string[];
}

export interface ErrorPareConfig {
  version: string;
  mode: 'basic' | 'analyze';
  llm?: LLMConfig;
  rules?: RuleConfig;
  settings: {
    maxLines: number;
    gitAware: boolean;
    output: 'text' | 'json' | 'markdown';
    compressLevel: 'fast' | 'balanced' | 'max';
  };
}

const ERRORPARE_VERSION = '2.0.0';
const CONFIG_DIR = path.join(os.homedir(), '.errorpare');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: ErrorPareConfig = {
  version: ERRORPARE_VERSION,
  mode: 'basic',
  settings: {
    maxLines: 1000,
    gitAware: true,
    output: 'text',
    compressLevel: 'balanced',
  },
  rules: {
    enabled: true,
  },
};

export class ConfigManager {
  private config: ErrorPareConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || CONFIG_FILE;
    this.config = this.loadConfig();
  }

  private loadConfig(): ErrorPareConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        const loaded = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...loaded, settings: { ...DEFAULT_CONFIG.settings, ...loaded.settings } };
      }
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Config load error: ${(error as Error).message}. Using defaults.`));
    }
    return { ...DEFAULT_CONFIG };
  }

  save(): void {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }
      this.config.version = ERRORPARE_VERSION;
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      console.log(chalk.green(`✅ Config saved to ${this.configPath}`));
    } catch (error) {
      throw new Error(`Failed to save config: ${(error as Error).message}`);
    }
  }

  getConfig(): ErrorPareConfig {
    return { ...this.config };
  }

  update(partial: Partial<ErrorPareConfig>): void {
    this.config = { ...this.config, ...partial };
    if (partial.settings) {
      this.config.settings = { ...this.config.settings, ...partial.settings };
    }
  }

  exists(): boolean {
    return fs.existsSync(this.configPath);
  }

  isLLMConfigured(): boolean {
    return this.config.mode === 'analyze' && 
           this.config.llm !== undefined && 
           this.config.llm.apiKey !== undefined;
  }

  getConfigPath(): string {
    return this.configPath;
  }

  reset(): void {
    this.config = { ...DEFAULT_CONFIG };
  }
}

let instance: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
  if (!instance) {
    instance = new ConfigManager();
  }
  return instance;
}
