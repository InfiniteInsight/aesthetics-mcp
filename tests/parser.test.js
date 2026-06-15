import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseAestheticPage, parseListPage } from '../src/scraper/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const aestheticHtml = readFileSync(resolve(__dirname, 'fixtures/aesthetic-page.html'), 'utf-8');
const listHtml = readFileSync(resolve(__dirname, 'fixtures/list-page.html'), 'utf-8');
const WIKI_URL = 'https://aesthetics.fandom.com/wiki/Vaporwave';

describe('parseAestheticPage', () => {
  test('extracts name from .page-header__title', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.name).toBe('Vaporwave');
  });

  test('generates slug from name', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.slug).toBe('vaporwave');
  });

  test('extracts description from first paragraph over 50 chars', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.description).toContain('microgenre');
  });

  test('extracts categories from /wiki/Category: links', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.categories).toContain('Music');
    expect(result.categories).toContain('Internet Culture');
  });

  test('extracts hex colors from inline background-color styles', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.colors).toContain('#FF71CE');
    expect(result.colors).toContain('#01CDFE');
    expect(result.colors).toContain('#B967FF');
  });

  test('excludes colors from <th> elements (wiki category nav chrome)', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.colors).not.toContain('#c232c0');
  });

  test('extracts color_names from pi-data key_colours', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.color_names).toContain('Pastel pink and cyan');
    expect(result.color_names).toContain('purple');
    expect(result.color_names).toContain('neon gradients');
  });

  test('extracts motifs from pi-data key_motifs', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.motifs).toContain('Hellenic statues');
    expect(result.motifs).toContain('palm trees');
  });

  test('extracts mood_tags from pi-data key_values', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.mood_tags).toContain('Nostalgia');
    expect(result.mood_tags).toContain('irony');
  });

  test('extracts era from pi-data decade_of_origin', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.era).toBe('Early 2010s');
  });

  test('extracts platforms from pi-data primary_platform', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.platforms).toContain('Tumblr');
    expect(result.platforms).toContain('SoundCloud');
  });

  test('extracts aliases from pi-data other_names', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.aliases).toContain('Vapor');
  });

  test('extracts related aesthetics from internal wiki links', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.related).toContain('Synthwave');
  });

  test('populates wiki_url', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.wiki_url).toBe(WIKI_URL);
  });

  test('populates raw_text with page body text', () => {
    const result = parseAestheticPage(aestheticHtml, WIKI_URL);
    expect(result.raw_text.length).toBeGreaterThan(50);
    expect(result.raw_text).toContain('Vaporwave');
  });
});

describe('parseListPage', () => {
  test('extracts aesthetic links with name and url', () => {
    const links = parseListPage(listHtml);
    expect(links.some(l => l.name === 'Vaporwave')).toBe(true);
    expect(links.some(l => l.name === 'Cottagecore')).toBe(true);
  });

  test('deduplicates links with same URL', () => {
    const links = parseListPage(listHtml);
    const urls = links.map(l => l.url);
    expect(urls.length).toBe(new Set(urls).size);
  });

  test('excludes Category: and Special: links', () => {
    const links = parseListPage(listHtml);
    expect(links.every(l => !l.name.includes('Category'))).toBe(true);
    expect(links.every(l => !l.name.includes('Special'))).toBe(true);
  });

  test('URLs are absolute fandom URLs', () => {
    const links = parseListPage(listHtml);
    links.forEach(l => expect(l.url).toMatch(/^https:\/\/aesthetics\.fandom\.com\/wiki\//));
  });
});
