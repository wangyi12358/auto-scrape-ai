/**
 * Persisted extension settings use **`browser.storage.local`** (not `sync`).
 *
 * Rationale: `ai.apiKey` is sensitive; Chrome sync replicates storage to Google
 * servers and other signed-in devices. Local-only keeps secrets on this profile.
 */
import { createSettingsUpdatedMessage } from './messages';
import { DEFAULT_EXTENSION_SETTINGS } from './types/defaults';
import { HTTP_METHODS, type HttpMethod } from './types/http';
import type {
	ExtensionSettings,
	IncludeDomainRule,
	SchemaType,
	TargetLanguage,
} from './types/settings';

const TARGET_LANGUAGES: readonly TargetLanguage[] = [
	'python',
	'go',
	'nodejs',
	'rust',
	'curl',
	'java',
	'csharp',
];

const SCHEMA_TYPES: readonly SchemaType[] = [
	'typescript-interface',
	'json-schema',
	'pydantic',
];

export const EXTENSION_SETTINGS_STORAGE_KEY = 'extensionSettingsV1' as const;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isHttpMethod(value: unknown): value is HttpMethod {
	return (
		typeof value === 'string' &&
		(HTTP_METHODS as readonly string[]).includes(value)
	);
}

function isIncludeRule(value: unknown): value is IncludeDomainRule {
	if (!isRecord(value) || typeof value.kind !== 'string') {
		return false;
	}
	if (value.kind === 'current-tab-host') {
		return true;
	}
	if (value.kind === 'regex' && typeof value.pattern === 'string') {
		return true;
	}
	return false;
}

/**
 * One rule per line. Line `current-tab-host` (case-insensitive) = inspected tab host.
 * Any other non-empty line = regex **source** matched against request hostname.
 */
export function parseIncludeRulesFromText(text: string): IncludeDomainRule[] {
	const rules: IncludeDomainRule[] = [];
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line) {
			continue;
		}
		if (line.toLowerCase() === 'current-tab-host') {
			rules.push({ kind: 'current-tab-host' });
			continue;
		}
		rules.push({ kind: 'regex', pattern: line });
	}
	return rules;
}

export function serializeIncludeRulesToText(
	rules: IncludeDomainRule[],
): string {
	return rules
		.map((r) =>
			r.kind === 'current-tab-host' ? 'current-tab-host' : r.pattern,
		)
		.join('\n');
}

/** Split on newlines and commas; normalize to lowercase leading-dot form. */
export function parseExtensionsFromText(text: string): string[] {
	const out = new Set<string>();
	for (const part of text.split(/[\n,]+/)) {
		const t = part.trim().toLowerCase();
		if (!t) {
			continue;
		}
		out.add(t.startsWith('.') ? t : `.${t}`);
	}
	return [...out];
}

export function serializeExtensionsToText(extensions: string[]): string {
	return extensions.join('\n');
}

function cloneDefaults(): ExtensionSettings {
	return structuredClone(DEFAULT_EXTENSION_SETTINGS);
}

/**
 * Coerce unknown JSON from storage into `ExtensionSettings`, filling gaps from
 * {@link DEFAULT_EXTENSION_SETTINGS}.
 */
export function mergeExtensionSettingsFromStored(
	raw: unknown,
): ExtensionSettings {
	const base = cloneDefaults();
	if (!isRecord(raw) || raw.settingsVersion !== 1) {
		return base;
	}

	const next: ExtensionSettings = {
		settingsVersion: 1,
		ai: { ...base.ai },
		analysis: { ...base.analysis },
		filter: {
			...base.filter,
			includeDomainRules: [...base.filter.includeDomainRules],
		},
		sampling: { ...base.sampling },
	};

	if (isRecord(raw.ai)) {
		if (typeof raw.ai.apiKey === 'string') {
			next.ai.apiKey = raw.ai.apiKey;
		}
		if (typeof raw.ai.baseUrl === 'string' && raw.ai.baseUrl.trim()) {
			next.ai.baseUrl = raw.ai.baseUrl.trim();
		}
		if (typeof raw.ai.model === 'string' && raw.ai.model.trim()) {
			next.ai.model = raw.ai.model.trim();
		}
	}

	if (isRecord(raw.analysis)) {
		if (
			typeof raw.analysis.maxConcurrentAnalysis === 'number' &&
			Number.isFinite(raw.analysis.maxConcurrentAnalysis)
		) {
			next.analysis.maxConcurrentAnalysis = Math.min(
				32,
				Math.max(1, Math.floor(raw.analysis.maxConcurrentAnalysis)),
			);
		}
		if (
			typeof raw.analysis.analysisTimeoutMs === 'number' &&
			Number.isFinite(raw.analysis.analysisTimeoutMs)
		) {
			next.analysis.analysisTimeoutMs = Math.min(
				600_000,
				Math.max(10_000, Math.round(raw.analysis.analysisTimeoutMs)),
			);
		}
		const tl = raw.analysis.targetLanguage;
		if (
			typeof tl === 'string' &&
			(TARGET_LANGUAGES as readonly string[]).includes(tl)
		) {
			next.analysis.targetLanguage = tl as TargetLanguage;
		}
		const st = raw.analysis.schemaType;
		if (
			typeof st === 'string' &&
			(SCHEMA_TYPES as readonly string[]).includes(st)
		) {
			next.analysis.schemaType = st as SchemaType;
		}
	}

	if (isRecord(raw.sampling)) {
		if (
			typeof raw.sampling.responseBodyLimit === 'number' &&
			Number.isFinite(raw.sampling.responseBodyLimit)
		) {
			next.sampling.responseBodyLimit = raw.sampling.responseBodyLimit;
		}
		if (
			typeof raw.sampling.arrayTruncationCount === 'number' &&
			Number.isFinite(raw.sampling.arrayTruncationCount)
		) {
			next.sampling.arrayTruncationCount = raw.sampling.arrayTruncationCount;
		}
	}

	if (isRecord(raw.filter)) {
		if (Array.isArray(raw.filter.includeDomainRules)) {
			next.filter.includeDomainRules =
				raw.filter.includeDomainRules.filter(isIncludeRule);
		}
		if (Array.isArray(raw.filter.excludeExtensions)) {
			const ext = raw.filter.excludeExtensions
				.filter((x): x is string => typeof x === 'string')
				.map((x) => x.trim().toLowerCase());
			next.filter.excludeExtensions = ext.map((x) =>
				x.startsWith('.') ? x : `.${x}`,
			);
		}
		if (Array.isArray(raw.filter.methods)) {
			const methods = raw.filter.methods.filter(isHttpMethod);
			if (methods.length) {
				next.filter.methods = methods;
			}
		}
	}

	return next;
}

export function validateExtensionSettings(s: ExtensionSettings): string[] {
	const errors: string[] = [];
	if (!Number.isFinite(s.sampling.responseBodyLimit)) {
		errors.push('Response body limit must be a number');
	} else if (s.sampling.responseBodyLimit < 256) {
		errors.push('Response body limit must be at least 256');
	} else if (s.sampling.responseBodyLimit > 2_000_000) {
		errors.push('Response body limit is too large (max 2,000,000)');
	}

	if (!Number.isFinite(s.sampling.arrayTruncationCount)) {
		errors.push('Array truncation must be a number');
	} else if (s.sampling.arrayTruncationCount < 0) {
		errors.push('Array truncation cannot be negative');
	} else if (s.sampling.arrayTruncationCount > 500) {
		errors.push('Array truncation is too large (max 500)');
	}

	if (s.filter.methods.length === 0) {
		errors.push('Select at least one HTTP method');
	}

	for (const rule of s.filter.includeDomainRules) {
		if (rule.kind === 'regex' && !rule.pattern.trim()) {
			errors.push('Include rules: empty regex line');
		}
	}

	if (!s.ai.model.trim()) {
		errors.push('Model id cannot be empty');
	}
	if (!s.ai.baseUrl.trim()) {
		errors.push('Base URL cannot be empty');
	}

	if (
		!(TARGET_LANGUAGES as readonly string[]).includes(s.analysis.targetLanguage)
	) {
		errors.push('Invalid target language');
	}
	if (!(SCHEMA_TYPES as readonly string[]).includes(s.analysis.schemaType)) {
		errors.push('Invalid schema type');
	}

	if (!Number.isFinite(s.analysis.maxConcurrentAnalysis)) {
		errors.push('Max concurrent analysis must be a number');
	} else if (s.analysis.maxConcurrentAnalysis < 1) {
		errors.push('Max concurrent analysis must be at least 1');
	} else if (s.analysis.maxConcurrentAnalysis > 32) {
		errors.push('Max concurrent analysis is too large (max 32)');
	}

	if (!Number.isFinite(s.analysis.analysisTimeoutMs)) {
		errors.push('Analysis timeout must be a number');
	} else if (s.analysis.analysisTimeoutMs < 10_000) {
		errors.push('Analysis timeout must be at least 10,000 ms');
	} else if (s.analysis.analysisTimeoutMs > 600_000) {
		errors.push('Analysis timeout is too large (max 600,000 ms)');
	}

	return errors;
}

export async function loadExtensionSettings(): Promise<ExtensionSettings> {
	const bag = await browser.storage.local.get(EXTENSION_SETTINGS_STORAGE_KEY);
	const raw = bag[EXTENSION_SETTINGS_STORAGE_KEY];
	return mergeExtensionSettingsFromStored(raw);
}

export async function saveExtensionSettings(
	settings: ExtensionSettings,
): Promise<void> {
	const errors = validateExtensionSettings(settings);
	if (errors.length) {
		throw new Error(errors.join('\n'));
	}
	await browser.storage.local.set({
		[EXTENSION_SETTINGS_STORAGE_KEY]: settings,
	});
	await notifySettingsUpdated(settings);
}

export async function notifySettingsUpdated(
	settings: ExtensionSettings,
): Promise<void> {
	const msg = createSettingsUpdatedMessage(settings);
	try {
		await browser.runtime.sendMessage(msg);
	} catch {
		// Receiver may be inactive before task 07 wiring; persistence still succeeded.
	}
}
