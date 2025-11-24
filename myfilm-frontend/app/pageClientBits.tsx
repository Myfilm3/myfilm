'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { trackEvent } from '@/utils/tracking';

export default function ClientHomeBits() {
  useEffect(() => {
    trackEvent({ type: 'view', route: '/' });
  }, []);

  return (
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold">Bienvenido a MYFILM Frontend 🚀</h1>
      <div className="flex items-center justify-center gap-4">
        <Button
          onClick={() =>
            trackEvent({ type: 'click', route: '/', payload: { target: 'cta_home' } })
          }
        >
          Probar click tracking
        </Button>
      </div>
    </div>
  );
}