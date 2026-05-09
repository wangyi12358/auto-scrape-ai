import { Button, Card, Space, Typography } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { Browser } from 'wxt/browser';
import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';
import { bridgeHintText } from '@/lib/messaging/bridge-hints';

export default function App() {
	const portRef = useRef<Browser.runtime.Port | null>(null);
	const [recording, setRecording] = useState(false);
	const [bridgeHint, setBridgeHint] = useState<string>('');

	useEffect(() => {
		const port = browser.runtime.connect({ name: BRIDGE_PORT_NAME });
		portRef.current = port;

		const onMessage = (raw: unknown): void => {
			if (!isBridgeMessage(raw)) {
				return;
			}
			const msg = raw as BridgeMessage;
			if (msg.type === BridgeMessageType.RECORDING_TOGGLED) {
				setRecording(msg.payload.active);
				setBridgeHint(bridgeHintText(msg.payload.reason));
			}
		};

		port.onMessage.addListener(onMessage);
		return () => {
			port.onMessage.removeListener(onMessage);
			port.disconnect();
			portRef.current = null;
		};
	}, []);

	function sendToBridge(message: BridgeMessage): void {
		const p = portRef.current;
		if (!p) {
			return;
		}
		try {
			p.postMessage(message);
		} catch {
			/* disconnected */
		}
	}

	return (
		<Card className='w-80' styles={{ body: { padding: 16 } }}>
			<Typography.Text strong>自动抓包 AI</Typography.Text>
			<Typography.Paragraph className='!mb-2 mt-2 text-xs' type='secondary'>
				录制状态与 DevTools 面板共用同一桥接，在此开始/停止与面板一致。
			</Typography.Paragraph>
			<Space className='w-full' direction='vertical' size='small'>
				<Space wrap>
					<Button
						onClick={() =>
							sendToBridge({
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
							sendToBridge({
								type: BridgeMessageType.STOP_RECORDING,
								payload: {},
							})
						}
					>
						停止录制
					</Button>
				</Space>
				<div className='font-mono text-xs'>
					录制状态：<span>{recording ? '录制中' : '未录制'}</span>
				</div>
				{bridgeHint ? (
					<div className='text-amber-600 text-xs'>{bridgeHint}</div>
				) : null}
				<Button
					block
					onClick={() => {
						browser.runtime.openOptionsPage();
					}}
				>
					打开设置
				</Button>
			</Space>
		</Card>
	);
}
