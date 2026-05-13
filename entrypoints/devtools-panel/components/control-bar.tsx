import { Button, Space, Typography } from 'antd';
import type { BridgeMessage } from '@/lib/messages';
import { BridgeMessageType } from '@/lib/messages';

interface ControlBarProps {
	exportSelectionCount: number;
	hasApiKey: boolean;
	hasCaptures: boolean;
	onAnalyzeAll: () => void;
	onClearCaptures: () => void;
	onExportJson: () => void;
	onExportMarkdown: () => void;
	onSendToBridge: (message: BridgeMessage) => void;
}

export function ControlBar({
	hasApiKey,
	hasCaptures,
	exportSelectionCount,
	onSendToBridge,
	onClearCaptures,
	onAnalyzeAll,
	onExportJson,
	onExportMarkdown,
}: ControlBarProps) {
	const canExport = exportSelectionCount > 0;

	return (
		<div className='mt-4 flex flex-wrap items-center gap-2'>
			<Button
				onClick={() =>
					onSendToBridge({
						type: BridgeMessageType.START_RECORDING,
						payload: {},
					})
				}
				type='primary'
			>
				开始录制
			</Button>
			<Button
				onClick={() =>
					onSendToBridge({
						type: BridgeMessageType.STOP_RECORDING,
						payload: {},
					})
				}
			>
				停止录制
			</Button>
			<Button onClick={onClearCaptures}>清空会话计数</Button>
			<Button disabled={!(hasApiKey && hasCaptures)} onClick={onAnalyzeAll}>
				一键分析待分析
			</Button>
			{canExport ? (
				<Typography.Text className='text-xs' type='secondary'>
					已选 {exportSelectionCount} 条
				</Typography.Text>
			) : null}
			<Space size='small' wrap>
				<Button disabled={!canExport} onClick={onExportJson}>
					导出 JSON
				</Button>
				<Button disabled={!canExport} onClick={onExportMarkdown}>
					导出 Markdown
				</Button>
			</Space>
		</div>
	);
}
