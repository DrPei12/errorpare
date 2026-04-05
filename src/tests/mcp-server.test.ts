import { describe, expect, it } from 'vitest';
import path from 'path';
import { ErrorPareMCPServer } from '../mcp/server.js';

describe('ErrorPareMCPServer', () => {
  it('advertises tools and resources during initialization', async () => {
    const server = new ErrorPareMCPServer();
    const initResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
    });

    expect(initResponse?.result?.capabilities?.tools).toBeTruthy();
    expect(initResponse?.result?.capabilities?.resources).toBeTruthy();

    const toolsResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/list',
    });

    const toolNames = toolsResponse?.result?.tools?.map((tool: { name: string }) => tool.name);
    expect(toolNames).toContain('run_command');
    expect(toolNames).toContain('compress_errors');
    expect(toolNames).toContain('analyze_errors');

    const resourcesResponse = await server.handleRequest({
      jsonrpc: '2.0',
      id: 3,
      method: 'resources/list',
    });

    const resourceUris = resourcesResponse?.result?.resources?.map((resource: { uri: string }) => resource.uri);
    expect(resourceUris).toContain('errorpare://docs/mcp-integration');
    expect(resourceUris).toContain('errorpare://docs/claude-desktop');
    expect(resourceUris).toContain('errorpare://docs/cursor');
  });

  it('returns null for initialized notifications', async () => {
    const server = new ErrorPareMCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    expect(response).toBeNull();
  });

  it('reads markdown resources from the published docs set', async () => {
    const server = new ErrorPareMCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 'resource-1',
      method: 'resources/read',
      params: {
        uri: 'errorpare://docs/mcp-integration',
      },
    });

    expect(response?.result?.contents?.[0]?.mimeType).toBe('text/markdown');
    expect(response?.result?.contents?.[0]?.text).toContain('ErrorPare 可以作为一个本地 MCP Server');
  });

  it('analyzes errors with local rules and optional compression payload', async () => {
    const server = new ErrorPareMCPServer();
    const response = await server.handleRequest({
      jsonrpc: '2.0',
      id: 'tool-1',
      method: 'tools/call',
      params: {
        name: 'analyze_errors',
        arguments: {
          errors: "TypeError: Cannot read property 'id' of undefined",
          includeCompression: true,
          projectRoot: path.resolve(process.cwd()),
        },
      },
    });

    const content = JSON.parse(response?.result?.content?.[0]?.text ?? '{}');
    expect(content.matches[0].ruleId).toBe('ts-001');
    expect(content.compression.errors[0].message).toContain("Cannot read property 'id'");
  });
});
