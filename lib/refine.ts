import type {
	CapturedRequest,
	HttpHeaderEntry,
	RefinedRequest,
} from './types/requests';
import type { ExtensionSettings } from './types/settings';

/**
 * Headers removed before prompts / storage (lowercase name match).
 * `sec-ch-ua` prefix covers Sec-Ch-Ua, Sec-Ch-Ua-Mobile, Sec-Ch-Ua-Platform, etc.
 */
export const DEFAULT_HEADER_BLOCKLIST: readonly RegExp[] = [
	/^cookie$/i,
	/^set-cookie$/i,
	/^authorization$/i,
	/^proxy-authorization$/i,
	/^accept-language$/i,
	/^sec-ch-ua/i,
];

function isBlockedHeader(name: string, extra: readonly RegExp[]): boolean {
	const blockers = extra.length
		? [...DEFAULT_HEADER_BLOCKLIST, ...extra]
		: DEFAULT_HEADER_BLOCKLIST;
	return blockers.some((re) => re.test(name.trim()));
}

function filterHeaders(
	headers: HttpHeaderEntry[],
	extraBlocklist: readonly RegExp[],
): { headers: HttpHeaderEntry[]; removed: boolean } {
	const out: HttpHeaderEntry[] = [];
	let removed = false;
	for (const h of headers) {
		if (isBlockedHeader(h.name, extraBlocklist)) {
			removed = true;
			continue;
		}
		out.push(h);
	}
	return { headers: out, removed };
}

const JSON_PARSE_MAX_CHARS = 2_000_000;

/**
 * Recursively truncates **every JSON array** to at most `maxItems` elements.
 * Objects are walked depth-first; non-array leaves unchanged.
 * If `maxItems <= 0`, arrays become empty (explicit product choice — document in UI later).
 */
export function truncateJsonArrays(value: unknown, maxItems: number): unknown {
	if (Array.isArray(value)) {
		const cap = Math.max(0, maxItems);
		const sliced = value.slice(0, cap);
		return sliced.map((item) => truncateJsonArrays(item, maxItems));
	}
	if (value !== null && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			out[k] = truncateJsonArrays(v, maxItems);
		}
		return out;
	}
	return value;
}

function serializeResponseSample(
	raw: string,
	settings: ExtensionSettings,
): { text: string; truncated: boolean; arraysTruncated: boolean } {
	const { responseBodyLimit, arrayTruncationCount } = settings.sampling;
	let arraysTruncated = false;
	let working = raw;

	if (working.length > JSON_PARSE_MAX_CHARS) {
		return {
			text: working.slice(0, responseBodyLimit),
			truncated: true,
			arraysTruncated: false,
		};
	}

	try {
		const parsed: unknown = JSON.parse(working);
		const shrunk = truncateJsonArrays(parsed, arrayTruncationCount);
		const before = JSON.stringify(parsed);
		const after = JSON.stringify(shrunk);
		arraysTruncated = before !== after;
		working = JSON.stringify(shrunk);
	} catch {
		// not JSON — keep plain text
	}

	const truncated = working.length > responseBodyLimit;
	const text = truncated ? working.slice(0, responseBodyLimit) : working;
	return { text, truncated, arraysTruncated };
}

function summarizeRequestBody(
	text: string | null | undefined,
	charBudget: number,
): { summary?: string; truncated: boolean } {
	if (text == null || text === '') {
		return { truncated: false };
	}
	const truncated = text.length > charBudget;
	const summary = truncated ? text.slice(0, charBudget) : text;
	return { summary, truncated };
}

function summarizeCapturedResponse(
	body: CapturedRequest['responseBody'],
	settings: ExtensionSettings,
): {
	summary: string;
	truncated: boolean;
	arraysTruncated: boolean;
	sanitized: boolean;
} {
	if (body.kind === 'text') {
		const r = serializeResponseSample(body.text, settings);
		return {
			summary: r.text,
			truncated: r.truncated,
			arraysTruncated: r.arraysTruncated,
			sanitized: r.truncated || r.arraysTruncated,
		};
	}
	if (body.kind === 'binary') {
		return {
			summary: `[binary body, ${body.byteLength} bytes]`,
			truncated: false,
			arraysTruncated: false,
			sanitized: true,
		};
	}
	if (body.kind === 'empty') {
		return {
			summary: '[empty body]',
			truncated: false,
			arraysTruncated: false,
			sanitized: false,
		};
	}
	return {
		summary: `[body unavailable: ${body.reason}]`,
		truncated: false,
		arraysTruncated: false,
		sanitized: true,
	};
}

/**
 * Strip sensitive headers, truncate bodies, and fold JSON arrays for model prompts.
 * Independent of {@link passesFilter} — callers may refine only filtered rows.
 */
export function refineRequest(
	request: CapturedRequest,
	settings: ExtensionSettings,
	options?: { extraHeaderBlocklist?: readonly RegExp[] },
): RefinedRequest {
	const extra = options?.extraHeaderBlocklist ?? [];
	const reqH = filterHeaders(request.requestHeaders, extra);
	const resH = filterHeaders(request.responseHeaders, extra);

	const requestCharBudget = Math.min(4000, settings.sampling.responseBodyLimit);
	const reqBody = summarizeRequestBody(
		request.requestBodyText ?? undefined,
		requestCharBudget,
	);

	const resSample = summarizeCapturedResponse(request.responseBody, settings);

	const wasSanitized =
		reqH.removed ||
		resH.removed ||
		reqBody.truncated ||
		resSample.sanitized ||
		resSample.truncated ||
		resSample.arraysTruncated;

	return {
		captureId: request.captureId,
		url: request.url,
		method: request.method,
		status: request.status,
		mimeType: request.mimeType,
		requestHeadersRedacted: reqH.headers,
		responseHeadersRedacted: resH.headers,
		requestBodySummary: reqBody.summary,
		responseBodySummary: resSample.summary,
		wasSanitized,
	};
}
