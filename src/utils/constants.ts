// ErrorPare - Constants (Phase 2)

export const ERRORPARE_VERSION = '2.0.0';

export const EXIT_CODES = {
  SUCCESS: 0,
  COMMAND_FAILED: 1,
  INVALID_ARGS: 2,
  INTERNAL_ERROR: 3,
} as const;

export const MAX_LINES = 1000;
export const MAX_MEMORY_MB = 100;

export const CLI_NAME = 'errorpare';
export const CLI_DESCRIPTION = 'AI 报错压缩工具 - 让 Claude/Gemini 更高效';

export const CONFIG_FILES = {
  CURSOR: '.cursorrules',
  CLAUDE: '.claude.md',
  CLAUDE_CODE: '.claudeCODE',
  AIDER: '.aider.conf',
  ERRORPARERC: '.errorparerc',
} as const;

// Third-party patterns for Git-aware filtering
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

export const STACK_TRACE_PATTERNS = {
  // JavaScript/TypeScript
  JS: /at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/g,
  
  // Python
  PYTHON: /File\s+"(.+?)",\s+line\s+(\d+)(?:,\s+in\s+(.+?))?/g,
  
  // Java
  JAVA: /at\s+(.+?)\((.+?):(\d+)\)/g,
  
  // Go
  GO: /^(.+?):(\d+):\d+\s+(.+?)$/gm,
  
  // Rust
  RUST: /^\s*(\d+):\s*(.+?)\s+at\s+(.+?):(\d+):(\d+)$/gm,
  
  // C/C++
  CPP: /^(.+?):(\d+):\d+:\s*(.+?)$/gm,
} as const;

export const ERROR_TYPE_PATTERNS = {
  TypeError: /TypeError:\s*(.+)/i,
  ReferenceError: /ReferenceError:\s*(.+)/i,
  SyntaxError: /SyntaxError:\s*(.+)/i,
  Error: /^Error:\s*(.+)/i,
  ZeroDivisionError: /ZeroDivisionError:\s*(.+)/i,
  NullPointerException: /NullPointerException:\s*(.+)/i,
  RuntimeError: /RuntimeError:\s*(.+)/i,
} as const;

export const VARIABLE_PATTERNS = {
  // IP addresses
  IP: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  
  // UUIDs
  UUID: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
  
  // Hex numbers
  HEX: /\b0x[0-9a-fA-F]+\b/g,
  
  // File paths
  PATH: /(?:\/[a-zA-Z0-9_.-]+)+\/?/g,
  
  // Numbers in stack traces
  NUMBER: /\b\d+\b/g,
} as const;

export const FRAMEWORK_NAMES = {
  'node_modules/express': 'express',
  'node_modules/react': 'react',
  'node_modules/vue': 'vue',
  'node_modules/angular': 'angular',
  'node_modules/next': 'next',
  'site-packages/django': 'django',
  'site-packages/flask': 'flask',
  'site-packages/requests': 'requests',
  '.cargo/registry': 'cargo',
  '/usr/include': 'gcc',
} as const;
