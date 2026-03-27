# UnoCSS Helper

$ARGUMENTS

---

You are helping write or fix UnoCSS classes for this project. Use only what is available:

## Available presets

- **`presetUno`** — Tailwind-compatible utilities (`flex`, `gap-4`, `text-sm`, `rounded`, `p-2`, etc.)
- **`presetAttributify`** — attribute mode: `text="green-400 xl"` `flex="~ col"` `border="1 solid gray/20"`
- **`presetIcons`** — icon classes from bundled icon sets, format: `i-{collection}-{icon}`
  - Available collections: `carbon`, `mdi`, `ri`, `codicon`, `solar`, `oui`, `nonicons`, `logos`, `circle-flags`, `skill-icons`
  - Example: `i-carbon-close`, `i-mdi-calendar`, `i-ri-moon-line`

## Project shortcuts (defined in `vite.config.ts`)

| Shortcut | Expands to |
|---|---|
| `border-base` | `border-gray/20 dark:border-gray/15` |
| `bg-base` | `bg-white dark:bg-[#1a1a1a]` |
| `bg-canvas` | `bg-gray:15 dark:bg-[#111]` |
| `icon-btn` | `op30 hover:op100` |

## Theme

- Background: `#070c09` (dark default) → use `bg-[#070c09]` or `dark:bg-[#070c09]`
- Accent green: `#4ade80` → `text-[#4ade80]`, `bg-[#4ade80]`, or `text-green-400`
- Always use `dark:` prefix variants for dark-mode styles

## Rules

- Prefer utility classes over arbitrary values where a scale exists (`p-4` not `p-[16px]`)
- Use `dark:` prefix instead of CSS variables for theme switching
- Use `icon-btn` shortcut for icon button opacity interactions
- For borders/backgrounds that need dark-mode awareness, prefer `border-base` / `bg-base` / `bg-canvas` shortcuts

When asked to style a component, output the UnoCSS classes directly. When asked to review existing classes, flag: missing dark-mode variants, use of arbitrary values that could be replaced with scale values, and any classes from unavailable icon collections.
