function parseArrayFields(row) {
  if (!row) return null;
  const arrayFields = ['aliases', 'categories', 'related', 'mood_tags', 'colors',
                       'color_names', 'typography', 'textures', 'motifs', 'key_media', 'platforms'];
  const result = { ...row };
  for (const field of arrayFields) {
    result[field] = JSON.parse(row[field] || '[]');
  }
  return result;
}

export function searchAesthetics(db, query, limit = 10) {
  // Strip FTS5 syntax chars to prevent query parse errors
  const safeQuery = query.replace(/["\-*()^,]/g, ' ').trim();
  if (!safeQuery) return [];
  const rows = db.prepare(`
    SELECT a.name, a.slug, a.mood_tags, a.colors, a.description, a.completeness
    FROM aesthetics_fts f
    JOIN aesthetics a ON a.id = f.rowid
    WHERE aesthetics_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(safeQuery, limit);

  return rows.map(r => ({
    name: r.name,
    slug: r.slug,
    description: r.description,
    mood_tags: JSON.parse(r.mood_tags || '[]'),
    colors: JSON.parse(r.colors || '[]'),
    completeness: r.completeness,
  }));
}

export function getAesthetic(db, nameOrSlug) {
  const slug = nameOrSlug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const row = db.prepare(
    `SELECT * FROM aesthetics WHERE slug = ? OR lower(name) = lower(?) LIMIT 1`
  ).get(slug, nameOrSlug);
  return parseArrayFields(row);
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
    categories: JSON.parse(r.categories || '[]'),
    mood_tags: JSON.parse(r.mood_tags || '[]'),
  }));
}

export function suggestAesthetics(db, description, limit = 3) {
  // Natural language input: OR across all terms so partial matches rank rather than requiring every word
  const terms = description.replace(/["\-*()^,]/g, ' ').trim().split(/\s+/).filter(Boolean);
  return searchAesthetics(db, terms.join(' OR '), limit);
}
