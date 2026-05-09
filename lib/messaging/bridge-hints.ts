/** UI copy for {@link BridgeMessageType.RECORDING_TOGGLED} `reason` codes. */
export const BRIDGE_REASON_HINT: Record<string, string> = {
	'devtools-not-connected':
		'未检测到本扩展的 DevTools 页，请先在目标页打开开发者工具并切到本扩展面板。',
	'devtools-disconnected':
		'DevTools 已关闭或已断开，录制已停止。重新打开开发者工具后可再次开始录制。',
};

export function bridgeHintText(reason: string | undefined): string {
	if (!reason) {
		return '';
	}
	return BRIDGE_REASON_HINT[reason] ?? reason;
}
