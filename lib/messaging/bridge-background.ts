/**
 * Background hub for `runtime.connect` ({@link BRIDGE_PORT_NAME}).
 *
 * **Why background:** DevTools and Sidepanel are separate extension pages with no
 * direct channel. Routing here also covers “DevTools closed” (port disconnect) and
 * future offscreen / service consolidation.
 *
 * **Reconnect:** Clients call `browser.runtime.connect` on load. If DevTools closes,
 * its port drops → we emit {@link BridgeMessageType.RECORDING_TOGGLED} with
 * `reason: 'devtools-disconnected'`. Sidepanel should treat capture as inactive until
 * DevTools reconnects and the user starts recording again.
 *
 * **Large payloads:** {@link BridgeMessageType.REQUEST_CAPTURED} may carry full
 * `CapturedRequest` (including body text). For very large bodies, consider trimming
 * at capture time or moving to IndexedDB (later tasks).
 */

import type { Browser } from 'wxt/browser';
import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';
import { inferBridgeEndpoint } from '@/lib/messaging/bridge-role';

function broadcast(
	ports: Set<Browser.runtime.Port>,
	message: BridgeMessage,
): void {
	for (const p of ports) {
		try {
			p.postMessage(message);
		} catch {
			/* receiver gone */
		}
	}
}

const devtoolsPorts = new Set<Browser.runtime.Port>();
const sidepanelPorts = new Set<Browser.runtime.Port>();

function broadcastToSidepanels(message: BridgeMessage): void {
	broadcast(sidepanelPorts, message);
}

function broadcastToDevtools(message: BridgeMessage): void {
	broadcast(devtoolsPorts, message);
}

function broadcastToAllUi(message: BridgeMessage): void {
	broadcastToSidepanels(message);
	broadcastToDevtools(message);
}

function handleSidepanelCommand(message: BridgeMessage): void {
	switch (message.type) {
		case BridgeMessageType.START_RECORDING: {
			if (devtoolsPorts.size === 0) {
				broadcastToSidepanels({
					type: BridgeMessageType.RECORDING_TOGGLED,
					payload: {
						active: false,
						reason: 'devtools-not-connected',
					},
				});
				return;
			}
			broadcastToDevtools(message);
			break;
		}
		case BridgeMessageType.STOP_RECORDING: {
			if (devtoolsPorts.size === 0) {
				broadcastToSidepanels({
					type: BridgeMessageType.RECORDING_TOGGLED,
					payload: {
						active: false,
						reason: 'devtools-not-connected',
					},
				});
				return;
			}
			broadcastToDevtools(message);
			break;
		}
		case BridgeMessageType.CLEAR_CAPTURES: {
			broadcastToDevtools(message);
			break;
		}
		default:
			break;
	}
}

function handleDevtoolsMessage(message: BridgeMessage): void {
	switch (message.type) {
		case BridgeMessageType.REQUEST_CAPTURED:
		case BridgeMessageType.RECORDING_TOGGLED:
			broadcastToSidepanels(message);
			break;
		default:
			break;
	}
}

export function registerBridgeHub(): void {
	browser.runtime.onConnect.addListener((port) => {
		if (port.name !== BRIDGE_PORT_NAME) {
			return;
		}
		const endpoint = inferBridgeEndpoint(port);
		if (!endpoint) {
			port.disconnect();
			return;
		}
		const bucket = endpoint === 'devtools' ? devtoolsPorts : sidepanelPorts;
		bucket.add(port);

		port.onDisconnect.addListener(() => {
			bucket.delete(port);
			if (endpoint === 'devtools' && devtoolsPorts.size === 0) {
				broadcastToSidepanels({
					type: BridgeMessageType.RECORDING_TOGGLED,
					payload: {
						active: false,
						reason: 'devtools-disconnected',
					},
				});
			}
		});

		port.onMessage.addListener((raw: unknown) => {
			if (!isBridgeMessage(raw)) {
				return;
			}
			const msg = raw as BridgeMessage;
			if (endpoint === 'sidepanel') {
				handleSidepanelCommand(msg);
			} else {
				handleDevtoolsMessage(msg);
			}
		});
	});

	browser.runtime.onMessage.addListener((message: unknown) => {
		if (!isBridgeMessage(message)) {
			return;
		}
		const m = message as BridgeMessage;
		if (m.type === BridgeMessageType.SETTINGS_UPDATED) {
			broadcastToAllUi(m);
		}
	});
}
