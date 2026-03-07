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

import { startMCPServer } from '../mcp/server.js';

startMCPServer();
