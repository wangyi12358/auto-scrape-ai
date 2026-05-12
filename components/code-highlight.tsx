import { useEffect, useState } from 'react';
import { type BundledLanguage, codeToHtml } from 'shiki';

interface CodeHighlightProps {
	code: string;
	language: string;
}

const LANG_MAP: Record<string, BundledLanguage> = {
	typescript: 'typescript',
	go: 'go',
	pydantic: 'python',
	python: 'python',
};

export function CodeHighlight({ code, language }: CodeHighlightProps) {
	const [html, setHtml] = useState<string>('');

	useEffect(() => {
		let cancelled = false;
		const lang = LANG_MAP[language] ?? 'typescript';
		codeToHtml(code, { lang, theme: 'github-light' }).then((result) => {
			if (!cancelled) {
				setHtml(result);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [code, language]);

	if (!html) {
		return (
			<pre className='overflow-x-auto rounded-lg bg-gray-50 p-4 text-sm'>
				<code>{code}</code>
			</pre>
		);
	}

	return (
		<div
			className='[&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:p-4 [&_pre]:text-sm'
			// biome-ignore lint/security/noDangerouslySetInnerHtml: shiki output is trusted
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	);
}
