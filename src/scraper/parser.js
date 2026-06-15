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

// Read a Fandom Portable Infobox field by its data-source attribute.
function piField($, ...dataSources) {
  for (const src of dataSources) {
    const val = $(`[data-source="${src}"] .pi-data-value`).text().trim();
    if (val) return val;
  }
  return '';
}

function splitCsv(text) {
  return text ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function rgbaToHex(r, g, b) {
  return '#' + [r, g, b].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
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

  // Extract colors from inline styles. Skip <th> elements — those are category
  // navigation table headers (wiki chrome), not aesthetic color swatches.
  const colors = [];
  $('[style*="background-color"]').each((_, el) => {
    if (el.tagName === 'th') return;
    const style = $(el).attr('style') || '';
    const hexMatch = style.match(/background-color:\s*(#[0-9a-fA-F]{6})\b/i);
    if (hexMatch && !colors.includes(hexMatch[1])) {
      colors.push(hexMatch[1]);
    }
    // Convert rgba(r,g,b,...) to hex (wiki pages often use rgba for color swatches)
    const rgbaMatch = style.match(/background-color:\s*rgba\(\s*(\d+),\s*(\d+),\s*(\d+)/i);
    if (rgbaMatch) {
      const hex = rgbaToHex(rgbaMatch[1], rgbaMatch[2], rgbaMatch[3]);
      if (!colors.includes(hex)) colors.push(hex);
    }
  });

  const rawText = $('.mw-parser-output').text().replace(/\s+/g, ' ').trim();

  return {
    name,
    slug,
    aliases: splitCsv(piField($, 'other_names')),
    categories: [...new Set(categories)],
    related: [...new Set(related)].slice(0, 10),
    description,
    mood_tags: splitCsv(piField($, 'key_values')),
    era: piField($, 'decade_of_origin'),
    colors,
    color_names: splitCsv(piField($, 'key_colours', 'key_colors')),
    typography: [],
    textures: [],
    motifs: splitCsv(piField($, 'key_motifs')),
    key_media: [],
    platforms: splitCsv(piField($, 'primary_platform')),
    wiki_url: wikiUrl,
    scraped_at: new Date().toISOString(),
    raw_text: rawText,
  };
}
