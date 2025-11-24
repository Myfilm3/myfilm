export default function UserProfileSettings() {
  return (
    <main className="px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-semibold">Perfil de usuario</h1>
        <p className="text-sm text-white/70">
          Aquí podrás cambiar tu foto, alias, preferencias personales y futuros ajustes
          sociales de MyFilm.
        </p>

        <section className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-sm text-white/60">
            Más adelante añadiremos el selector de avatar/foto, alias, nombre público,
            país, idiomas preferidos, géneros favoritos, etc.
          </p>
        </section>
      </div>
    </main>
  );
}