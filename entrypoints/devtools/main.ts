/**
 * DevTools extension page (task 05–06).
 * Network capture hooks run here, not in the side panel.
 */
import { ARCHITECTURE_VERSION } from '@/lib/architecture';
import { initDevtoolsBridge } from './bridge';
import {
	isRecording,
	startRecording,
	stopRecording,
	subscribeStats,
} from './capture';

import './devtools.css';

console.info('[auto-scrape-ai devtools] loaded', { ARCHITECTURE_VERSION });

const toggle = document.querySelector<HTMLButtonElement>('#record-toggle');
const totalFinishedEl = document.querySelector('#stat-total');
const skippedEl = document.querySelector('#stat-skipped');
const passedEl = document.querySelector('#stat-passed');
const bodyFailEl = document.querySelector('#stat-body-fail');

function syncButton(): void {
	if (!toggle) {
		return;
	}
	const rec = isRecording();
	toggle.textContent = rec ? 'Stop recording' : 'Start recording';
	toggle.setAttribute('aria-pressed', rec ? 'true' : 'false');
}

async function onToggleRecording(): Promise<void> {
	if (isRecording()) {
		stopRecording();
	} else {
		await startRecording();
	}
	syncButton();
}

if (toggle) {
	toggle.addEventListener('click', () => {
		onToggleRecording().catch(() => {
			/* start/stop is best-effort */
		});
	});
}

initDevtoolsBridge(syncButton);

subscribeStats((s) => {
	if (totalFinishedEl) {
		totalFinishedEl.textContent = String(s.totalFinished);
	}
	if (skippedEl) {
		skippedEl.textContent = String(s.skippedByFilter);
	}
	if (passedEl) {
		passedEl.textContent = String(s.passedFilter);
	}
	if (bodyFailEl) {
		bodyFailEl.textContent = String(s.bodyFailures);
	}
});

syncButton();
