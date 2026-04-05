// ErrorPare - MCP Server

import * as fs from 'fs/promises';
import * as path from 'path';
import { Compressor } from '../core/compressor.js';
import { CommandExecutor } from '../core/executor/command-executor.js';
import { RuleEngine } from '../core/rules/rule-engine.js';
import type { ErrorPareOptions } from '../types/index.js';
import { ERRORPARE_VERSION } from '../utils/constants.js';

interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  fileName: string;
}

const LANGUAGE_ENUM = ['typescript', 'javascript', 'python', 'go', 'java', 'rust', 'cpp', 'ruby', 'php', 'csharp'];
const MCP_RESOURCES: MCPResource[] = [
  {
    uri: 'errorpare://docs/mcp-integration',
    name: 'MCP Integration Guide',
    description: 'Overview and end-to-end setup for using ErrorPare as an MCP server.',
    mimeType: 'text/markdown',
    fileName: 'MCP_INTEGRATION.md',
  },
  {
    uri: 'errorpare://docs/claude-desktop',
    name: 'Claude Desktop Setup',
    description: 'Claude Desktop configuration example and troubleshooting notes.',
    mimeType: 'text/markdown',
    fileName: 'MCP_CLAUDE_DESKTOP.md',
  },
  {
    uri: 'errorpare://docs/cursor',
    name: 'Cursor Setup',
    description: 'Cursor MCP configuration example and workflow tips.',
    mimeType: 'text/markdown',
    fileName: 'MCP_CURSOR.md',
  },
];

async function resolveResourcePath(fileName: string): Promise<string | null> {
  const scriptDir = process.argv[1] ? path.dirname(path.resolve(process.argv[1])) : process.cwd();
  const candidates = [
    path.resolve(process.cwd(), 'docs', fileName),
    path.resolve(scriptDir, '..', 'docs', fileName),
    path.resolve(scriptDir, 'docs', fileName),
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

function normalizeToolResult(result: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      },
    ],
  };
}

function createToolInputSchema(requiredKey: string, extraProperties: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      [requiredKey]: {
        type: 'string',
      },
      language: {
        type: 'string',
        enum: LANGUAGE_ENUM,
        description: 'Programming language (auto-detected if not specified)',
      },
      maxLines: {
        type: 'number',
        description: 'Maximum lines to keep in memory',
        default: 1000,
      },
      contextLines: {
        type: 'number',
        description: 'Number of source context lines to attach (0-20)',
        default: 0,
      },
      projectRoot: {
        type: 'string',
        description: 'Project root used for Git-aware filtering and source map resolution',
      },
      gitAware: {
        type: 'boolean',
        description: 'Collapse third-party frames before compression when source maps are not restoring frames',
        default: true,
      },
      sourceMaps: {
        type: 'boolean',
        description: 'Restore JavaScript/TypeScript stack frames through source maps',
        default: true,
      },
      ...extraProperties,
    },
    required: [requiredKey],
  };
}

/**
 * MCP Server implementation for ErrorPare
 * Implements the Model Context Protocol for AI tool integration
 */
export class ErrorPareMCPServer {
  private compressor: Compressor;
  private readonly ruleEngine: RuleEngine;
  
  constructor(options: ErrorPareOptions = {}) {
    this.compressor = new Compressor(options);
    this.ruleEngine = new RuleEngine();
  }
  
  /**
   * Handle incoming MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse | null> {
    const { id, method, params } = request;
    
    try {
      switch (method) {
        case 'initialize':
          return this.createResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {
                listChanged: false,
              },
              resources: {
                listChanged: false,
                subscribe: false,
              },
            },
            serverInfo: {
              name: 'errorpare',
              version: ERRORPARE_VERSION,
            },
          });

        case 'notifications/initialized':
          return null;
        
        case 'tools/list':
          return this.createResponse(id, {
            tools: [
              {
                name: 'run_command',
                description: 'Execute a shell command and compress the resulting stderr/stdout into a smaller debugging payload.',
                inputSchema: createToolInputSchema('command', {
                  cwd: {
                    type: 'string',
                    description: 'Working directory for the command execution',
                  },
                }),
              },
              {
                name: 'compress_errors',
                description: 'Compress existing error text without executing a command.',
                inputSchema: createToolInputSchema('errors'),
              },
              {
                name: 'analyze_errors',
                description: 'Run local ErrorPare compression plus rule-based diagnosis on existing error text.',
                inputSchema: createToolInputSchema('errors', {
                  includeCompression: {
                    type: 'boolean',
                    description: 'Include compressed error payload in the analysis response',
                    default: true,
                  },
                }),
              },
            ],
          });

        case 'resources/list':
          return this.createResponse(id, {
            resources: MCP_RESOURCES.map(({ uri, name, description, mimeType }) => ({
              uri,
              name,
              description,
              mimeType,
            })),
          });

        case 'resources/read':
          return this.handleResourceRead(id, params);
        
        case 'tools/call':
          return this.handleToolCall(id, params);
        
        case 'ping':
          return this.createResponse(id, { pong: true });
        
        default:
          return this.createErrorResponse(id, -32601, `Method not found: ${method}`);
      }
    } catch (error: any) {
      return this.createErrorResponse(id, -32603, error.message);
    }
  }
  
  /**
   * Handle tool call
   */
  private async handleToolCall(
    id: string | number | undefined,
    params: { name: string; arguments?: any }
  ): Promise<MCPResponse> {
    const { name, arguments: args = {} } = params;

    try {
      switch (name) {
        case 'run_command': {
          if (!args.command) {
            return this.createErrorResponse(id, -32602, 'Missing required parameter: command');
          }
          
          const executor = new CommandExecutor({ cwd: args.cwd });
          const execResult = await executor.execute(args.command);
          
          const errorOutput = execResult.stderr || execResult.stdout;
          const compressor = new Compressor(this.buildCompressorOptions(args));
          const result = await compressor.compress(
            errorOutput,
            args.command,
            execResult.exitCode
          );
          
          return this.createResponse(id, normalizeToolResult({
            success: result.success,
            exitCode: execResult.exitCode,
            command: args.command,
            compression: result.compression,
            errors: result.errors,
            summary: result.summary,
            formatted: compressor.formatAsText(result),
          }));
        }
        
        case 'compress_errors': {
          if (!args.errors) {
            return this.createErrorResponse(id, -32602, 'Missing required parameter: errors');
          }
          
          const compressor = new Compressor(this.buildCompressorOptions(args));
          const result = await compressor.compress(args.errors, 'compress_errors', 1);
          
          return this.createResponse(id, normalizeToolResult(result));
        }

        case 'analyze_errors': {
          if (!args.errors) {
            return this.createErrorResponse(id, -32602, 'Missing required parameter: errors');
          }

          const compressor = new Compressor(this.buildCompressorOptions(args));
          const compression = await compressor.compress(args.errors, 'analyze_errors', 1);
          const matches = this.ruleEngine.match(args.errors).map(match => ({
            ruleId: match.rule.id,
            name: match.rule.name,
            category: match.rule.category,
            severity: match.rule.severity,
            confidence: match.confidence,
            suggestion: match.rule.suggestion,
            context: match.context,
          }));

          return this.createResponse(id, normalizeToolResult({
            summary: compression.summary,
            topSuggestion: matches[0]?.suggestion,
            matches,
            ...(args.includeCompression === false ? {} : { compression }),
          }));
        }
        
        default:
          return this.createErrorResponse(id, -32601, `Tool not found: ${name}`);
      }
    } catch (error: any) {
      return this.createErrorResponse(id, -32603, error.message);
    }
  }
  
  /**
   * Create success response
   */
  private async handleResourceRead(id: string | number | undefined, params: { uri?: string }): Promise<MCPResponse> {
    const resource = MCP_RESOURCES.find(item => item.uri === params?.uri);
    if (!resource) {
      return this.createErrorResponse(id, -32602, `Unknown resource: ${params?.uri ?? 'undefined'}`);
    }

    try {
      const resourcePath = await resolveResourcePath(resource.fileName);
      if (!resourcePath) {
        return this.createErrorResponse(id, -32603, `Failed to locate resource: ${resource.uri}`);
      }

      const text = await fs.readFile(resourcePath, 'utf-8');
      return this.createResponse(id, {
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text,
          },
        ],
      });
    } catch (error: any) {
      return this.createErrorResponse(id, -32603, `Failed to read resource: ${resource.uri}`, error.message);
    }
  }

  private buildCompressorOptions(args: Record<string, unknown>): ErrorPareOptions {
    return {
      language: args.language as ErrorPareOptions['language'],
      maxLines: typeof args.maxLines === 'number' ? args.maxLines : undefined,
      contextLines: typeof args.contextLines === 'number' ? Math.min(Math.max(args.contextLines, 0), 20) : 0,
      projectRoot: typeof args.projectRoot === 'string' ? args.projectRoot : process.cwd(),
      gitAware: typeof args.gitAware === 'boolean' ? args.gitAware : true,
      sourceMaps: typeof args.sourceMaps === 'boolean' ? args.sourceMaps : true,
    };
  }

  private createResponse(id: string | number | undefined, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result,
    };
  }
  
  /**
   * Create error response
   */
  private createErrorResponse(id: string | number | undefined, code: number, message: string, data?: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      error: {
        code,
        message,
        data,
      },
    };
  }
}

/**
 * CLI entry point for MCP server
 */
export function startMCPServer(): void {
  const server = new ErrorPareMCPServer();
  
  // Read JSON-RPC requests from stdin
  process.stdin.setEncoding('utf-8');
  
  let buffer = '';
  
  process.stdin.on('data', async (chunk: string) => {
    buffer += chunk;
    
    // Try to parse complete JSON messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.trim()) {
        try {
          const request = JSON.parse(line) as MCPRequest;
          
          const response = await server.handleRequest(request);
          if (response) {
            console.log(JSON.stringify(response));
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  });
  
  process.stdin.on('end', () => {
    // Handle any remaining data
    if (buffer.trim()) {
      try {
        const request = JSON.parse(buffer) as MCPRequest;
        server.handleRequest(request).then(response => {
          if (response) {
            console.log(JSON.stringify(response));
          }
        });
      } catch {
        // Ignore
      }
    }
  });
}
