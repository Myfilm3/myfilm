// Cliente de tracking para Next.js (sendBeacon + consentimiento)
export function track(type: string, payload: any = {}) {
  if (typeof window === 'undefined') return;
  if (!(window as any).MYFILM_CONSENT?.analytics) return;
  const body = JSON.stringify({
    type, payload,
    route: location.pathname,
    referrer: document.referrer,
    lang: navigator.language,
  });
  navigator.sendBeacon('/v1/analytics', new Blob([body], { type: 'application/json' }));
}
