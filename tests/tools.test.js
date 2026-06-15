import { describe, test, expect, beforeEach } from 'vitest';
import { initDb } from '../src/db/schema.js';
import { upsertAesthetic } from '../src/db/write.js';
import { TOOLS, handleToolCall } from '../src/server/tools.js';

const SAMPLE = {
  name: 'Vaporwave',
  slug: 'vaporwave',
  aliases: [],
  categories: ['music'],
  related: [],
  description: 'A retro-futurist aesthetic.',
  mood_tags: ['nostalgic'],
  era: '',
  colors: ['#FF71CE'],
  color_names: ['hot pink'],
  typography: [],
  textures: [],
  motifs: [],
  key_media: [],
  platforms: [],
  wiki_url: 'https://aesthetics.fandom.com/wiki/Vaporwave',
  scraped_at: '2026-06-11T00:00:00Z',
  raw_text: 'Vaporwave retro nostalgic electronic music dreamlike.',
};

describe('TOOLS', () => {
  test('exports exactly nine tools', () => {
    expect(TOOLS.length).toBe(9);
  });

  test('each tool has name, description, and inputSchema', () => {
    TOOLS.forEach(tool => {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('inputSchema');
    });
  });

  test('tool names match expected set', () => {
    const names = TOOLS.map(t => t.name).sort();
    expect(names).toEqual([
      'check_db_staleness',
      'find_related',
      'get_aesthetic',
      'list_aesthetics',
      'list_categories',
      'random_aesthetic',
      'search_aesthetics',
      'search_by_color',
      'suggest_aesthetics',
    ]);
  });
});

describe('handleToolCall', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertAesthetic(db, SAMPLE);
  });

  test('search_aesthetics returns matching results', async () => {
    const result = await handleToolCall(db, 'search_aesthetics', { query: 'nostalgic' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('Vaporwave');
  });

  test('get_aesthetic returns full entry', async () => {
    const result = await handleToolCall(db, 'get_aesthetic', { name: 'Vaporwave' });
    expect(result.slug).toBe('vaporwave');
    expect(result.colors).toEqual(['#FF71CE']);
  });

  test('get_aesthetic returns null for unknown name', async () => {
    const result = await handleToolCall(db, 'get_aesthetic', { name: 'DoesNotExist' });
    expect(result).toBeNull();
  });

  test('list_aesthetics returns all aesthetics', async () => {
    const result = await handleToolCall(db, 'list_aesthetics', {});
    expect(result.length).toBe(1);
  });

  test('list_aesthetics accepts optional category', async () => {
    const result = await handleToolCall(db, 'list_aesthetics', { category: 'music' });
    expect(result.length).toBe(1);
  });

  test('suggest_aesthetics defaults to limit 3', async () => {
    const result = await handleToolCall(db, 'suggest_aesthetics', { description: 'retro electronic' });
    expect(Array.isArray(result)).toBe(true);
  });

  test('random_aesthetic returns an aesthetic', async () => {
    const result = await handleToolCall(db, 'random_aesthetic', {});
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('slug');
  });

  test('search_by_color finds by color name', async () => {
    const result = await handleToolCall(db, 'search_by_color', { color: 'pink' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('Vaporwave');
  });

  test('list_categories returns array containing inserted categories', async () => {
    const result = await handleToolCall(db, 'list_categories', {});
    expect(Array.isArray(result)).toBe(true);
    expect(result).toContain('music');
  });

  test('find_related returns root and related array', async () => {
    const result = await handleToolCall(db, 'find_related', { name: 'Vaporwave' });
    expect(result).not.toBeNull();
    expect(result.root.name).toBe('Vaporwave');
    expect(Array.isArray(result.related)).toBe(true);
  });

  test('check_db_staleness returns staleness info', async () => {
    const result = await handleToolCall(db, 'check_db_staleness', {});
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('is_stale');
    expect(result.total).toBe(1);
  });

  test('unknown tool rejects with an error', async () => {
    await expect(handleToolCall(db, 'nonexistent_tool', {})).rejects.toThrow('Unknown tool: nonexistent_tool');
  });
});
