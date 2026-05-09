/**
 * DevTools bootstrap page.
 * It does two things:
 * 1) host capture bridge (background <-> devtools capture module)
 * 2) register visible DevTools UI pages (panel + Elements sidebar pane)
 */
import { ARCHITECTURE_VERSION } from '@/lib/architecture';
import { initDevtoolsBridge } from './bridge';

console.info('[auto-scrape-ai devtools] loaded', { ARCHITECTURE_VERSION });

initDevtoolsBridge(() => {
	/* panel UI state is handled inside devtools-panel page */
});

browser.devtools.panels.create(
	'自动抓包 AI',
	'icon/128.png',
	'devtools-panel.html',
);

// browser.devtools.panels.elements.createSidebarPane(
// 	'自动抓包 AI',
// 	(pane) => {
// 		pane.setPage('devtools-pane.html');
// 	},
// );
