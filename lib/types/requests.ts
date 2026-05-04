import type { HttpMethod } from './http';

/**
 * Stable id for one captured row (UUID from DevTools layer or hash of request+time).
 */
export type CaptureId = string;

/**
 * Header list as DevTools / fetch exposes (order may matter for duplicates).
 */
export interface HttpHeaderEntry {
	name: string;
	value: string;
}

/**
 * Response entity as read from `getContent` (or skipped when too large / binary).
 */
export type CapturedResponseBody =
	| { kind: 'text'; text: string }
	| { kind: 'binary' /** size in bytes when known */; byteLength: number }
	| { kind: 'empty' }
	| {
			kind: 'unavailable';
			reason:
				| 'not-requested'
				| 'timeout'
				| 'too-large'
				| 'decode-error'
				| 'no-content'
				| 'opaque'
				| string;
	  };

/**
 * Minimal HAR-shaped record produced in the **DevTools** context only.
 * Sidepanel receives copies via messaging (task 07).
 */
export interface CapturedRequest {
	captureId: CaptureId;
	/** Wall clock when the request finished (ms since epoch) */
	finishedMs: number;
	/**
	 * Top-level page URL of the inspected tab (for `current-tab-host` filter).
	 * Optional if unavailable at capture time.
	 */
	inspectedTabUrl?: string;
	method: HttpMethod;
	/** `response.content.mimeType` when present */
	mimeType?: string;
	requestBodyText?: string | null;
	requestHeaders: HttpHeaderEntry[];
	responseBody: CapturedResponseBody;
	responseHeaders: HttpHeaderEntry[];
	/** HTTP status from onRequestFinished */
	status: number;
	/** Absolute request URL */
	url: string;
}

/**
 * Sanitized + truncated snapshot **safe to embed in prompts** (task 03 fills this).
 */
export interface RefinedRequest {
	captureId: CaptureId;
	method: HttpMethod;
	mimeType?: string;
	/** Optional one-line or truncated request payload */
	requestBodySummary?: string;
	requestHeadersRedacted: HttpHeaderEntry[];
	/** Truncated / array-folded response sample (often JSON substring) */
	responseBodySummary: string;
	responseHeadersRedacted: HttpHeaderEntry[];
	status: number;
	url: string;
	/** True if body or headers were stripped or truncated */
	wasSanitized: boolean;
}
