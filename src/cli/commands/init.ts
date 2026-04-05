// ErrorPare - CLI 'init' command (Phase 2: provider setup backed by model catalog)

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager, LLMConfig } from '../../core/config/config-manager.js';
import {
  getDefaultProviderSelection,
  getProviderCatalogEntries,
} from '../../core/model-config/catalog.js';
import {
  runErrorPareAnalyzeOnboarding,
  supportsErrorPareModelCatalogProvider,
} from '../../core/model-config/onboarding.js';

const LOGO = `
========================================
              ERRORPARE
========================================
`;

interface ProviderInfo {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  defaultModelRef?: string | null;
  envVar: string;
  keyUrl: string;
  description: string;
  bestFor?: string;
  tradeoff?: string;
  recommended?: boolean;
  authType: 'api_key' | 'oauth';
  recommendedModels?: string[];
  latestModels?: string[];
  fallbackRefs?: string[];
  source?: string;
}

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

  if (configManager.exists() && !options.force) {
    console.log(chalk.yellow('ErrorPare is already set up:'));
    console.log(chalk.gray(`  ${configManager.getConfigPath()}`));
    console.log('');
    console.log(chalk.gray('Run setup again with --force if you want to replace it.'));
    console.log('');

    const currentConfig = configManager.getConfig();
    console.log(chalk.gray('Current setup:'));
    console.log(chalk.gray(`  Mode: ${currentConfig.mode}`));
    if (currentConfig.llm) {
      console.log(chalk.gray(`  AI model: ${currentConfig.llm.provider}/${currentConfig.llm.model}`));
    }
    console.log('');
    return;
  }

  console.log(chalk.cyan('Quick Setup'));
  console.log(chalk.gray('-'.repeat(42)));
  console.log('');

  const mode = await selectMode(options.analyze);

  const config: {
    version: string;
    mode: 'basic' | 'analyze';
    settings: {
      maxLines: number;
      gitAware: boolean;
      output: 'text';
      compressLevel: 'balanced';
    };
    rules: {
      enabled: true;
    };
    llm?: LLMConfig;
  } = {
    version: '2.1.0',
    mode,
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

  if (mode === 'analyze') {
    console.log(chalk.cyan('Step 2: AI Model Setup'));
    console.log(chalk.gray('-'.repeat(42)));
    console.log('');

    const llmConfig = shouldUseModelCatalogOnboarding(options.provider)
      ? await configureProviderWithModelCatalogOnboarding(options.provider)
      : await configureProvider(options.provider || (await selectProvider()));
    config.llm = llmConfig;
  }

  configManager.update(config);
  configManager.save();

  console.log('');
  console.log(chalk.green('ErrorPare is ready.'));
  if (config.mode === 'analyze' && config.llm) {
    console.log(chalk.gray(`  AI model: ${buildSelectedModelSummary(config.llm)}`));
  }
  console.log('');
  console.log(chalk.cyan('Try this next:'));
  if (config.mode === 'analyze') {
    console.log(chalk.gray('  errorpare run "npm run build" --analyze'));
    console.log(chalk.gray('  errorpare config'));
    console.log(chalk.gray('  errorpare init --analyze --force    # Open model setup again'));
  } else {
    console.log(chalk.gray('  errorpare run "npm run build"'));
    console.log(chalk.gray('  errorpare config'));
  }
  console.log('');
}

async function selectMode(analyzeFlag?: boolean): Promise<'basic' | 'analyze'> {
  console.log(chalk.cyan('Step 1: Select Mode'));
  console.log(chalk.gray('-'.repeat(42)));
  console.log('');

  if (analyzeFlag) {
    console.log(chalk.green('Mode: Analyze'));
    console.log(chalk.gray('AI will help explain the failure and suggest a fix.'));
    console.log('');
    return 'analyze';
  }

  console.log('Select operation mode:');
  console.log('');
  console.log(`  ${chalk.green('1.')} Basic Mode`);
  console.log(chalk.gray('     - Fast compression (60-90% reduction)'));
  console.log(chalk.gray('     - No API calls required'));
  console.log(chalk.gray('     - Rule-based analysis only'));
  console.log('');
  console.log(`  ${chalk.cyan('2.')} Analyze Mode`);
  console.log(chalk.gray('     - Everything in Basic mode, plus:'));
  console.log(chalk.gray('     - AI-powered root cause analysis'));
  console.log(chalk.gray('     - Code fix suggestions'));
  console.log(chalk.gray('     - Requires LLM API key'));
  console.log('');
  console.log(chalk.gray('Using Basic mode for non-interactive setup.'));
  console.log('');
  return 'basic';
}

async function selectProvider(): Promise<string> {
  const providers = getProviders();
  const defaultSelection = getDefaultProviderSelection();

  console.log('Select LLM provider:');
  console.log('');

  providers.forEach((provider, index) => {
    const recommended = provider.recommended ? chalk.green(' [recommended]') : '';
    console.log(`  ${chalk.cyan(String(index + 1))}. ${provider.name}${recommended}`);
    console.log(chalk.gray(`     ${provider.description}`));
    if (provider.bestFor) {
      console.log(chalk.gray(`     Best for: ${provider.bestFor}`));
    }
    console.log(chalk.gray(`     Default model: ${provider.defaultModel}`));
    if (provider.recommendedModels?.length) {
      console.log(chalk.gray(`     Recommended: ${provider.recommendedModels.join(', ')}`));
    }
  });

  console.log('');

  const selectedProviderId =
    defaultSelection?.providerId && providers.some((provider) => provider.id === defaultSelection.providerId)
      ? defaultSelection.providerId
      : providers[0]?.id || 'openai';

  console.log(chalk.gray(`Auto-selecting ${selectedProviderId} for non-interactive setup.`));
  console.log('');
  return selectedProviderId;
}

async function configureProvider(providerId: string): Promise<LLMConfig> {
  const provider = getProviders().find((entry) => entry.id === providerId);

  if (!provider) {
    throw new Error(
      `Unknown provider: ${providerId}. Available providers: ${getProviders()
        .map((entry) => entry.id)
        .join(', ')}`,
    );
  }

  console.log(chalk.cyan(`Configuring ${provider.name}...`));
  console.log('');

  console.log(chalk.gray('Provider details:'));
  if (provider.bestFor) {
    console.log(chalk.gray(`  Best for: ${provider.bestFor}`));
  }
  if (provider.tradeoff) {
    console.log(chalk.gray(`  Tradeoff: ${provider.tradeoff}`));
  }
  console.log(chalk.gray(`  API Base URL: ${provider.baseUrl}`));
  console.log(chalk.gray(`  Default Model: ${provider.defaultModel}`));
  if (provider.defaultModelRef) {
    console.log(chalk.gray(`  Primary route: ${provider.defaultModelRef}`));
  }
  if (provider.fallbackRefs?.length) {
    console.log(chalk.gray(`  Fallbacks: ${provider.fallbackRefs.join(', ')}`));
  }
  console.log(chalk.gray(`  Auth Type: ${provider.authType === 'oauth' ? 'OAuth 2.0' : 'API Key'}`));
  console.log(chalk.gray(`  Source: ${provider.source || 'catalog'}`));
  if (provider.recommendedModels?.length) {
    console.log(chalk.gray(`  Recommended models: ${provider.recommendedModels.join(', ')}`));
  }
  if (provider.latestModels?.length) {
    console.log(chalk.gray(`  Latest picks: ${provider.latestModels.join(', ')}`));
  }
  console.log('');

  console.log(chalk.yellow('How to get your API key:'));
  console.log(chalk.gray(`  1. Visit: ${provider.keyUrl}`));
  console.log(chalk.gray('  2. Sign in or create account'));
  console.log(chalk.gray('  3. Create a new API key'));
  console.log(chalk.gray(`  4. Set environment variable ${provider.envVar}`));
  console.log('');
  console.log(chalk.gray(`     export ${provider.envVar}="your-api-key"`));
  console.log('');

  const apiKey = process.env[provider.envVar];

  if (!apiKey) {
    console.log(chalk.yellow('API key not found in environment.'));
    console.log('');
    console.log(chalk.gray(`Please set ${provider.envVar} and run init again.`));
    console.log(chalk.gray(`Get your key from: ${provider.keyUrl}`));
    console.log('');

    throw new Error(`API key required. Please set ${provider.envVar}.`);
  }

  console.log(chalk.green(`API key found (${provider.envVar})`));
  console.log(chalk.green(`Model: ${provider.defaultModel}`));
  console.log(chalk.green(`Base URL: ${provider.baseUrl}`));
  console.log('');

  return {
    provider: provider.id as LLMConfig['provider'],
    model: provider.defaultModel,
    apiKey,
    baseUrl: provider.baseUrl,
    maxTokens: 2000,
    temperature: 0.1,
    source: 'manual',
  };
}

async function configureProviderWithModelCatalogOnboarding(providerId?: string): Promise<LLMConfig> {
  const onboarding = await runErrorPareAnalyzeOnboarding({
    providerId,
  });

  return onboarding.llmConfig;
}

function getProviders(): ProviderInfo[] {
  const defaultSelection = getDefaultProviderSelection();

  return getProviderCatalogEntries().map((provider) => ({
    id: provider.providerId,
    name: provider.displayName,
    baseUrl: provider.baseUrl,
    defaultModel: provider.defaultModel,
    defaultModelRef: provider.defaultModelRef,
    envVar: provider.envVar,
    keyUrl: provider.keyUrl,
    description: provider.description,
    bestFor: provider.bestFor,
    tradeoff: provider.tradeoff,
    recommended: provider.providerId === defaultSelection?.providerId,
    authType: 'api_key',
    recommendedModels: provider.recommendedModels
      .slice(0, 3)
      .map((model: { modelId: string }) => model.modelId),
    latestModels: provider.latestModels
      .slice(0, 3)
      .map((model: { modelId: string }) => model.modelId),
    fallbackRefs: provider.fallbackRefs.slice(0, 3),
    source: provider.source,
  }));
}

function buildRouteSummary(providerId: string): string {
  const provider = getProviders().find((entry) => entry.id === providerId);
  if (!provider) {
    return providerId;
  }

  if (!provider.defaultModelRef) {
    return provider.defaultModel;
  }

  if (!provider.fallbackRefs?.length) {
    return provider.defaultModelRef;
  }

  return `${provider.defaultModelRef} -> ${provider.fallbackRefs.join(' -> ')}`;
}

function buildSelectedModelSummary(config: LLMConfig): string {
  const provider = getProviders().find((entry) => entry.id === config.provider);
  const providerLabel = provider?.name || config.provider;
  return `${providerLabel} / ${config.model}`;
}

function isInteractiveTerminal(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function shouldUseModelCatalogOnboarding(providerId?: string): boolean {
  return isInteractiveTerminal() && supportsErrorPareModelCatalogProvider(providerId || null);
}
