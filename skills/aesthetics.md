---
name: aesthetics
description: >
  Use when working on any design or UI task where an aesthetic direction is needed.
  Triggers on: named aesthetics ("make it Vaporwave", "Cottagecore vibes"), vibe
  descriptions ("dark and moody", "warm and handmade"), requests for color palettes,
  CSS tokens, Tailwind config, or design direction, and "suggest an aesthetic for
  this project" requests. Requires the aesthetics-mcp MCP server to be installed.
---

# Aesthetics Skill

You have access to an MCP server (`aesthetics-mcp`) with a database of 1135+ named
visual aesthetics from the Aesthetics Wiki. Use it to ground design work in real,
named aesthetic traditions rather than generic descriptions.

## Step 1: Identify intent and call the right tool

| What the user says | Tool to call |
|--------------------|-------------|
| Names an aesthetic ("make it Vaporwave") | `get_aesthetic("Vaporwave")` |
| Describes a vibe ("dark moody academic candlelight") | `search_aesthetics("dark moody academic candlelight")` |
| Describes their project ("meditation app, calm but not clinical") | `suggest_aesthetics("<description>")` |
| Wants to explore options ("what aesthetics exist for nature?") | `list_aesthetics("nature")` |
| Wants inspiration or a random pick | `random_aesthetic()` or `random_aesthetic(category)` |
| Asks what categories exist | `list_categories()` then `list_aesthetics(category)` |
| Wants aesthetics with specific colors ("black and gold palette") | `search_by_color("black and gold")` |
| Wants to explore adjacent aesthetics ("what's related to Dark Academia?") | `find_related("Dark Academia")` |
| Asks if the data is current | `check_db_staleness()` |

## Step 2: Validate the match and summarize the page

- `get_aesthetic` automatically falls back to fuzzy search when an exact name isn't
  found. If the result includes `_fuzzy_match: true`, confirm with the user before
  proceeding: "I couldn't find [requested name] exactly — did you mean [result.name]?"
- If `completeness` is `"stub"`, tell the user: "This aesthetic has limited data in
  the database — I'll supplement with my own knowledge where needed."
- If `search_aesthetics` returns multiple plausible matches, present them briefly
  (name + one-line description) and ask which resonates before generating output.

**After a successful `get_aesthetic` call:** the response includes `raw_text` — the
complete wiki page text. Use a Haiku subagent to produce a thorough analysis:

> Prompt: "You are analyzing an Aesthetics Wiki page for [aesthetic name]. Produce a
> detailed analysis covering every dimension the page discusses. Do not summarize
> briefly — extract everything useful. Cover:
>
> 1. **Definition and origins** — what this aesthetic is, where and when it emerged,
>    its cultural and historical roots, any predecessor or origin movements.
> 2. **Mood and emotional register** — the feeling it evokes, psychological associations,
>    what kind of person or subculture it appeals to.
> 3. **Visual hallmarks** — specific colors (name them), color relationships, typical
>    palettes; typography styles; recurring motifs, symbols, and imagery; textures and
>    surfaces; compositional tendencies (chaotic vs. minimal, dense vs. sparse, etc.).
> 4. **Fashion and physical expression** — clothing, accessories, hair, makeup if the
>    page covers them.
> 5. **Interior and environmental expression** — how spaces decorated in this aesthetic
>    look and feel, furniture, lighting, objects.
> 6. **Digital and media expression** — graphic design conventions, UI patterns, social
>    media presentation styles, photography tendencies.
> 7. **Key media and cultural references** — specific albums, films, TV shows, artists,
>    brands, websites, or subcultures the page names as canonical examples.
> 8. **Related and adjacent aesthetics** — what it overlaps with, how it differs from
>    similar aesthetics, which aesthetics it evolved from or influenced.
> 9. **Things that break the aesthetic** — anachronisms, wrong colors, wrong textures,
>    common mistakes.
>
> Write in flowing prose by section. Skip any section the page has nothing to say about.
> Be specific throughout — generic statements like 'earthy tones' are less useful than
> 'terracotta, sage green, and warm cream'. Quote or closely paraphrase distinctive
> phrases from the page when they capture the aesthetic well.
>
> Page text: [raw_text]"

Use this analysis as your working knowledge of the aesthetic for all output generation.
The pre-extracted `description` field is only the first paragraph and should be ignored.

## Step 3: Ask for output format (or infer from context)

Once the aesthetic is confirmed, ask:

> "What would you like me to generate?
> - **CSS custom properties** — design tokens as CSS variables
> - **Tailwind config** — `theme.extend` block
> - **Design brief** — mood, typography, and imagery guidance in prose
> - **Component style guide** — how buttons, cards, inputs, and nav should look"

If the user's request already implies a format (e.g., "give me the Tailwind config"),
skip asking and generate it directly.

## Step 4: Generate output

Use the aesthetic data from the MCP tool response. Guidelines per format:

### CSS custom properties

```css
:root {
  /* Colors: use actual hex values from aesthetic.colors */
  --color-primary: <first hex>;
  --color-secondary: <second hex>;
  --color-accent: <third hex>;
  --color-background: <appropriate dark or light base>;
  --color-text: <readable contrast color>;

  /* Typography: choose fonts that match aesthetic.typography descriptors */
  --font-display: '<display font>', <generic fallback>;
  --font-body: '<body font>', <generic fallback>;

  /* Spacing and shape: match the aesthetic's personality */
  /* (sharp corners for industrial, large radius for soft/cozy, etc.) */
  --radius: <value>;
  --spacing-unit: <value>;
}
```

### Tailwind config

```javascript
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        // Name colors after the aesthetic's motifs, not "primary"/"secondary"
        '<motif-name>': {
          DEFAULT: '<hex>',
          light: '<lighter hex>',
          dark: '<darker hex>',
        },
      },
      fontFamily: {
        display: ['<font name>', '<fallback>'],
        body: ['<font name>', '<fallback>'],
      },
      borderRadius: {
        aesthetic: '<value matching the aesthetic personality>',
      },
    },
  },
}
```

### Design brief

Write 4–6 paragraphs covering:
1. Overall mood and emotional register
2. Color story (reference `aesthetic.color_names` to explain why these colors work)
3. Typography choices and text personality
4. Texture, pattern, and imagery guidance
5. Things to avoid (what breaks the aesthetic)
6. (optional) Reference media from `aesthetic.key_media` as authenticity anchors

### Component style guide

Cover: buttons, cards, form inputs, navigation, and any aesthetic-specific elements
(e.g., "scanline overlays" for Vaporwave, "pressed flower decorations" for
Cottagecore, "distressed textures" for Dark Academia).

## Notes

- `aesthetic.related` lists adjacent aesthetics — use `find_related` to fetch their
  full data when blending influences or exploring variations.
- When `completeness` is `"partial"`, supplement sparse fields with your own
  knowledge of the aesthetic. Be transparent about which details are inferred.
- Color names in `aesthetic.color_names` add meaning to the palette — use them in
  design briefs to explain the emotional weight of each color.
