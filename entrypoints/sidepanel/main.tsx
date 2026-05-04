import '@/assets/tailwind.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HerouiProvider } from '@/components/heroui-provider';
import App from './app.tsx';

const root = document.getElementById('root');
if (!root) {
	throw new Error('Missing #root');
}
ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<HerouiProvider>
			<App />
		</HerouiProvider>
	</React.StrictMode>,
);
