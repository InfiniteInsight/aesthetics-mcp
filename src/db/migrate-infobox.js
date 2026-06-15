#!/usr/bin/env node
/**
 * Backfill structured infobox fields (color_names, motifs, mood_tags, era,
 * platforms, aliases) from already-scraped raw_text, and clear colors that
 * are known wiki chrome artifacts.
 *
 * The Fandom Portable Infobox labels appear verbatim in raw_text. We locate
 * each label, then extract text up to the next known label as the value.
 */
import { initDb } from './schema.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.AESTHETICS_DB_PATH
  ?? resolve(__dirname, '../../data/aesthetics.db');

// All infobox boundary labels (used to delimit field values in raw_text).
const BOUNDARIES = [
  'Origins', 'Visuals & Themes', 'Connections', 'Media & Culture', 'Timeline',
  'Related aesthetics', 'Relatedaesthetics', 'Subgenres',
  'Iconic figures', 'Iconicfigures', 'Preceded by', 'Succeeded by',
  'Key colours', 'Key colors', 'Key motifs', 'Key values',
  'Decade of origin', 'Primary platform', 'Primaryplatform',
  'Other names', 'Othernames',
];

// These colors appear on dozens of unrelated aesthetics — they are category
// navigation table chrome, not aesthetic palette colors.
const CHROME_COLORS = new Set([
  '#c232c0', '#942792', '#d5ccc7', '#a9a29c', '#333333',
  '#1a1a1a', '#1DB954',
]);

function extractField(rawText, labels) {
  for (const label of labels) {
    const idx = rawText.indexOf(label);
    if (idx === -1) continue;
    const start = idx + label.length;
    // Find the nearest boundary that comes after start
    let end = rawText.length;
    for (const b of BOUNDARIES) {
      if (b === label) continue;
      const bIdx = rawText.indexOf(b, start);
      if (bIdx > start && bIdx < end) end = bIdx;
    }
    const value = rawText.slice(start, end).trim();
    if (value) return value;
  }
  return '';
}

function splitCsv(text) {
  return text ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function scoreCompleteness(row) {
  const visualFields = [row.colors, row.motifs];
  const populated = visualFields.filter(f => {
    try { return JSON.parse(f || '[]').length > 0; } catch { return false; }
  }).length;
  if (!row.description) return 'stub';
  if (populated >= 2) return 'full';
  return 'partial';
}

const db = initDb(DB_PATH);
const rows = db.prepare('SELECT id, raw_text, colors, description, motifs FROM aesthetics').all();

const update = db.prepare(`
  UPDATE aesthetics
  SET color_names=?, motifs=?, mood_tags=?, era=?, platforms=?, aliases=?,
      colors=?, completeness=?
  WHERE id=?
`);

let updated = 0;
const migrate = db.transaction(() => {
  for (const row of rows) {
    const text = row.raw_text || '';

    const colorNamesText = extractField(text, ['Key colours', 'Key colors']);
    const motifsText     = extractField(text, ['Key motifs']);
    const moodText       = extractField(text, ['Key values']);
    const eraText        = extractField(text, ['Decade of origin']);
    const platformsText  = extractField(text, ['Primary platform', 'Primaryplatform']);
    const aliasesText    = extractField(text, ['Other names', 'Othernames']);

    const colorNames = splitCsv(colorNamesText);
    const motifs     = splitCsv(motifsText);
    const moodTags   = splitCsv(moodText);
    const platforms  = splitCsv(platformsText);
    const aliases    = splitCsv(aliasesText);

    // Strip known chrome colors from the existing colors array
    let existingColors;
    try { existingColors = JSON.parse(row.colors || '[]'); } catch { existingColors = []; }
    const cleanColors = existingColors.filter(c => !CHROME_COLORS.has(c.toLowerCase()));

    const completeness = scoreCompleteness({
      description: row.description,
      colors: JSON.stringify(cleanColors),
      motifs: JSON.stringify(motifs),
    });

    update.run(
      JSON.stringify(colorNames),
      JSON.stringify(motifs),
      JSON.stringify(moodTags),
      eraText,
      JSON.stringify(platforms),
      JSON.stringify(aliases),
      JSON.stringify(cleanColors),
      completeness,
      row.id,
    );
    updated++;
  }
});

migrate();
console.log(`Migrated ${updated} aesthetics.`);

// Spot-check
const v = db.prepare('SELECT name, color_names, motifs, mood_tags, era, platforms, aliases, colors FROM aesthetics WHERE slug=?').get('vaporwave');
if (v) {
  console.log('\nVaporwave spot-check:');
  console.log('  color_names:', v.color_names);
  console.log('  motifs:', v.motifs);
  console.log('  mood_tags:', v.mood_tags);
  console.log('  era:', v.era);
  console.log('  platforms:', v.platforms);
  console.log('  aliases:', v.aliases);
  console.log('  colors (cleaned):', v.colors);
}
