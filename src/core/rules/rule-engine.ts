// ErrorPare - Rule Engine (Phase 2)

export interface ErrorRule {
  id: string;
  name: string;
  language: 'typescript' | 'python' | 'java' | 'go' | 'rust' | 'cpp' | 'ruby' | 'php' | 'general';
  pattern: RegExp;
  severity: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  suggestion: string;
  examples?: string[];
}

export interface RuleMatch {
  rule: ErrorRule;
  match: RegExpMatchArray;
  confidence: number;
  context?: string;
}

export class RuleEngine {
  private rules: ErrorRule[] = [];

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Load default rule library (50+ rules for Phase 2)
   */
  private loadDefaultRules(): void {
    // TypeScript/JavaScript Rules
    this.rules.push(
      // Null/Undefined errors
      {
        id: 'ts-001',
        name: 'Cannot read property of undefined/null',
        language: 'typescript',
        pattern: /Cannot read propert(?:y|ies) (?:of )?['"]?(\w+)['"]?\s*(?:of undefined|of null|undefined|null)/i,
        severity: 'error',
        category: 'null-safety',
        description: 'Attempting to access a property on undefined or null value',
        suggestion: 'Add null check before accessing property, or use optional chaining (?.)',
        examples: ["Cannot read property 'id' of undefined"],
      },
      {
        id: 'ts-002',
        name: 'Cannot read property of undefined (optional chaining)',
        language: 'typescript',
        pattern: /Cannot read propert(?:y|ies) (?:of )?['"]?(\w+)['"]?\s*of undefined/i,
        severity: 'error',
        category: 'null-safety',
        description: 'Property access on undefined - use optional chaining',
        suggestion: 'Use optional chaining: obj?.property instead of obj.property',
      },
      {
        id: 'ts-003',
        name: 'Variable is possibly undefined',
        language: 'typescript',
        pattern: /Variable '(?:\w+)' is possibly 'undefined'/i,
        severity: 'error',
        category: 'type-safety',
        description: 'TypeScript strict null check failed',
        suggestion: 'Add type guard or default value: const x = value ?? defaultValue',
      },
      
      // Import/Module errors
      {
        id: 'ts-004',
        name: 'Cannot find module',
        language: 'typescript',
        pattern: /Cannot find module ['"]([^'"]+)['"]/i,
        severity: 'error',
        category: 'module',
        description: 'Module import failed - package not installed or path incorrect',
        suggestion: 'Run npm install <package> or check import path',
      },
      {
        id: 'ts-005',
        name: 'Module not found',
        language: 'typescript',
        pattern: /Module not found['"]?:? Can't resolve ['"]([^'"]+)['"]/i,
        severity: 'error',
        category: 'module',
        description: 'Webpack/module bundler cannot resolve import',
        suggestion: 'Check package.json dependencies and import path',
      },
      
      // Type errors
      {
        id: 'ts-006',
        name: 'Type is not assignable',
        language: 'typescript',
        pattern: /Type '(?:[^']+)' is not assignable to type '(?:[^']+)'/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Type mismatch - value does not match expected type',
        suggestion: 'Check type definitions and ensure value matches expected type',
      },
      {
        id: 'ts-007',
        name: 'Property does not exist',
        language: 'typescript',
        pattern: /Property '(?:\w+)' does not exist on type ['"]?([^'"]+)['"]?/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Accessing non-existent property on typed object',
        suggestion: 'Check interface/type definition or add property',
      },
      
      // Async/Promise errors
      {
        id: 'ts-008',
        name: 'Promise/async handling',
        language: 'typescript',
        pattern: /(?:Promise|async function|await) (?:must be awaited|handled with \.catch)/i,
        severity: 'error',
        category: 'async',
        description: 'Unhandled Promise or missing await',
        suggestion: 'Add await keyword or .catch() handler',
      },
      
      // Build errors
      {
        id: 'ts-009',
        name: 'Build failed with errors',
        language: 'typescript',
        pattern: /Build failed with (\d+) error(?:s)?/i,
        severity: 'error',
        category: 'build',
        description: 'TypeScript compilation failed',
        suggestion: 'Fix type errors and re-run build',
      },
      {
        id: 'ts-010',
        name: 'TS Error code',
        language: 'typescript',
        pattern: /TS(\d+):\s*(.+)/i,
        severity: 'error',
        category: 'type-safety',
        description: 'TypeScript compiler error',
        suggestion: 'Look up TS code and fix accordingly',
      },
    );

    // Python Rules
    this.rules.push(
      {
        id: 'py-001',
        name: 'AttributeError - NoneType',
        language: 'python',
        pattern: /AttributeError: 'NoneType' object has no attribute '(\w+)'/i,
        severity: 'error',
        category: 'null-safety',
        description: 'Calling method/attribute on None value',
        suggestion: 'Add None check before accessing attribute',
      },
      {
        id: 'py-002',
        name: 'KeyError',
        language: 'python',
        pattern: /KeyError: ['"]([^'"]+)['"]/i,
        severity: 'error',
        category: 'data-access',
        description: 'Dictionary key does not exist',
        suggestion: 'Use dict.get(key) or check key existence with "in"',
      },
      {
        id: 'py-003',
        name: 'IndexError',
        language: 'python',
        pattern: /IndexError: (?:list index out of range|tuple index out of range)/i,
        severity: 'error',
        category: 'data-access',
        description: 'List/tuple index out of bounds',
        suggestion: 'Check list length before indexing or use try/except',
      },
      {
        id: 'py-004',
        name: 'TypeError - NoneType',
        language: 'python',
        pattern: /TypeError: (?:unsupported operand type|object of type) 'NoneType'/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Operation on None value',
        suggestion: 'Ensure value is not None before operation',
      },
      {
        id: 'py-005',
        name: 'ModuleNotFoundError',
        language: 'python',
        pattern: /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/i,
        severity: 'error',
        category: 'module',
        description: 'Python module not installed',
        suggestion: 'Run pip install <package>',
      },
      {
        id: 'py-006',
        name: 'ImportError',
        language: 'python',
        pattern: /ImportError: (?:cannot import name|No module named)/i,
        severity: 'error',
        category: 'module',
        description: 'Import statement failed',
        suggestion: 'Check module name and installation',
      },
      {
        id: 'py-007',
        name: 'SyntaxError',
        language: 'python',
        pattern: /SyntaxError: (.+)/i,
        severity: 'error',
        category: 'syntax',
        description: 'Python syntax error',
        suggestion: 'Fix syntax at indicated line',
      },
      {
        id: 'py-008',
        name: 'IndentationError',
        language: 'python',
        pattern: /IndentationError: (.+)/i,
        severity: 'error',
        category: 'syntax',
        description: 'Python indentation error',
        suggestion: 'Fix indentation - use consistent spaces/tabs',
      },
      {
        id: 'py-009',
        name: 'ValueError',
        language: 'python',
        pattern: /ValueError: (.+)/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Invalid value for operation',
        suggestion: 'Validate input before operation',
      },
      {
        id: 'py-010',
        name: 'FileNotFoundError',
        language: 'python',
        pattern: /FileNotFoundError: \[Errno 2\] No such file or directory: ['"]([^'"]+)['"]/i,
        severity: 'error',
        category: 'file-io',
        description: 'File does not exist at path',
        suggestion: 'Check file path and ensure file exists',
      },
    );

    // Java Rules
    this.rules.push(
      {
        id: 'java-001',
        name: 'NullPointerException',
        language: 'java',
        pattern: /java\.lang\.NullPointerException(?:\s*:?\s*(.+))?/i,
        severity: 'error',
        category: 'null-safety',
        description: 'Dereferencing null object reference',
        suggestion: 'Add null check or use Optional',
      },
      {
        id: 'java-002',
        name: 'ClassCastException',
        language: 'java',
        pattern: /java\.lang\.ClassCastException: (.+)/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Invalid type cast',
        suggestion: 'Check object type before casting with instanceof',
      },
      {
        id: 'java-003',
        name: 'ArrayIndexOutOfBoundsException',
        language: 'java',
        pattern: /java\.lang\.ArrayIndexOutOfBoundsException/i,
        severity: 'error',
        category: 'data-access',
        description: 'Array index out of bounds',
        suggestion: 'Check array length before accessing',
      },
      {
        id: 'java-004',
        name: 'IllegalArgumentException',
        language: 'java',
        pattern: /java\.lang\.IllegalArgumentException: (.+)/i,
        severity: 'error',
        category: 'validation',
        description: 'Invalid method argument',
        suggestion: 'Validate arguments before method call',
      },
      {
        id: 'java-005',
        name: 'IllegalStateException',
        language: 'java',
        pattern: /java\.lang\.IllegalStateException: (.+)/i,
        severity: 'error',
        category: 'state',
        description: 'Method called in wrong state',
        suggestion: 'Check object state before method call',
      },
    );

    // Go Rules
    this.rules.push(
      {
        id: 'go-001',
        name: 'Nil pointer dereference',
        language: 'go',
        pattern: /panic: runtime error: invalid memory address or nil pointer dereference/i,
        severity: 'error',
        category: 'null-safety',
        description: 'Dereferencing nil pointer',
        suggestion: 'Add nil check before dereferencing',
      },
      {
        id: 'go-002',
        name: 'Index out of range',
        language: 'go',
        pattern: /panic: runtime error: index out of range/i,
        severity: 'error',
        category: 'data-access',
        description: 'Slice/array index out of bounds',
        suggestion: 'Check length before indexing',
      },
      {
        id: 'go-003',
        name: 'Cannot assign',
        language: 'go',
        pattern: /cannot assign to (?:struct field|map index)/i,
        severity: 'error',
        category: 'type-safety',
        description: 'Assignment to read-only field',
        suggestion: 'Check if field is exported or map is initialized',
      },
      {
        id: 'go-004',
        name: 'Undefined',
        language: 'go',
        pattern: /undefined: (\w+)/i,
        severity: 'error',
        category: 'module',
        description: 'Undefined variable or function',
        suggestion: 'Check spelling and imports',
      },
      {
        id: 'go-005',
        name: 'Import cycle',
        language: 'go',
        pattern: /import cycle not allowed/i,
        severity: 'error',
        category: 'module',
        description: 'Circular import detected',
        suggestion: 'Refactor to break import cycle',
      },
    );

    // General/Rust/C++ Rules
    this.rules.push(
      {
        id: 'rs-001',
        name: 'Panic',
        language: 'rust',
        pattern: /thread '.+' panicked at '(.+?)'(?:, (.+))?/i,
        severity: 'error',
        category: 'runtime',
        description: 'Rust panic occurred',
        suggestion: 'Handle Result/Option properly, avoid unwrap()',
      },
      {
        id: 'rs-002',
        name: 'Borrow checker error',
        language: 'rust',
        pattern: /cannot borrow `.+' as mutable|borrow of moved value/i,
        severity: 'error',
        category: 'ownership',
        description: 'Rust borrow checker violation',
        suggestion: 'Review ownership and borrowing rules',
      },
      {
        id: 'cpp-001',
        name: 'Segmentation fault',
        language: 'cpp',
        pattern: /segmentation fault|(?:segfault|SIGSEGV)/i,
        severity: 'error',
        category: 'memory',
        description: 'Invalid memory access',
        suggestion: 'Check pointer validity and array bounds',
      },
      {
        id: 'cpp-002',
        name: 'Memory leak',
        language: 'cpp',
        pattern: /memory leak|detected memory leaks/i,
        severity: 'warning',
        category: 'memory',
        description: 'Memory not freed',
        suggestion: 'Ensure all allocations are freed or use smart pointers',
      },
      {
        id: 'gen-001',
        name: 'Permission denied',
        language: 'general',
        pattern: /permission denied|EACCES/i,
        severity: 'error',
        category: 'permissions',
        description: 'Insufficient permissions',
        suggestion: 'Check file permissions or run with elevated privileges',
      },
      {
        id: 'gen-002',
        name: 'Connection refused',
        language: 'general',
        pattern: /connection refused|ECONNREFUSED/i,
        severity: 'error',
        category: 'network',
        description: 'Cannot connect to service',
        suggestion: 'Check if service is running and port is correct',
      },
      {
        id: 'gen-003',
        name: 'Timeout',
        language: 'general',
        pattern: /timeout|ETIMEDOUT|request timed out/i,
        severity: 'error',
        category: 'network',
        description: 'Operation timed out',
        suggestion: 'Increase timeout or check network connectivity',
      },
      {
        id: 'gen-004',
        name: 'Out of memory',
        language: 'general',
        pattern: /out of memory|ENOMEM|heap out of memory/i,
        severity: 'error',
        category: 'memory',
        description: 'Insufficient memory',
        suggestion: 'Reduce memory usage or increase available memory',
      },
      {
        id: 'gen-005',
        name: 'Command not found',
        language: 'general',
        pattern: /command not found|not recognized as an internal or external command/i,
        severity: 'error',
        category: 'shell',
        description: 'Command not in PATH',
        suggestion: 'Install the command or add to PATH',
      },
      {
        id: 'gen-006',
        name: 'npm missing script',
        language: 'general',
        pattern: /npm (?:ERR! |error )?Missing script:\s*['"]?([^'"\r\n]+)['"]?/i,
        severity: 'error',
        category: 'command',
        description: 'The requested npm script is not defined in package.json',
        suggestion: 'Run `npm run` to inspect available scripts, or add the missing script to package.json',
        examples: ['Missing script: "build"'],
      },
    );
  }

  /**
   * Match error text against all rules
   */
  match(errorText: string): RuleMatch[] {
    const matches: RuleMatch[] = [];
    
    for (const rule of this.rules) {
      const match = errorText.match(rule.pattern);
      if (match) {
        matches.push({
          rule,
          match,
          confidence: this.calculateConfidence(rule, match),
          context: match[0],
        });
      }
    }
    
    // Sort by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate match confidence (0-1)
   */
  private calculateConfidence(rule: ErrorRule, match: RegExpMatchArray): number {
    let confidence = 0.5;
    
    // Full match gets higher confidence
    if (match[0].length > 20) confidence += 0.2;
    
    // Extra capture groups indicate more specific match
    if (match.length > 2) confidence += 0.1;
    
    // Known error patterns get bonus
    if (rule.examples?.some(ex => match[0].includes(ex))) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Get rule by ID
   */
  getRule(id: string): ErrorRule | undefined {
    return this.rules.find(r => r.id === id);
  }

  /**
   * Get all rules for a language
   */
  getRulesByLanguage(language: ErrorRule['language']): ErrorRule[] {
    return this.rules.filter(r => r.language === language || r.language === 'general');
  }

  /**
   * Get rule count
   */
  getRuleCount(): number {
    return this.rules.length;
  }

  /**
   * Add custom rule
   */
  addRule(rule: ErrorRule): void {
    this.rules.push(rule);
  }
}
