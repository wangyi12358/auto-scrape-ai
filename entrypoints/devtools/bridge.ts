import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';
import {
	resetSessionStats,
	setCapturedNotifier,
	setRecordingNotifier,
	startRecording,
	stopRecording,
} from './capture';

/**
 * Long-lived `runtime.connect` pipe for task 07. On disconnect the devtools page is
 * usually unloading; a new connect happens on next open.
 */
export function initDevtoolsBridge(syncUi: () => void): void {
	const port = browser.runtime.connect({ name: BRIDGE_PORT_NAME });

	port.onMessage.addListener((raw: unknown) => {
		if (!isBridgeMessage(raw)) {
			return;
		}
		dispatchBridgeCommand(raw as BridgeMessage, syncUi).catch(() => {
			/* command failed */
		});
	});

	setRecordingNotifier((event) => {
		try {
			port.postMessage({
				type: BridgeMessageType.RECORDING_TOGGLED,
				payload: {
					active: event.active,
					reason: event.reason,
				},
			} satisfies BridgeMessage);
		} catch {
			/* port gone */
		}
		syncUi();
	});

	setCapturedNotifier((request) => {
		try {
			port.postMessage({
				type: BridgeMessageType.REQUEST_CAPTURED,
				payload: { request },
			} satisfies BridgeMessage);
		} catch {
			/* port gone */
		}
	});
}

async function dispatchBridgeCommand(
	msg: BridgeMessage,
	syncUi: () => void,
): Promise<void> {
	switch (msg.type) {
		case BridgeMessageType.START_RECORDING:
			await startRecording();
			break;
		case BridgeMessageType.STOP_RECORDING:
			stopRecording();
			break;
		case BridgeMessageType.CLEAR_CAPTURES:
			resetSessionStats();
			break;
		default:
			break;
	}
	syncUi();
}
