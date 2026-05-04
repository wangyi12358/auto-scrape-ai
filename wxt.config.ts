import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
	modules: ['@wxt-dev/module-react'],
	vite: () => ({
		plugins: [tailwindcss()],
	}),
	manifest: {
		name: 'Auto Scrape AI',
		description:
			'Capture HTTP traffic from DevTools, refine it, and turn it into structured docs with AI.',
		/**
		 * Permissions & manifest fields used across tasks 05–13:
		 * - `storage` — options + session/analysis persistence (tasks 04, 13).
		 * - `sidePanel` — injected by WXT when a `sidepanel` entrypoint exists (task 08+).
		 * - `devtools_page` — set by WXT from `entrypoints/devtools/*` (tasks 05–06); required for `chrome.devtools.network`.
		 * - `host_permissions` — add provider origins in task 10 (avoid `<all_urls>` unless necessary).
		 */
		permissions: ['storage'],
	},
});
