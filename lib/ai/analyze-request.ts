import OpenAI from 'openai';
import { refineRequest } from '@/lib/refine';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

const MAX_REQUEST_SUMMARY_CHARS = 1200;
const MAX_RESPONSE_SUMMARY_CHARS = 2800;
const LAST_RESPONSE_SUMMARY_BY_PATH = new Map<string, string>();

export type TypeDefinitionLanguage =
	| 'typescript'
	| 'go'
	| 'pydantic'
	| 'rust'
	| 'kotlin'
	| 'swift'
	| 'java'
	| 'csharp'
	| 'json-schema'
	| 'zod'
	| 'protobuf';

export interface TypeDefinitionResult {
	code: string;
	language: TypeDefinitionLanguage;
}

/** 用于生成「复现该 HTTP 请求」的示例脚本（仅用于你有权访问的接口）。 */
export type CrawlerCodeLanguage =
	| 'ts-fetch'
	| 'js-fetch'
	| 'python-requests'
	| 'python-httpx'
	| 'go-http'
	| 'curl'
	| 'node-axios';

export interface CrawlerCodeResult {
	code: string;
	language: CrawlerCodeLanguage;
}

function normalizePathUrl(raw: string): string {
	try {
		const u = new URL(raw);
		return `${u.origin}${u.pathname}`;
	} catch {
		return raw;
	}
}

function compactSummary(
	text: string | undefined,
	maxChars: number,
): string | undefined {
	if (!text) {
		return text;
	}
	if (text.length <= maxChars) {
		return text;
	}
	return `${text.slice(0, maxChars)}\n...[truncated]`;
}

export interface EndpointAnalysis {
	detailedDescription: string;
	shortDescription: string;
}

interface RawEndpointAnalysis {
	detailedDescription?: unknown;
	shortDescription?: unknown;
}

function stripCodeFence(raw: string): string {
	const t = raw.trim();
	if (!t.startsWith('```')) {
		return t;
	}
	return t.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '');
}

function coerceAnalysis(raw: string): EndpointAnalysis {
	try {
		const parsed = JSON.parse(stripCodeFence(raw)) as RawEndpointAnalysis;
		const shortDescription =
			typeof parsed.shortDescription === 'string'
				? parsed.shortDescription
				: '无法概括该接口。';
		const detailedDescription =
			typeof parsed.detailedDescription === 'string'
				? parsed.detailedDescription
				: shortDescription;
		return { shortDescription, detailedDescription };
	} catch {
		return {
			shortDescription: 'AI 返回格式异常，已降级为原始文本摘要。',
			detailedDescription: raw,
		};
	}
}

export async function analyzeCapturedRequest(
	request: CapturedRequest,
	settings: ExtensionSettings,
): Promise<EndpointAnalysis> {
	const refined = refineRequest(request, settings);
	const pathKey = normalizePathUrl(refined.url);
	const compactRequestSummary = compactSummary(
		refined.requestBodySummary,
		MAX_REQUEST_SUMMARY_CHARS,
	);
	const compactResponseSummary = compactSummary(
		refined.responseBodySummary,
		MAX_RESPONSE_SUMMARY_CHARS,
	);
	let responseBodySummaryForPrompt = compactResponseSummary ?? '';
	const prevSummary = LAST_RESPONSE_SUMMARY_BY_PATH.get(pathKey);
	if (
		prevSummary &&
		compactResponseSummary &&
		prevSummary === compactResponseSummary
	) {
		responseBodySummaryForPrompt =
			'[same-as-previous-summary-for-this-endpoint-path]';
	} else if (compactResponseSummary) {
		LAST_RESPONSE_SUMMARY_BY_PATH.set(pathKey, compactResponseSummary);
	}

	const promptPayload = {
		captureId: refined.captureId,
		url: refined.url,
		method: refined.method,
		status: refined.status,
		mimeType: refined.mimeType,
		requestBodySummary: compactRequestSummary,
		responseBodySummary: responseBodySummaryForPrompt,
		wasSanitized: refined.wasSanitized,
	};

	const client = new OpenAI({
		apiKey: settings.ai.apiKey,
		baseURL: settings.ai.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const prompt = [
		'你是一个 API 逆向分析助手。',
		'请根据 URL、HTTP 方法、请求摘要和响应摘要，判断该接口的用途。',
		'必须使用简体中文。',
		'只返回严格 JSON，不要输出任何额外文本；JSON 必须包含以下字段：',
		'- shortDescription: 用于列表展示的一句话纯文本简述（不要使用 Markdown）',
		'- detailedDescription: 更详细的接口行为说明与业务含义推断，**必须使用 Markdown** 编写（可使用二级/三级标题、有序/无序列表、粗体、行内代码与围栏代码块等；内容中的换行在 JSON 字符串里用 \\n 表示）',
		`输入 JSON：${JSON.stringify(promptPayload)}`,
	].join('\n');

	try {
		const completion = await client.chat.completions.create({
			model: settings.ai.model,
			temperature: 0.2,
			messages: [{ role: 'user', content: prompt }],
		});
		const content = completion.choices[0]?.message?.content ?? '';
		return coerceAnalysis(content);
	} catch (error) {
		console.error('[AI Analysis Error]', {
			error,
			baseURL: settings.ai.baseUrl,
			model: settings.ai.model,
			apiKeyLength: settings.ai.apiKey?.length ?? 0,
		});
		throw error;
	}
}

function coerceTypeDefinition(raw: string): string {
	const t = raw.trim();
	const fencePattern = /^```[a-zA-Z]*\n?([\s\S]*?)\n?```$/;
	const match = t.match(fencePattern);
	if (match) {
		return match[1].trim();
	}
	return t;
}

export async function generateTypeDefinition(
	request: CapturedRequest,
	settings: ExtensionSettings,
	language: TypeDefinitionLanguage,
): Promise<TypeDefinitionResult> {
	const refined = refineRequest(request, settings);
	const compactRequestSummary = compactSummary(
		refined.requestBodySummary,
		MAX_REQUEST_SUMMARY_CHARS,
	);
	const compactResponseSummary = compactSummary(
		refined.responseBodySummary,
		MAX_RESPONSE_SUMMARY_CHARS,
	);

	const languageInstructions: Record<TypeDefinitionLanguage, string> = {
		typescript:
			'生成 TypeScript Interface 定义。使用 export interface，字段类型使用 number/string/boolean/array/object 等。添加必要的注释。',
		go: '生成 Go Struct 定义。使用 json tag，添加必要的注释。包名使用 types。',
		pydantic:
			'生成 Pydantic BaseModel 定义。使用 Python 类型注解，添加 Field 描述和必要的注释。',
		rust: '生成 Rust struct，使用 serde 的 Serialize/Deserialize 与 #[serde(rename_all = "camelCase")] 等必要属性，添加文档注释（///）。',
		kotlin:
			'生成 Kotlin data class，使用 kotlinx.serialization 的 @Serializable 与 @SerialName，添加 KDoc。',
		swift:
			'生成 Swift struct，遵循 Codable，使用 CodingKeys 映射 JSON 字段名，添加必要注释。',
		java: '生成 Java record 或 POJO，使用 Jackson 注解（如 @JsonProperty），添加 Javadoc。',
		csharp:
			'生成 C# record 或 class，使用 System.Text.Json 的 JsonPropertyName 特性，添加 XML 文档注释。',
		'json-schema':
			'生成符合 JSON Schema Draft 2020-12（或兼容 Draft-07）的单个 schema 对象：包含 type、properties、required、items、description 等；根对象可作为 responses/body 的结构。',
		zod: '生成 Zod 3 schema（import { z } from "zod"），使用 z.object、z.array、z.union、z.literal 等组合出请求体与响应体的类型；可导出推断类型 type X = z.infer<typeof schema>。',
		protobuf:
			'生成 Protocol Buffers v3 的 message 定义（syntax = "proto3";），字段使用合适的标量类型与 repeated/map，添加注释。',
	};

	const promptPayload = {
		url: refined.url,
		method: refined.method,
		requestBodySummary: compactRequestSummary,
		responseBodySummary: compactResponseSummary,
	};

	const client = new OpenAI({
		apiKey: settings.ai.apiKey,
		baseURL: settings.ai.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const prompt = [
		'你是一个类型定义生成助手。',
		'根据以下 API 请求和响应信息，生成对应语言的数据类型定义。',
		languageInstructions[language],
		'只返回代码，不要输出任何额外文本或说明。不要使用 Markdown 代码围栏。',
		`输入信息：${JSON.stringify(promptPayload)}`,
	].join('\n');

	try {
		const completion = await client.chat.completions.create({
			model: settings.ai.model,
			temperature: 0.2,
			messages: [{ role: 'user', content: prompt }],
		});
		const content = completion.choices[0]?.message?.content ?? '';
		return {
			code: coerceTypeDefinition(content),
			language,
		};
	} catch (error) {
		console.error('[TypeDefinition Error]', {
			error,
			baseURL: settings.ai.baseUrl,
			model: settings.ai.model,
			language,
		});
		throw error;
	}
}

const CRAWLER_INSTRUCTIONS: Record<CrawlerCodeLanguage, string> = {
	'ts-fetch':
		'使用 TypeScript + 原生 fetch（假定 Node 18+ 或带 DOM fetch 的环境）。输出完整可运行示例：包含 URL、method、headers 与可选 body；用 async/await；解析 JSON；敏感信息用环境变量或占位符。',
	'js-fetch':
		'使用 JavaScript + 原生 fetch。输出完整可运行示例（可在浏览器控制台或 Node 18+ 运行）。',
	'python-requests':
		'使用 Python `requests` 库。输出完整脚本：session 或单次请求、headers、json/data 参数、response.raise_for_status()、解析 JSON。',
	'python-httpx':
		'使用 Python `httpx`（同步或 async 任选其一，注明依赖）。完整示例含 headers 与 body。',
	'go-http':
		'使用 Go 标准库 `net/http`。输出 package main 或可复用的函数：构造 Request、设置 Header、读取 Body、json.Unmarshal 示例。',
	curl: '输出一段可在终端执行的 curl 命令（多行用 \\ 续行）。不要内置真实密钥；用占位符说明需替换的 Cookie/Token。',
	'node-axios':
		'使用 Node.js + axios（TypeScript 或 JS 均可）。完整示例含 baseURL/headers/data、错误处理与 JSON 解析。',
};

export async function generateCrawlerCode(
	request: CapturedRequest,
	settings: ExtensionSettings,
	language: CrawlerCodeLanguage,
): Promise<CrawlerCodeResult> {
	const refined = refineRequest(request, settings);
	const compactRequestSummary = compactSummary(
		refined.requestBodySummary,
		MAX_REQUEST_SUMMARY_CHARS,
	);
	const compactResponseSummary = compactSummary(
		refined.responseBodySummary,
		MAX_RESPONSE_SUMMARY_CHARS,
	);

	const promptPayload = {
		url: refined.url,
		method: refined.method,
		status: refined.status,
		requestHeaders: refined.requestHeadersRedacted,
		requestBodySummary: compactRequestSummary,
		responseBodySummaryPreview: compactResponseSummary,
		wasSanitized: refined.wasSanitized,
	};

	const client = new OpenAI({
		apiKey: settings.ai.apiKey,
		baseURL: settings.ai.baseUrl,
		dangerouslyAllowBrowser: true,
	});

	const prompt = [
		'你是一个 HTTP 客户端代码生成助手。',
		'用户需要「复现当前捕获的接口调用」的示例代码，用于调试自动化或合法抓取自己有权限的数据。',
		'务必遵守：不要在代码中写入真实 Cookie、Token、API Key；用占位符或从环境变量读取；注明请求目标仅限用户有权访问的资源。',
		CRAWLER_INSTRUCTIONS[language],
		'只返回代码或 curl 文本，不要 Markdown 围栏或额外解释。',
		`输入 JSON：${JSON.stringify(promptPayload)}`,
	].join('\n');

	try {
		const completion = await client.chat.completions.create({
			model: settings.ai.model,
			temperature: 0.2,
			messages: [{ role: 'user', content: prompt }],
		});
		const content = completion.choices[0]?.message?.content ?? '';
		return {
			code: coerceTypeDefinition(content),
			language,
		};
	} catch (error) {
		console.error('[CrawlerCode Error]', {
			error,
			baseURL: settings.ai.baseUrl,
			model: settings.ai.model,
			language,
		});
		throw error;
	}
}
