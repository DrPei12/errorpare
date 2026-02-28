// ErrorPare - CLI 'compress' command

import { Command } from 'commander';
import { Compressor } from '../../core/compressor.js';
import { createLLMAnalyzer, listModels } from '../../core/analysis/llm-analyzer.js';
import type { ErrorPareOptions } from '../../types/index.js';
import chalk from 'chalk';
import * as fs from 'fs';

interface CompressOptions {
  lang?: string;
  json?: boolean;
  maxLines?: number;
  projectRoot?: string;
  analyze?: boolean;
  apiKey?: string;
  provider?: string;
  model?: string;
  listModels?: boolean;
}

export function createCompressCommand(): Command {
  const command = new Command('compress');
  
  command
    .description('Compress error messages from file or stdin')
    .argument('[input]', 'Error file path or error text (use - for stdin)')
    .option('-l, --lang <language>', 'Target language')
    .option('--json', 'Output in JSON format', false)
    .option('--max-lines <number>', 'Maximum lines to keep', '1000')
    .option('-C, --project-root <directory>', 'Project root directory')
    .option('--analyze', 'Enable LLM analysis (requires API key)', false)
    .option('--api-key <key>', 'API key for LLM analysis (or set GROQ_API_KEY env var)')
    .option('--provider <provider>', 'LLM provider (groq, deepseek, openai, anthropic, azure)', 'groq')
    .option('--model <model>', 'Model ID to use (default: provider default)')
    .option('--list-models', 'List available LLM models', false)
    .action(async (input: string | undefined, options: CompressOptions) => {
      
      // List models if requested
      if (options.listModels) {
        console.log(chalk.cyan(listModels()));
        return;
      }
      
      await compressErrors(input, options);
    });
  
  return command;
}

async function compressErrors(input: string | undefined, options: CompressOptions): Promise<void> {
  let errorContent: string;
  
  // Read input
  if (!input || input === '-') {
    // Read from stdin
    const chunks: string[] = [];
    process.stdin.on('data', (chunk) => chunks.push(chunk.toString()));
    await new Promise<void>((resolve) => {
      process.stdin.on('end', resolve);
    });
    errorContent = chunks.join('');
  } else if (fs.existsSync(input)) {
    // Read from file
    errorContent = fs.readFileSync(input, 'utf-8');
  } else {
    // Treat as direct text
    errorContent = input;
  }
  
  if (!errorContent.trim()) {
    console.error(chalk.red('No error content provided'));
    process.exit(1);
  }
  
  // Parse options
  const maxLines = parseInt(String(options.maxLines) || '1000', 10);
  const projectRoot = options.projectRoot || process.cwd();
  
  // Compress
  const compressor = new Compressor({
    maxLines,
    gitAware: true,
    language: options.lang as ErrorPareOptions['language'],
    projectRoot,
    output: options.json ? 'json' : 'text',
  });
  
  const result = compressor.compress(errorContent);
  
  // LLM Analysis (if requested)
  if (options.analyze) {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY;
    
    if (!apiKey) {
      console.log(chalk.yellow('[ErrorPare] Warning: No API key provided. Set --api-key or GROQ_API_KEY env var'));
      console.log(chalk.yellow('[ErrorPare] Skipping LLM analysis...'));
    } else {
      try {
        const analyzer = createLLMAnalyzer(options.provider || 'groq', apiKey, options.model);
        console.log(chalk.cyan('[ErrorPare] Running LLM analysis with', options.model || 'default model', '...'));
        
        const analysis = await analyzer.analyze(result);
        
        result.llmAnalysis = analysis;
        
        console.log(chalk.green('[ErrorPare] Analysis complete!'));
        console.log('');
        console.log(chalk.bold('📊 Root Cause:'), analysis.rootCause);
        console.log(chalk.bold('🔧 Fix:'), analysis.fix);
      } catch (error: any) {
        console.log(chalk.red('[ErrorPare] Analysis failed:'), error.message);
      }
    }
  }
  
  // Output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(compressor.formatAsText(result));
    
    // Show LLM analysis in text mode
    if (options.analyze && result.llmAnalysis) {
      console.log('');
      console.log(chalk.bold('📊 Root Cause:'), result.llmAnalysis.rootCause);
      console.log(chalk.bold('🔧 Fix:'), result.llmAnalysis.fix);
    }
  }
}
