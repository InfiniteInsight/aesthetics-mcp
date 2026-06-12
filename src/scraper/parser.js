import * as cheerio from 'cheerio';

export function parseListPage(html) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const links = [];

  $('.mw-parser-output a[href^="/wiki/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const name = $(el).text().trim();
    // Skip pages with a colon in the path segment (Category:, Special:, File:, etc.)
    const segment = href.replace('/wiki/', '');
    if (!name || segment.includes(':')) return;
    const url = `https://aesthetics.fandom.com${href}`;
    if (seen.has(url)) return;
    seen.add(url);
    links.push({ name, url });
  });

  return links;
}

export function parseAestheticPage(html, wikiUrl) {
  const $ = cheerio.load(html);

  const name = $('.page-header__title').first().text().trim()
    || $('h1').first().text().trim()
    || '';

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  let description = '';
  $('.mw-parser-output > p').each((_, el) => {
    const text = $(el).text().trim();
    if (!description && text.length > 50) {
      description = text;
    }
  });

  const categories = [];
  $('a[href*="/wiki/Category:"]').each((_, el) => {
    const cat = $(el).text().trim();
    if (cat) categories.push(cat);
  });

  const related = [];
  $('.mw-parser-output a[href^="/wiki/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const text = $(el).text().trim();
    const segment = href.replace('/wiki/', '');
    if (!text || segment.includes(':') || text === name) return;
    related.push(text);
  });

  const colors = [];
  $('[style*="background-color"]').each((_, el) => {
    const style = $(el).attr('style') || '';
    const hexMatch = style.match(/background-color:\s*(#[0-9a-fA-F]{6})/i);
    if (hexMatch && !colors.includes(hexMatch[1])) {
      colors.push(hexMatch[1]);
    }
  });

  const rawText = $('.mw-parser-output').text().replace(/\s+/g, ' ').trim();

  return {
    name,
    slug,
    aliases: [],
    categories: [...new Set(categories)],
    related: [...new Set(related)].slice(0, 10),
    description,
    mood_tags: [],
    era: '',
    colors,
    color_names: [],
    typography: [],
    textures: [],
    motifs: [],
    key_media: [],
    platforms: [],
    wiki_url: wikiUrl,
    scraped_at: new Date().toISOString(),
    raw_text: rawText,
  };
}
