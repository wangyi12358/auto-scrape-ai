/**
 * Identify which extension UI opened the bridge port (`BRIDGE_PORT_NAME` in `lib/messages`).
 * Used by the background hub to route commands vs capture events.
 */
import type { Browser } from 'wxt/browser';

export type BridgeEndpointKind = 'devtools' | 'sidepanel';

/**
 * Uses `port.sender.url` (present for extension pages). Background/popup/options
 * generally do not open this port — unknown URLs are rejected.
 */
export function inferBridgeEndpoint(
	port: Browser.runtime.Port,
): BridgeEndpointKind | null {
	const url = port.sender?.url ?? '';
	if (url.includes('devtools')) {
		return 'devtools';
	}
	if (url.includes('sidepanel')) {
		return 'sidepanel';
	}
	return null;
}
