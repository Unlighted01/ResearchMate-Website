---
name: add-theme
description: Add proper theme support (glass/bubble/minimalist + dark mode) to a ResearchMate component, or add new CSS variables to index.css for a specific theme
disable-model-invocation: true
effort: medium
allowed-tools: Read, Edit
---

Add theme support to: $ARGUMENTS

Steps:
1. Read the target file
2. Read index.css to understand existing theme variable patterns under:
   - `html[data-ui-theme="glass"]` / `html.dark[data-ui-theme="glass"]`
   - `html[data-ui-theme="bubble"]` / `html.dark[data-ui-theme="bubble"]`
   - `html[data-ui-theme="minimalist"]` / `html.dark[data-ui-theme="minimalist"]`
3. For a component:
   - Replace hardcoded colors with `--ui-*` CSS variables
   - Add `dark:` variants for every Tailwind color class
   - Use `backdrop-filter: blur(18px) saturate(1.6)` for glass surfaces
4. For index.css additions:
   - Add under all 6 theme selectors (3 themes × light + dark)
   - Follow existing variable naming: `--ui-surface-bg`, `--ui-surface-border`, etc.
5. Apply changes and show a summary table: theme → what changed → light value → dark value
