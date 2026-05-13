import { Button, Space, Spin, Table, Typography } from 'antd';
import type { EndpointAnalysis } from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';

function formatTime(ms: number): string {
	return new Date(ms).toLocaleTimeString('zh-CN', {
		hour12: false,
	});
}

interface CaptureTableRow {
	key: string;
	method: string;
	mimeType: string;
	shortDescription: string;
	status: number;
	time: string;
	url: string;
}

interface CaptureTableProps {
	analysisById: Record<string, EndpointAnalysis>;
	analyzingIds: Record<string, true>;
	capturedRequests: CapturedRequest[];
	onRetryAnalysis: (captureId: string) => void;
	onSelectCapture: (capture: CapturedRequest) => void;
	onSelectedIdsChange: (ids: string[]) => void;
	requestsById: Record<string, CapturedRequest>;
	selectedIds: string[];
}

export function CaptureTable({
	capturedRequests,
	analyzingIds,
	analysisById,
	onSelectCapture,
	onRetryAnalysis,
	requestsById,
	selectedIds,
	onSelectedIdsChange,
}: CaptureTableProps) {
	return (
		<Table<CaptureTableRow>
			columns={[
				{
					title: '概要',
					key: 'reqMeta',
					width: 132,
					render: (_: unknown, row: CaptureTableRow) => {
						const line = `${row.method} · ${row.status} · ${row.mimeType}`;
						return (
							<Typography.Text
								className='font-mono text-xs'
								ellipsis={{ tooltip: line }}
							>
								{line}
							</Typography.Text>
						);
					},
				},
				{
					title: 'URL',
					dataIndex: 'url',
					width: 300,
					key: 'url',
					render: (value: string) => (
						<Typography.Text
							copyable={{ text: value }}
							ellipsis={{ tooltip: value }}
						>
							{value}
						</Typography.Text>
					),
				},
				{
					title: '接口作用',
					dataIndex: 'shortDescription',
					key: 'shortDescription',
					render: (value: string, row: CaptureTableRow) =>
						analyzingIds[row.key] ? (
							<Space size='small'>
								<Spin size='small' />
								<Typography.Text type='secondary'>分析中...</Typography.Text>
							</Space>
						) : (
							<Typography.Text ellipsis={{ tooltip: value }}>
								{value || '待分析'}
							</Typography.Text>
						),
				},
				{
					title: '详情',
					dataIndex: 'action',
					key: 'action',
					width: 180,
					render: (_: unknown, row: CaptureTableRow) => (
						<Space size='small'>
							<Button
								onClick={() => {
									const req = requestsById[row.key];
									if (req) {
										onSelectCapture(req);
									}
								}}
								size='small'
							>
								详情
							</Button>
							<Button
								disabled={!!analyzingIds[row.key]}
								onClick={() => onRetryAnalysis(row.key)}
								size='small'
							>
								重试分析
							</Button>
						</Space>
					),
				},
			]}
			dataSource={capturedRequests.map(
				(req): CaptureTableRow => ({
					key: req.captureId,
					time: formatTime(req.finishedMs),
					method: req.method,
					status: req.status,
					mimeType: req.mimeType ?? '-',
					url: req.url,
					shortDescription: analysisById[req.captureId]?.shortDescription ?? '',
				}),
			)}
			locale={{
				emptyText: '暂无拦截记录。点击「开始录制」后在页面触发请求。',
			}}
			pagination={false}
			rowSelection={{
				selectedRowKeys: selectedIds,
				onChange: (keys) => {
					onSelectedIdsChange(keys.map(String));
				},
				preserveSelectedRowKeys: true,
			}}
			scroll={{ x: 640 }}
			size='small'
		/>
	);
}
