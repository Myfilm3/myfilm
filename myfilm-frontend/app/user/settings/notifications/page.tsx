export default function NotificationSettings() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <p className="text-sm text-white/70">
          Elige qué avisos quieres recibir sobre nuevos estrenos y cambios en los
          títulos que sigues.
        </p>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-sm text-white/60">
            Aquí irán los toggles para estrenos en tus plataformas, recordatorios de
            &quot;Seguir viendo&quot;, avisos por email/push, etc.
          </p>
        </section>
      </div>
    </main>
  );
}
