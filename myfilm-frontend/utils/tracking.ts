export type TrackEventPayload = {
  type: string;
  route: string;
  referrer?: string | null;
  lang?: string | null;
  payload?: any;
};

export async function trackEvent(event: TrackEventPayload) {
  try {
    await fetch('http://localhost:3001/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      body: JSON.stringify({
        ...event,
        lang: event.lang || (typeof navigator !== 'undefined' ? navigator.language : 'es'),
        referrer: (typeof document !== 'undefined' ? document.referrer : '') || null,
      }),
      keepalive: true,
    });
  } catch (err) {
    console.warn('Analytics failed', err);
  }
}