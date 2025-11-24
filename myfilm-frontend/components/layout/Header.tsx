// myfilm-frontend/components/layout/Header.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Container from '@/components/layout/Container';
import { trackEvent } from '@/utils/tracking';

const nav = [
  { href: '/', label: 'Explorar' },
  { href: '/trending', label: 'Tendencias' },
  { href: '/for-you', label: 'Para ti' },
  { href: '/new', label: 'Novedades' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname.startsWith(href);
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <Container className="h-14 flex items-center justify-between gap-3">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-wide"
          onClick={() => trackEvent({ type: 'click', route: '/', payload: { target: 'logo' } })}
        >
          {/* Logotipo simple por ahora */}
          <span className="inline-block text-base leading-none rounded px-2 py-1 border border-gray-300">
            MYFILM
          </span>
        </Link>

        {/* Navegación desktop */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'px-3 py-2 rounded text-sm transition',
                isActive(pathname, item.href)
                  ? 'font-semibold text-gray-900'
                  : 'text-gray-600 hover:text-gray-900',
              ].join(' ')}
              onClick={() =>
                trackEvent({ type: 'click', route: pathname, payload: { target: `nav:${item.label}` } })
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Acciones derecha */}
        <div className="flex items-center gap-2">
          {/* Buscar */}
          <button
            aria-label="Buscar"
            className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 hover:bg-gray-50"
            onClick={() =>
              trackEvent({ type: 'click', route: pathname, payload: { target: 'search' } })
            }
          >
            {/* icono lupa */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="M20 20L17 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          {/* Hamburguesa (móvil) */}
          <button
            aria-label="Abrir menú"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded border border-gray-300 hover:bg-gray-50"
            onClick={() => setOpen(true)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </Container>

      {/* Drawer móvil */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* fondo */}
          <button
            className="absolute inset-0 bg-black/20"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
          {/* panel */}
          <div className="ml-auto h-full w-80 max-w-[85%] bg-white shadow-xl border-l border-gray-200 p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <span className="font-semibold">MYFILM</span>
              <button
                className="h-8 w-8 inline-flex items-center justify-center rounded hover:bg-gray-100"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="mt-6 grid gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'px-3 py-2 rounded text-sm',
                    isActive(pathname, item.href)
                      ? 'font-semibold text-gray-900 bg-gray-50'
                      : 'text-gray-700 hover:bg-gray-50',
                  ].join(' ')}
                  onClick={() => {
                    setOpen(false);
                    trackEvent({ type: 'click', route: pathname, payload: { target: `nav-mobile:${item.label}` } });
                  }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pt-6 text-xs text-gray-500">© {new Date().getFullYear()} MYFILM</div>
          </div>
        </div>
      )}
    </header>
  );
}
