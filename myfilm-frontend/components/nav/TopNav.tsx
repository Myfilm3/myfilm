// myfilm-frontend/components/nav/TopNav.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const TABS = [
  { href: '/que-ver-hoy', label: 'QUE VER HOY' },
  { href: '/mylist',      label: 'MYLIST' },
  { href: '/generos',     label: 'GÉNEROS' },
  { href: '/kids',        label: 'KIDS' },
];

export default function TopNav() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const capRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sombra / fondo según scroll (muy barato: solo cambia boolean)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(true);
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => setScrolled(false), 180);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  // Exponer --nav-h (por si lo usas para offsets)
  useEffect(() => {
    const el = capRef.current;
    if (!el) return;
    const setVar = () =>
      document.documentElement.style.setProperty(
        '--nav-h',
        `${el.getBoundingClientRect().height}px`,
      );
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header className="sticky top-0 z-50" aria-label="Navegación principal">
      {/* Banda que centra la cápsula */}
      <div className="w-full flex justify-center py-2">
        {/* CÁPSULA alineada con carruseles (90vw / 1600px) */}
        <div
          ref={capRef}
          className={[
            'w-[90vw] max-w-[1600px]',
            'grid grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-4',
            'rounded-[999px] border shadow-[0_8px_30px_rgba(0,0,0,0.35)]',
            'backdrop-blur-md px-3 md:px-4',
            'min-h-[52px] md:min-h-[64px] lg:min-h-[68px]',
            scrolled
              ? 'bg-white/6 border-white/20 backdrop-blur-2xl'
              : 'bg-[#0e0e0e]/95 border-white/10',
          ].join(' ')}
        >
          {/* Col 1: LOGO */}
          <div className="flex items-center pl-8">
            <Link href="/" aria-label="Ir a inicio" className="inline-flex items-center">
              <Image
                src="/legacy/images/logo3.webp"
                alt="MYFILM"
                width={120}
                height={30}
                // Sin priority → dejamos el LCP para el Hero
                className="select-none"
              />
            </Link>
          </div>

          {/* Col 2: TABS (ocultas si se abre el buscador) */}
          {!searchOpen && (
            <nav
              className="hidden md:flex items-center justify-center gap-2"
              aria-label="Secciones principales"
            >
              {TABS.map((t) => {
                const active = pathname === t.href;
                return (
                  <Link
                    key={t.href}
                    href={t.href}
                    className={`px-7 py-2 rounded-full text-base transition ${
                      active
                        ? 'bg-white text-black'
                        : 'text-white/90 hover:bg-white/10'
                    }`}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Col 3: BUSCADOR + USUARIO */}
          <div
            className={
              searchOpen
                ? 'col-span-2 col-start-2 flex items-center justify-end gap-3'
                : 'col-start-3 flex items-center justify-end'
            }
          >
            <div
              className={
                searchOpen
                  ? 'relative w-full transition-all'
                  : 'relative w-[260px] sm:w-[360px] lg:w-[520px] xl:w-[640px] transition-all'
              }
            >
              <div
                className={[
                  'relative flex items-center h-11 overflow-hidden rounded-[999px]',
                  'bg-white/0 border border-[#f5a623] shadow-[0_8px_30px_rgba(0,0,0,0.25)]',
                  'transition-all focus-within:border-[#f7c04a] focus-within:bg-white/5',
                ].join(' ')}
              >
                <div className="pointer-events-none absolute inset-0 bg-white/0" />
                <span
                  className="relative z-10 pl-4 pr-2 text-white/90 pointer-events-none flex items-center"
                  aria-hidden
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="opacity-90"
                  >
                    <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                    <path
                      d="M20 20L16.5 16.5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <input
                  type="search"
                  placeholder="Busca todo, todo y todo"
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setSearchOpen(false)}
                  className="relative z-10 flex-1 h-full bg-transparent text-white placeholder-white/70 pr-4 outline-none border-0 appearance-none"
                  aria-label="Buscar contenido"
                />
              </div>
            </div>

            {/* Botón / avatar de usuario (SIEMPRE visible en desktop) */}
            <Link
              href="/user"
              aria-label="Ir a tu cuenta"
              className="ml-3 hidden md:inline-flex w-9 h-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <span className="text-sm">👤</span>
            </Link>

            {/* Hamburguesa móvil */}
            <button
              className="md:hidden ml-2 w-9 h-9 rounded-full bg-white/10 text-white"
              onClick={() => setDrawerOpen(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" aria-modal="true" role="dialog">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[82%] max-w-xs bg-neutral-900 border-r border-white/10 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Image
                src="/legacy/images/logo3.webp"
                alt="MYFILM"
                width={100}
                height={30}
              />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="text-white text-xl"
              >
                ×
              </button>
            </div>
            <div className="pt-2">
              <div className="relative">
                <div className="relative flex items-center h-11 overflow-hidden rounded-[999px] bg-white/5 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.2)] backdrop-blur-md transition focus-within:border-white/25 focus-within:bg-white/10">
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/5 via-white/0 to-white/5 opacity-60" />
                  <span
                    className="relative z-10 pl-4 pr-2 text-white/80 pointer-events-none flex items-center"
                    aria-hidden
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="opacity-90"
                    >
                      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M20 20L16.5 16.5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    type="search"
                    placeholder="Busca todo, todo y todo"
                    className="relative z-10 flex-1 h-full bg-transparent text-white placeholder-white/60 pr-4 outline-none border-0 appearance-none"
                    aria-label="Buscar contenido"
                  />
                </div>
              </div>
            </div>
            <nav className="pt-2 space-y-2" aria-label="Menú móvil">
              {TABS.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  onClick={() => setDrawerOpen(false)}
                  className="block w-full px-3 py-2 rounded-md text-white/90 hover:bg-white/10"
                >
                  {t.label}
                </Link>
              ))}
              {/* En móvil, acceso rápido al perfil */}
              <Link
                href="/user"
                onClick={() => setDrawerOpen(false)}
                className="mt-2 block w-full px-3 py-2 rounded-md text-white/90 hover:bg-white/10"
              >
                👤 Mi perfil
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </header>
  );
}
