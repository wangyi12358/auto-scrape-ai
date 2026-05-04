import { I18nProvider } from '@heroui/react/rac';
import type { ReactNode } from 'react';

export function HerouiProvider({ children }: { children: ReactNode }) {
	return <I18nProvider locale='zh-CN'>{children}</I18nProvider>;
}
