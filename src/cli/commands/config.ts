// ErrorPare - CLI 'config' command (Phase 2)

import { Command } from 'commander';
import chalk from 'chalk';
import { ConfigManager } from '../../core/config/config-manager.js';

interface ConfigOptions {
  get?: string;
  set?: string;
  reset?: boolean;
  path?: boolean;
}

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
  
  // Show config path
  if (options.path) {
    console.log(configManager.getConfigPath());
    return;
  }
  
  // Reset configuration
  if (options.reset) {
    configManager.reset();
    configManager.save();
    console.log(chalk.green('✅ Configuration reset to defaults'));
    return;
  }
  
  // Get specific value
  if (options.get) {
    const config = configManager.getConfig();
    const keys = options.get.split('.');
    let value: any = config;
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    if (value === undefined) {
      console.log(chalk.yellow(`⚠️  Key not found: ${options.get}`));
    } else {
      console.log(JSON.stringify(value, null, 2));
    }
    return;
  }
  
  // Set value (simplified - full implementation would parse key=value)
  if (options.set) {
    console.log(chalk.yellow('⚠️  Interactive config editor not yet implemented'));
    console.log(chalk.gray('   Edit config file directly:'), configManager.getConfigPath());
    return;
  }
  
  // Show full configuration
  console.log('');
  console.log(chalk.cyan('🦞 ErrorPare Configuration'));
  console.log(chalk.gray('═'.repeat(50)));
  console.log('');
  
  const config = configManager.getConfig();
  
  console.log(chalk.yellow('Mode:'), config.mode);
  console.log(chalk.yellow('Version:'), config.version);
  console.log('');
  
  console.log(chalk.yellow('Settings:'));
  console.log(chalk.gray(`  maxLines: ${config.settings.maxLines}`));
  console.log(chalk.gray(`  gitAware: ${config.settings.gitAware}`));
  console.log(chalk.gray(`  output: ${config.settings.output}`));
  console.log(chalk.gray(`  compressLevel: ${config.settings.compressLevel}`));
  console.log('');
  
  if (config.llm) {
    console.log(chalk.yellow('LLM Configuration:'));
    console.log(chalk.gray(`  provider: ${config.llm.provider}`));
    console.log(chalk.gray(`  model: ${config.llm.model}`));
    console.log(chalk.gray(`  apiKey: ${config.llm.apiKey ? '***' + config.llm.apiKey.slice(-4) : 'not set'}`));
    if (config.llm.baseUrl) {
      console.log(chalk.gray(`  baseUrl: ${config.llm.baseUrl}`));
    }
    console.log('');
  } else {
    console.log(chalk.gray('LLM: not configured'));
    console.log(chalk.gray('    Run: errorpare init --analyze'));
    console.log('');
  }
  
  if (config.rules) {
    console.log(chalk.yellow('Rules:'));
    console.log(chalk.gray(`  enabled: ${config.rules.enabled}`));
    console.log('');
  }
  
  console.log(chalk.gray('─'.repeat(50)));
  console.log(chalk.gray(`Config file: ${configManager.getConfigPath()}`));
  console.log('');
}
