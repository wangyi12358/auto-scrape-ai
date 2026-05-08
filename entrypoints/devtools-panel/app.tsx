import { Button, Surface, Text } from '@heroui/react';
import { useEffect, useRef, useState } from 'react';
import type { Browser } from 'wxt/browser';
import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';

const BRIDGE_REASON_HINT: Record<string, string> = {
	'devtools-not-connected':
		'未检测到本扩展的 DevTools 页，请先在目标页打开开发者工具并切到本扩展面板。',
	'devtools-disconnected':
		'DevTools 已关闭或已断开，录制已停止。重新打开开发者工具后可再次开始录制。',
};

function bridgeHintText(reason: string | undefined): string {
	if (!reason) {
		return '';
	}
	return BRIDGE_REASON_HINT[reason] ?? reason;
}

export default function App() {
	const portRef = useRef<Browser.runtime.Port | null>(null);
	const [recording, setRecording] = useState(false);
	const [capturedCount, setCapturedCount] = useState(0);
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
			if (msg.type === BridgeMessageType.REQUEST_CAPTURED) {
				setCapturedCount((n) => n + 1);
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
		<Surface.Root className='min-h-screen p-4' variant='default'>
			<h1 className='font-semibold text-foreground text-lg'>
				Bingo Texas DevTools
			</h1>
			<Text.Root className='mt-2 text-muted text-sm leading-relaxed'>
				通过 background 桥接 DevTools 抓包与面板
				UI。请先打开目标页的开发者工具， 再在此开始录制。
			</Text.Root>

			<div className='mt-4 flex flex-wrap gap-2'>
				<Button
					onPress={() =>
						sendToBridge({
							type: BridgeMessageType.START_RECORDING,
							payload: {},
						})
					}
					variant='primary'
				>
					开始录制
				</Button>
				<Button
					onPress={() =>
						sendToBridge({
							type: BridgeMessageType.STOP_RECORDING,
							payload: {},
						})
					}
					variant='secondary'
				>
					停止录制
				</Button>
				<Button
					onPress={() => {
						setCapturedCount(0);
						sendToBridge({
							type: BridgeMessageType.CLEAR_CAPTURES,
							payload: {},
						});
					}}
					variant='secondary'
				>
					清空会话计数
				</Button>
			</div>

			<div className='mt-4 space-y-1 font-mono text-muted text-xs'>
				<div>
					录制状态：
					<span className='text-foreground'>{recording ? 'on' : 'off'}</span>
				</div>
				<div>
					已通过筛选的请求数：
					<span className='text-foreground'>{capturedCount}</span>
				</div>
				{bridgeHint ? (
					<div className='text-amber-600 dark:text-amber-400'>{bridgeHint}</div>
				) : null}
			</div>
		</Surface.Root>
	);
}
