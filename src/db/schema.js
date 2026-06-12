import Database from 'better-sqlite3';

export function initDb(dbPath) {
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS aesthetics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      aliases TEXT DEFAULT '[]',
      categories TEXT DEFAULT '[]',
      related TEXT DEFAULT '[]',
      description TEXT DEFAULT '',
      mood_tags TEXT DEFAULT '[]',
      era TEXT DEFAULT '',
      colors TEXT DEFAULT '[]',
      color_names TEXT DEFAULT '[]',
      typography TEXT DEFAULT '[]',
      textures TEXT DEFAULT '[]',
      motifs TEXT DEFAULT '[]',
      key_media TEXT DEFAULT '[]',
      platforms TEXT DEFAULT '[]',
      wiki_url TEXT NOT NULL,
      scraped_at TEXT NOT NULL,
      completeness TEXT DEFAULT 'stub',
      raw_text TEXT DEFAULT ''
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS aesthetics_fts USING fts5(
      name,
      description,
      mood_tags,
      color_names,
      motifs,
      raw_text,
      content=aesthetics,
      content_rowid=id
    );

    CREATE TRIGGER IF NOT EXISTS aesthetics_ai AFTER INSERT ON aesthetics BEGIN
      INSERT INTO aesthetics_fts(rowid, name, description, mood_tags, color_names, motifs, raw_text)
      VALUES (new.id, new.name, new.description, new.mood_tags, new.color_names, new.motifs, new.raw_text);
    END;

    CREATE TRIGGER IF NOT EXISTS aesthetics_ad AFTER DELETE ON aesthetics BEGIN
      INSERT INTO aesthetics_fts(aesthetics_fts, rowid, name, description, mood_tags, color_names, motifs, raw_text)
      VALUES ('delete', old.id, old.name, old.description, old.mood_tags, old.color_names, old.motifs, old.raw_text);
    END;

    CREATE TRIGGER IF NOT EXISTS aesthetics_au AFTER UPDATE ON aesthetics BEGIN
      INSERT INTO aesthetics_fts(aesthetics_fts, rowid, name, description, mood_tags, color_names, motifs, raw_text)
      VALUES ('delete', old.id, old.name, old.description, old.mood_tags, old.color_names, old.motifs, old.raw_text);
      INSERT INTO aesthetics_fts(rowid, name, description, mood_tags, color_names, motifs, raw_text)
      VALUES (new.id, new.name, new.description, new.mood_tags, new.color_names, new.motifs, new.raw_text);
    END;
  `);

  return db;
}
