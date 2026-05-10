import { Typography } from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';
import { appendUniqueRequestByPath } from '@/lib/capture-list';
import {
	buildExportRecords,
	downloadTextFile,
	exportFilename,
	recordsToJson,
	recordsToMarkdown,
} from '@/lib/export-captures';
import { BridgeMessageType } from '@/lib/messages';
import {
	EXTENSION_SETTINGS_STORAGE_KEY,
	loadExtensionSettings,
} from '@/lib/settings-storage';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';
import { CaptureDetailDrawer } from './components/capture-detail';
import { CaptureTable } from './components/capture-table';
import { ControlBar } from './components/control-bar';
import { StatusBar } from './components/status-bar';
import { useAnalysisQueue } from './hooks/use-analysis-queue';
import { useBridgeConnection } from './hooks/use-bridge-connection';

export default function App() {
	const [settings, setSettings] = useState<ExtensionSettings | null>(null);
	const [capturedCount, setCapturedCount] = useState(0);
	const [capturedRequests, setCapturedRequests] = useState<CapturedRequest[]>(
		[],
	);
	const [selectedCapture, setSelectedCapture] =
		useState<CapturedRequest | null>(null);
	const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);

	const capturedRequestsRef = useRef<CapturedRequest[]>([]);
	const requestsByIdRef = useRef<Record<string, CapturedRequest>>({});

	useEffect(() => {
		capturedRequestsRef.current = capturedRequests;
		const byId: Record<string, CapturedRequest> = {};
		for (const req of capturedRequests) {
			byId[req.captureId] = req;
		}
		requestsByIdRef.current = byId;
	}, [capturedRequests]);

	const { analysisById, analyzingIds, enqueueAnalysis } =
		useAnalysisQueue(settings);

	const handleRequestCaptured = useCallback(
		(request: CapturedRequest) => {
			const next = appendUniqueRequestByPath(
				capturedRequestsRef.current,
				request,
			);
			if (!next.added) {
				return;
			}
			capturedRequestsRef.current = next.requests;
			setCapturedRequests(next.requests);
			setCapturedCount((n) => n + 1);
			enqueueAnalysis(request);
		},
		[enqueueAnalysis],
	);

	const { recording, bridgeHint, sendToBridge } = useBridgeConnection({
		onRequestCaptured: handleRequestCaptured,
	});

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
		return () => {
			browser.storage.onChanged.removeListener(onStorage);
		};
	}, []);

	const handleClearCaptures = () => {
		setCapturedCount(0);
		capturedRequestsRef.current = [];
		setCapturedRequests([]);
		setSelectedExportIds([]);
		sendToBridge({
			type: BridgeMessageType.CLEAR_CAPTURES,
			payload: {},
		});
	};

	const exportSelected = useCallback(
		(format: 'json' | 'markdown') => {
			const selectedSet = new Set(selectedExportIds);
			const ordered = capturedRequests.filter((r) =>
				selectedSet.has(r.captureId),
			);
			const records = buildExportRecords(ordered, analysisById);
			if (format === 'json') {
				downloadTextFile(
					exportFilename('json'),
					recordsToJson(records),
					'application/json;charset=utf-8',
				);
				return;
			}
			downloadTextFile(
				exportFilename('md'),
				recordsToMarkdown(records),
				'text/markdown;charset=utf-8',
			);
		},
		[analysisById, capturedRequests, selectedExportIds],
	);

	const handleRetryAnalysis = (captureId: string) => {
		const req = requestsByIdRef.current[captureId];
		if (req) {
			enqueueAnalysis(req, true);
		}
	};

	return (
		<div className='min-h-screen p-4'>
			<Typography.Title level={4}>Auto Scrape AI</Typography.Title>
			<Typography.Text
				className='block text-sm leading-relaxed'
				type='secondary'
			>
				通过 background 桥接 DevTools 抓包与面板
				UI。请先打开目标页的开发者工具， 再在此开始录制。
			</Typography.Text>

			<ControlBar
				exportSelectionCount={selectedExportIds.length}
				hasApiKey={!!(settings?.ai.apiKey && settings?.ai.baseUrl)}
				hasCaptures={capturedRequests.length > 0}
				onAnalyzeAll={() => {
					for (const req of capturedRequests) {
						enqueueAnalysis(req, false);
					}
				}}
				onClearCaptures={handleClearCaptures}
				onExportJson={() => {
					exportSelected('json');
				}}
				onExportMarkdown={() => {
					exportSelected('markdown');
				}}
				onSendToBridge={sendToBridge}
			/>

			<StatusBar
				bridgeHint={bridgeHint}
				capturedCount={capturedCount}
				hasApiKey={!!(settings?.ai.apiKey && settings?.ai.baseUrl)}
				recording={recording}
			/>

			<CaptureTable
				analysisById={analysisById}
				analyzingIds={analyzingIds}
				capturedRequests={capturedRequests}
				onRetryAnalysis={handleRetryAnalysis}
				onSelectCapture={setSelectedCapture}
				onSelectedIdsChange={setSelectedExportIds}
				requestsById={requestsByIdRef.current}
				selectedIds={selectedExportIds}
			/>

			<CaptureDetailDrawer
				analysis={
					selectedCapture ? analysisById[selectedCapture.captureId] : undefined
				}
				capture={selectedCapture}
				onClose={() => setSelectedCapture(null)}
				open={!!selectedCapture}
				settings={settings}
			/>
		</div>
	);
}
