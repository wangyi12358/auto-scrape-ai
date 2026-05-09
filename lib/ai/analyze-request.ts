import OpenAI from 'openai';
import { refineRequest } from '@/lib/refine';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

const MAX_REQUEST_SUMMARY_CHARS = 1200;
const MAX_RESPONSE_SUMMARY_CHARS = 2800;
const LAST_RESPONSE_SUMMARY_BY_PATH = new Map<string, string>();

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
		'必须使用简体中文输出 shortDescription 和 detailedDescription。',
		'只返回严格 JSON，不要输出任何额外文本；JSON 必须包含以下字段：',
		'- shortDescription: 用于列表展示的一句话简述',
		'- detailedDescription: 更详细的接口行为说明与业务含义推断',
		`输入 JSON：${JSON.stringify(promptPayload)}`,
	].join('\n');

	const completion = await client.chat.completions.create({
		model: settings.ai.model,
		temperature: 0.2,
		messages: [{ role: 'user', content: prompt }],
	});

	const content = completion.choices[0]?.message?.content ?? '';
	return coerceAnalysis(content);
}
