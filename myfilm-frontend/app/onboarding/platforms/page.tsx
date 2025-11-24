'use client';

export default function OnboardingPlatforms() {
  return (
    <main className="min-h-screen px-6 py-10 flex flex-col items-center">
      <div className="max-w-3xl w-full space-y-8">
        <header className="space-y-2">
          <p className="text-sm text-white/60">Paso 2 de 3</p>
          <h1 className="text-3xl font-semibold">Tus plataformas</h1>
          <p className="text-sm text-white/70">
            Selecciona dónde tienes cuenta. Esto nos permite enseñarte contenido
            realmente disponible para ti.
          </p>

          <div className="mt-4 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-white/80" style={{ width: '66%' }} />
          </div>
        </header>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-sm text-white/60">
            Aquí irán los botones de plataformas (Netflix, Prime, Disney+, etc.)
          </p>
        </section>

        <footer className="flex justify-between pt-4">
          <button className="text-sm text-white/70 hover:text-white">Volver</button>
          <button className="rounded-full bg-white text-black px-6 py-2 text-sm">
            Continuar
          </button>
        </footer>
      </div>
    </main>
  );
}