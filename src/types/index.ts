// ErrorPare - Core Types

export interface ErrorPareOptions {
  /** Maximum lines to keep in memory */
  maxLines?: number;
  /** Enable Git-aware third-party frame collapsing */
  gitAware?: boolean;
  /** Enable LLM analysis (requires API key) */
  analyze?: boolean;
  /** Output format: 'text' | 'json' */
  output?: 'text' | 'json';
  /** Language for parsing (auto-detected if not specified) */
  language?: ProgrammingLanguage;
  /** Project root directory */
  projectRoot?: string;
}

export type ProgrammingLanguage = 
  | 'typescript' 
  | 'javascript' 
  | 'python' 
  | 'go' 
  | 'java' 
  | 'rust' 
  | 'cpp' 
  | 'ruby' 
  | 'php' 
  | 'csharp'
  | 'unknown';

export interface CompressionResult {
  success: boolean;
  exitCode: number;
  command: string;
  timing: {
    total: number;
    compression: number;
    analysis?: number;
  };
  compression: {
    originalLines: number;
    compressedLines: number;
    rate: number;
    uniqueErrors: number;
    thirdPartyCollapsed?: number;
  };
  errors: CompressedError[];
  summary: string;
  llmAnalysis?: LLMAnalysis;
}

export interface CompressedError {
  count: number;
  type: string;
  message: string;
  template: string;
  location?: string;
  variables: Variable[];
  suggestion?: string;
}

export interface Variable {
  name: string;
  value: string;
  type: 'identifier' | 'path' | 'ip' | 'hex' | 'uuid' | 'number';
}

export interface LLMAnalysis {
  rootCause: string;
  fix: string;
  codeSnippet?: string;
}

export interface StackFrame {
  file: string;
  line: number;
  column: number;
  method?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const THIRD_PARTY_PATTERNS = [
  'node_modules',
  'site-packages',
  '.cargo/registry',
  '.cache',
  'vendor/bundle',
  '.npm',
  '.pnpm',
  'packages',
  '__pycache__',
  'dist',
  'build',
  '.next',
] as const;

export const DEFAULT_OPTIONS: ErrorPareOptions = {
  maxLines: 1000,
  gitAware: true,
  analyze: false,
  output: 'text',
};
