export function scoreCompleteness(aesthetic) {
  const visualFields = [aesthetic.colors, aesthetic.typography, aesthetic.textures, aesthetic.motifs];
  const populated = visualFields.filter(f => JSON.parse(f || '[]').length > 0).length;
  if (!aesthetic.description) return 'stub';
  if (populated >= 3) return 'full';
  return 'partial';
}

export function upsertAesthetic(db, aesthetic) {
  const serialized = {
    name: aesthetic.name,
    slug: aesthetic.slug,
    aliases: JSON.stringify(aesthetic.aliases || []),
    categories: JSON.stringify(aesthetic.categories || []),
    related: JSON.stringify(aesthetic.related || []),
    description: aesthetic.description || '',
    mood_tags: JSON.stringify(aesthetic.mood_tags || []),
    era: aesthetic.era || '',
    colors: JSON.stringify(aesthetic.colors || []),
    color_names: JSON.stringify(aesthetic.color_names || []),
    typography: JSON.stringify(aesthetic.typography || []),
    textures: JSON.stringify(aesthetic.textures || []),
    motifs: JSON.stringify(aesthetic.motifs || []),
    key_media: JSON.stringify(aesthetic.key_media || []),
    platforms: JSON.stringify(aesthetic.platforms || []),
    wiki_url: aesthetic.wiki_url,
    scraped_at: aesthetic.scraped_at,
    raw_text: aesthetic.raw_text || '',
  };

  serialized.completeness = scoreCompleteness(serialized);

  db.prepare(`
    INSERT INTO aesthetics
      (name, slug, aliases, categories, related, description, mood_tags, era,
       colors, color_names, typography, textures, motifs, key_media, platforms,
       wiki_url, scraped_at, completeness, raw_text)
    VALUES
      (@name, @slug, @aliases, @categories, @related, @description, @mood_tags, @era,
       @colors, @color_names, @typography, @textures, @motifs, @key_media, @platforms,
       @wiki_url, @scraped_at, @completeness, @raw_text)
    ON CONFLICT(slug) DO UPDATE SET
      name=excluded.name, aliases=excluded.aliases, categories=excluded.categories,
      related=excluded.related, description=excluded.description, mood_tags=excluded.mood_tags,
      era=excluded.era, colors=excluded.colors, color_names=excluded.color_names,
      typography=excluded.typography, textures=excluded.textures, motifs=excluded.motifs,
      key_media=excluded.key_media, platforms=excluded.platforms,
      wiki_url=excluded.wiki_url, scraped_at=excluded.scraped_at,
      completeness=excluded.completeness, raw_text=excluded.raw_text
  `).run(serialized);
}
