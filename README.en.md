# Auto Scrape AI

A [WXT](https://wxt.dev/) + React browser extension that captures HTTP traffic inside **Chrome DevTools**, refines request/response summaries, and uses an **OpenAI-compatible API** to produce short and detailed endpoint descriptions (the AI prompt asks for **Simplified Chinese** output by default).

**Languages:** [简体中文（默认）](README.md) · [English](README.en.md)

## Features

- **DevTools panel** (`Auto Scrape AI`): start/stop recording, table of captured requests, bridge status hints.
- **Network capture** via `chrome.devtools.network` in the DevTools context (reliable access to response bodies).
- **Filtering**: domain rules (regex or `current-tab-host`), HTTP methods, file extensions (e.g. `.js`, `.css`, images), and content-type skips (images, video, audio, `text/plain`, common binary/streaming types).
- **Refinement**: header blocklists, JSON array truncation with same-shape deduplication, configurable body limits.
- **AI analysis**: OpenAI SDK against user-configured **Base URL**, **API Key**, and **model**; concurrent queue (2 in-flight), per-request timeout (60s), retry from the UI; prompt payload trims summaries and deduplicates identical response summaries per URL path to save tokens.
- **UI**: [Ant Design](https://ant.design/) on **Tailwind CSS v4** (`assets/tailwind.css` imports `antd/dist/reset.css`).

## Quick start

### Option 1: Download pre-built package from GitHub Releases

1. Visit the project's [GitHub Releases](https://github.com/wangyi12358/auto-scrape-ai/releases) page
2. Download the latest `.zip` file (e.g., `auto-scrape-ai-1.0.0.zip`)
3. Extract the downloaded `.zip` file to a local directory
4. Open Chrome browser and navigate to `chrome://extensions/`
5. Enable **Developer mode** in the top right corner
6. Click **Load unpacked** and select the extracted directory
7. Open a tab, press **F12**, then choose the **Auto Scrape AI** panel
8. Configure **extension options** (API key, base URL, filters, sampling)

### Option 2: Build from source for development

```bash
bun install   # or: bun install
cp .env.example .env.local   # optional: defaults for local dev (see below)
bun dev       # or: bun dev
```

Load the unpacked extension from `.output/chrome-mv3-dev` (path may vary by WXT version). Open a tab, press **F12**, then choose the **Auto Scrape AI** panel. Configure **extension options** (API key, base URL, filters, sampling).

## Configuration

### Options page

From `chrome://extensions` → **Auto Scrape AI** → **Extension options** (or `browser.runtime.openOptionsPage()` from the popup).

### Default overrides via `.env.local`

At build time, WXT injects `import.meta.env`. The following keys seed **defaults** merged with storage (see `lib/types/defaults.ts`):

| Variable | Purpose |
|----------|---------|
| `WXT_DEFAULT_OPENAI_API_KEY` | Default API key |
| `WXT_DEFAULT_OPENAI_BASE_URL` | OpenAI-compatible base URL (e.g. `https://api.openai.com/v1`) |
| `WXT_DEFAULT_OPENAI_MODEL` | Model id |
| `WXT_DEFAULT_INCLUDE_RULES` | Comma- or newline-separated rules; use `current-tab-host` or host regexes |
| `WXT_DEFAULT_TARGET_LANGUAGE` | Analysis target language setting (stored preference) |
| `WXT_DEFAULT_SCHEMA_TYPE` | Schema style preference (stored preference) |

Copy `.env.example` to `.env.local` and adjust. Do not commit secrets.

## Project layout

| Path | Role |
|------|------|
| `entrypoints/background.ts` | Service worker / background logic |
| `entrypoints/devtools/` | DevTools bootstrap page, bridge, **network capture** (`capture.ts`) |
| `entrypoints/devtools-panel/` | React **DevTools panel** UI (Ant Design table, AI analysis, drawer) |
| `entrypoints/popup/`, `entrypoints/options/` | Toolbar popup and settings UI |
| `entrypoints/content.ts` | Content script (if used) |
| `assets/tailwind.css` | Tailwind v4 + Ant Design reset |
| `lib/types/` | Settings, `CapturedRequest` / refined shapes |
| `lib/messages.ts` | `runtime.connect` bridge message unions |
| `lib/filter.ts` | `passesFilter`, path extension helpers |
| `lib/refine.ts` | `refineRequest`, `truncateJsonArrays` |
| `lib/ai/analyze-request.ts` | OpenAI client + prompt + `EndpointAnalysis` parsing |
| `lib/settings-storage.ts` | `storage.local` load/save/validate |
| `lib/messaging/bridge-role.ts` | Routes DevTools vs panel UI ports |
| `docs/tasks/` | Numbered implementation notes |

## Architecture note

Full **response bodies** are read in the **DevTools** script (`chrome.devtools.network`), not in the panel alone. The panel connects to the background/DevTools bridge (`BRIDGE_PORT_NAME` in `lib/messages.ts`). See `lib/architecture.ts` for the high-level split.

## Scripts

| Command | Description |
|---------|-------------|
| `bun dev` / `bun dev` | WXT dev server |
| `bun dev:firefox` | WXT dev (Firefox) |
| `bun build` | Production build |
| `bun zip` | Build Chrome extension release package (.zip file) |
| `bun zip:firefox` | Build Firefox extension release package (.zip file) |
| `bun compile` | `tsc --noEmit` |
| `bun test` / `bun test lib/` | Unit tests (e.g. refiner) |
| `bun check` / `bun fix` | Ultracite (Biome) |

## License / privacy

API keys and captured traffic are handled locally in the extension and sent only to the AI endpoint you configure. Review provider terms and site policies before capturing or analyzing third-party traffic.
