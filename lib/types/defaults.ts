import type { ExtensionSettings } from './settings';

/**
 * Sensible defaults until Options (task 04) writes user overrides.
 */
type EnvMap = Record<string, string | undefined>;

function readEnv(): EnvMap {
	return (import.meta as ImportMeta & { env?: EnvMap }).env ?? {};
}

function envString(key: string, fallback: string): string {
	const value = readEnv()[key]?.trim();
	return value ? value : fallback;
}

function envStringList(key: string, fallback: string[]): string[] {
	const raw = readEnv()[key];
	if (!raw?.trim()) {
		return fallback;
	}
	const list = raw
		.split(/[\n,]+/)
		.map((x) => x.trim())
		.filter(Boolean);
	return list.length ? list : fallback;
}

function envInt(
	key: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = readEnv()[key]?.trim();
	if (!raw) {
		return fallback;
	}
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	return Math.min(max, Math.max(min, n));
}

function envTimeoutMs(
	key: string,
	fallback: number,
	min: number,
	max: number,
): number {
	const raw = readEnv()[key]?.trim();
	if (!raw) {
		return fallback;
	}
	const n = Number(raw);
	if (!Number.isFinite(n)) {
		return fallback;
	}
	const rounded = Math.round(n);
	return Math.min(max, Math.max(min, rounded));
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
	settingsVersion: 1,
	filter: {
		includeDomainRules: envStringList('WXT_DEFAULT_INCLUDE_RULES', [
			'current-tab-host',
		]).map((rule) =>
			rule.toLowerCase() === 'current-tab-host'
				? { kind: 'current-tab-host' as const }
				: { kind: 'regex' as const, pattern: rule },
		),
		excludeExtensions: [
			'.js',
			'.jpg',
			'.jpeg',
			'.png',
			'.gif',
			'.webp',
			'.svg',
			'.ico',
			'.css',
			'.woff',
			'.woff2',
			'.ttf',
			'.eot',
			'.mp4',
			'.webm',
			'.mp3',
			'.pdf',
		],
		methods: ['GET', 'POST'],
	},
	sampling: {
		responseBodyLimit: 8000,
		arrayTruncationCount: 2,
	},
	analysis: {
		maxConcurrentAnalysis: envInt(
			'WXT_DEFAULT_MAX_CONCURRENT_ANALYSIS',
			4,
			1,
			32,
		),
		analysisTimeoutMs: envTimeoutMs(
			'WXT_DEFAULT_ANALYSIS_TIMEOUT_MS',
			60_000,
			10_000,
			600_000,
		),
		targetLanguage: envString(
			'WXT_DEFAULT_TARGET_LANGUAGE',
			'python',
		) as ExtensionSettings['analysis']['targetLanguage'],
		schemaType: envString(
			'WXT_DEFAULT_SCHEMA_TYPE',
			'typescript-interface',
		) as ExtensionSettings['analysis']['schemaType'],
	},
	ai: {
		apiKey: envString('WXT_DEFAULT_OPENAI_API_KEY', ''),
		baseUrl: envString(
			'WXT_DEFAULT_OPENAI_BASE_URL',
			'https://api.openai.com/v1',
		),
		model: envString('WXT_DEFAULT_OPENAI_MODEL', 'gpt-4.1-mini'),
	},
};
