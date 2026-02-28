#!/usr/bin/env node

/**
 * ErrorPare - MCP Server Entry Point
 * 
 * This is a dedicated entry point for MCP mode.
 * It uses stdio for JSON-RPC communication.
 * 
 * Usage:
 *   errorpare-mcp
 * 
 * Or via npx:
 *   npx errorpare mcp
 */

import { ErrorPareMCPServer } from '../mcp/server.js';

const server = new ErrorPareMCPServer();

// Read JSON-RPC requests from stdin
process.stdin.setEncoding('utf-8');

let buffer = '';

process.stdin.on('data', (chunk: string) => {
  buffer += chunk;
  
  // Try to parse complete JSON messages
  // MCP uses newline-delimited JSON
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const request = JSON.parse(line);
        const response = server.handleRequest(request);
        console.log(JSON.stringify(response));
      } catch (e) {
        // Ignore parse errors for non-JSON input
      }
    }
  }
});

process.stdin.on('end', () => {
  // Handle any remaining data
  if (buffer.trim()) {
    try {
      const request = JSON.parse(buffer);
      const response = server.handleRequest(request);
      console.log(JSON.stringify(response));
    } catch (e) {
      // Ignore
    }
  }
});
