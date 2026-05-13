import type {
	CrawlerCodeLanguage,
	TypeDefinitionLanguage,
} from '@/lib/ai/analyze-request';

export const TYPE_DEFINITION_LANGUAGE_OPTIONS: {
	value: TypeDefinitionLanguage;
	label: string;
}[] = [
	{ value: 'typescript', label: 'TypeScript Interface' },
	{ value: 'zod', label: 'Zod Schema' },
	{ value: 'go', label: 'Go Struct' },
	{ value: 'pydantic', label: 'Pydantic Model' },
	{ value: 'rust', label: 'Rust (serde)' },
	{ value: 'kotlin', label: 'Kotlin (kotlinx.serialization)' },
	{ value: 'swift', label: 'Swift (Codable)' },
	{ value: 'java', label: 'Java (Jackson)' },
	{ value: 'csharp', label: 'C# (System.Text.Json)' },
	{ value: 'json-schema', label: 'JSON Schema' },
	{ value: 'protobuf', label: 'Protocol Buffers' },
];

export const CRAWLER_LANGUAGE_OPTIONS: {
	value: CrawlerCodeLanguage;
	label: string;
}[] = [
	{ value: 'ts-fetch', label: 'TypeScript (fetch)' },
	{ value: 'js-fetch', label: 'JavaScript (fetch)' },
	{ value: 'node-axios', label: 'Node.js (axios)' },
	{ value: 'python-requests', label: 'Python (requests)' },
	{ value: 'python-httpx', label: 'Python (httpx)' },
	{ value: 'go-http', label: 'Go (net/http)' },
	{ value: 'curl', label: 'cURL' },
];
