# Auto Scrape AI

WXT + React extension: capture network traffic in **DevTools**, refine it, and analyze it with AI from the **side panel**.

## Project layout

| Path | Role |
|------|------|
| `entrypoints/` | WXT entrypoints (background, popup, content, **devtools**, **sidepanel**, …). |
| `assets/` | Shared static assets (e.g. `tailwind.css`). |
| `lib/` | Chrome-agnostic logic, types, refiners, prompts (shared code). |
| `lib/types/` | Settings, `CapturedRequest` / `RefinedRequest` (task 02). |
| `lib/messages.ts` | `runtime.connect` bridge message unions (task 02). |
| `components/` | Shared React UI (built in later tasks). |
| `docs/tasks/` | Numbered implementation tasks. |

Architecture note: full **response bodies** are read in the **DevTools** script (`chrome.devtools.network`), not in the side panel. See `lib/architecture.ts`.

## Styling

[Tailwind CSS v4](https://tailwindcss.com/) with the Vite plugin (`@tailwindcss/vite` in `wxt.config.ts`). Shared entry stylesheet: `assets/tailwind.css` (`@import 'tailwindcss'`). Import `@/assets/tailwind.css` from any entry that needs utilities.

## Scripts

- `pnpm dev` / `bun dev` — WXT dev server
- `pnpm compile` / `bun compile` — TypeScript check
- `pnpm build` — production build
