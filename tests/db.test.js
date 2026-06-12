import { describe, test, expect } from 'vitest';
import { initDb } from '../src/db/schema.js';
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
