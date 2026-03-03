// ErrorPare - CLI 'init' command (Phase 2: Interactive Config Wizard)

import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { ConfigManager, LLMConfig } from '../../core/config/config-manager.js';

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
    .option('-p, --provider <provider>', 'LLM provider (openai|anthropic|bailian|moonshot|deepseek)')
    .action(async (options: InitOptions) => {
      await initializeErrorPare(options);
    });
  
  return command;
}

async function initializeErrorPare(options: InitOptions): Promise<void> {
  const configManager = new ConfigManager();
  
  console.log('');
  console.log(chalk.cyan('⬡ ErrorPare Configuration Wizard'));
  console.log(chalk.gray('══════════════════════════════════════════'));
  console.log('');
  
  if (configManager.exists() && !options.force) {
    console.log(chalk.yellow('⚠️  Configuration already exists at:'), configManager.getConfigPath());
    console.log(chalk.gray('   Use --force to overwrite'));
    console.log('');
    
    const currentConfig = configManager.getConfig();
    console.log(chalk.gray('Current configuration:'));
    console.log(chalk.gray(`   Mode: ${currentConfig.mode}`));
    console.log(chalk.gray(`   Output: ${currentConfig.settings.output}`));
    if (currentConfig.llm) {
      console.log(chalk.gray(`   LLM: ${currentConfig.llm.provider}/${currentConfig.llm.model}`));
    }
    console.log('');
    return;
  }
  
  const config: any = {
    version: '2.0.1',
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
  
  if (options.analyze) {
    config.mode = 'analyze';
    console.log(chalk.cyan('📊 Mode: Analyze (LLM-powered root cause analysis)'));
  } else {
    console.log(chalk.green('✅ Mode: Basic (fast compression, no API calls)'));
    console.log(chalk.gray('   Use --analyze flag for LLM-powered analysis'));
  }
  
  console.log('');
  
  if (config.mode === 'analyze') {
    console.log(chalk.cyan('🔧 LLM Configuration'));
    console.log(chalk.gray('──────────────────────────────────────────'));
    
    const provider = options.provider || await promptLLMProvider();
    const llmConfig = await configureLLM(provider);
    config.llm = llmConfig;
    console.log('');
  }
  
  configManager.update(config);
  configManager.save();
  
  console.log('');
  console.log(chalk.green('⬡ Configuration complete!'));
  console.log('');
  console.log(chalk.cyan('Usage:'));
  console.log(chalk.gray('   errorpare run "npm run build"           # Basic compression'));
  if (config.mode === 'analyze') {
    console.log(chalk.gray('   errorpare run "npm run build" --analyze # With LLM analysis'));
  }
  console.log(chalk.gray('   errorpare config                        # View/edit config'));
  console.log('');
}

async function promptLLMProvider(): Promise<string> {
  const providers = [
    { id: 'bailian', name: '阿里云百炼 (Qwen/Kimi)', recommended: true },
    { id: 'moonshot', name: 'Moonshot (Kimi)', recommended: false },
    { id: 'openai', name: 'OpenAI (GPT-4)', recommended: false },
    { id: 'anthropic', name: 'Anthropic (Claude)', recommended: false },
    { id: 'deepseek', name: 'DeepSeek', recommended: false },
    { id: 'custom', name: 'Custom OpenAI-compatible API', recommended: false },
  ];
  
  console.log('');
  console.log('Select LLM provider:');
  providers.forEach((p, i) => {
    const rec = p.recommended ? chalk.green(' [推荐]') : '';
    console.log(`  ${i + 1}. ${p.name}${rec}`);
  });
  console.log('');
  
  console.log(chalk.gray('(Auto-selecting 阿里云百炼 for demo)'));
  return 'bailian';
}

async function configureLLM(provider: string): Promise<LLMConfig> {
  console.log('');
  console.log(chalk.gray(`Configuring ${provider}...`));
  console.log('');
  
  const providerConfigs: Record<string, { model: string; baseUrl?: string; envVar: string }> = {
    bailian: {
      model: 'qwen-plus',
      envVar: 'ERRORPARE_BAILIAN_API_KEY',
    },
    moonshot: {
      model: 'moonshot-v1-8k',
      envVar: 'ERRORPARE_MOONSHOT_API_KEY',
    },
    openai: {
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      envVar: 'ERRORPARE_OPENAI_API_KEY',
    },
    anthropic: {
      model: 'claude-3-5-sonnet-20241022',
      baseUrl: 'https://api.anthropic.com',
      envVar: 'ERRORPARE_ANTHROPIC_API_KEY',
    },
    deepseek: {
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
      envVar: 'ERRORPARE_DEEPSEEK_API_KEY',
    },
  };
  
  const providerConfig = providerConfigs[provider] || providerConfigs.bailian;
  
  const apiKey = process.env[providerConfig.envVar];
  
  if (!apiKey) {
    console.log(chalk.yellow('⚠️  API key not found in environment'));
    console.log(chalk.gray(`   Set ${providerConfig.envVar} environment variable`));
    console.log(chalk.gray('   Or enter API key now:'));
    console.log('');
    throw new Error('API key required. Set environment variable or run interactively.');
  }
  
  console.log(chalk.green(`✅ API key found (${providerConfig.envVar})`));
  console.log(chalk.green(`✅ Model: ${providerConfig.model}`));
  
  return {
    provider: provider as LLMConfig['provider'],
    model: providerConfig.model,
    apiKey: apiKey,
    baseUrl: providerConfig.baseUrl,
    maxTokens: 2000,
    temperature: 0.1,
  };
}
