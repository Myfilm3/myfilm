export default function PrivacySettings() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Privacidad</h1>
        <p className="text-sm text-white/70">
          Controla tu visibilidad pública, el perfil compartido y opciones relacionadas
          con la protección de tus datos.
        </p>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-sm text-white/60">
            Aquí añadiremos los toggles de visibilidad, ocultar actividad, descarga de
            datos, eliminación de cuenta, etc.
          </p>
        </section>
      </div>
    </main>
  );
}
