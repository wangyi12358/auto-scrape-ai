import {
	Alert,
	Button,
	Card,
	Checkbox,
	Col,
	Input,
	InputNumber,
	Row,
	Select,
	Space,
	Spin,
	Typography,
} from 'antd';
import { useCallback, useEffect, useState } from 'react';
import {
	EXTENSION_SETTINGS_STORAGE_KEY,
	loadExtensionSettings,
	parseExtensionsFromText,
	parseIncludeRulesFromText,
	saveExtensionSettings,
	serializeExtensionsToText,
	serializeIncludeRulesToText,
} from '@/lib/settings-storage';
import { DEFAULT_EXTENSION_SETTINGS } from '@/lib/types/defaults';
import { HTTP_METHODS, type HttpMethod } from '@/lib/types/http';
import type { ExtensionSettings } from '@/lib/types/settings';

const PRESET_MODELS = [
	'gpt-4.1-mini',
	'gpt-4o-mini',
	'gpt-4.1',
	'gpt-4o',
	'gpt-5-mini',
] as const;

const LANGUAGE_OPTIONS: {
	id: ExtensionSettings['analysis']['targetLanguage'];
	label: string;
}[] = [
	{ id: 'python', label: 'Python' },
	{ id: 'go', label: 'Go' },
	{ id: 'nodejs', label: 'Node.js' },
	{ id: 'rust', label: 'Rust' },
	{ id: 'curl', label: 'cURL' },
	{ id: 'java', label: 'Java' },
	{ id: 'csharp', label: 'C#' },
];

const SCHEMA_OPTIONS: {
	id: ExtensionSettings['analysis']['schemaType'];
	label: string;
}[] = [
	{ id: 'typescript-interface', label: 'TypeScript Interface' },
	{ id: 'json-schema', label: 'JSON Schema' },
	{ id: 'pydantic', label: 'Pydantic' },
];

function cloneSettings(s: ExtensionSettings): ExtensionSettings {
	return structuredClone(s);
}

export default function App() {
	const [settings, setSettings] = useState<ExtensionSettings | null>(null);
	const [includeText, setIncludeText] = useState('');
	const [excludeText, setExcludeText] = useState('');
	const [modelChoice, setModelChoice] = useState<string>('gpt-4.1-mini');
	const [customModel, setCustomModel] = useState('');
	const [status, setStatus] = useState<{
		kind: 'idle' | 'ok' | 'err';
		text?: string;
	}>({ kind: 'idle' });
	const [busy, setBusy] = useState(false);

	const hydrate = useCallback(async () => {
		const s = await loadExtensionSettings();
		setSettings(s);
		setIncludeText(serializeIncludeRulesToText(s.filter.includeDomainRules));
		setExcludeText(serializeExtensionsToText(s.filter.excludeExtensions));
		const preset = PRESET_MODELS.find((m) => m === s.ai.model);
		if (preset) {
			setModelChoice(preset);
			setCustomModel('');
		} else {
			setModelChoice('__custom__');
			setCustomModel(s.ai.model);
		}
	}, []);

	useEffect(() => {
		hydrate().catch(() => undefined);
	}, [hydrate]);

	useEffect(() => {
		const onStorage = (changes: object, areaName: string) => {
			if (areaName !== 'local') {
				return;
			}
			if (!Object.hasOwn(changes, EXTENSION_SETTINGS_STORAGE_KEY)) {
				return;
			}
			hydrate().catch(() => undefined);
		};
		browser.storage.onChanged.addListener(onStorage);
		return () => {
			browser.storage.onChanged.removeListener(onStorage);
		};
	}, [hydrate]);

	const effectiveModel =
		modelChoice === '__custom__' ? customModel.trim() : modelChoice;

	const onSave = async () => {
		if (!settings) {
			return;
		}
		setBusy(true);
		setStatus({ kind: 'idle' });
		try {
			const next: ExtensionSettings = {
				...settings,
				ai: { ...settings.ai, model: effectiveModel || settings.ai.model },
				filter: {
					...settings.filter,
					includeDomainRules: parseIncludeRulesFromText(includeText),
					excludeExtensions: parseExtensionsFromText(excludeText),
				},
			};
			await saveExtensionSettings(next);
			setSettings(cloneSettings(next));
			setStatus({
				kind: 'ok',
				text: '已保存（已通知其他扩展上下文刷新配置）。',
			});
		} catch (e) {
			const text = e instanceof Error ? e.message : String(e);
			setStatus({ kind: 'err', text });
		} finally {
			setBusy(false);
		}
	};

	const onReset = async () => {
		// biome-ignore lint/suspicious/noAlert: destructive action needs native confirm
		if (!globalThis.confirm('恢复为默认配置并立即保存？')) {
			return;
		}
		setBusy(true);
		setStatus({ kind: 'idle' });
		try {
			const d = cloneSettings(DEFAULT_EXTENSION_SETTINGS);
			await saveExtensionSettings(d);
			await hydrate();
			setStatus({ kind: 'ok', text: '已恢复默认并保存。' });
		} catch (e) {
			const text = e instanceof Error ? e.message : String(e);
			setStatus({ kind: 'err', text });
		} finally {
			setBusy(false);
		}
	};

	const setMethodSelected = (m: HttpMethod, selected: boolean) => {
		setSettings((prev) => {
			if (!prev) {
				return prev;
			}
			const has = prev.filter.methods.includes(m);
			let methods = prev.filter.methods;
			if (selected && !has) {
				methods = [...methods, m];
			}
			if (!selected && has) {
				methods = methods.filter((x) => x !== m);
			}
			return { ...prev, filter: { ...prev.filter, methods } };
		});
	};

	if (!settings) {
		return (
			<div className='flex min-h-screen items-center justify-center gap-3'>
				<Spin />
				<Typography.Text type='secondary'>加载中…</Typography.Text>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-3xl space-y-6 px-4 py-8 text-foreground'>
			<header className='space-y-1'>
				<Typography.Title level={3}>Auto Scrape AI 设置</Typography.Title>
				<Typography.Text type='secondary'>
					配置保存在本机的 storage.local，不会通过 Chrome 同步（避免 API Key
					离开本机）。
				</Typography.Text>
			</header>

			<Card title='AI 连接'>
				<Space className='w-full' direction='vertical' size='middle'>
					<div>
						<div className='mb-1 font-medium'>API Key</div>
						<Input.Password
							autoComplete='off'
							onChange={(e) =>
								setSettings({
									...settings,
									ai: { ...settings.ai, apiKey: e.target.value },
								})
							}
							placeholder='sk-…'
							value={settings.ai.apiKey}
						/>
					</div>
					<div>
						<div className='mb-1 font-medium'>Base URL</div>
						<Input
							onChange={(e) =>
								setSettings({
									...settings,
									ai: { ...settings.ai, baseUrl: e.target.value },
								})
							}
							placeholder='https://api.openai.com/v1'
							value={settings.ai.baseUrl}
						/>
					</div>
					<Row gutter={16}>
						<Col span={12}>
							<div className='mb-1 font-medium'>模型</div>
							<Select
								className='w-full'
								onChange={(v) => setModelChoice(v)}
								options={[
									...PRESET_MODELS.map((m) => ({ label: m, value: m })),
									{ label: '自定义…', value: '__custom__' },
								]}
								value={modelChoice}
							/>
						</Col>
						{modelChoice === '__custom__' ? (
							<Col span={12}>
								<div className='mb-1 font-medium'>自定义模型 ID</div>
								<Input
									onChange={(e) => setCustomModel(e.target.value)}
									placeholder='例如 my-gateway/model-name'
									value={customModel}
								/>
							</Col>
						) : null}
					</Row>
				</Space>
			</Card>

			<Card title='过滤'>
				<Space className='w-full' direction='vertical' size='middle'>
					<div>
						<div className='mb-1 font-medium'>Include 域名 / 主机规则</div>
						<Typography.Text type='secondary'>
							每行一条：普通行为正则（匹配主机名）；单独一行写 current-tab-host
							表示使用当前 DevTools 所检查标签页的域名。
						</Typography.Text>
						<Input.TextArea
							className='mt-2'
							onChange={(e) => setIncludeText(e.target.value)}
							rows={6}
							spellCheck={false}
							value={includeText}
						/>
					</div>
					<div>
						<div className='mb-1 font-medium'>排除扩展名</div>
						<Typography.Text type='secondary'>
							逗号或换行分隔，可带或不带前导点（保存时会规范为小写 + 前导点）。
						</Typography.Text>
						<Input.TextArea
							className='mt-2'
							onChange={(e) => setExcludeText(e.target.value)}
							rows={4}
							spellCheck={false}
							value={excludeText}
						/>
					</div>
					<div>
						<div className='mb-2 font-medium'>HTTP 方法</div>
						<Space size='middle' wrap>
							{HTTP_METHODS.map((m) => (
								<Checkbox
									checked={settings.filter.methods.includes(m)}
									key={m}
									onChange={(e) => setMethodSelected(m, e.target.checked)}
								>
									{m}
								</Checkbox>
							))}
						</Space>
					</div>
				</Space>
			</Card>

			<Card title='采样'>
				<Row gutter={16}>
					<Col span={12}>
						<div className='mb-1 font-medium'>Response Body 字符上限</div>
						<InputNumber
							className='w-full'
							max={2_000_000}
							min={256}
							onChange={(v) =>
								setSettings({
									...settings,
									sampling: {
										...settings.sampling,
										responseBodyLimit: Number(
											v ?? settings.sampling.responseBodyLimit,
										),
									},
								})
							}
							value={settings.sampling.responseBodyLimit}
						/>
					</Col>
					<Col span={12}>
						<div className='mb-1 font-medium'>JSON 数组最多保留元素数</div>
						<InputNumber
							className='w-full'
							max={500}
							min={0}
							onChange={(v) =>
								setSettings({
									...settings,
									sampling: {
										...settings.sampling,
										arrayTruncationCount: Number(
											v ?? settings.sampling.arrayTruncationCount,
										),
									},
								})
							}
							value={settings.sampling.arrayTruncationCount}
						/>
					</Col>
				</Row>
			</Card>

			<Card title='分析预设'>
				<Row gutter={16}>
					<Col span={12}>
						<div className='mb-1 font-medium'>目标语言</div>
						<Select
							className='w-full'
							onChange={(id) =>
								setSettings({
									...settings,
									analysis: {
										...settings.analysis,
										targetLanguage:
											id as ExtensionSettings['analysis']['targetLanguage'],
									},
								})
							}
							options={LANGUAGE_OPTIONS.map((o) => ({
								label: o.label,
								value: o.id,
							}))}
							value={settings.analysis.targetLanguage}
						/>
					</Col>
					<Col span={12}>
						<div className='mb-1 font-medium'>Schema 类型</div>
						<Select
							className='w-full'
							onChange={(id) =>
								setSettings({
									...settings,
									analysis: {
										...settings.analysis,
										schemaType:
											id as ExtensionSettings['analysis']['schemaType'],
									},
								})
							}
							options={SCHEMA_OPTIONS.map((o) => ({
								label: o.label,
								value: o.id,
							}))}
							value={settings.analysis.schemaType}
						/>
					</Col>
				</Row>
			</Card>

			{status.kind === 'ok' ? (
				<Alert
					description={status.text}
					message='成功'
					showIcon
					type='success'
				/>
			) : null}
			{status.kind === 'err' ? (
				<Alert
					description={
						<span className='whitespace-pre-wrap'>{status.text}</span>
					}
					message='校验或保存失败'
					showIcon
					type='error'
				/>
			) : null}

			<div className='flex flex-wrap gap-3'>
				<Button
					disabled={busy}
					onClick={() => onSave().catch(() => undefined)}
					type='primary'
				>
					保存
				</Button>
				<Button
					disabled={busy}
					onClick={() => onReset().catch(() => undefined)}
				>
					恢复默认
				</Button>
			</div>
		</div>
	);
}
