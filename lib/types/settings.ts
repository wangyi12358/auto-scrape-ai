import type { HttpMethod } from './http';

/**
 * One row in “Include domains”: either a regex (as raw string) or the magic
 * “use inspected tab’s host” placeholder (filled at capture time in DevTools).
 */
export type IncludeDomainRule =
	| {
			kind: 'regex' /** ECMAScript regex source, e.g. `^api\\.example\\.com` */;
			pattern: string;
	  }
	| { kind: 'current-tab-host' };

/**
 * First-pass filter (DevTools / Refiner). Semantics: URL must match **at least
 * one** include rule when the list is non-empty; extension/method rules apply
 * in addition (implemented in task 03).
 */
export interface FilterSettings {
	/** Lowercase entries with leading dot, e.g. `.jpg`, `.woff2` */
	excludeExtensions: string[];
	includeDomainRules: IncludeDomainRule[];
	methods: HttpMethod[];
}

/**
 * Limits payload size before sending to the model (token / context control).
 */
export interface SamplingSettings {
	/** When response JSON contains arrays, keep only first N elements per array node. */
	arrayTruncationCount: number;
	/** Max characters for serialized response body sample (after JSON pretty, etc.). */
	responseBodyLimit: number;
}

/** Language for generated client / scraper snippets in analysis UI. */
export type TargetLanguage =
	| 'python'
	| 'go'
	| 'nodejs'
	| 'rust'
	| 'curl'
	| 'java'
	| 'csharp';

/** Shape of structured schema output in analysis Tab 2. */
export type SchemaType = 'typescript-interface' | 'json-schema' | 'pydantic';

export interface AnalysisPresets {
	/** Per-request AI call timeout in milliseconds (e.g. 60_000). */
	analysisTimeoutMs: number;
	/** Parallel OpenAI calls in DevTools panel queue (1–32). */
	maxConcurrentAnalysis: number;
	schemaType: SchemaType;
	targetLanguage: TargetLanguage;
}

/**
 * Cloud / gateway credentials (UI in task 04). Values live in extension
 * storage only; never log in production.
 */
export interface AiConnectionSettings {
	apiKey: string;
	/** OpenAI-compatible base URL, e.g. `https://api.openai.com/v1` */
	baseUrl: string;
	/** Provider model id, e.g. `gpt-4.1-mini` */
	model: string;
}

/**
 * Full persisted options document (versioned for migrations).
 */
export interface ExtensionSettings {
	ai: AiConnectionSettings;
	analysis: AnalysisPresets;
	filter: FilterSettings;
	sampling: SamplingSettings;
	settingsVersion: 1;
}
