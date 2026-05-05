/**
 * DevTools-only network capture (task 06).
 *
 * **Large responses:** Before calling `getContent`, we compare `Content-Length` (when present)
 * to {@link MAX_RAW_BYTES_BEFORE_GET_CONTENT}. Unknown length still calls `getContent` but is
 * bounded by {@link GET_CONTENT_TIMEOUT_MS} and truncated after read to cap in-memory text size.
 */
import { passesFilter } from '@/lib/filter';
import {
	EXTENSION_SETTINGS_STORAGE_KEY,
	loadExtensionSettings,
} from '@/lib/settings-storage';
import { HTTP_METHODS, type HttpMethod } from '@/lib/types/http';
import type {
	CapturedRequest,
	CapturedResponseBody,
	HttpHeaderEntry,
} from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

/** Har entry shape from `chrome.devtools.network.onRequestFinished` (minimal). */
interface DevToolsHarEntry {
	getContent(
		callback: (content: string | undefined | null, encoding?: string) => void,
	): void;
	request: {
		url: string;
		method: string;
		headers: HarHeader[];
		postData?: { text?: string; mimeType?: string };
	};
	response: {
		status: number;
		headers: HarHeader[];
		content: {
			mimeType?: string;
			size?: number;
		};
	};
}

interface HarHeader {
	name: string;
	value: string;
}

const GET_CONTENT_TIMEOUT_MS = 12_000;
/** Skip `getContent` when declared body exceeds this (bytes). */
export const MAX_RAW_BYTES_BEFORE_GET_CONTENT = 2 * 1024 * 1024;

export interface CaptureStats {
	/** `getContent` failed or timed out (still counted in passedFilter if filter passed) */
	bodyFailures: number;
	/** Passed filter (candidate for downstream / task 07) */
	passedFilter: number;
	/** Failed {@link passesFilter} (no `getContent`) */
	skippedByFilter: number;
	/** Every `onRequestFinished` event */
	totalFinished: number;
}

const initialStats: CaptureStats = {
	totalFinished: 0,
	skippedByFilter: 0,
	passedFilter: 0,
	bodyFailures: 0,
};

let stats: CaptureStats = { ...initialStats };
const statListeners = new Set<(s: CaptureStats) => void>();

function emitStats(): void {
	const snap = { ...stats };
	for (const fn of statListeners) {
		fn(snap);
	}
}

function bump(partial: Partial<CaptureStats>): void {
	stats = { ...stats, ...partial };
	emitStats();
}

export function subscribeStats(cb: (s: CaptureStats) => void): () => void {
	statListeners.add(cb);
	cb({ ...stats });
	return () => {
		statListeners.delete(cb);
	};
}

export function getStats(): CaptureStats {
	return { ...stats };
}

/** Optional hooks for task 07 bridge (DevTools → background → sidepanel). */
export type RecordingChangeEvent = {
	active: boolean;
	reason?: string;
};

let recordingNotifier: ((e: RecordingChangeEvent) => void) | undefined;
let capturedNotifier: ((r: CapturedRequest) => void) | undefined;

export function setRecordingNotifier(fn: typeof recordingNotifier): void {
	recordingNotifier = fn;
}

export function setCapturedNotifier(fn: typeof capturedNotifier): void {
	capturedNotifier = fn;
}

/** Session counters only (task 07 CLEAR_CAPTURES from sidepanel). */
export function resetSessionStats(): void {
	stats = { ...initialStats };
	emitStats();
}

let recording = false;
let cachedSettings: ExtensionSettings | null = null;
let inspectedTabUrl: string | undefined;

let requestListener: ((req: DevToolsHarEntry) => void) | undefined;
let navigatedListener: ((url: string) => void) | undefined;
let storageListener:
	| Parameters<typeof browser.storage.onChanged.addListener>[0]
	| undefined;

/** Narrow `chrome.*` shape for `devtools_page` without `@types/chrome`. */
interface ChromeRuntimeShim {
	lastError?: { message?: string };
}

interface InspectedWindowEval {
	eval(
		expression: string,
		callback: (result: unknown, isException: boolean) => void,
	): void;
}

interface DevtoolsNetworkApi {
	onNavigated?: {
		addListener(cb: (url: string) => void): void;
		removeListener(cb: (url: string) => void): void;
	};
	onRequestFinished: {
		addListener(cb: (request: DevToolsHarEntry) => void): void;
		removeListener(cb: (request: DevToolsHarEntry) => void): void;
	};
}

interface ExtensionChrome {
	devtools?: {
		network?: DevtoolsNetworkApi;
		inspectedWindow?: InspectedWindowEval;
	};
	runtime?: ChromeRuntimeShim;
}

function extensionChrome(): ExtensionChrome | undefined {
	return (globalThis as unknown as { chrome?: ExtensionChrome }).chrome;
}

function getDevtoolsNetwork(): DevtoolsNetworkApi | undefined {
	return extensionChrome()?.devtools?.network;
}

function getInspectedWindow(): InspectedWindowEval | undefined {
	return extensionChrome()?.devtools?.inspectedWindow;
}

function coerceHttpMethod(raw: string): HttpMethod {
	const u = raw.trim().toUpperCase();
	if ((HTTP_METHODS as readonly string[]).includes(u)) {
		return u as HttpMethod;
	}
	return 'GET';
}

function headerValue(
	headers: HarHeader[] | undefined,
	name: string,
): string | undefined {
	if (!headers) {
		return;
	}
	const lower = name.toLowerCase();
	for (const h of headers) {
		if (h.name.toLowerCase() === lower) {
			return h.value;
		}
	}
	return;
}

function normalizeHeaders(headers: HarHeader[] | undefined): HttpHeaderEntry[] {
	if (!Array.isArray(headers)) {
		return [];
	}
	return headers.map((h) => ({ name: h.name, value: h.value ?? '' }));
}

function maxCaptureTextChars(settings: ExtensionSettings): number {
	const base = settings.sampling.responseBodyLimit;
	return Math.min(2_000_000, Math.max(50_000, base * 25));
}

function shouldTreatAsNonTextMime(mime: string | undefined): boolean {
	if (!mime) {
		return false;
	}
	const m = mime.toLowerCase();
	return (
		m.startsWith('image/') ||
		m.startsWith('video/') ||
		m.startsWith('audio/') ||
		m.includes('font')
	);
}

function truncatedPostDataText(
	text: string | undefined | null,
	maxChars: number,
): string | undefined {
	if (text === undefined || text === null) {
		return;
	}
	if (text.length <= maxChars) {
		return text;
	}
	return text.slice(0, maxChars);
}

function httpStatusOrZero(value: unknown): number {
	if (typeof value === 'number') {
		return value;
	}
	return 0;
}

function buildShellRequest(
	entry: DevToolsHarEntry,
	opts: {
		captureId: string;
		finishedMs: number;
		inspectedTabUrl: string | undefined;
		settings: ExtensionSettings;
	},
): CapturedRequest {
	const { request, response } = entry;
	const mimeType = response.content?.mimeType;
	const maxPostChars = 256 * 1024;
	const requestBodyText = truncatedPostDataText(
		request.postData?.text,
		maxPostChars,
	);

	return {
		captureId: opts.captureId,
		finishedMs: opts.finishedMs,
		inspectedTabUrl: opts.inspectedTabUrl,
		method: coerceHttpMethod(request.method),
		mimeType,
		requestBodyText: requestBodyText ?? null,
		requestHeaders: normalizeHeaders(request.headers),
		responseBody: { kind: 'empty' },
		responseHeaders: normalizeHeaders(response.headers),
		status: httpStatusOrZero(response.status),
		url: request.url,
	};
}

function readResponseBody(
	entry: DevToolsHarEntry,
	settings: ExtensionSettings,
): Promise<CapturedResponseBody> {
	const mimeType = entry.response.content?.mimeType;
	const cl = headerValue(entry.response.headers, 'Content-Length');
	if (cl !== undefined) {
		const n = Number.parseInt(cl, 10);
		if (Number.isFinite(n) && n > MAX_RAW_BYTES_BEFORE_GET_CONTENT) {
			return Promise.resolve({
				kind: 'unavailable',
				reason: 'too-large',
			});
		}
	}

	if (shouldTreatAsNonTextMime(mimeType)) {
		const rawSize = entry.response.content?.size;
		let byteLength = 0;
		if (typeof rawSize === 'number') {
			byteLength = rawSize;
		}
		return Promise.resolve({
			kind: 'binary',
			byteLength,
		});
	}

	return new Promise((resolve) => {
		const timeout = globalThis.setTimeout(() => {
			resolve({ kind: 'unavailable', reason: 'timeout' });
		}, GET_CONTENT_TIMEOUT_MS);

		try {
			entry.getContent((content, encoding) => {
				globalThis.clearTimeout(timeout);
				const lastErr = extensionChrome()?.runtime?.lastError;
				if (lastErr?.message) {
					resolve({
						kind: 'unavailable',
						reason: lastErr.message,
					});
					return;
				}
				if (encoding === 'base64') {
					let approxBytes = 0;
					if (content) {
						approxBytes = Math.floor((content.length * 3) / 4);
					}
					resolve({ kind: 'binary', byteLength: approxBytes });
					return;
				}
				if (content === undefined || content === null) {
					resolve({ kind: 'unavailable', reason: 'no-content' });
					return;
				}
				const cap = maxCaptureTextChars(settings);
				let text = content;
				if (content.length > cap) {
					text = content.slice(0, cap);
				}
				resolve({ kind: 'text', text });
			});
		} catch {
			globalThis.clearTimeout(timeout);
			resolve({ kind: 'unavailable', reason: 'decode-error' });
		}
	});
}

/** Count Chrome/network issues; omit deliberate skips (oversized, empty body). */
function isBodyReadFailure(body: CapturedResponseBody): boolean {
	if (body.kind !== 'unavailable') {
		return false;
	}
	const { reason } = body;
	return (
		reason !== 'too-large' &&
		reason !== 'not-requested' &&
		reason !== 'no-content'
	);
}

async function refreshInspectedUrl(): Promise<void> {
	const iw = getInspectedWindow();
	if (!iw?.eval) {
		inspectedTabUrl = undefined;
		return;
	}
	await new Promise<void>((resolve) => {
		iw.eval('window.location.href', (result: unknown, isException: boolean) => {
			if (isException || typeof result !== 'string') {
				inspectedTabUrl = undefined;
			} else {
				inspectedTabUrl = result;
			}
			resolve();
		});
	});
}

async function onHarFinished(
	entry: DevToolsHarEntry,
): Promise<CapturedRequest | undefined> {
	if (!(recording && cachedSettings)) {
		return;
	}
	bump({ totalFinished: stats.totalFinished + 1 });

	const settings = cachedSettings;
	const captureId = crypto.randomUUID();
	const finishedMs = Date.now();

	const shell = buildShellRequest(entry, {
		captureId,
		finishedMs,
		inspectedTabUrl,
		settings,
	});

	if (!passesFilter(shell, settings)) {
		bump({ skippedByFilter: stats.skippedByFilter + 1 });
		return;
	}

	bump({ passedFilter: stats.passedFilter + 1 });

	let responseBody: CapturedResponseBody;
	try {
		responseBody = await readResponseBody(entry, settings);
	} catch {
		responseBody = { kind: 'unavailable', reason: 'decode-error' };
	}

	if (isBodyReadFailure(responseBody)) {
		bump({ bodyFailures: stats.bodyFailures + 1 });
	}

	// Task 07: bridge sends `REQUEST_CAPTURED` for filtered rows only.
	const captured: CapturedRequest = { ...shell, responseBody };
	capturedNotifier?.(captured);
	return captured;
}

export function isRecording(): boolean {
	return recording;
}

async function refreshSettings(): Promise<void> {
	cachedSettings = await loadExtensionSettings();
}

export async function startRecording(): Promise<void> {
	if (recording) {
		return;
	}
	stats = { ...initialStats };
	emitStats();

	await refreshSettings();
	await refreshInspectedUrl();

	const net = getDevtoolsNetwork();
	if (!net?.onRequestFinished) {
		console.error(
			'[auto-scrape-ai devtools] chrome.devtools.network unavailable',
		);
		recordingNotifier?.({
			active: false,
			reason: 'devtools-network-unavailable',
		});
		return;
	}

	recording = true;

	requestListener = (req: DevToolsHarEntry) => {
		onHarFinished(req).catch(() => {
			/* dropped async errors from one HAR row */
		});
	};
	net.onRequestFinished.addListener(requestListener);

	navigatedListener = () => {
		refreshInspectedUrl().catch(() => {
			/* inspected URL optional for filter */
		});
	};
	if (net.onNavigated) {
		net.onNavigated.addListener(navigatedListener);
	}

	storageListener = (changes, area) => {
		if (area !== 'local' || !(EXTENSION_SETTINGS_STORAGE_KEY in changes)) {
			return;
		}
		refreshSettings().catch(() => {
			/* settings reload is best-effort */
		});
	};
	browser.storage.onChanged.addListener(storageListener);

	recordingNotifier?.({ active: true });
}

export function stopRecording(): void {
	if (!recording) {
		return;
	}
	recording = false;

	const net = getDevtoolsNetwork();
	if (net?.onRequestFinished && requestListener) {
		net.onRequestFinished.removeListener(requestListener);
	}
	if (net?.onNavigated && navigatedListener) {
		net.onNavigated.removeListener(navigatedListener);
	}
	if (storageListener) {
		browser.storage.onChanged.removeListener(storageListener);
	}

	requestListener = undefined;
	navigatedListener = undefined;
	storageListener = undefined;

	recordingNotifier?.({ active: false });
}
