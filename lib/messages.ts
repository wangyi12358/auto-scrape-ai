import type { CapturedRequest } from './types/requests';
import type { ExtensionSettings } from './types/settings';

/**
 * `runtime.connect` port name shared by DevTools, background, and sidepanel (task 07).
 */
export const BRIDGE_PORT_NAME = 'auto-scrape-ai:bridge' as const;

/**
 * Discriminant for every frame sent over the bridge. Prefer **one-way
 * notifications**; if an ack is ever needed, add `correlationId` + paired
 * reply types in a later revision (keep RPC surface small).
 */
export const BridgeMessageType = {
	/** Sidepanel / background → DevTools: start `onRequestFinished` subscription */
	START_RECORDING: 'START_RECORDING',
	/** Sidepanel / background → DevTools: stop subscription */
	STOP_RECORDING: 'STOP_RECORDING',
	/** DevTools → UI: whether capture is active (start/stop acknowledgement + passive updates) */
	RECORDING_TOGGLED: 'RECORDING_TOGGLED',
	/** DevTools → UI: one row passed filter, ready for store / refine */
	REQUEST_CAPTURED: 'REQUEST_CAPTURED',
	/** Options saved or storage changed → all contexts refresh cached settings */
	SETTINGS_UPDATED: 'SETTINGS_UPDATED',
	/** AI stream token delta for one capture (task 10–11) */
	ANALYSIS_STREAM_CHUNK: 'ANALYSIS_STREAM_CHUNK',
	/** Drop in-memory list for current session (storage policy in task 13) */
	CLEAR_CAPTURES: 'CLEAR_CAPTURES',
} as const;

export type BridgeMessageTypeName =
	(typeof BridgeMessageType)[keyof typeof BridgeMessageType];

export interface StartRecordingPayload {
	/** Optional DevTools inspected tab id when known */
	tabId?: number;
}

export interface RecordingToggledPayload {
	active: boolean;
	/** Human-readable reason for UI (e.g. DevTools disconnected) */
	reason?: string;
}

export interface RequestCapturedPayload {
	request: CapturedRequest;
}

export interface SettingsUpdatedPayload {
	settings: ExtensionSettings;
}

export interface AnalysisStreamChunkPayload {
	captureId: string;
	/** Incremental text chunk (append in UI) */
	delta: string;
	done: boolean;
}

/**
 * Union of all bridge notifications / commands. Direction is by convention:
 * - `START_RECORDING` / `STOP_RECORDING` / `CLEAR_CAPTURES`: usually sidepanel → background → devtools
 * - `REQUEST_CAPTURED` / `RECORDING_TOGGLED`: devtools → background → sidepanel
 * - `SETTINGS_UPDATED`: options or background broadcast
 * - `ANALYSIS_STREAM_CHUNK`: AI worker → sidepanel
 */
export type BridgeMessage =
	| {
			type: typeof BridgeMessageType.START_RECORDING;
			payload: StartRecordingPayload;
	  }
	| {
			type: typeof BridgeMessageType.STOP_RECORDING;
			payload: Record<string, never>;
	  }
	| {
			type: typeof BridgeMessageType.RECORDING_TOGGLED;
			payload: RecordingToggledPayload;
	  }
	| {
			type: typeof BridgeMessageType.REQUEST_CAPTURED;
			payload: RequestCapturedPayload;
	  }
	| {
			type: typeof BridgeMessageType.SETTINGS_UPDATED;
			payload: SettingsUpdatedPayload;
	  }
	| {
			type: typeof BridgeMessageType.ANALYSIS_STREAM_CHUNK;
			payload: AnalysisStreamChunkPayload;
	  }
	| {
			type: typeof BridgeMessageType.CLEAR_CAPTURES;
			payload: Record<string, never>;
	  };

export function createSettingsUpdatedMessage(
	settings: ExtensionSettings,
): Extract<BridgeMessage, { type: typeof BridgeMessageType.SETTINGS_UPDATED }> {
	return {
		type: BridgeMessageType.SETTINGS_UPDATED,
		payload: { settings },
	};
}

export function isBridgeMessage(value: unknown): value is BridgeMessage {
	if (!value || typeof value !== 'object') {
		return false;
	}
	const v = value as { type?: string };
	if (typeof v.type !== 'string') {
		return false;
	}
	return (Object.values(BridgeMessageType) as string[]).includes(v.type);
}
