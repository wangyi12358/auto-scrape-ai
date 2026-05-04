import { describe, expect, it } from 'bun:test';
import { passesFilter, pathnameExtension } from './filter';
import { DEFAULT_EXTENSION_SETTINGS } from './types/defaults';
import type { CapturedRequest } from './types/requests';
import type { ExtensionSettings } from './types/settings';

function baseRequest(over: Partial<CapturedRequest> = {}): CapturedRequest {
	return {
		captureId: 'c1',
		url: 'https://api.example.com/v1/data',
		method: 'GET',
		status: 200,
		mimeType: 'application/json',
		finishedMs: 1,
		requestHeaders: [],
		responseHeaders: [],
		responseBody: { kind: 'text', text: '{}' },
		...over,
	};
}

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

describe('pathnameExtension', () => {
	it('normalizes case and leading dot segment', () => {
		expect(pathnameExtension('https://x.com/a/b.JPG')).toBe('.jpg');
		expect(pathnameExtension('https://x.com/a/b')).toBe('');
	});
});

describe('passesFilter', () => {
	it('rejects when method not listed', () => {
		const s = baseSettings({
			filter: { ...DEFAULT_EXTENSION_SETTINGS.filter, methods: ['POST'] },
		});
		expect(passesFilter(baseRequest({ method: 'GET' }), s)).toBe(false);
	});

	it('rejects excluded extension case-insensitively', () => {
		const s = baseSettings({
			filter: {
				...DEFAULT_EXTENSION_SETTINGS.filter,
				includeDomainRules: [],
				excludeExtensions: ['.jpg'],
				methods: ['GET'],
			},
		});
		expect(
			passesFilter(baseRequest({ url: 'https://cdn.example.com/x.JPG' }), s),
		).toBe(false);
		expect(
			passesFilter(baseRequest({ url: 'https://cdn.example.com/x.png' }), s),
		).toBe(true);
	});

	it('allows all hosts when include list empty', () => {
		const s = baseSettings({
			filter: {
				...DEFAULT_EXTENSION_SETTINGS.filter,
				includeDomainRules: [],
				methods: ['GET'],
			},
		});
		expect(
			passesFilter(baseRequest({ url: 'https://anywhere.test/z' }), s),
		).toBe(true);
	});

	it('matches regex against hostname', () => {
		const s = baseSettings({
			filter: {
				...DEFAULT_EXTENSION_SETTINGS.filter,
				includeDomainRules: [{ kind: 'regex', pattern: '^api\\.' }],
				methods: ['GET'],
			},
		});
		expect(
			passesFilter(baseRequest({ url: 'https://api.example.com/x' }), s),
		).toBe(true);
		expect(
			passesFilter(baseRequest({ url: 'https://www.example.com/x' }), s),
		).toBe(false);
	});

	it('matches current-tab-host using inspectedTabUrl', () => {
		const s = baseSettings({
			filter: {
				...DEFAULT_EXTENSION_SETTINGS.filter,
				includeDomainRules: [{ kind: 'current-tab-host' }],
				methods: ['GET'],
			},
		});
		const ok = baseRequest({
			url: 'https://shop.example.com/api',
			inspectedTabUrl: 'https://shop.example.com/page',
		});
		const bad = baseRequest({
			url: 'https://other.com/api',
			inspectedTabUrl: 'https://shop.example.com/page',
		});
		expect(passesFilter(ok, s)).toBe(true);
		expect(passesFilter(bad, s)).toBe(false);
	});

	it('invalid regex rule does not match but other rule can', () => {
		const s = baseSettings({
			filter: {
				...DEFAULT_EXTENSION_SETTINGS.filter,
				includeDomainRules: [
					{ kind: 'regex', pattern: '(' },
					{ kind: 'regex', pattern: 'example' },
				],
				methods: ['GET'],
			},
		});
		expect(
			passesFilter(baseRequest({ url: 'https://foo.example.com/' }), s),
		).toBe(true);
	});
});
