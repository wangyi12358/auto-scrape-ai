interface StatusBarProps {
	bridgeHint: string;
	capturedCount: number;
	hasApiKey: boolean;
	recording: boolean;
}

export function StatusBar({
	recording,
	capturedCount,
	bridgeHint,
	hasApiKey,
}: StatusBarProps) {
	return (
		<div className='mt-4 space-y-1 font-mono text-xs'>
			<div>
				录制状态：
				<span>{recording ? '录制中' : '未录制'}</span>
			</div>
			<div>
				已通过筛选的请求数：
				<span>{capturedCount}</span>
			</div>
			{bridgeHint ? <div className='text-amber-600'>{bridgeHint}</div> : null}
			{!hasApiKey && (
				<div className='text-amber-600'>
					未配置 API Key，当前仅显示请求列表。请到扩展选项页配置 API Key 与 Base
					URL。
				</div>
			)}
		</div>
	);
}
