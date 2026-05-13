import { Typography } from 'antd';
import { AnalysisMarkdown } from '@/components/analysis-markdown';
import type { EndpointAnalysis } from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';

interface AnalysisSectionProps {
	analysis: EndpointAnalysis | undefined;
	capture: CapturedRequest;
}

export function AnalysisSection({ capture, analysis }: AnalysisSectionProps) {
	return (
		<>
			<div>
				<Typography.Text
					copyable={{ text: capture.url }}
					ellipsis={{ tooltip: capture.url }}
				>
					{capture.method} {capture.url}
				</Typography.Text>
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
