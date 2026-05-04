import { describe, expect, it } from 'bun:test';
import { refineRequest, truncateJsonArrays } from './refine';
import { DEFAULT_EXTENSION_SETTINGS } from './types/defaults';
import type { CapturedRequest } from './types/requests';
import type { ExtensionSettings } from './types/settings';

function baseSettings(
	over: Partial<ExtensionSettings> = {},
): ExtensionSettings {
	return {
		...DEFAULT_EXTENSION_SETTINGS,
		...over,
		filter: { ...DEFAULT_EXTENSION_SETTINGS.filter, ...over.filter },
		sampling: { ...DEFAULT_EXTENSION_SETTINGS.sampling, ...over.sampling },
		analysis: { ...DEFAULT_EXTENSION_SETTINGS.analysis, ...over.analysis },
		ai: { ...DEFAULT_EXTENSION_SETTINGS.ai, ...over.ai },
	};
}

function baseRequest(over: Partial<CapturedRequest> = {}): CapturedRequest {
	return {
		captureId: 'r1',
		url: 'https://api.example.com/x',
		method: 'POST',
		status: 200,
		mimeType: 'application/json',
		finishedMs: 1,
		requestHeaders: [
			{ name: 'Cookie', value: 'a=b' },
			{ name: 'X-Debug', value: '1' },
		],
		responseHeaders: [
			{ name: 'Set-Cookie', value: 'sid=1' },
			{ name: 'Content-Type', value: 'application/json' },
		],
		requestBodyText: '{"x":1}',
		responseBody: { kind: 'text', text: '{"items":[1,2,3,4]}' },
		...over,
	};
}

describe('truncateJsonArrays', () => {
	it('keeps first N elements at any depth', () => {
		const input = { a: [{ b: [1, 2, 3] }, { c: 2 }], d: [9, 8, 7] };
		const out = truncateJsonArrays(input, 2) as typeof input;
		expect(out.a[0].b).toEqual([1, 2]);
		expect(out.a.length).toBe(2);
		expect(out.d).toEqual([9, 8]);
	});
});

describe('refineRequest', () => {
	it('strips blocklisted headers', () => {
		const r = refineRequest(baseRequest(), baseSettings());
		expect(
			r.requestHeadersRedacted.some((h) => h.name.toLowerCase() === 'cookie'),
		).toBe(false);
		expect(
			r.responseHeadersRedacted.some(
				(h) => h.name.toLowerCase() === 'set-cookie',
			),
		).toBe(false);
		expect(r.requestHeadersRedacted.some((h) => h.name === 'X-Debug')).toBe(
			true,
		);
	});

	it('truncates JSON arrays then applies char limit', () => {
		const s = baseSettings({
			sampling: { responseBodyLimit: 500, arrayTruncationCount: 2 },
		});
		const body = JSON.stringify({ items: [1, 2, 3, 4, 5] });
		const r = refineRequest(
			baseRequest({
				responseBody: { kind: 'text', text: body },
			}),
			s,
		);
		const parsed = JSON.parse(r.responseBodySummary) as { items: number[] };
		expect(parsed.items).toEqual([1, 2]);
		expect(r.wasSanitized).toBe(true);
	});

	it('falls back to plain text when JSON invalid', () => {
		const s = baseSettings({
			sampling: { responseBodyLimit: 12, arrayTruncationCount: 2 },
		});
		const raw = 'not json at all------';
		const r = refineRequest(
			baseRequest({
				responseBody: { kind: 'text', text: raw },
			}),
			s,
		);
		expect(r.responseBodySummary).toBe('not json at ');
		expect(r.wasSanitized).toBe(true);
	});

	it('summarizes binary and unavailable bodies', () => {
		const s = baseSettings();
		const bin = refineRequest(
			baseRequest({ responseBody: { kind: 'binary', byteLength: 1024 } }),
			s,
		);
		expect(bin.responseBodySummary).toContain('binary');
		expect(bin.wasSanitized).toBe(true);

		const un = refineRequest(
			baseRequest({
				responseBody: { kind: 'unavailable', reason: 'timeout' },
			}),
			s,
		);
		expect(un.responseBodySummary).toContain('timeout');
		expect(un.wasSanitized).toBe(true);
	});
});
