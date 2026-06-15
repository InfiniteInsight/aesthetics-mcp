# aesthetics-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server that gives Claude knowledge of 1135+ named visual aesthetics from the [Aesthetics Wiki](https://aesthetics.fandom.com/wiki/Aesthetics_Wiki). Use it to generate CSS tokens, Tailwind configs, design briefs, and UI components grounded in real aesthetic traditions.

## Prerequisites

- Node.js 18+
- [Claude Code](https://claude.ai/code) (CLI, desktop app, or IDE extension)

## Install

```bash
git clone https://github.com/InfiniteInsight/aesthetics-mcp.git
cd aesthetics-mcp
npm install
npm run setup
```

Then **restart Claude Code**. The MCP server and aesthetics skill are now active.

The database ships pre-scraped and pre-embedded — no scraping or model download needed on first run. The embedding model (~23MB) downloads on the first `suggest_aesthetics` call.

## Usage

The skill activates automatically on design-related requests. You can also trigger it directly:

| Intent | Example |
|--------|---------|
| Named aesthetic | "make it Vaporwave" |
| Vibe description | "dark moody academic candlelight" |
| Project description | "a meditation app, calm but not clinical" |
| Random inspiration | "pick a random aesthetic for me" |
| Color-first | "find aesthetics that use black and gold" |
| Explore | "what aesthetics are related to Dark Academia?" |

## MCP Tools

| Tool | Description |
|------|-------------|
| `get_aesthetic` | Full details + wiki text for a named aesthetic |
| `search_aesthetics` | FTS keyword search across all 1135+ aesthetics |
| `suggest_aesthetics` | Semantic similarity search from a project description |
| `list_aesthetics` | Browse all aesthetics, optionally filtered by category |
| `random_aesthetic` | Random pick, optionally filtered by category |
| `search_by_color` | Find aesthetics by color name (e.g. "burgundy", "earth tones") |
| `list_categories` | All 66 distinct aesthetic categories |
| `find_related` | Resolve an aesthetic's related/adjacent neighbors |
| `check_db_staleness` | How recently the database was last scraped |

## Re-scraping

The bundled database was scraped in June 2026. To refresh it:

```bash
npm run scrape                        # re-scrapes all 1135 aesthetics (~30 min)
node src/db/migrate-embeddings.js     # re-computes semantic embeddings (~5 min)
```

## Development

```bash
npm test          # run all 63 tests
npm run setup     # re-run after pulling changes to update skill + MCP path
```
