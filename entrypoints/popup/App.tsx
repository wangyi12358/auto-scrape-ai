import { Button, Surface, Text } from '@heroui/react';
import { useState } from 'react';

export default function App() {
	const [count, setCount] = useState(0);
	return (
		<Surface.Root className='w-80 space-y-3 p-4' variant='default'>
			<Text.Root className='font-semibold'>Auto Scrape AI</Text.Root>
			<Button onPress={() => setCount((c) => c + 1)} variant='primary'>
				count is {count}
			</Button>
			<Button
				onPress={() => {
					browser.runtime.openOptionsPage();
				}}
				variant='secondary'
			>
				打开设置
			</Button>
		</Surface.Root>
	);
}
