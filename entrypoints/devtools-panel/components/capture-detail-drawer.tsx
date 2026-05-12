import { Button, Drawer, Select, Spin, Typography } from 'antd';
import { useState } from 'react';
import { AnalysisMarkdown } from '@/components/analysis-markdown';
import { CodeHighlight } from '@/components/code-highlight';
import {
	type EndpointAnalysis,
	generateTypeDefinition,
	type TypeDefinitionLanguage,
} from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';

const LANGUAGE_OPTIONS: { value: TypeDefinitionLanguage; label: string }[] = [
	{ value: 'typescript', label: 'TypeScript Interface' },
	{ value: 'go', label: 'Go Struct' },
	{ value: 'pydantic', label: 'Pydantic Model' },
];

interface CaptureDetailDrawerProps {
	analysis: EndpointAnalysis | undefined;
	capture: CapturedRequest | null;
	onClose: () => void;
	open: boolean;
	settings: ExtensionSettings | null;
}

export function CaptureDetailDrawer({
	open,
	capture,
	analysis,
	settings,
	onClose,
}: CaptureDetailDrawerProps) {
	const [selectedLanguage, setSelectedLanguage] =
		useState<TypeDefinitionLanguage>('typescript');
	const [typeDefinitions, setTypeDefinitions] = useState<
		Record<string, Record<string, string>>
	>({});
	const [generatingType, setGeneratingType] = useState(false);

	const currentCode = capture
		? (typeDefinitions[capture.captureId]?.[selectedLanguage] ?? null)
		: null;

	const handleGenerate = async () => {
		if (!(capture && settings?.ai.apiKey && settings?.ai.baseUrl)) {
			return;
		}

		if (typeDefinitions[capture.captureId]?.[selectedLanguage]) {
			return;
		}

		setGeneratingType(true);
		try {
			const result = await generateTypeDefinition(
				capture,
				settings,
				selectedLanguage,
			);
			setTypeDefinitions((prev) => ({
				...prev,
				[capture.captureId]: {
					...prev[capture.captureId],
					[selectedLanguage]: result.code,
				},
			}));
		} catch {
			setTypeDefinitions((prev) => ({
				...prev,
				[capture.captureId]: {
					...prev[capture.captureId],
					[selectedLanguage]: '// 生成失败，请检查配置后重试',
				},
			}));
		} finally {
			setGeneratingType(false);
		}
	};

	const handleCopy = () => {
		if (currentCode) {
			navigator.clipboard.writeText(currentCode);
		}
	};

	return (
		<Drawer onClose={onClose} open={open} title='接口详情' width={720}>
			{capture && (
				<div className='space-y-6'>
					<div>
						<Typography.Text
							copyable={{ text: capture.url }}
							ellipsis={{ tooltip: capture.url }}
						>
							{capture.method} {capture.url}
						</Typography.Text>
					</div>

					<div>
						<Typography.Title level={5}>详细说明</Typography.Title>
						<AnalysisMarkdown
							markdown={analysis?.detailedDescription ?? '暂无分析结果。'}
						/>
					</div>

					<div>
						<Typography.Title level={5}>类型定义</Typography.Title>
						<div className='mb-3 flex items-center gap-3'>
							<Select<TypeDefinitionLanguage>
								className='w-48'
								disabled={generatingType}
								onChange={setSelectedLanguage}
								options={LANGUAGE_OPTIONS}
								value={selectedLanguage}
							/>
							<Button
								disabled={
									!(settings?.ai.apiKey && settings?.ai.baseUrl) ||
									generatingType
								}
								loading={generatingType}
								onClick={handleGenerate}
								type='primary'
							>
								{currentCode ? '重新生成' : '生成类型定义'}
							</Button>
							{currentCode && <Button onClick={handleCopy}>复制代码</Button>}
						</div>

						{generatingType && !currentCode && (
							<div className='flex items-center gap-2 py-4'>
								<Spin size='small' />
								<Typography.Text type='secondary'>
									正在生成类型定义...
								</Typography.Text>
							</div>
						)}

						{currentCode && (
							<CodeHighlight code={currentCode} language={selectedLanguage} />
						)}

						{!(currentCode || generatingType) && (
							<Typography.Text type='secondary'>
								选择语言后点击「生成类型定义」按钮，AI
								将根据请求和响应自动生成对应的类型定义代码。
							</Typography.Text>
						)}
					</div>
				</div>
			)}
		</Drawer>
	);
}
