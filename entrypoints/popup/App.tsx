import { Button, Card, Typography } from 'antd';
import { useState } from 'react';

export default function App() {
	const [count, setCount] = useState(0);
	return (
		<Card className='w-80' styles={{ body: { padding: 16 } }}>
			<Typography.Text strong>自动抓包 AI</Typography.Text>
			<div className='mt-3 flex flex-col gap-3'>
				<Button onClick={() => setCount((c) => c + 1)} type='primary'>
					演示：点击次数 {count}
				</Button>
				<Button
					onClick={() => {
						browser.runtime.openOptionsPage();
					}}
				>
					打开设置
				</Button>
			</div>
		</Card>
	);
}
