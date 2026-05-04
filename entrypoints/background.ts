import { BridgeMessageType } from '@/lib/messages';

export default defineBackground(() => {
	browser.runtime.onMessage.addListener((message: unknown) => {
		const m = message as { type?: string };
		if (m.type === BridgeMessageType.SETTINGS_UPDATED) {
			// Task 07: relay to sidepanel / devtools connected ports.
		}
	});
});
