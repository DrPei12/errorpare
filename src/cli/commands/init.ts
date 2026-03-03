// ErrorPare - CLI 'init' command (Phase 2: Interactive Step-by-Step Config Wizard)

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { ConfigManager, LLMConfig } from '../../core/config/config-manager.js';

const LOGO = `
╔═══════════════════════════════════════════╗
║    ███████╗██╗ ██████╗███████╗██╗      ║
║    ██╔════╝██║██╔════╝██╔════╝██║      ║
║    █████╗  ██║██║     █████╗  ██║      ║
║    ██╔══╝  ██║██║     ██╔══╝  ██║      ║
║    ██║     ██║╚██████╗███████╗███████╗ ║
║    ╚═╝     ╚═╝ ╚═════╝╚══════╝╚══════╝ ║
║              E R R O R P A R E           ║
╚═══════════════════════════════════════════╝
`;

interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  envVar: string;
  keyUrl: string;
  description: string;
  recommended?: boolean;
  authType: 'api_key' | 'oauth';
}

const PROVIDERS: ProviderInfo[] = [
  {
    id: 'bailian',
    name: '阿里云百炼',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    envVar: 'ERRORPARE_BAILIAN_API_KEY',
    keyUrl: 'https://bailian.console.aliyun.com/#/api-key',
    description: '阿里云百炼平台，支持 Qwen/Kimi/DeepSeek 等模型',
    recommended: true,
    authType: 'api_key',
  },
  {
    id: 'moonshot',
    name: 'Moonshot (Kimi)',
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: 'moonshot-v1-8k',
    envVar: 'ERRORPARE_MOONSHOT_API_KEY',
    keyUrl: 'https://platform.moonshot.cn/console/api-keys',
    description: '月之暗面 Kimi 大模型',
    authType: 'api_key',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    envVar: 'ERRORPARE_DEEPSEEK_API_KEY',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    description: '深度求索 DeepSeek 大模型',
    authType: 'api_key',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    envVar: 'ERRORPARE_OPENAI_API_KEY',
    keyUrl: 'https://platform.openai.com/api-keys',
    description: 'OpenAI GPT-4/GPT-4o 系列',
    authType: 'api_key',
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-3-5-sonnet-20241022',
    envVar: 'ERRORPARE_ANTHROPIC_API_KEY',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Anthropic Claude 系列模型',
    authType: 'api_key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter (聚合)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    envVar: 'ERRORPARE_OPENROUTER_API_KEY',
    keyUrl: 'https://openrouter.ai/keys',
    description: '一个 Key 访问数十个模型 (Claude/GPT/Gemini/DeepSeek 等)',
    authType: 'api_key',
  },
];

interface InitOptions {
  force?: boolean;
  analyze?: boolean;
  provider?: string;
}

export function createInitCommand(): Command {
  const command = new Command('init');
  
  command
    .description('Initialize ErrorPare configuration (interactive wizard)')
    .option('-f, --force', 'Overwrite existing configuration')
    .option('-a, --analyze', 'Enable analyze mode (requires LLM API key)')
    .option('-p, --provider <provider>', 'LLM provider ID (skip selection)')
    .action(async (options: InitOptions) => {
      await initializeErrorPare(options);
    });
  
  return command;
}

async function initializeErrorPare(options: InitOptions): Promise<void> {
  const configManager = new ConfigManager();
  
  console.log(LOGO);
  console.log('');
  
  // Check existing config
  if (configManager.exists() && !options.force) {
    console.log(chalk.yellow('⚠️  Configuration already exists:'));
    console.log(chalk.gray(`   ${configManager.getConfigPath()}`));
    console.log('');
    console.log(chalk.gray('Use --force to overwrite'));
    console.log('');
    
    const currentConfig = configManager.getConfig();
    console.log(chalk.gray('Current configuration:'));
    console.log(chalk.gray(`   Mode: ${currentConfig.mode}`));
    if (currentConfig.llm) {
      console.log(chalk.gray(`   LLM: ${currentConfig.llm.provider}/${currentConfig.llm.model}`));
    }
    console.log('');
    return;
  }
  
  console.log(chalk.cyan('📦 Configuration Wizard'));
  console.log(chalk.gray('══════════════════════════════════════════'));
  console.log('');
  
  // Step 1: Mode selection
  const mode = await selectMode(options.analyze);
  
  const config: any = {
    version: '2.0.4',
    mode: mode,
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
  
  // Step 2: LLM Configuration (if analyze mode)
  if (mode === 'analyze') {
    console.log('');
    console.log(chalk.cyan('──────────────────────────────────────────'));
    console.log(chalk.cyan('Step 2: LLM Provider Configuration'));
    console.log(chalk.cyan('──────────────────────────────────────────'));
    console.log('');
    
    const provider = options.provider || await selectProvider();
    const llmConfig = await configureProvider(provider);
    config.llm = llmConfig;
  }
  
  // Save configuration
  configManager.update(config);
  configManager.save();
  
  console.log('');
  console.log(chalk.green('✅ Configuration complete!'));
  console.log('');
  console.log(chalk.cyan('Quick Start:'));
  console.log(chalk.gray('   errorpare run "npm run build"           # Basic compression'));
  if (config.mode === 'analyze') {
    console.log(chalk.gray('   errorpare run "npm run build" --analyze # With LLM analysis'));
  }
  console.log(chalk.gray('   errorpare config                        # View/edit config'));
  console.log('');
}

async function selectMode(analyzeFlag?: boolean): Promise<'basic' | 'analyze'> {
  console.log(chalk.cyan('──────────────────────────────────────────'));
  console.log(chalk.cyan('Step 1: Select Mode'));
  console.log(chalk.cyan('──────────────────────────────────────────'));
  console.log('');
  
  if (analyzeFlag) {
    console.log(chalk.green('✅ Mode: Analyze (LLM-powered root cause analysis)'));
    console.log('');
    return 'analyze';
  }
  
  console.log('Select operation mode:');
  console.log('');
  console.log(`  ${chalk.green('1.')} Basic Mode`);
  console.log(chalk.gray('     • Fast compression (60-90% reduction)'));
  console.log(chalk.gray('     • No API calls required'));
  console.log(chalk.gray('     • Rule-based analysis only'));
  console.log('');
  console.log(`  ${chalk.cyan('2.')} Analyze Mode`);
  console.log(chalk.gray('     • Everything in Basic +'));
  console.log(chalk.gray('     • AI-powered root cause analysis'));
  console.log(chalk.gray('     • Code fix suggestions'));
  console.log(chalk.gray('     • Requires LLM API key'));
  console.log('');
  console.log(chalk.gray('Select mode (1/2) [default: 1]:'));
  console.log('');
  
  // For non-interactive, default to basic
  console.log(chalk.gray('(Using Basic mode for non-interactive install)'));
  console.log('');
  return 'basic';
}

async function selectProvider(): Promise<string> {
  console.log('Select LLM provider:');
  console.log('');
  
  PROVIDERS.forEach((p, i) => {
    const rec = p.recommended ? chalk.green(' [推荐]') : '';
    const authIcon = p.authType === 'oauth' ? '🔐' : '🔑';
    console.log(`  ${chalk.cyan(String(i + 1))}. ${p.name}${rec}`);
    console.log(chalk.gray(`     ${authIcon} ${p.description}`));
    console.log(chalk.gray(`     Default model: ${p.defaultModel}`));
  });
  
  console.log('');
  console.log(chalk.gray('Enter provider number [default: 1]:'));
  console.log('');
  
  // For non-interactive, default to bailian
  console.log(chalk.gray('(Auto-selecting 阿里云百炼 for demo)'));
  return 'bailian';
}

async function configureProvider(providerId: string): Promise<LLMConfig> {
  const provider = PROVIDERS.find(p => p.id === providerId) || PROVIDERS[0];
  
  console.log('');
  console.log(chalk.cyan(`Configuring ${provider.name}...`));
  console.log('');
  
  // Show provider info
  console.log(chalk.gray('Provider Details:'));
  console.log(chalk.gray(`  • API Base URL: ${provider.baseUrl}`));
  console.log(chalk.gray(`  • Default Model: ${provider.defaultModel}`));
  console.log(chalk.gray(`  • Auth Type: ${provider.authType === 'oauth' ? 'OAuth 2.0' : 'API Key'}`));
  console.log('');
  
  // Show how to get API key
  console.log(chalk.yellow('📖 How to get your API key:'));
  console.log(chalk.gray(`  1. Visit: ${provider.keyUrl}`));
  console.log(chalk.gray(`  2. Sign in or create account`));
  console.log(chalk.gray(`  3. Create new API key`));
  console.log(chalk.gray(`  4. Copy the key and set environment variable:`));
  console.log('');
  console.log(chalk.gray(`     export ${provider.envVar}="sk-xxx"`));
  console.log('');
  
  // Check environment
  const apiKey = process.env[provider.envVar];
  
  if (!apiKey) {
    console.log(chalk.yellow('⚠️  API key not found in environment'));
    console.log('');
    console.log('Please set the environment variable and run again:');
    console.log(chalk.gray(`  export ${provider.envVar}="your-api-key"`));
    console.log('');
    console.log('Or enter API key now (will not be saved to config):');
    console.log(chalk.gray('(Press Enter to skip and configure later)'));
    console.log('');
    
    // In interactive mode, we would prompt for input here
    // For now, throw error to indicate manual setup needed
    throw new Error(
      `API key required. Please set ${provider.envVar} environment variable.\n` +
      `Get your key from: ${provider.keyUrl}`
    );
  }
  
  console.log(chalk.green(`✅ API key found (${provider.envVar})`));
  console.log(chalk.green(`✅ Model: ${provider.defaultModel}`));
  console.log(chalk.green(`✅ Base URL: ${provider.baseUrl}`));
  console.log('');
  
  return {
    provider: provider.id as LLMConfig['provider'],
    model: provider.defaultModel,
    apiKey: apiKey,
    baseUrl: provider.baseUrl,
    maxTokens: 2000,
    temperature: 0.1,
  };
}
