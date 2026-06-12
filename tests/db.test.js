import { describe, test, expect, beforeEach } from 'vitest';
import { initDb } from '../src/db/schema.js';
import { upsertAesthetic, scoreCompleteness } from '../src/db/write.js';
import { searchAesthetics, getAesthetic, listAesthetics, suggestAesthetics } from '../src/db/read.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync } from 'fs';

describe('schema', () => {
  test('initDb creates aesthetics and fts tables', () => {
    const db = initDb(':memory:');
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table'`
    ).all().map(r => r.name);
    expect(tables).toContain('aesthetics');
    expect(tables).toContain('aesthetics_fts');
  });

  test('initDb is idempotent on the same database file', () => {
    const tmp = join(tmpdir(), `test-idempotent-${Date.now()}.db`);
    try {
      const db = initDb(tmp);
      db.close();
      expect(() => initDb(tmp)).not.toThrow();
    } finally {
      rmSync(tmp, { force: true });
    }
  });

  test('FTS5 triggers keep index in sync with main table', () => {
    const db = initDb(':memory:');

    // INSERT trigger: row should be findable via FTS
    db.prepare(`INSERT INTO aesthetics (name, slug, wiki_url, scraped_at, raw_text)
      VALUES ('Vaporwave', 'vaporwave', 'https://example.com', '2026-01-01', 'nostalgic dreamy retro')`).run();
    let rows = db.prepare(`SELECT name FROM aesthetics_fts WHERE aesthetics_fts MATCH 'nostalgic'`).all();
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Vaporwave');

    // UPDATE trigger: FTS should reflect the update
    db.prepare(`UPDATE aesthetics SET raw_text = 'cozy warm handmade' WHERE slug = 'vaporwave'`).run();
    rows = db.prepare(`SELECT name FROM aesthetics_fts WHERE aesthetics_fts MATCH 'cozy'`).all();
    expect(rows.length).toBe(1);
    rows = db.prepare(`SELECT name FROM aesthetics_fts WHERE aesthetics_fts MATCH 'nostalgic'`).all();
    expect(rows.length).toBe(0);

    // DELETE trigger: row should no longer be findable
    db.prepare(`DELETE FROM aesthetics WHERE slug = 'vaporwave'`).run();
    rows = db.prepare(`SELECT name FROM aesthetics_fts WHERE aesthetics_fts MATCH 'cozy'`).all();
    expect(rows.length).toBe(0);
  });
});

const SAMPLE = {
  name: 'Vaporwave',
  slug: 'vaporwave',
  aliases: ['aesthetic wave'],
  categories: ['music', 'internet culture'],
  related: ['synthwave'],
  description: 'A retro-futurist aesthetic.',
  mood_tags: ['nostalgic', 'dreamy'],
  era: '1980s imagined future',
  colors: ['#FF71CE', '#01CDFE'],
  color_names: ['hot pink', 'cyan'],
  typography: ['serif', 'glitch'],
  textures: ['gradients'],
  motifs: ['Greek statues'],
  key_media: ['Floral Shoppe'],
  platforms: ['Tumblr'],
  wiki_url: 'https://aesthetics.fandom.com/wiki/Vaporwave',
  scraped_at: '2026-06-11T00:00:00Z',
  raw_text: 'Vaporwave is a microgenre nostalgic dreamy retro.',
};

describe('write', () => {
  let db;
  beforeEach(() => { db = initDb(':memory:'); });

  test('upsertAesthetic inserts a new aesthetic', () => {
    upsertAesthetic(db, SAMPLE);
    const row = db.prepare('SELECT * FROM aesthetics WHERE slug = ?').get('vaporwave');
    expect(row.name).toBe('Vaporwave');
  });

  test('upsertAesthetic updates existing aesthetic on re-insert', () => {
    upsertAesthetic(db, SAMPLE);
    upsertAesthetic(db, { ...SAMPLE, description: 'Updated.' });
    const row = db.prepare('SELECT * FROM aesthetics WHERE slug = ?').get('vaporwave');
    expect(row.description).toBe('Updated.');
  });

  test('scoreCompleteness returns "full" when description + 3 visual fields populated', () => {
    expect(scoreCompleteness({
      description: 'A description.',
      colors: JSON.stringify(['#FF71CE']),
      typography: JSON.stringify(['serif']),
      textures: JSON.stringify(['gradients']),
      motifs: JSON.stringify(['statues']),
    })).toBe('full');
  });

  test('scoreCompleteness returns "partial" when description but fewer than 3 visual fields', () => {
    expect(scoreCompleteness({
      description: 'A description.',
      colors: JSON.stringify(['#FF71CE']),
      typography: JSON.stringify([]),
      textures: JSON.stringify([]),
      motifs: JSON.stringify([]),
    })).toBe('partial');
  });

  test('scoreCompleteness returns "stub" when no description', () => {
    expect(scoreCompleteness({
      description: '',
      colors: JSON.stringify([]),
      typography: JSON.stringify([]),
      textures: JSON.stringify([]),
      motifs: JSON.stringify([]),
    })).toBe('stub');
  });
});

const COTTAGECORE = {
  name: 'Cottagecore',
  slug: 'cottagecore',
  aliases: [],
  categories: ['nature', 'fashion'],
  related: ['fairycore'],
  description: 'A nature and handcraft aesthetic.',
  mood_tags: ['cozy', 'whimsical'],
  era: '2010s',
  colors: ['#8DB87A'],
  color_names: ['sage green'],
  typography: ['handwritten'],
  textures: ['linen'],
  motifs: ['wildflowers'],
  key_media: [],
  platforms: ['TikTok'],
  wiki_url: 'https://aesthetics.fandom.com/wiki/Cottagecore',
  scraped_at: '2026-06-11T00:00:00Z',
  raw_text: 'Cottagecore cozy nature handcraft whimsical wildflowers linen.',
};

describe('read', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertAesthetic(db, SAMPLE);
    upsertAesthetic(db, COTTAGECORE);
  });

  test('searchAesthetics returns results matching query', () => {
    const results = searchAesthetics(db, 'dreamy nostalgic');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Vaporwave');
  });

  test('searchAesthetics returns lightweight objects (no raw_text)', () => {
    const results = searchAesthetics(db, 'dreamy');
    expect(results[0]).not.toHaveProperty('raw_text');
    expect(results[0]).toHaveProperty('mood_tags');
    expect(results[0]).toHaveProperty('colors');
  });

  test('getAesthetic returns full entry by exact name', () => {
    const result = getAesthetic(db, 'Vaporwave');
    expect(result.slug).toBe('vaporwave');
    expect(result.colors).toEqual(['#FF71CE', '#01CDFE']);
  });

  test('getAesthetic returns full entry by slug', () => {
    const result = getAesthetic(db, 'vaporwave');
    expect(result.name).toBe('Vaporwave');
  });

  test('getAesthetic returns null for unknown name', () => {
    expect(getAesthetic(db, 'NonExistentAesthetic')).toBeNull();
  });

  test('listAesthetics returns all aesthetics', () => {
    const results = listAesthetics(db);
    expect(results.length).toBe(2);
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('categories');
    expect(results[0]).not.toHaveProperty('raw_text');
  });

  test('listAesthetics filters by category substring', () => {
    const results = listAesthetics(db, 'nature');
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Cottagecore');
  });

  test('suggestAesthetics returns top N results', () => {
    const results = suggestAesthetics(db, 'cozy nature wildflowers', 1);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Cottagecore');
  });
});
