// ErrorPare - CLI 'config' command (Phase 2)

import fs from 'node:fs/promises';
import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../core/config/config-manager.js';
import {
  getModelRoutingForProvider,
  getProviderCatalogEntry,
  getRoutingSummary,
} from '../../core/model-config/catalog.js';

interface ConfigOptions {
  get?: string;
  set?: string;
  reset?: boolean;
  path?: boolean;
}

const SECTION_DIVIDER = '-'.repeat(50);

export function createConfigCommand(): Command {
  const command = new Command('config');

  command
    .description('View or edit ErrorPare configuration')
    .option('-g, --get <key>', 'Get configuration value')
    .option('-s, --set <key=value>', 'Set configuration value')
    .option('-r, --reset', 'Reset to default configuration')
    .option('-p, --path', 'Show config file path')
    .action(async (options: ConfigOptions) => {
      await handleConfig(options);
    });

  return command;
}

async function handleConfig(options: ConfigOptions): Promise<void> {
  const configManager = new ConfigManager();

  if (options.path) {
    console.log(configManager.getConfigPath());
    return;
  }

  if (options.reset) {
    configManager.reset();
    configManager.save();
    console.log(chalk.green('Configuration reset to defaults'));
    return;
  }

  if (options.get) {
    const config = configManager.getConfig();
    const keys = options.get.split('.');
    let value: any = config;

    for (const key of keys) {
      value = value?.[key];
    }

    if (value === undefined) {
      console.log(chalk.yellow(`Warning: key not found: ${options.get}`));
    } else {
      console.log(JSON.stringify(value, null, 2));
    }
    return;
  }

  if (options.set) {
    console.log(chalk.yellow('Warning: interactive config editing is not implemented yet.'));
    console.log(chalk.gray('Edit the config file directly:'), configManager.getConfigPath());
    return;
  }

  const config = configManager.getConfig();

  console.log('');
  console.log(chalk.cyan('Current Setup'));
  console.log(chalk.gray(SECTION_DIVIDER));
  console.log('');

  console.log(chalk.yellow('Mode:'), config.mode === 'analyze' ? 'Analyze' : 'Basic');
  console.log(chalk.yellow('App version:'), config.version);
  console.log('');

  if (config.llm) {
    const providerCatalogEntry = getProviderCatalogEntry(config.llm.provider);
    const providerRouting = getModelRoutingForProvider(config.llm.provider);
    const routingSummary = getRoutingSummary();
    const providerName = providerCatalogEntry?.displayName || config.llm.provider;
    const connectedPreview = config.llm.apiKey ? `***${config.llm.apiKey.slice(-4)}` : 'not set';
    const routeSnapshot = await loadRouteSnapshot(config.llm.modelCatalogProfilePath);
    const mainModelRef =
      routeSnapshot?.primaryRef ||
      config.llm.modelRef ||
      providerRouting?.defaultPrimary ||
      null;
    const backupModels = uniqueModelRefs(
      routeSnapshot
        ? routeSnapshot.fallbackRefs
        : [
            ...(providerRouting?.defaultFallbackRefs || []),
            ...(routingSummary?.fallbackRefs || []),
          ],
      mainModelRef,
    );

    console.log(chalk.yellow('AI model:'));
    console.log(chalk.gray(`  Provider: ${providerName}`));
    console.log(chalk.gray(`  Model: ${config.llm.model}`));
    console.log(chalk.gray(`  Key: ${connectedPreview}`));
    if (config.llm.baseUrl) {
      console.log(chalk.gray(`  Endpoint: ${config.llm.baseUrl}`));
    }
    if (config.llm.source) {
      console.log(
        chalk.gray(
          `  Setup: ${config.llm.source === 'model-catalog' ? 'Guided model setup' : 'Manual setup'}`,
        ),
      );
    }
    if (mainModelRef) {
      console.log(chalk.gray(`  Main model: ${mainModelRef}`));
    }
    if (backupModels.length > 0) {
      console.log(chalk.gray(`  Backup models: ${backupModels.join(', ')}`));
    }
    if (config.llm.modelCatalogProfilePath) {
      console.log(chalk.gray(`  Saved profile: ${config.llm.modelCatalogProfilePath}`));
    }
    console.log('');
  } else {
    console.log(chalk.gray('AI model: not set'));
    console.log(chalk.gray('  Run: errorpare init --analyze'));
    console.log('');
  }

  console.log(chalk.gray(SECTION_DIVIDER));
  console.log(chalk.gray(`Config file: ${configManager.getConfigPath()}`));
  console.log('');
}

async function loadRouteSnapshot(profilePath?: string | null) {
  const resolvedProfilePath = String(profilePath || '').trim();
  if (!resolvedProfilePath) {
    return null;
  }

  try {
    const raw = await fs.readFile(resolvedProfilePath, 'utf8');
    const profile = JSON.parse(raw);
    const route = profile?.routes?.model;
    if (!route?.configured) {
      return null;
    }

    return {
      primaryRef: route.primaryRef || null,
      fallbackRefs: Array.isArray(route.fallbackRefs) ? route.fallbackRefs : [],
    };
  } catch {
    return null;
  }
}

function uniqueModelRefs(values: string[], mainModelRef?: string | null) {
  const normalizedMain = String(mainModelRef || '').trim().toLowerCase();
  const seen = new Set<string>();

  return (values || [])
    .map((value) => String(value || '').trim())
    .filter((value) => {
      if (!value) {
        return false;
      }

      if (normalizedMain && value.toLowerCase() === normalizedMain) {
        return false;
      }

      if (seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}
