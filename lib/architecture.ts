/**
 * Extension architecture (baseline for tasks 05–09).
 *
 * **Response bodies** are only available reliably from the Chrome DevTools extension
 * context (`chrome.devtools.network`, e.g. `onRequestFinished` + `getContent`). That
 * code must run in the DevTools page registered via `manifest.devtools_page`.
 *
 * The **Sidepanel** is the main UI (list, analysis, streaming). It does not have
 * access to `chrome.devtools.network`. Data flow: DevTools script → messaging
 * (`runtime.connect` / `sendMessage`, often via background) → Sidepanel store.
 *
 * **Background** may relay ports, persist session state, or host privileged fetch
 * (task 10+) depending on CORS and manifest design.
 *
 * Shared contracts: `lib/types/` (settings + capture shapes), `lib/messages.ts`
 * (bridge port + discriminated unions).
 */

export const ARCHITECTURE_VERSION = 1;
