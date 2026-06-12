import { searchAesthetics, getAesthetic, listAesthetics, suggestAesthetics } from '../db/read.js';

export const TOOLS = [
  {
    name: 'search_aesthetics',
    description: 'Full-text search across 300+ aesthetics by vibe, mood, color names, or motifs. Returns lightweight results. Use for vibe-first inputs like "dark moody academia" or "warm handmade cozy".',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keywords, mood descriptors, or vibe description to search for',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_aesthetic',
    description: 'Get the full details for a specific aesthetic by name or slug, including the complete wiki page text in `raw_text`. Use when the user names an aesthetic directly. After receiving the result, summarize `raw_text` with a Haiku subagent to get a richer description than the pre-extracted `description` field.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Aesthetic name or slug, e.g. "Vaporwave" or "dark-academia"',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_aesthetics',
    description: 'List all available aesthetics with their categories and mood tags. Optionally filter by category. Use for discovery or when suggesting options to the user.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category to filter by, e.g. "nature", "music", "fashion"',
        },
      },
    },
  },
  {
    name: 'suggest_aesthetics',
    description: 'Given a project description, return the top matching aesthetics. Use when the user describes their project or desired feeling rather than naming an aesthetic.',
    inputSchema: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Project description or desired vibe, e.g. "a meditation app for millennials, calm but not clinical"',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of results (default: 3)',
        },
      },
      required: ['description'],
    },
  },
];

export function handleToolCall(db, toolName, args) {
  switch (toolName) {
    case 'search_aesthetics':
      return searchAesthetics(db, args.query);
    case 'get_aesthetic':
      return getAesthetic(db, args.name);
    case 'list_aesthetics':
      return listAesthetics(db, args.category);
    case 'suggest_aesthetics':
      return suggestAesthetics(db, args.description, args.limit ?? 3);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
