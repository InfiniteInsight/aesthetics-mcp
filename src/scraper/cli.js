#!/usr/bin/env node
import { Command } from 'commander';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initDb } from '../db/schema.js';
import { upsertAesthetic } from '../db/write.js';
import { fetchAestheticLinks, fetchAestheticPage } from './crawler.js';
import { parseAestheticPage } from './parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB = resolve(__dirname, '../../data/aesthetics.db');

function parseDelay(value) {
  const parts = value.split('-').map(Number);
  if (parts.length === 2 && parts.every(n => !isNaN(n) && n >= 0)) {
    return { minDelay: parts[0], maxDelay: parts[1] };
  }
  if (parts.length === 1 && !isNaN(parts[0]) && parts[0] >= 0) {
    return { minDelay: parts[0], maxDelay: parts[0] };
  }
  throw new Error(`Invalid --delay value "${value}". Use a number (e.g. 1500) or range (e.g. 1000-3000).`);
}

const program = new Command();
program
  .name('aesthetics-scrape')
  .description('Scrape the Aesthetics Wiki into a local SQLite database');

program
  .command('full')
  .description('Fetch all aesthetic pages from scratch')
  .option('--db <path>', 'SQLite database path', DEFAULT_DB)
  .option('--delay <ms>', 'Delay between requests: fixed ms or min-max range (e.g. 1000-3000)', '1000-3000')
  .action(async (opts) => {
    const { minDelay, maxDelay } = parseDelay(opts.delay);
    const db = initDb(opts.db);
    console.log('Fetching aesthetic list...');
    const links = await fetchAestheticLinks();
    const delayDesc = minDelay === maxDelay ? `${minDelay}ms` : `${minDelay}–${maxDelay}ms`;
    console.log(`Found ${links.length} aesthetics. Starting scrape (${delayDesc} delay per page)...`);
    let success = 0;
    let failed = 0;
    for (const link of links) {
      try {
        process.stdout.write(`  ${link.name}... `);
        const html = await fetchAestheticPage(link.url, minDelay, maxDelay);
        const aesthetic = parseAestheticPage(html, link.url);
        upsertAesthetic(db, aesthetic);
        console.log('ok');
        success++;
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
        failed++;
      }
    }
    console.log(`\nDone. ${success} scraped, ${failed} failed.`);
  });

program
  .command('refresh')
  .description('Re-fetch pages older than N days (default: 30)')
  .option('--db <path>', 'SQLite database path', DEFAULT_DB)
  .option('--days <n>', 'Age threshold in days', '30')
  .option('--delay <ms>', 'Delay between requests: fixed ms or min-max range (e.g. 1000-3000)', '1000-3000')
  .action(async (opts) => {
    const { minDelay, maxDelay } = parseDelay(opts.delay);
    const db = initDb(opts.db);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(opts.days, 10));
    const stale = db.prepare(
      `SELECT name, wiki_url FROM aesthetics WHERE scraped_at < ?`
    ).all(cutoff.toISOString());
    console.log(`Refreshing ${stale.length} entries older than ${opts.days} days...`);
    for (const row of stale) {
      try {
        process.stdout.write(`  ${row.name}... `);
        const html = await fetchAestheticPage(row.wiki_url, minDelay, maxDelay);
        const aesthetic = parseAestheticPage(html, row.wiki_url);
        upsertAesthetic(db, aesthetic);
        console.log('ok');
      } catch (err) {
        console.log(`FAILED: ${err.message}`);
      }
    }
    console.log('Done.');
  });

program
  .command('aesthetic <name>')
  .description('Scrape or re-scrape a single aesthetic by name')
  .option('--db <path>', 'SQLite database path', DEFAULT_DB)
  .action(async (name, opts) => {
    const db = initDb(opts.db);
    const wikiName = name.replace(/\s+/g, '_');
    const url = `https://aesthetics.fandom.com/wiki/${encodeURIComponent(wikiName)}`;
    console.log(`Scraping "${name}" from ${url}...`);
    const html = await fetchAestheticPage(url);
    const aesthetic = parseAestheticPage(html, url);
    upsertAesthetic(db, aesthetic);
    console.log(`Done.`);
  });

program.parse();
