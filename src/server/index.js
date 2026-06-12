#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from '../db/schema.js';
import { TOOLS, handleToolCall } from './tools.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.AESTHETICS_DB_PATH
  ?? resolve(__dirname, '../../data/aesthetics.db');

const db = initDb(DB_PATH);

const server = new Server(
  { name: 'aesthetics-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = handleToolCall(db, name, args ?? {});
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true,
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
