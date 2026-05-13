import { Drawer, Tabs } from 'antd';
import { useState } from 'react';
import {
	type CrawlerCodeLanguage,
	type EndpointAnalysis,
	generateCrawlerCode,
	generateTypeDefinition,
	type TypeDefinitionLanguage,
} from '@/lib/ai/analyze-request';
import type { CapturedRequest } from '@/lib/types/requests';
import type { ExtensionSettings } from '@/lib/types/settings';
import { AnalysisSection } from './analysis-section';
import { CrawlerCodeTab } from './crawler-code-tab';
import { TypeDefinitionTab } from './type-definition-tab';

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
	const [selectedCrawlerLanguage, setSelectedCrawlerLanguage] =
		useState<CrawlerCodeLanguage>('ts-fetch');
	const [typeDefinitions, setTypeDefinitions] = useState<
		Record<string, Record<string, string>>
	>({});
	const [crawlerCodes, setCrawlerCodes] = useState<
		Record<string, Record<string, string>>
	>({});
	const [generatingType, setGeneratingType] = useState(false);
	const [generatingCrawler, setGeneratingCrawler] = useState(false);

	const currentTypeCode = capture
		? (typeDefinitions[capture.captureId]?.[selectedLanguage] ?? null)
		: null;

	const currentCrawlerCode = capture
		? (crawlerCodes[capture.captureId]?.[selectedCrawlerLanguage] ?? null)
		: null;

	const handleGenerateType = async () => {
		if (!(capture && settings?.ai.apiKey && settings?.ai.baseUrl)) {
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

	const handleGenerateCrawler = async () => {
		if (!(capture && settings?.ai.apiKey && settings?.ai.baseUrl)) {
			return;
		}

		setGeneratingCrawler(true);
		try {
			const result = await generateCrawlerCode(
				capture,
				settings,
				selectedCrawlerLanguage,
			);
			setCrawlerCodes((prev) => ({
				...prev,
				[capture.captureId]: {
					...prev[capture.captureId],
					[selectedCrawlerLanguage]: result.code,
				},
			}));
		} catch {
			setCrawlerCodes((prev) => ({
				...prev,
				[capture.captureId]: {
					...prev[capture.captureId],
					[selectedCrawlerLanguage]: '生成失败，请检查配置后重试',
				},
			}));
		} finally {
			setGeneratingCrawler(false);
		}
	};

	const handleCopyType = () => {
		if (currentTypeCode) {
			navigator.clipboard.writeText(currentTypeCode);
		}
	};

	const handleCopyCrawler = () => {
		if (currentCrawlerCode) {
			navigator.clipboard.writeText(currentCrawlerCode);
		}
	};

	const aiDisabled = !(settings?.ai.apiKey && settings?.ai.baseUrl);

	return (
		<Drawer onClose={onClose} open={open} title='接口详情' width={720}>
			{capture ? (
				<div className='space-y-6'>
					<AnalysisSection analysis={analysis} capture={capture} />

					<Tabs
						items={[
							{
								key: 'types',
								label: '类型定义',
								children: (
									<TypeDefinitionTab
										aiDisabled={aiDisabled}
										currentCode={currentTypeCode}
										generating={generatingType}
										onCopy={handleCopyType}
										onGenerate={handleGenerateType}
										onLanguageChange={setSelectedLanguage}
										selectedLanguage={selectedLanguage}
									/>
								),
							},
							{
								key: 'crawler',
								label: '爬虫代码',
								children: (
									<CrawlerCodeTab
										aiDisabled={aiDisabled}
										currentCode={currentCrawlerCode}
										generating={generatingCrawler}
										onCopy={handleCopyCrawler}
										onGenerate={handleGenerateCrawler}
										onLanguageChange={setSelectedCrawlerLanguage}
										selectedLanguage={selectedCrawlerLanguage}
									/>
								),
							},
						]}
					/>
				</div>
			) : null}
		</Drawer>
	);
}
