import { Button, Select, Spin, Typography } from 'antd';
import { CodeHighlight } from '@/components/code-highlight';
import type { TypeDefinitionLanguage } from '@/lib/ai/analyze-request';
import { TYPE_DEFINITION_LANGUAGE_OPTIONS } from './constants';

export interface TypeDefinitionTabProps {
	aiDisabled: boolean;
	currentCode: string | null;
	generating: boolean;
	onCopy: () => void;
	onGenerate: () => void;
	onLanguageChange: (lang: TypeDefinitionLanguage) => void;
	selectedLanguage: TypeDefinitionLanguage;
}

export function TypeDefinitionTab({
	selectedLanguage,
	onLanguageChange,
	generating,
	aiDisabled,
	currentCode,
	onGenerate,
	onCopy,
}: TypeDefinitionTabProps) {
	return (
		<div className='space-y-3 pt-1'>
			<Typography.Paragraph className='!mb-0 text-xs' type='secondary'>
				根据请求/响应摘要生成各语言类型声明（不含真实密钥）。
			</Typography.Paragraph>
			<div className='flex flex-wrap items-center gap-3'>
				<Select<TypeDefinitionLanguage>
					className='min-w-52 flex-1'
					disabled={generating}
					onChange={onLanguageChange}
					options={TYPE_DEFINITION_LANGUAGE_OPTIONS}
					value={selectedLanguage}
				/>
				<Button
					disabled={aiDisabled || generating}
					loading={generating}
					onClick={onGenerate}
					type='primary'
				>
					{currentCode ? '重新生成' : '生成类型定义'}
				</Button>
				{currentCode ? <Button onClick={onCopy}>复制代码</Button> : null}
			</div>

			{generating && !currentCode ? (
				<div className='flex items-center gap-2 py-4'>
					<Spin size='small' />
					<Typography.Text type='secondary'>
						正在生成类型定义...
					</Typography.Text>
				</div>
			) : null}

			{currentCode ? (
				<CodeHighlight code={currentCode} language={selectedLanguage} />
			) : null}

			{currentCode || generating ? null : (
				<Typography.Text type='secondary'>
					选择语言后点击「生成类型定义」。
				</Typography.Text>
			)}
		</div>
	);
}
