import { describe, test, expect } from 'vitest';
import { initDb } from '../src/db/schema.js';

describe('schema', () => {
  test('initDb creates aesthetics and fts tables', () => {
    const db = initDb(':memory:');
    const tables = db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table'`
    ).all().map(r => r.name);
    expect(tables).toContain('aesthetics');
    expect(tables).toContain('aesthetics_fts');
  });

  test('initDb is idempotent (safe to call twice)', () => {
    expect(() => {
      const db = initDb(':memory:');
      initDb(':memory:'); // second call on same path should not throw
    }).not.toThrow();
  });
});
