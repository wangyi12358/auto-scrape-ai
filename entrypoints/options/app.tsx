import {
	Alert,
	Button,
	Checkbox,
	Description,
	Fieldset,
	Input,
	Label,
	ListBox,
	NumberField,
	Select,
	Spinner,
	Surface,
	Text,
	TextArea,
	TextField,
} from '@heroui/react';
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
			<div className='flex min-h-screen items-center justify-center gap-3 text-muted'>
				<Spinner color='accent' size='md' />
				<Text.Root>加载中…</Text.Root>
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-3xl space-y-6 px-4 py-8 text-foreground'>
			<header className='space-y-1'>
				<h1 className='font-semibold text-2xl text-foreground'>
					Auto Scrape AI 设置
				</h1>
				<Text.Root className='text-muted' size='sm'>
					配置保存在本机的 storage.local，不会通过 Chrome 同步（避免 API Key
					离开本机）。
				</Text.Root>
			</header>

			<Surface.Root className='space-y-6 p-6' variant='default'>
				<div className='space-y-1'>
					<Text.Root className='font-medium text-lg'>AI 连接</Text.Root>
				</div>

				<TextField.Root
					onChange={(v) =>
						setSettings({ ...settings, ai: { ...settings.ai, apiKey: v } })
					}
					value={settings.ai.apiKey}
				>
					<Label.Root>API Key</Label.Root>
					<Input.Root autoComplete='off' placeholder='sk-…' type='password' />
				</TextField.Root>

				<div className='grid gap-4 sm:grid-cols-2'>
					<Select.Root
						onSelectionChange={(key) => {
							const k = key == null ? '' : String(key);
							setModelChoice(k);
						}}
						selectedKey={modelChoice}
					>
						<Label.Root>模型</Label.Root>
						<Select.Trigger className='mt-1'>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox.Root>
								{PRESET_MODELS.map((m) => (
									<ListBox.Item id={m} key={m} textValue={m}>
										{m}
									</ListBox.Item>
								))}
								<ListBox.Item id='__custom__' textValue='自定义'>
									自定义…
								</ListBox.Item>
							</ListBox.Root>
						</Select.Popover>
					</Select.Root>

					{modelChoice === '__custom__' ? (
						<TextField.Root
							onChange={(v) => setCustomModel(v)}
							value={customModel}
						>
							<Label.Root>自定义模型 ID</Label.Root>
							<Input.Root
								placeholder='例如 my-gateway/model-name'
								type='text'
							/>
						</TextField.Root>
					) : null}
				</div>
			</Surface.Root>

			<Surface.Root className='space-y-6 p-6' variant='default'>
				<Text.Root className='font-medium text-lg'>过滤</Text.Root>

				<TextField.Root onChange={setIncludeText} value={includeText}>
					<Label.Root>Include 域名 / 主机规则</Label.Root>
					<Description.Root>
						每行一条：普通行为正则（匹配主机名）；单独一行写 current-tab-host
						表示使用当前 DevTools 所检查标签页的域名。
					</Description.Root>
					<TextArea.Root
						className='mt-2 min-h-32 font-mono text-sm'
						spellCheck={false}
					/>
				</TextField.Root>

				<TextField.Root onChange={setExcludeText} value={excludeText}>
					<Label.Root>排除扩展名</Label.Root>
					<Description.Root>
						逗号或换行分隔，可带或不带前导点（保存时会规范为小写 + 前导点）。
					</Description.Root>
					<TextArea.Root
						className='mt-2 min-h-24 font-mono text-sm'
						spellCheck={false}
					/>
				</TextField.Root>

				<Fieldset.Root>
					<Fieldset.Legend>HTTP 方法</Fieldset.Legend>
					<Fieldset.Group className='mt-3 flex flex-wrap gap-4'>
						{HTTP_METHODS.map((m) => (
							<Checkbox.Root
								isSelected={settings.filter.methods.includes(m)}
								key={m}
								onChange={(selected) => setMethodSelected(m, selected)}
							>
								<Checkbox.Control>
									<Checkbox.Indicator />
								</Checkbox.Control>
								<Checkbox.Content>{m}</Checkbox.Content>
							</Checkbox.Root>
						))}
					</Fieldset.Group>
				</Fieldset.Root>
			</Surface.Root>

			<Surface.Root className='space-y-6 p-6' variant='default'>
				<Text.Root className='font-medium text-lg'>采样</Text.Root>
				<div className='grid gap-4 sm:grid-cols-2'>
					<NumberField.Root
						maxValue={2_000_000}
						minValue={256}
						onChange={(v) =>
							setSettings({
								...settings,
								sampling: { ...settings.sampling, responseBodyLimit: v },
							})
						}
						value={settings.sampling.responseBodyLimit}
					>
						<Label.Root>Response Body 字符上限</Label.Root>
						<NumberField.Group className='mt-1'>
							<NumberField.IncrementButton>+</NumberField.IncrementButton>
							<NumberField.Input />
							<NumberField.DecrementButton>−</NumberField.DecrementButton>
						</NumberField.Group>
					</NumberField.Root>

					<NumberField.Root
						maxValue={500}
						minValue={0}
						onChange={(v) =>
							setSettings({
								...settings,
								sampling: { ...settings.sampling, arrayTruncationCount: v },
							})
						}
						value={settings.sampling.arrayTruncationCount}
					>
						<Label.Root>JSON 数组最多保留元素数</Label.Root>
						<NumberField.Group className='mt-1'>
							<NumberField.IncrementButton>+</NumberField.IncrementButton>
							<NumberField.Input />
							<NumberField.DecrementButton>−</NumberField.DecrementButton>
						</NumberField.Group>
					</NumberField.Root>
				</div>
			</Surface.Root>

			<Surface.Root className='space-y-6 p-6' variant='default'>
				<Text.Root className='font-medium text-lg'>分析预设</Text.Root>
				<div className='grid gap-4 sm:grid-cols-2'>
					<Select.Root
						onSelectionChange={(key) => {
							const id = key == null ? undefined : String(key);
							if (!id) {
								return;
							}
							setSettings({
								...settings,
								analysis: {
									...settings.analysis,
									targetLanguage:
										id as ExtensionSettings['analysis']['targetLanguage'],
								},
							});
						}}
						selectedKey={settings.analysis.targetLanguage}
					>
						<Label.Root>目标语言</Label.Root>
						<Select.Trigger className='mt-1'>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox.Root>
								{LANGUAGE_OPTIONS.map((o) => (
									<ListBox.Item id={o.id} key={o.id} textValue={o.label}>
										{o.label}
									</ListBox.Item>
								))}
							</ListBox.Root>
						</Select.Popover>
					</Select.Root>

					<Select.Root
						onSelectionChange={(key) => {
							const id = key == null ? undefined : String(key);
							if (!id) {
								return;
							}
							setSettings({
								...settings,
								analysis: {
									...settings.analysis,
									schemaType: id as ExtensionSettings['analysis']['schemaType'],
								},
							});
						}}
						selectedKey={settings.analysis.schemaType}
					>
						<Label.Root>Schema 类型</Label.Root>
						<Select.Trigger className='mt-1'>
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox.Root>
								{SCHEMA_OPTIONS.map((o) => (
									<ListBox.Item id={o.id} key={o.id} textValue={o.label}>
										{o.label}
									</ListBox.Item>
								))}
							</ListBox.Root>
						</Select.Popover>
					</Select.Root>
				</div>
			</Surface.Root>

			{status.kind === 'ok' ? (
				<Alert.Root status='success'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>成功</Alert.Title>
						<Alert.Description>{status.text}</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			) : null}
			{status.kind === 'err' ? (
				<Alert.Root status='danger'>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>校验或保存失败</Alert.Title>
						<Alert.Description>
							<span className='whitespace-pre-wrap'>{status.text}</span>
						</Alert.Description>
					</Alert.Content>
				</Alert.Root>
			) : null}

			<div className='flex flex-wrap gap-3'>
				<Button
					isDisabled={busy}
					onPress={() => onSave().catch(() => undefined)}
					variant='primary'
				>
					保存
				</Button>
				<Button
					isDisabled={busy}
					onPress={() => onReset().catch(() => undefined)}
					variant='secondary'
				>
					恢复默认
				</Button>
			</div>
		</div>
	);
}
