import { Button } from 'antd';
import type { BridgeMessage } from '@/lib/messages';
import { BridgeMessageType } from '@/lib/messages';

interface ControlBarProps {
	hasApiKey: boolean;
	hasCaptures: boolean;
	onAnalyzeAll: () => void;
	onClearCaptures: () => void;
	onSendToBridge: (message: BridgeMessage) => void;
}

export function ControlBar({
	hasApiKey,
	hasCaptures,
	onSendToBridge,
	onClearCaptures,
	onAnalyzeAll,
}: ControlBarProps) {
	return (
		<div className='mt-4 flex flex-wrap gap-2'>
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
		</div>
	);
}
