import '@/assets/tailwind.css';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app';

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root');
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<ConfigProvider locale={zhCN}>
			<App />
		</ConfigProvider>
	</React.StrictMode>,
);
