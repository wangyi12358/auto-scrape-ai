import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function AnalysisMarkdown({ markdown }: { markdown: string }) {
	return (
		<div className='prose prose-sm max-w-none'>
			<ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
		</div>
	);
}
