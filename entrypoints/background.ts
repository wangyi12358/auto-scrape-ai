import { registerBridgeHub } from '@/lib/messaging/bridge-background';

export default defineBackground(() => {
	registerBridgeHub();
});
