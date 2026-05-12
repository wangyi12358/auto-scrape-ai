# AGENTS.md

## Quick Reference

```bash
bun install          # install deps (postinstall runs `wxt prepare`)
bun dev              # WXT dev mode, loads at .output/chrome-mv3-dev
bun build            # production build
bun zip              # build release .zip for Chrome Web Store
bun compile          # tsc --noEmit (type check only)
bun test lib/        # run unit tests (Bun test runner)
bun check            # Biome lint + format check (via Ultracite)
bun fix              # auto-fix lint/format issues
```

Pre-commit hook runs `ultracite fix` on staged JS/TS/JSON/CSS files.

## Architecture

Chrome extension built with [WXT](https://wxt.dev/) + React 19 + Ant Design + Tailwind CSS v4.

**Critical constraint**: Response bodies are only available in the DevTools script via `chrome.devtools.network`. The panel UI cannot access this directly. Data flows:

```
DevTools (capture.ts) → runtime.connect bridge → Background (relay) → Panel (UI)
```

- `entrypoints/devtools/` - DevTools page, network capture, bridge sender
- `entrypoints/devtools-panel/` - React UI (table, analysis, detail drawer)
- `entrypoints/background.ts` - Service Worker, message relay
- `entrypoints/options/` - Settings page
- `lib/` - shared logic (AI, types, filtering, messaging)

## AI Integration

Uses **OpenAI SDK directly** (not Vercel AI SDK) with `dangerouslyAllowBrowser: true`. This is required because the extension runs in browser context and Vercel AI SDK triggers CORS preflight requests that fail with third-party API providers.

Key files:
- `lib/ai/analyze-request.ts` - AI calls, prompt construction, response parsing
- `lib/refine.ts` - request/response summarization before sending to AI
- `lib/types/settings.ts` - `ExtensionSettings` shape

## Code Style (Biome)

- **Indent**: tabs (not spaces)
- **Quotes**: single quotes, JSX single quotes
- **Semicolons**: always
- **Trailing commas**: all
- **Arrow parens**: always
- Import sorting is enforced (`assist.source.organizeImports: "on"`)

Globals: `browser`, `defineBackground`, `defineContentScript` (WXT injects these).

Path alias: `@/` maps to project root (see `tsconfig.json`).

## Key Conventions

- AI prompts output **Simplified Chinese** by default
- Settings use `browser.storage.local` (not `sync`) to keep API keys on-device only
- `lib/messages.ts` defines the bridge protocol as a discriminated union (`BridgeMessage`)
- Tests live alongside source: `lib/filter.test.ts`, `lib/refine.test.ts`
- `docs/tasks/` contains per-task implementation specs

## Environment

Copy `.env.example` to `.env.local` for local defaults. WXT injects env vars at build time via `import.meta.env`. Never commit secrets.

## Common Pitfalls

- Don't use `@ai-sdk/openai` or `ai` package for browser-side calls — CORS will block them. Use `openai` SDK with `dangerouslyAllowBrowser: true`.
- The `openai` and `@ai-sdk/openai` packages are both in `package.json` but only `openai` is used for actual API calls. `@ai-sdk/openai`/`ai` were added for potential server-side use.
- WXT generates types in `.wxt/` — run `wxt prepare` (or `bun install`) after changing `wxt.config.ts` or manifest.
- `tsconfig.json` extends `.wxt/tsconfig.json` and excludes `.output` and `*.test.ts`.
