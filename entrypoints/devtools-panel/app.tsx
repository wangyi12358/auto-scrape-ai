import { Button, Card, Drawer, Space, Spin, Table, Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Browser } from 'wxt/browser';
import {
	analyzeCapturedRequest,
	type EndpointAnalysis,
} from '@/lib/ai/analyze-request';
import {
	BRIDGE_PORT_NAME,
	type BridgeMessage,
	BridgeMessageType,
	isBridgeMessage,
} from '@/lib/messages';
import {
	EXTENSION_SETTINGS_STORAGE_KEY,
	loadExtensionSettings,
} from '@/lib/settings-storage';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

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

function formatTime(ms: number): string {
	return new Date(ms).toLocaleTimeString('zh-CN', {
		hour12: false,
	});
}

function normalizePathUrl(raw: string): string {
	try {
		const u = new URL(raw);
		return `${u.origin}${u.pathname}`;
	} catch {
		return raw;
	}
}

const MAX_CONCURRENT_ANALYSIS = 2;
const ANALYSIS_TIMEOUT_MS = 60_000;
const FAILED_ANALYSIS: EndpointAnalysis = {
	shortDescription: '分析失败，请检查 API Key / Base URL / 模型配置。',
	detailedDescription:
		'AI 请求失败。请在扩展选项页确认 Base URL、API Key、模型 ID 是否正确。',
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timer = globalThis.setTimeout(() => {
			reject(new Error('analysis-timeout'));
		}, timeoutMs);
		promise
			.then((value) => {
				globalThis.clearTimeout(timer);
				resolve(value);
			})
			.catch((err) => {
				globalThis.clearTimeout(timer);
				reject(err);
			});
	});
}

export default function App() {
	const portRef = useRef<Browser.runtime.Port | null>(null);
	const [recording, setRecording] = useState(false);
	const [capturedCount, setCapturedCount] = useState(0);
	const [capturedRequests, setCapturedRequests] = useState<CapturedRequest[]>(
		[],
	);
	const [settings, setSettings] = useState<ExtensionSettings | null>(null);
	const [analysisById, setAnalysisById] = useState<
		Record<string, EndpointAnalysis>
	>({});
	const [analyzingIds, setAnalyzingIds] = useState<Record<string, true>>({});
	const [selectedCapture, setSelectedCapture] =
		useState<CapturedRequest | null>(null);
	const [bridgeHint, setBridgeHint] = useState<string>('');
	const queueRef = useRef<CapturedRequest[]>([]);
	const runningCountRef = useRef(0);
	const settingsRef = useRef<ExtensionSettings | null>(null);
	const requestsByIdRef = useRef<Record<string, CapturedRequest>>({});
	const analysisByIdRef = useRef<Record<string, EndpointAnalysis>>({});
	const analyzingIdsRef = useRef<Record<string, true>>({});

	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);
	useEffect(() => {
		analysisByIdRef.current = analysisById;
	}, [analysisById]);
	useEffect(() => {
		analyzingIdsRef.current = analyzingIds;
	}, [analyzingIds]);

	useEffect(() => {
		const byId: Record<string, CapturedRequest> = {};
		for (const req of capturedRequests) {
			byId[req.captureId] = req;
		}
		requestsByIdRef.current = byId;
	}, [capturedRequests]);

	const pumpQueue = useCallback(function pumpQueue(): void {
		while (
			runningCountRef.current < MAX_CONCURRENT_ANALYSIS &&
			queueRef.current.length > 0
		) {
			const req = queueRef.current.shift();
			if (!req) {
				return;
			}
			const currentSettings = settingsRef.current;
			if (!(currentSettings?.ai.apiKey && currentSettings.ai.baseUrl)) {
				return;
			}
			runningCountRef.current += 1;
			setAnalyzingIds((prev) => ({ ...prev, [req.captureId]: true }));
			withTimeout(
				analyzeCapturedRequest(req, currentSettings),
				ANALYSIS_TIMEOUT_MS,
			)
				.then((analysis) => {
					setAnalysisById((prev) => ({ ...prev, [req.captureId]: analysis }));
				})
				.catch(() => {
					setAnalysisById((prev) => ({
						...prev,
						[req.captureId]: FAILED_ANALYSIS,
					}));
				})
				.finally(() => {
					runningCountRef.current = Math.max(0, runningCountRef.current - 1);
					setAnalyzingIds((prev) => {
						const next = { ...prev };
						delete next[req.captureId];
						return next;
					});
					pumpQueue();
				});
		}
	}, []);

	const enqueueAnalysis = useCallback(
		(request: CapturedRequest, force = false): void => {
			const currentSettings = settingsRef.current;
			if (!(currentSettings?.ai.apiKey && currentSettings.ai.baseUrl)) {
				return;
			}
			if (!force) {
				if (
					analysisByIdRef.current[request.captureId] ||
					analyzingIdsRef.current[request.captureId]
				) {
					return;
				}
				if (queueRef.current.some((x) => x.captureId === request.captureId)) {
					return;
				}
			}
			queueRef.current.push(request);
			pumpQueue();
		},
		[pumpQueue],
	);

	useEffect(() => {
		loadExtensionSettings()
			.then((s) => {
				setSettings(s);
			})
			.catch(() => undefined);

		const onStorage = (changes: object, area: string) => {
			if (
				area !== 'local' ||
				!Object.hasOwn(changes, EXTENSION_SETTINGS_STORAGE_KEY)
			) {
				return;
			}
			loadExtensionSettings()
				.then((s) => {
					setSettings(s);
				})
				.catch(() => undefined);
		};
		browser.storage.onChanged.addListener(onStorage);

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
				const request = msg.payload.request;
				let added = false;
				setCapturedRequests((prev) => {
					const pathKey = normalizePathUrl(request.url);
					const duplicated = prev.some(
						(item) => normalizePathUrl(item.url) === pathKey,
					);
					if (duplicated) {
						return prev;
					}
					added = true;
					const next = [request, ...prev];
					return next.slice(0, 300);
				});
				if (added) {
					setCapturedCount((n) => n + 1);
					enqueueAnalysis(request);
				}
			}
		};

		port.onMessage.addListener(onMessage);
		return () => {
			browser.storage.onChanged.removeListener(onStorage);
			port.onMessage.removeListener(onMessage);
			port.disconnect();
			portRef.current = null;
		};
	}, [enqueueAnalysis]);

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
		<div className='min-h-screen p-4'>
			<Typography.Title level={4}>自动抓包 AI</Typography.Title>
			<Typography.Text
				className='block text-sm leading-relaxed'
				type='secondary'
			>
				通过 background 桥接 DevTools 抓包与面板
				UI。请先打开目标页的开发者工具， 再在此开始录制。
			</Typography.Text>

			<div className='mt-4 flex flex-wrap gap-2'>
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
				<Button
					onClick={() => {
						setCapturedCount(0);
						setCapturedRequests([]);
						setAnalysisById({});
						setAnalyzingIds({});
						queueRef.current = [];
						runningCountRef.current = 0;
						sendToBridge({
							type: BridgeMessageType.CLEAR_CAPTURES,
							payload: {},
						});
					}}
				>
					清空会话计数
				</Button>
			</div>

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
				{settings?.ai.apiKey ? null : (
					<div className='text-amber-600'>
						未配置 API Key，当前仅显示请求列表。请到扩展选项页配置 API Key 与
						Base URL。
					</div>
				)}
			</div>

			<Card className='mt-4'>
				<Table
					columns={[
						{ title: '方法', dataIndex: 'method', key: 'method', width: 90 },
						{ title: '状态', dataIndex: 'status', key: 'status', width: 90 },
						{
							title: '类型',
							dataIndex: 'mimeType',
							key: 'mimeType',
							width: 120,
						},
						{
							title: 'URL',
							dataIndex: 'url',
							width: 300,
							key: 'url',
							render: (value: string) => (
								<Typography.Text
									copyable={{ text: value }}
									ellipsis={{ tooltip: value }}
								>
									{value}
								</Typography.Text>
							),
						},
						{
							title: '接口作用',
							dataIndex: 'shortDescription',
							key: 'shortDescription',
							render: (value: string, row: { key: string }) =>
								analyzingIds[row.key] ? (
									<Space size='small'>
										<Spin size='small' />
										<Typography.Text type='secondary'>
											分析中...
										</Typography.Text>
									</Space>
								) : (
									<Typography.Text ellipsis={{ tooltip: value }}>
										{value || '待分析'}
									</Typography.Text>
								),
						},
						{
							title: '详情',
							dataIndex: 'action',
							key: 'action',
							width: 180,
							render: (_: unknown, row: { key: string }) => (
								<Space size='small'>
									<Button
										onClick={() =>
											setSelectedCapture(
												capturedRequests.find((x) => x.captureId === row.key) ??
													null,
											)
										}
										size='small'
									>
										详情
									</Button>
									<Button
										disabled={!!analyzingIds[row.key]}
										onClick={() => {
											const req = requestsByIdRef.current[row.key];
											if (!req) {
												return;
											}
											enqueueAnalysis(req, true);
										}}
										size='small'
									>
										重试分析
									</Button>
								</Space>
							),
						},
					]}
					dataSource={capturedRequests.map((req) => ({
						key: req.captureId,
						time: formatTime(req.finishedMs),
						method: req.method,
						status: req.status,
						mimeType: req.mimeType ?? '-',
						url: req.url,
						shortDescription:
							analysisById[req.captureId]?.shortDescription ?? '',
					}))}
					locale={{
						emptyText: '暂无拦截记录。点击「开始录制」后在页面触发请求。',
					}}
					pagination={false}
					scroll={{ x: 760 }}
					size='small'
				/>
			</Card>

			<Drawer
				onClose={() => setSelectedCapture(null)}
				open={!!selectedCapture}
				title='接口详情'
				width={720}
			>
				{selectedCapture ? (
					<div className='space-y-4'>
						<Typography.Text
							copyable={{ text: selectedCapture.url }}
							ellipsis={{ tooltip: selectedCapture.url }}
						>
							{selectedCapture.method} {selectedCapture.url}
						</Typography.Text>
						<div>
							<Typography.Title level={5}>详细说明</Typography.Title>
							<Typography.Paragraph>
								{analysisById[selectedCapture.captureId]?.detailedDescription ??
									'暂无分析结果。'}
							</Typography.Paragraph>
						</div>
						<Typography.Text type='secondary'>
							类型定义功能已关闭。
						</Typography.Text>
					</div>
				) : null}
			</Drawer>
		</div>
	);
}
