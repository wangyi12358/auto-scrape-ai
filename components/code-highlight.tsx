import { useEffect, useState } from 'react';
import { type BundledLanguage, codeToHtml } from 'shiki';

interface CodeHighlightProps {
	code: string;
	language: string;
}

const LANG_MAP: Record<string, BundledLanguage> = {
	typescript: 'typescript',
	zod: 'typescript',
	go: 'go',
	pydantic: 'python',
	python: 'python',
	rust: 'rust',
	kotlin: 'kotlin',
	swift: 'swift',
	java: 'java',
	csharp: 'csharp',
	'json-schema': 'json',
	protobuf: 'proto',
	'ts-fetch': 'typescript',
	'js-fetch': 'javascript',
	'python-requests': 'python',
	'python-httpx': 'python',
	'go-http': 'go',
	curl: 'bash',
	'node-axios': 'typescript',
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
