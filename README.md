# aesthetics-mcp

MCP server for 300+ visual aesthetics from the [Aesthetics Wiki](https://aesthetics.fandom.com/wiki/Aesthetics_Wiki).

Gives Claude queryable knowledge of named internet aesthetics (Vaporwave, Cottagecore, Dark Academia, etc.) and a workflow for turning that knowledge into design tokens, Tailwind configs, and design briefs.

## Install

```bash
npm install -g aesthetics-mcp
```

Then populate the database (takes ~10 minutes, makes ~300 HTTP requests):

```bash
aesthetics-scrape full
```

## Configure Claude Code

Add to `~/.claude/mcp.json`:

```json
{
  "mcpServers": {
    "aesthetics": {
      "command": "aesthetics-mcp"
    }
  }
}
```

## Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or
`%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "aesthetics": {
      "command": "aesthetics-mcp"
    }
  }
}
```

## Install the companion skill

```bash
mkdir -p ~/.claude/skills/aesthetics
cp skills/aesthetics.md ~/.claude/skills/aesthetics/SKILL.md
```

Then use `/aesthetics` or just describe what you want — the skill auto-triggers on aesthetic requests.

## Refresh the database

```bash
# Re-scrape pages older than 30 days
aesthetics-scrape refresh

# Re-scrape one aesthetic
aesthetics-scrape aesthetic "Vaporwave"

# Custom database path
aesthetics-scrape full --db /path/to/aesthetics.db
AESTHETICS_DB_PATH=/path/to/aesthetics.db aesthetics-mcp
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `search_aesthetics(query)` | Full-text search by vibe or keywords |
| `get_aesthetic(name)` | Full details for a named aesthetic |
| `list_aesthetics(category?)` | Browse all aesthetics, optionally filtered |
| `suggest_aesthetics(description, limit?)` | Top matches for a project description |
