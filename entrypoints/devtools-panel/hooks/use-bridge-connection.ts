import { useCallback, useEffect, useRef, useState } from 'react';
import type { Browser } from 'wxt/browser';
import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';
import { bridgeHintText } from '@/lib/messaging/bridge-hints';
import type { CapturedRequest } from '@/lib/types/requests';

interface UseBridgeConnectionOptions {
	onRequestCaptured: (request: CapturedRequest) => void;
}

export function useBridgeConnection({
	onRequestCaptured,
}: UseBridgeConnectionOptions) {
	const portRef = useRef<Browser.runtime.Port | null>(null);
	const [recording, setRecording] = useState(false);
	const [bridgeHint, setBridgeHint] = useState('');

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
				onRequestCaptured(msg.payload.request);
			}
		};

		port.onMessage.addListener(onMessage);
		return () => {
			port.onMessage.removeListener(onMessage);
			port.disconnect();
			portRef.current = null;
		};
	}, [onRequestCaptured]);

	const sendToBridge = useCallback((message: BridgeMessage): void => {
		const p = portRef.current;
		if (!p) {
			return;
		}
		try {
			p.postMessage(message);
		} catch {
			/* disconnected */
		}
	}, []);

	return {
		recording,
		bridgeHint,
		sendToBridge,
	};
}
