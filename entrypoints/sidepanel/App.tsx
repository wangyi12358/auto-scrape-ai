import { Surface, Text } from '@heroui/react';

export default function App() {
	return (
		<Surface.Root className='min-h-screen p-4' variant='default'>
			<h1 className='font-semibold text-foreground text-lg'>Auto Scrape AI</h1>
			<Text.Root className='mt-2 text-muted text-sm leading-relaxed'>
				Side panel shell（任务 08）。抓包逻辑在 DevTools 页执行，不在此处 — 见{' '}
				<code className='bg-field font-mono text-xs'>lib/architecture.ts</code>
				。
			</Text.Root>
		</Surface.Root>
	);
}
