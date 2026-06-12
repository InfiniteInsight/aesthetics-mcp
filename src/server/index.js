#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { initDb } from '../db/schema.js';
import { TOOLS, handleToolCall } from './tools.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.AESTHETICS_DB_PATH
  ?? resolve(__dirname, '../../data/aesthetics.db');

let db;
try {
  db = initDb(DB_PATH);
} catch (err) {
  process.stderr.write(`Failed to open database at ${DB_PATH}: ${err.message}\n`);
  process.exit(1);
}

const server = new Server(
  { name: 'aesthetics-mcp', version },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(db, name, args ?? {});
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

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  process.stderr.write(`Failed to start aesthetics-mcp: ${err.message}\n`);
  process.exit(1);
});
