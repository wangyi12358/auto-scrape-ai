import { Tag, Typography } from 'antd';
import { AnalysisMarkdown } from '@/components/analysis-markdown';
import type { EndpointAnalysis } from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';

function formatFinishedAt(ms: number): string {
	return new Date(ms).toLocaleString('zh-CN', {
		hour12: false,
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});
}

function methodTagColor(method: string): string {
	const m = method.toUpperCase();
	if (m === 'GET') {
		return 'blue';
	}
	if (m === 'POST') {
		return 'green';
	}
	if (m === 'PUT' || m === 'PATCH') {
		return 'orange';
	}
	if (m === 'DELETE') {
		return 'red';
	}
	return 'default';
}

function statusTagColor(status: number): string {
	if (status >= 200 && status < 300) {
		return 'success';
	}
	if (status >= 300 && status < 400) {
		return 'processing';
	}
	if (status >= 400 && status < 500) {
		return 'warning';
	}
	if (status >= 500) {
		return 'error';
	}
	return 'default';
}

interface AnalysisSectionProps {
	analysis: EndpointAnalysis | undefined;
	capture: CapturedRequest;
}

export function AnalysisSection({ capture, analysis }: AnalysisSectionProps) {
	const mime = capture.mimeType?.trim() || '—';
	const short = analysis?.shortDescription?.trim();

	return (
		<>
			<div>
				<div className='flex flex-wrap items-center gap-2'>
					<Tag color={methodTagColor(capture.method)}>{capture.method}</Tag>
					<Tag color={statusTagColor(capture.status)}>{capture.status}</Tag>
					<span className='font-mono text-neutral-600 text-xs dark:text-neutral-400'>
						{mime}
					</span>
					<span className='text-neutral-400'>·</span>
					<span className='text-neutral-500 text-xs'>
						完成 {formatFinishedAt(capture.finishedMs)}
					</span>
				</div>

				{short ? (
					<Typography.Paragraph className='!mb-2 mt-2 text-sm' type='secondary'>
						{short}
					</Typography.Paragraph>
				) : (
					<div className='mt-2' />
				)}

				{capture.inspectedTabUrl ? (
					<Typography.Text
						className='mb-2 block text-xs'
						ellipsis={{ tooltip: capture.inspectedTabUrl }}
						type='secondary'
					>
						页面上下文：{capture.inspectedTabUrl}
					</Typography.Text>
				) : null}

				<Typography.Paragraph
					className='!mb-0 break-all font-mono text-xs leading-relaxed'
					copyable={{
						text: capture.url,
						tooltips: ['复制 URL', '已复制'],
					}}
				>
					{capture.url}
				</Typography.Paragraph>
			</div>

			<div>
				<Typography.Title level={5}>详细说明</Typography.Title>
				<AnalysisMarkdown
					markdown={analysis?.detailedDescription ?? '暂无分析结果。'}
				/>
			</div>
		</>
	);
}
