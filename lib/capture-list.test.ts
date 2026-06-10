import { describe, expect, it } from 'bun:test';
import {
	appendUniqueRequestByPath,
	MAX_CAPTURED_REQUESTS,
	normalizeRequestPath,
} from './capture-list';
import type { CapturedRequest } from './types/requests';

/**
 * Build a minimal captured request fixture and allow each test to override the
 * fields relevant to the behavior under test.
 */
function baseRequest(over: Partial<CapturedRequest> = {}): CapturedRequest {
	return {
		captureId: 'r1',
		finishedMs: 1,
		method: 'GET',
		mimeType: 'application/json',
		requestHeaders: [],
		responseBody: { kind: 'empty' },
		responseHeaders: [],
		status: 200,
		url: 'https://api.example.com/v1/items?page=1',
		...over,
	};
}

describe('normalizeRequestPath', () => {
	it('drops query and hash while keeping origin and path', () => {
		expect(
			normalizeRequestPath('https://api.example.com/v1/items?page=1#top'),
		).toBe('https://api.example.com/v1/items');
	});

	it('falls back to raw input for invalid URLs', () => {
		expect(normalizeRequestPath('not a url')).toBe('not a url');
	});
});

describe('appendUniqueRequestByPath', () => {
	it('prepends a new endpoint path', () => {
		const first = baseRequest({ captureId: 'first' });
		const second = baseRequest({
			captureId: 'second',
			url: 'https://api.example.com/v1/users',
		});
		const result = appendUniqueRequestByPath([first], second);
		expect(result.added).toBe(true);
		expect(result.requests.map((r) => r.captureId)).toEqual([
			'second',
			'first',
		]);
	});

	it('rejects duplicates that only differ by query string', () => {
		const first = baseRequest({
			captureId: 'first',
			url: 'https://api.example.com/v1/items?page=1',
		});
		const duplicate = baseRequest({
			captureId: 'duplicate',
			url: 'https://api.example.com/v1/items?page=2',
		});
		const result = appendUniqueRequestByPath([first], duplicate);
		expect(result.added).toBe(false);
		expect(result.requests.length).toBe(1);
		expect(result.requests[0]?.captureId).toBe('first');
	});

	it('caps the visible list', () => {
		const current = Array.from({ length: MAX_CAPTURED_REQUESTS }, (_, i) =>
			baseRequest({
				captureId: `r${i}`,
				url: `https://api.example.com/v1/${i}`,
			}),
		);
		const added = baseRequest({
			captureId: 'new',
			url: 'https://api.example.com/v1/new',
		});
		const result = appendUniqueRequestByPath(current, added);
		expect(result.added).toBe(true);
		expect(result.requests.length).toBe(MAX_CAPTURED_REQUESTS);
		expect(result.requests[0]?.captureId).toBe('new');
		expect(result.requests.at(-1)?.captureId).toBe(
			`r${MAX_CAPTURED_REQUESTS - 2}`,
		);
	});
});
