import { searchAesthetics, getAesthetic, listAesthetics, suggestAesthetics,
         randomAesthetic, searchByColor, listCategories, findRelated, checkStaleness } from '../db/read.js';

export const TOOLS = [
  {
    name: 'search_aesthetics',
    description: 'Full-text search across 1135+ aesthetics by vibe, mood, color names, or motifs. Returns lightweight results. Use for vibe-first inputs like "dark moody academia" or "warm handmade cozy".',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Keywords, mood descriptors, or vibe description to search for',
        },
        min_completeness: {
          type: 'string',
          enum: ['stub', 'partial', 'full'],
          description: 'Minimum data completeness to include (default: "stub" — show all)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_aesthetic',
    description: 'Get the full details for a specific aesthetic by name or slug, including the complete wiki page text in `raw_text`. Automatically falls back to fuzzy search if the exact name is not found — when this happens, `_fuzzy_match: true` is set in the result, and you should confirm the match with the user. After receiving the result, pass `raw_text` to a Haiku subagent for detailed analysis — the pre-extracted `description` field is only the first paragraph and should be ignored.',
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
    description: 'List all 1135+ available aesthetics with their categories and mood tags. Optionally filter by category. Call list_categories first to discover valid category names.',
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
    description: 'Given a project description, return the top matching aesthetics using semantic similarity. More accurate than search_aesthetics for abstract or project-level descriptions like "a meditation app for millennials, calm but not clinical". Use when the user describes a feeling or project rather than naming an aesthetic.',
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
        min_completeness: {
          type: 'string',
          enum: ['stub', 'partial', 'full'],
          description: 'Minimum data completeness (default: "partial" — excludes near-empty stubs)',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'random_aesthetic',
    description: 'Returns a random aesthetic from the database. Use for inspiration, exploration, or when the user wants a surprise. Optionally filter by category.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category to filter by, e.g. "nature", "music", "fashion"',
        },
        min_completeness: {
          type: 'string',
          enum: ['stub', 'partial', 'full'],
          description: 'Minimum data completeness (default: "partial")',
        },
      },
    },
  },
  {
    name: 'search_by_color',
    description: 'Find aesthetics by color name or description. Use when the user says "I want something with burgundy and gold" or "find aesthetics using pastel colors". Searches color name descriptions rather than hex values.',
    inputSchema: {
      type: 'object',
      properties: {
        color: {
          type: 'string',
          description: 'Color name or description, e.g. "burgundy", "pastel pink", "earth tones", "black and gold"',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of results (default: 10)',
        },
      },
      required: ['color'],
    },
  },
  {
    name: 'list_categories',
    description: 'Returns all distinct aesthetic categories in the database. Use this to discover valid category values before calling list_aesthetics with a category filter, or when the user asks what kinds of aesthetics exist.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'find_related',
    description: 'Given an aesthetic name, returns the aesthetics listed as related or adjacent to it in the wiki. Use to explore the aesthetic graph, find alternatives, or blend influences from neighboring aesthetics.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Aesthetic name or slug, e.g. "Dark Academia"',
        },
        limit: {
          type: 'integer',
          description: 'Maximum number of related aesthetics to return (default: 5)',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'check_db_staleness',
    description: 'Reports how recently the aesthetics database was last scraped and whether it is likely stale (>30 days old). Use if the user asks whether the data is current or up to date.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleToolCall(db, toolName, args) {
  switch (toolName) {
    case 'search_aesthetics':
      return searchAesthetics(db, args.query, args.limit ?? 10, args.min_completeness ?? 'stub');
    case 'get_aesthetic':
      return getAesthetic(db, args.name);
    case 'list_aesthetics':
      return listAesthetics(db, args.category);
    case 'suggest_aesthetics':
      return await suggestAesthetics(db, args.description, args.limit ?? 3, args.min_completeness ?? 'partial');
    case 'random_aesthetic':
      return randomAesthetic(db, args.category, args.min_completeness ?? 'partial');
    case 'search_by_color':
      return searchByColor(db, args.color, args.limit ?? 10);
    case 'list_categories':
      return listCategories(db);
    case 'find_related':
      return findRelated(db, args.name, args.limit ?? 5);
    case 'check_db_staleness':
      return checkStaleness(db);
    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
