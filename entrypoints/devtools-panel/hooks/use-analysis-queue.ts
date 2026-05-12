import { useCallback, useEffect, useRef, useState } from 'react';
import {
	analyzeCapturedRequest,
	type EndpointAnalysis,
} from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

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

export function useAnalysisQueue(settings: ExtensionSettings | null) {
	const [analysisById, setAnalysisById] = useState<
		Record<string, EndpointAnalysis>
	>({});
	const [analyzingIds, setAnalyzingIds] = useState<Record<string, true>>({});

	const queueRef = useRef<CapturedRequest[]>([]);
	const runningCountRef = useRef(0);
	const settingsRef = useRef<ExtensionSettings | null>(null);
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

	const pumpQueue = useCallback(function pumpQueue(): void {
		const snap = settingsRef.current;
		const maxConcurrent = Math.max(
			1,
			Math.min(32, snap?.analysis.maxConcurrentAnalysis ?? 4),
		);
		const timeoutMs = Math.max(
			10_000,
			Math.min(600_000, snap?.analysis.analysisTimeoutMs ?? 60_000),
		);

		while (
			runningCountRef.current < maxConcurrent &&
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
			withTimeout(analyzeCapturedRequest(req, currentSettings), timeoutMs)
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
		pumpQueue();
	}, [pumpQueue]);

	return {
		analysisById,
		analyzingIds,
		enqueueAnalysis,
	};
}
