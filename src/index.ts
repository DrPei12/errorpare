/**
 * ErrorPare - AI报错压缩工具
 * @package @errorpare/core
 */

export { Compressor, compress } from './core/compressor.js';
export { applyGitAwareFilter } from './core/filters/git-aware.js';
export { deduplicateErrors, maskVariables } from './core/filters/deduplicator.js';
export { Drain3Miner, processWithDrain3, type Drain3Cluster } from './core/filters/drain3.js';
export { CommandExecutor, SimpleCommandExecutor } from './core/executor/command-executor.js';
export type {
  ErrorPareOptions,
  ProgrammingLanguage,
  CompressionResult,
  CompressedError,
  Variable,
  LLMAnalysis,
  StackFrame,
  ExecutionResult,
} from './types/index.js';
