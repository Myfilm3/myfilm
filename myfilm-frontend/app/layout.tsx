// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import TopNav from '@/components/nav/TopNav';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'MyFilm – Encuentra qué ver hoy en tus plataformas',
  description:
    'Descubre qué ver esta noche en tus plataformas de streaming. Recomendaciones personalizadas de cine y series en español.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh text-white bg-[#040D19] relative overflow-x-hidden">
        {/* Capa 1: color base */}
        <div className="fixed inset-0 -z-30 bg-[#040D19]" />

        {/* Capa 2: degradado */}
        <div className="fixed inset-0 -z-20">
          <Image
            src="/legacy/images/degradado.webp"
            alt=""
            fill
            // sin priority: dejamos que el hero sea el LCP
            sizes="100vw"
            className="object-cover"
          />
        </div>

        {/* Capa 3: textura (huellas) */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/legacy/images/textura.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-25 mix-blend-overlay"
          />
          {/* Oscurecimiento suave para contraste global */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#040D19]/40 via-transparent to-[#040D19]/50" />
        </div>

        {/* Menú superior */}
        <TopNav />

        {/* Contenido */}
        {children}
      </body>
    </html>
  );
}