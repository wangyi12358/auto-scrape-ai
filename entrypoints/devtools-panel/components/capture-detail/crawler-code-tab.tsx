import { Button, Select, Spin, Typography } from 'antd';
import { CodeHighlight } from '@/components/code-highlight';
import type { CrawlerCodeLanguage } from '@/lib/ai/analyze-request';
import { CRAWLER_LANGUAGE_OPTIONS } from './constants';

export interface CrawlerCodeTabProps {
	aiDisabled: boolean;
	currentCode: string | null;
	generating: boolean;
	onCopy: () => void;
	onGenerate: () => void;
	onLanguageChange: (lang: CrawlerCodeLanguage) => void;
	selectedLanguage: CrawlerCodeLanguage;
}

export function CrawlerCodeTab({
	selectedLanguage,
	onLanguageChange,
	generating,
	aiDisabled,
	currentCode,
	onGenerate,
	onCopy,
}: CrawlerCodeTabProps) {
	return (
		<div className='space-y-3 pt-1'>
			<Typography.Paragraph className='!mb-0 text-xs' type='secondary'>
				生成可复现该请求的示例脚本（fetch / requests / curl
				等）。请勿用于未授权的站点或绕过鉴权。
			</Typography.Paragraph>
			<div className='flex flex-wrap items-center gap-3'>
				<Select<CrawlerCodeLanguage>
					className='min-w-52 flex-1'
					disabled={generating}
					onChange={onLanguageChange}
					options={CRAWLER_LANGUAGE_OPTIONS}
					value={selectedLanguage}
				/>
				<Button
					disabled={aiDisabled || generating}
					loading={generating}
					onClick={onGenerate}
					type='primary'
				>
					{currentCode ? '重新生成' : '生成爬虫代码'}
				</Button>
				{currentCode ? <Button onClick={onCopy}>复制代码</Button> : null}
			</div>

			{generating && !currentCode ? (
				<div className='flex items-center gap-2 py-4'>
					<Spin size='small' />
					<Typography.Text type='secondary'>
						正在生成爬虫代码...
					</Typography.Text>
				</div>
			) : null}

			{currentCode ? (
				<CodeHighlight code={currentCode} language={selectedLanguage} />
			) : null}

			{currentCode || generating ? null : (
				<Typography.Text type='secondary'>
					选择运行时后点击「生成爬虫代码」。
				</Typography.Text>
			)}
		</div>
	);
}
