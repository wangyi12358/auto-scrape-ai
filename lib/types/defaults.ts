import type { ExtensionSettings } from './settings';

/**
 * Sensible defaults until Options (task 04) writes user overrides.
 */
export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
	settingsVersion: 1,
	filter: {
		includeDomainRules: [{ kind: 'current-tab-host' }],
		excludeExtensions: [
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
		targetLanguage: 'python',
		schemaType: 'typescript-interface',
	},
	ai: {
		apiKey: '',
		model: 'gpt-4.1-mini',
	},
};
