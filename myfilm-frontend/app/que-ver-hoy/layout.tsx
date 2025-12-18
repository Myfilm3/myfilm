// app/que-ver-hoy/layout.tsx
export default function QueVerHoyLayout({ children }: { children: React.ReactNode }) {
  // 👇 Cambia esto para bajar/subir el inicio (pt-0, pt-6, pt-10, pt-16, pt-24, pt-32...)
  const CONTENT_TOP = 'pt-10';

  return (
    <div className="min-h-screen text-white">
      <header className="p-4 text-center font-semibold">
        ¿Qué ver hoy?
      </header>

      <main className={`max-w-5xl mx-auto px-4 ${CONTENT_TOP} pb-10`}>
        {children}
      </main>
    </div>
  );
}