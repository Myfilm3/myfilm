# MYFILM Web — Analytics Client
Uso:
import { track } from './lib/analytics';
if (typeof window !== 'undefined') (window as any).MYFILM_CONSENT = { analytics: true };
track('pageview');
track('click', { el:'MovieCard', id:'movie:123' });
