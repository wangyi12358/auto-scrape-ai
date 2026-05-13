import type { EndpointAnalysis } from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';

/** 导出条目：请求元信息 + AI「接口作用」「详细描述」。 */
export interface ExportedCaptureRecord {
	captureId: string;
	detailedDescription: string;
	finishedAtIso: string;
	finishedMs: number;
	method: string;
	mimeType: string;
	shortDescription: string;
	status: number;
	url: string;
}

export function buildExportRecords(
	requests: CapturedRequest[],
	analysisById: Record<string, EndpointAnalysis>,
): ExportedCaptureRecord[] {
	return requests.map((req) => {
		const a = analysisById[req.captureId];
		return {
			captureId: req.captureId,
			method: req.method,
			url: req.url,
			status: req.status,
			mimeType: req.mimeType ?? '',
			finishedMs: req.finishedMs,
			finishedAtIso: new Date(req.finishedMs).toISOString(),
			shortDescription: a?.shortDescription ?? '',
			detailedDescription: a?.detailedDescription ?? '',
		};
	});
}

export function recordsToJson(records: ExportedCaptureRecord[]): string {
	return `${JSON.stringify(records, null, 2)}\n`;
}

export function recordsToMarkdown(
	records: ExportedCaptureRecord[],
	title = 'Auto Scrape AI 导出',
): string {
	const lines: string[] = [`# ${title}`, '', `共 ${records.length} 条`, ''];
	for (let i = 0; i < records.length; i++) {
		const r = records[i];
		lines.push(`## ${i + 1}. ${r.method} ${r.url}`, '');
		lines.push(`- **状态**: ${r.status}`);
		lines.push(`- **类型**: ${r.mimeType || '—'}`);
		lines.push(`- **完成时间**: ${r.finishedAtIso}`);
		lines.push(`- **接口作用**: ${r.shortDescription || '（暂无）'}`);
		lines.push('');
		lines.push('### 详细描述');
		lines.push('');
		lines.push(r.detailedDescription || '（暂无）');
		lines.push('');
		lines.push('---');
		lines.push('');
	}
	return lines.join('\n');
}

export function downloadTextFile(
	filename: string,
	content: string,
	mimeType: string,
): void {
	const blob = new Blob([content], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.rel = 'noopener';
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

export function exportFilename(ext: 'json' | 'md'): string {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
	return `auto-scrape-ai-export-${stamp}.${ext}`;
}
