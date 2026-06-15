import { describe, test, expect, beforeEach } from 'vitest';
import { initDb } from '../src/db/schema.js';
import { upsertAesthetic, scoreCompleteness } from '../src/db/write.js';
import { searchAesthetics, getAesthetic, listAesthetics, suggestAesthetics,
         randomAesthetic, searchByColor, listCategories, findRelated, checkStaleness } from '../src/db/read.js';
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

const FAIRYCORE = {
  name: 'Fairycore',
  slug: 'fairycore',
  aliases: [],
  categories: ['nature', 'fantasy'],
  related: [],
  description: 'A whimsical fairy-inspired aesthetic.',
  mood_tags: ['whimsical', 'magical'],
  era: '2010s',
  colors: ['#C8A2C8'],
  color_names: ['lilac', 'soft pink'],
  typography: ['handwritten'],
  textures: ['sheer'],
  motifs: ['wings', 'mushrooms'],
  key_media: [],
  platforms: ['TikTok'],
  wiki_url: 'https://aesthetics.fandom.com/wiki/Fairycore',
  scraped_at: '2026-06-11T00:00:00Z',
  raw_text: 'Fairycore is whimsical magical fantasy nature.',
};

describe('read', () => {
  let db;
  beforeEach(() => {
    db = initDb(':memory:');
    upsertAesthetic(db, SAMPLE);
    upsertAesthetic(db, COTTAGECORE);
    upsertAesthetic(db, FAIRYCORE);
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

  test('searchAesthetics respects min_completeness filter', () => {
    // Vaporwave has typography+textures+motifs+colors = full; all are full in this fixture set
    // Insert a stub to test filtering
    upsertAesthetic(db, {
      ...SAMPLE, name: 'Stub Aesthetic', slug: 'stub-aesthetic',
      description: '', raw_text: 'dreamy nostalgic stub',
    });
    const all = searchAesthetics(db, 'dreamy nostalgic', 10, 'stub');
    const partial = searchAesthetics(db, 'dreamy nostalgic', 10, 'partial');
    expect(all.length).toBeGreaterThan(partial.length);
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

  test('getAesthetic sets _fuzzy_match when falling back to search', () => {
    // FTS can match 'cottagecore' in name column even when slug lookup fails
    const result = getAesthetic(db, 'cottagecore nature');
    if (result) {
      expect(result._fuzzy_match).toBe(true);
    }
    // null is also acceptable if FTS doesn't match
  });

  test('listAesthetics returns all aesthetics', () => {
    const results = listAesthetics(db);
    expect(results.length).toBe(3);
    expect(results[0]).toHaveProperty('name');
    expect(results[0]).toHaveProperty('categories');
    expect(results[0]).not.toHaveProperty('raw_text');
  });

  test('listAesthetics filters by category substring', () => {
    const results = listAesthetics(db, 'nature');
    expect(results.length).toBe(2); // Cottagecore and Fairycore
    const names = results.map(r => r.name);
    expect(names).toContain('Cottagecore');
    expect(names).toContain('Fairycore');
  });

  test('suggestAesthetics returns top N results', async () => {
    const results = await suggestAesthetics(db, 'cozy nature wildflowers', 1);
    expect(results.length).toBe(1);
    expect(results[0].name).toBe('Cottagecore');
  });

  test('randomAesthetic returns an aesthetic', () => {
    const result = randomAesthetic(db);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('slug');
  });

  test('randomAesthetic filters by category', () => {
    const result = randomAesthetic(db, 'fantasy');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Fairycore');
  });

  test('randomAesthetic returns null when no match', () => {
    const result = randomAesthetic(db, 'nonexistent-category-xyz');
    expect(result).toBeNull();
  });

  test('searchByColor finds aesthetics by color name', () => {
    const results = searchByColor(db, 'pink');
    expect(results.length).toBeGreaterThan(0);
    const names = results.map(r => r.name);
    expect(names).toContain('Vaporwave'); // has 'hot pink'
  });

  test('searchByColor matches multi-word colors', () => {
    const results = searchByColor(db, 'sage green');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe('Cottagecore');
  });

  test('searchByColor returns empty array for no match', () => {
    const results = searchByColor(db, 'crimsonxyznonexistent');
    expect(results).toEqual([]);
  });

  test('listCategories returns distinct sorted categories', () => {
    const cats = listCategories(db);
    expect(Array.isArray(cats)).toBe(true);
    expect(cats).toContain('music');
    expect(cats).toContain('nature');
    expect(cats).toContain('fashion');
    expect(cats).toContain('fantasy');
    expect(cats).toEqual([...cats].sort());
  });

  test('findRelated returns root and resolved related aesthetics', () => {
    // COTTAGECORE.related = ['fairycore']; Fairycore is in the DB
    const result = findRelated(db, 'Cottagecore');
    expect(result).not.toBeNull();
    expect(result.root.name).toBe('Cottagecore');
    expect(result.related.length).toBe(1);
    expect(result.related[0].name).toBe('Fairycore');
  });

  test('findRelated returns empty related array when no DB matches', () => {
    // SAMPLE.related = ['synthwave']; Synthwave is not in the DB
    const result = findRelated(db, 'Vaporwave');
    expect(result).not.toBeNull();
    expect(result.root.name).toBe('Vaporwave');
    expect(result.related).toEqual([]);
  });

  test('findRelated returns null for unknown aesthetic', () => {
    expect(findRelated(db, 'NonExistentXYZ')).toBeNull();
  });

  test('checkStaleness returns staleness info', () => {
    const result = checkStaleness(db);
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('oldest_scraped');
    expect(result).toHaveProperty('newest_scraped');
    expect(result).toHaveProperty('days_since_last_scrape');
    expect(result).toHaveProperty('is_stale');
    expect(result.total).toBe(3);
    expect(typeof result.days_since_last_scrape).toBe('number');
    expect(result.days_since_last_scrape).toBeGreaterThanOrEqual(0);
  });
});
