# Auto Scrape AI

WXT + React extension: capture network traffic in **DevTools**, refine it, and analyze it with AI from the **side panel**.

## Project layout

| Path | Role |
|------|------|
| `entrypoints/` | WXT entrypoints (background, popup, **options**, content, **devtools**, **sidepanel**, …). |
| `assets/` | Shared static assets (e.g. `tailwind.css`). |
| `lib/` | Chrome-agnostic logic, types, refiners, prompts (shared code). |
| `lib/types/` | Settings, `CapturedRequest` / `RefinedRequest` (task 02). |
| `lib/messages.ts` | `runtime.connect` bridge message unions (task 02). |
| `lib/filter.ts` | `passesFilter`, `pathnameExtension` (task 03). |
| `lib/refine.ts` | `refineRequest`, `truncateJsonArrays`, header blocklist (task 03). |
| `lib/settings-storage.ts` | `loadExtensionSettings`, `saveExtensionSettings`, `storage.local` (task 04). |
| `components/` | Shared UI shell (e.g. `heroui-provider.tsx`). |
| `docs/tasks/` | Numbered implementation tasks. |

Architecture note: full **response bodies** are read in the **DevTools** script (`chrome.devtools.network`), not in the side panel. See `lib/architecture.ts`.

## UI & styling

[HeroUI v3](https://www.heroui.com/) (`@heroui/react`, `@heroui/styles`) on **Tailwind CSS v4** — `@heroui/styles` already pulls in `tailwindcss` and theme tokens. Shared stylesheet: `assets/tailwind.css` with `@import '@heroui/styles';`. Each React entry imports `@/assets/tailwind.css` and wraps the tree in `HerouiProvider` from `components/heroui-provider.tsx` (React Aria `I18nProvider`, `locale="zh-CN"`). The Vite plugin `@tailwindcss/vite` remains in `wxt.config.ts` so Tailwind resolves inside dependency CSS.

## Scripts

- `pnpm dev` / `bun dev` — WXT dev server
- `pnpm compile` / `bun compile` — TypeScript check
- `pnpm test` / `bun test lib/` — unit tests (filter + refiner)
- Open **Options** from `chrome://extensions` → Auto Scrape AI → Extension options (or programmatically `browser.runtime.openOptionsPage()`).
- `pnpm build` — production build
