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

You have access to an MCP server (`aesthetics-mcp`) with a database of 300+ named
visual aesthetics from the Aesthetics Wiki. Use it to ground design work in real,
named aesthetic traditions rather than generic descriptions.

## Step 1: Identify intent and call the right tool

| What the user says | Tool to call |
|--------------------|-------------|
| Names an aesthetic ("make it Vaporwave") | `get_aesthetic("Vaporwave")` |
| Describes a vibe ("dark moody academic candlelight") | `search_aesthetics("dark moody academic candlelight")` |
| Describes their project ("meditation app, calm but not clinical") | `suggest_aesthetics("<description>")` |
| Wants to explore options ("what aesthetics exist for nature?") | `list_aesthetics("nature")` |

## Step 2: Validate the match and summarize the page

- If `get_aesthetic` returns `null`, the name may be misspelled or use a different
  casing — try `search_aesthetics` with the name as the query.
- If `completeness` is `"stub"`, tell the user: "This aesthetic has limited data in
  the database — I'll supplement with my own knowledge where needed."
- If `search_aesthetics` returns multiple plausible matches, present them briefly
  (name + one-line description) and ask which resonates before generating output.

**After a successful `get_aesthetic` call:** the response includes `raw_text` — the
complete wiki page text. Use a Haiku subagent to summarize it:

> Prompt: "Summarize this Aesthetics Wiki page for [aesthetic name] in 3–5 sentences.
> Cover: what it is, its dominant mood, visual hallmarks, and cultural origins.
> Be specific — name actual colors, motifs, and reference media where present.
> Page text: [raw_text]"

Use the Haiku summary as your working description. The pre-extracted `description`
field is only the first paragraph and is often incomplete.

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

- `aesthetic.related` lists adjacent aesthetics — mention them if the user wants to
  blend or explore variations.
- When `completeness` is `"partial"`, supplement sparse fields with your own
  knowledge of the aesthetic. Be transparent about which details are inferred.
- Color names in `aesthetic.color_names` add meaning to the palette — use them in
  design briefs to explain the emotional weight of each color.
