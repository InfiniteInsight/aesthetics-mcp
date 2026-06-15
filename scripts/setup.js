#!/usr/bin/env node
/**
 * Sets up aesthetics-mcp for Claude Code:
 *   1. Registers the MCP server in ~/.claude/mcp.json
 *   2. Installs the aesthetics skill to ~/.claude/skills/aesthetics/SKILL.md
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = join(ROOT, 'src', 'server', 'index.js');
const skillSrc  = join(ROOT, 'skills', 'aesthetics.md');

const claudeDir  = join(homedir(), '.claude');
const mcpConfig  = join(claudeDir, 'mcp.json');
const skillDest  = join(claudeDir, 'skills', 'aesthetics', 'SKILL.md');

// 1. Register MCP server
let config = {};
if (existsSync(mcpConfig)) {
  try { config = JSON.parse(readFileSync(mcpConfig, 'utf8')); } catch {}
}

config['aesthetics-mcp'] = { command: 'node', args: [serverPath] };

mkdirSync(claudeDir, { recursive: true });
writeFileSync(mcpConfig, JSON.stringify(config, null, 2) + '\n');
console.log(`MCP server registered in ${mcpConfig}`);

// 2. Install skill file
mkdirSync(dirname(skillDest), { recursive: true });
copyFileSync(skillSrc, skillDest);
console.log(`Skill installed to ${skillDest}`);

console.log('\nSetup complete. Restart Claude Code to activate.');
console.log('The database ships with pre-computed embeddings — no rescraping needed.');
