import type { CapturedRequest } from './types/requests';

export const MAX_CAPTURED_REQUESTS = 300;

/**
 * Convert a request URL into the endpoint identity used for panel de-duplication.
 * Search parameters and hashes are intentionally ignored; invalid URLs are
 * returned unchanged so callers can still compare opaque request identifiers.
 */
export function normalizeRequestPath(raw: string): string {
	try {
		const u = new URL(raw);
		return `${u.origin}${u.pathname}`;
	} catch {
		return raw;
	}
}

export interface AppendCapturedRequestResult {
	added: boolean;
	requests: CapturedRequest[];
}

/**
 * Keep one representative request per endpoint path in the visible capture list.
 * Query strings are ignored deliberately so repeated filtered/search requests do
 * not flood the panel.
 */
export function appendUniqueRequestByPath(
	current: CapturedRequest[],
	request: CapturedRequest,
	limit = MAX_CAPTURED_REQUESTS,
): AppendCapturedRequestResult {
	const pathKey = normalizeRequestPath(request.url);
	const duplicated = current.some(
		(item) => normalizeRequestPath(item.url) === pathKey,
	);
	if (duplicated) {
		return { added: false, requests: current };
	}

	return {
		added: true,
		requests: [request, ...current].slice(0, limit),
	};
}
