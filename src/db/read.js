const COMPLETENESS_RANK = { stub: 0, partial: 1, full: 2 };

function parseArrayFields(row) {
  if (!row) return null;
  const arrayFields = ['aliases', 'categories', 'related', 'mood_tags', 'colors',
                       'color_names', 'typography', 'textures', 'motifs', 'key_media', 'platforms'];
  const result = { ...row };
  for (const field of arrayFields) {
    try { result[field] = JSON.parse(row[field] || '[]'); } catch { result[field] = []; }
  }
  return result;
}

function safeJsonArray(str) {
  try { return JSON.parse(str || '[]'); } catch { return []; }
}

export function searchAesthetics(db, query, limit = 10, minCompleteness = 'stub') {
  const safeQuery = query.replace(/["\-*()^,]/g, ' ').trim();
  if (!safeQuery) return [];
  const rows = db.prepare(`
    SELECT a.name, a.slug, a.mood_tags, a.colors, a.description, a.completeness
    FROM aesthetics_fts f
    JOIN aesthetics a ON a.id = f.rowid
    WHERE aesthetics_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(safeQuery, limit * 3);

  const floor = COMPLETENESS_RANK[minCompleteness] ?? 0;
  return rows
    .filter(r => (COMPLETENESS_RANK[r.completeness] ?? 0) >= floor)
    .slice(0, limit)
    .map(r => ({
      name: r.name,
      slug: r.slug,
      description: r.description,
      mood_tags: safeJsonArray(r.mood_tags),
      colors: safeJsonArray(r.colors),
      completeness: r.completeness,
    }));
}

export function getAesthetic(db, nameOrSlug) {
  const slug = nameOrSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const row = db.prepare(
    `SELECT * FROM aesthetics WHERE slug = ? OR lower(name) = lower(?) LIMIT 1`
  ).get(slug, nameOrSlug);
  if (row) return parseArrayFields(row);

  // Auto-fallback: FTS search when exact match misses
  const hits = searchAesthetics(db, nameOrSlug, 1);
  if (!hits.length) return null;
  const fallback = db.prepare(`SELECT * FROM aesthetics WHERE slug = ?`).get(hits[0].slug);
  if (!fallback) return null;
  return { ...parseArrayFields(fallback), _fuzzy_match: true };
}

export function listAesthetics(db, category) {
  const rows = category
    ? db.prepare(
        `SELECT name, slug, categories, mood_tags FROM aesthetics WHERE categories LIKE ? ORDER BY name`
      ).all(`%${category}%`)
    : db.prepare(
        `SELECT name, slug, categories, mood_tags FROM aesthetics ORDER BY name`
      ).all();

  return rows.map(r => ({
    name: r.name,
    slug: r.slug,
    categories: safeJsonArray(r.categories),
    mood_tags: safeJsonArray(r.mood_tags),
  }));
}

export async function suggestAesthetics(db, description, limit = 3, minCompleteness = 'partial') {
  const hasEmbeddings = (() => {
    try {
      const r = db.prepare(
        "SELECT COUNT(*) c FROM aesthetics WHERE embedding IS NOT NULL LIMIT 1"
      ).get();
      return r.c > 0;
    } catch { return false; }
  })();

  const floor = COMPLETENESS_RANK[minCompleteness] ?? 0;

  if (hasEmbeddings) {
    const { encode, cosine, blobToVec } = await import('./embed.js');
    const [queryVec] = await encode(description);

    const rows = db.prepare(
      `SELECT name, slug, description, mood_tags, colors, completeness, embedding
       FROM aesthetics WHERE embedding IS NOT NULL`
    ).all();

    const scored = rows
      .filter(r => (COMPLETENESS_RANK[r.completeness] ?? 0) >= floor)
      .map(r => ({
        name: r.name,
        slug: r.slug,
        description: r.description,
        mood_tags: safeJsonArray(r.mood_tags),
        colors: safeJsonArray(r.colors),
        completeness: r.completeness,
        score: cosine(queryVec, blobToVec(r.embedding)),
      }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(({ score: _s, ...rest }) => rest);
  }

  // Fallback: FTS5 keyword OR-match
  const terms = description.replace(/["\-*()^,]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return searchAesthetics(db, terms.join(' OR '), limit, minCompleteness);
}

export function randomAesthetic(db, category, minCompleteness = 'partial') {
  const floor = COMPLETENESS_RANK[minCompleteness] ?? 0;
  const allowed = Object.entries(COMPLETENESS_RANK)
    .filter(([, r]) => r >= floor)
    .map(([k]) => k);
  const placeholders = allowed.map(() => '?').join(', ');

  const row = category
    ? db.prepare(
        `SELECT * FROM aesthetics WHERE categories LIKE ? AND completeness IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
      ).get(`%${category}%`, ...allowed)
    : db.prepare(
        `SELECT * FROM aesthetics WHERE completeness IN (${placeholders}) ORDER BY RANDOM() LIMIT 1`
      ).get(...allowed);

  return parseArrayFields(row);
}

export function searchByColor(db, colorQuery, limit = 10) {
  const terms = colorQuery
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);

  if (!terms.length) return [];

  const conditions = terms.map(() => `lower(color_names) LIKE ?`).join(' AND ');
  const rows = db.prepare(`
    SELECT name, slug, description, mood_tags, colors, color_names, completeness
    FROM aesthetics
    WHERE ${conditions}
    AND color_names != '[]' AND color_names IS NOT NULL
    ORDER BY
      CASE completeness WHEN 'full' THEN 0 WHEN 'partial' THEN 1 ELSE 2 END,
      name
    LIMIT ?
  `).all(...terms.map(t => `%${t}%`), limit);

  return rows.map(r => ({
    name: r.name,
    slug: r.slug,
    description: r.description,
    mood_tags: safeJsonArray(r.mood_tags),
    colors: safeJsonArray(r.colors),
    color_names: safeJsonArray(r.color_names),
    completeness: r.completeness,
  }));
}

export function listCategories(db) {
  const rows = db.prepare(
    `SELECT categories FROM aesthetics WHERE categories != '[]' AND categories IS NOT NULL`
  ).all();
  const cats = new Set();
  for (const row of rows) {
    for (const c of safeJsonArray(row.categories)) {
      const trimmed = c.trim();
      if (trimmed) cats.add(trimmed);
    }
  }
  return [...cats].sort();
}

export function findRelated(db, nameOrSlug, limit = 5) {
  const root = getAesthetic(db, nameOrSlug);
  if (!root) return null;
  if (!root.related.length) return { root: { name: root.name, slug: root.slug }, related: [] };

  const candidates = root.related.slice(0, Math.min(root.related.length, limit * 4));
  const placeholders = candidates.map(() => '?').join(', ');

  const rows = db.prepare(`
    SELECT name, slug, description, mood_tags, colors, color_names, completeness
    FROM aesthetics
    WHERE lower(name) IN (${placeholders})
    LIMIT ?
  `).all(...candidates.map(n => n.toLowerCase()), limit);

  return {
    root: { name: root.name, slug: root.slug },
    related: rows.map(r => ({
      name: r.name,
      slug: r.slug,
      description: r.description,
      mood_tags: safeJsonArray(r.mood_tags),
      colors: safeJsonArray(r.colors),
      color_names: safeJsonArray(r.color_names),
      completeness: r.completeness,
    })),
  };
}

export function checkStaleness(db) {
  const stats = db.prepare(`
    SELECT COUNT(*) as total,
           MIN(scraped_at) as oldest,
           MAX(scraped_at) as newest
    FROM aesthetics
  `).get();

  const newestDate = new Date(stats.newest);
  const now = new Date();
  const daysSince = Math.floor((now - newestDate) / (1000 * 60 * 60 * 24));

  return {
    total: stats.total,
    oldest_scraped: stats.oldest,
    newest_scraped: stats.newest,
    days_since_last_scrape: daysSince,
    is_stale: daysSince > 30,
    note: daysSince > 30
      ? 'Data is over 30 days old. Consider re-running the scraper.'
      : 'Database is current.',
  };
}
