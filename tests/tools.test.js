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
  test('exports exactly four tools', () => {
    expect(TOOLS.length).toBe(4);
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
      'get_aesthetic',
      'list_aesthetics',
      'search_aesthetics',
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

  test('search_aesthetics returns matching results', () => {
    const result = handleToolCall(db, 'search_aesthetics', { query: 'nostalgic' });
    expect(Array.isArray(result)).toBe(true);
    expect(result[0].name).toBe('Vaporwave');
  });

  test('get_aesthetic returns full entry', () => {
    const result = handleToolCall(db, 'get_aesthetic', { name: 'Vaporwave' });
    expect(result.slug).toBe('vaporwave');
    expect(result.colors).toEqual(['#FF71CE']);
  });

  test('get_aesthetic returns null for unknown name', () => {
    const result = handleToolCall(db, 'get_aesthetic', { name: 'DoesNotExist' });
    expect(result).toBeNull();
  });

  test('list_aesthetics returns all aesthetics', () => {
    const result = handleToolCall(db, 'list_aesthetics', {});
    expect(result.length).toBe(1);
  });

  test('list_aesthetics accepts optional category', () => {
    const result = handleToolCall(db, 'list_aesthetics', { category: 'music' });
    expect(result.length).toBe(1);
  });

  test('suggest_aesthetics defaults to limit 3', () => {
    const result = handleToolCall(db, 'suggest_aesthetics', { description: 'retro electronic' });
    expect(Array.isArray(result)).toBe(true);
  });

  test('unknown tool throws an error', () => {
    expect(() => handleToolCall(db, 'nonexistent_tool', {})).toThrow('Unknown tool: nonexistent_tool');
  });
});
