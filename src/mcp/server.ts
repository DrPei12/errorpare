// ErrorPare - MCP Server

import { Compressor } from '../core/compressor.js';
import { CommandExecutor } from '../core/executor/command-executor.js';
import type { CompressionResult, ErrorPareOptions } from '../types/index.js';
import { ERRORPARE_VERSION } from '../utils/constants.js';

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * MCP Server implementation for ErrorPare
 * Implements the Model Context Protocol for AI tool integration
 */
export class ErrorPareMCPServer {
  private compressor: Compressor;
  private commandExecutor: CommandExecutor;
  
  constructor(options: ErrorPareOptions = {}) {
    this.compressor = new Compressor(options);
    this.commandExecutor = new CommandExecutor();
  }
  
  /**
   * Handle incoming MCP request
   */
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    const { id, method, params } = request;
    
    try {
      switch (method) {
        case 'initialize':
          return this.createResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: true,
              resources: false,
            },
            serverInfo: {
              name: 'errorpare',
              version: ERRORPARE_VERSION,
            },
          });
        
        case 'tools/list':
          return this.createResponse(id, {
            tools: [
              {
                name: 'run_command',
                description: 'Execute a command with error compression. Use this instead of running commands directly to get compressed error output.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    command: {
                      type: 'string',
                      description: 'Command to execute (e.g., "npm run build")',
                    },
                    language: {
                      type: 'string',
                      enum: ['typescript', 'javascript', 'python', 'go', 'java', 'rust', 'cpp', 'ruby', 'php', 'csharp'],
                      description: 'Programming language (auto-detected if not specified)',
                    },
                    maxLines: {
                      type: 'number',
                      description: 'Maximum lines to keep (default: 1000)',
                      default: 1000,
                    },
                    analyze: {
                      type: 'boolean',
                      description: 'Enable LLM analysis (requires API key)',
                      default: false,
                    },
                  },
                  required: ['command'],
                },
              },
              {
                name: 'compress_errors',
                description: 'Compress existing error text without executing a command.',
                inputSchema: {
                  type: 'object',
                  properties: {
                    errors: {
                      type: 'string',
                      description: 'Error text to compress',
                    },
                    language: {
                      type: 'string',
                      enum: ['typescript', 'javascript', 'python', 'go', 'java', 'rust', 'cpp', 'ruby', 'php', 'csharp'],
                      description: 'Programming language (auto-detected if not specified)',
                    },
                    maxLines: {
                      type: 'number',
                      description: 'Maximum lines to keep',
                      default: 1000,
                    },
                  },
                  required: ['errors'],
                },
              },
            ],
          });
        
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
  private async handleToolCall(id: string | number, params: { name: string; arguments?: any }): Promise<MCPResponse> {
    const { name, arguments: args } = params;

    try {
      switch (name) {
        case 'run_command': {
          if (!args.command) {
            return this.createErrorResponse(id, -32602, 'Missing required parameter: command');
          }
          
          // Execute the command
          const execResult = await this.commandExecutor.execute(args.command);
          
          // Compress the error output
          const errorOutput = execResult.stderr || execResult.stdout;
          const result = this.compressor.compress(
            errorOutput,
            args.command,
            execResult.exitCode
          );
          
          return this.createResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: result.success,
                  exitCode: execResult.exitCode,
                  command: args.command,
                  compressed: result.compression,
                  errors: result.errors,
                  summary: result.summary,
                }, null, 2),
              },
            ],
          });
        }
        
        case 'compress_errors': {
          if (!args.errors) {
            return this.createErrorResponse(id, -32602, 'Missing required parameter: errors');
          }
          
          const options: ErrorPareOptions = {
            language: args.language,
            maxLines: args.maxLines,
            gitAware: true,
          };
          
          const compressor = new Compressor(options);
          const result = compressor.compress(args.errors, 'compress_errors', 1);
          
          return this.createResponse(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          });
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
  private createResponse(id: string | number, result: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      result,
    };
  }
  
  /**
   * Create error response
   */
  private createErrorResponse(id: string | number, code: number, message: string, data?: any): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
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
          
          // Handle async tools
          const response = await server.handleRequest(request);
          console.log(JSON.stringify(response));
        } catch (e) {
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
          console.log(JSON.stringify(response));
        });
      } catch (e) {
        // Ignore
      }
    }
  });
}
