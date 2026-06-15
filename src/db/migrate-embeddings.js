#!/usr/bin/env node
/**
 * Pre-compute and store semantic embeddings for all aesthetics.
 * Run once after install; re-run to refresh after a rescrape.
 *
 * Uses Xenova/all-MiniLM-L6-v2 (~23MB, downloads on first run).
 * Encodes in batches of 32 to avoid OOM on large corpora.
 */
import { initDb } from './schema.js';
import { encode, aestheticToText, vecToBlob } from './embed.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.AESTHETICS_DB_PATH
  ?? resolve(__dirname, '../../data/aesthetics.db');
const BATCH = 32;

const db = initDb(DB_PATH);

// Add embedding column if it doesn't exist yet
try {
  db.exec('ALTER TABLE aesthetics ADD COLUMN embedding BLOB DEFAULT NULL');
  console.log('Added embedding column.');
} catch {
  // Column already exists — fine
}

const rows = db.prepare(
  'SELECT id, name, mood_tags, motifs, color_names, description FROM aesthetics'
).all();

const upsert = db.prepare('UPDATE aesthetics SET embedding = ? WHERE id = ?');

console.log(`Encoding ${rows.length} aesthetics in batches of ${BATCH}…`);
console.log('(Downloading model on first run — ~23MB, one-time only)\n');

let done = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const texts = batch.map(aestheticToText);
  const vecs = await encode(texts);

  const tx = db.transaction(() => {
    for (let j = 0; j < batch.length; j++) {
      upsert.run(vecToBlob(vecs[j]), batch[j].id);
    }
  });
  tx();

  done += batch.length;
  const pct = Math.round((done / rows.length) * 100);
  process.stdout.write(`\r  ${done}/${rows.length} (${pct}%)   `);
}

console.log('\n\nDone. Spot-check:');
const spot = db.prepare(
  'SELECT name, length(embedding) as emb_bytes FROM aesthetics WHERE embedding IS NOT NULL LIMIT 3'
).all();
spot.forEach(r => console.log(`  ${r.name}: ${r.emb_bytes} bytes (${r.emb_bytes / 4} dims)`));

const total = db.prepare('SELECT COUNT(*) c FROM aesthetics WHERE embedding IS NOT NULL').get().c;
console.log(`\n${total}/${rows.length} aesthetics have embeddings.`);
