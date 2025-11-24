// app/page.tsx
import { getTop } from '@/lib/api';
import Hero from './Hero';
import CarouselSection from '@/components/layout/CarouselSection';
import MoodsSection from '@/components/home/MoodsSection';

function FullBleed90vw({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] px-[5vw]">
      {children}
    </div>
  );
}

export default async function Home() {
  const [
    trendingWeek,
    popularAll,
    bestRatedMovies,
    mostWatchedAll,
    upcomingMovies,
  ] = await Promise.all([
    // Hero → tendencias de la semana (pelis + series)
    getTop('trending', { type: 'all', window: 'week', page: 1 }),

    // Nuestras recomendaciones → populares (pelis + series)
    getTop('popular', { type: 'all', page: 1 }),

    // Mejor valoradas → SOLO películas
    getTop('top_rated', { type: 'movie', page: 1 }),

    // Lo más visto en tus plataformas → tendencias del día (pelis + series)
    getTop('trending', { type: 'all', window: 'day', page: 1 }),

    // Próximamente → upcoming TMDB
    getTop('upcoming', { page: 1 }),
  ]);

  // Hero con máximo 10
  const heroItems = (trendingWeek.results ?? []).slice(0, 10);

  return (
    <>
      {heroItems.length > 0 && (
        // No pasamos intervalSec para evitar el warning de tipos; que use el default
        <Hero items={heroItems} fullBleed />
      )}

      <main className="space-y-12 py-8">
        {/* Nuestras recomendaciones */}
        <FullBleed90vw>
          <CarouselSection
            title="Nuestras recomendaciones"
            items={(popularAll.results ?? []).slice(0, 22)}
          />
        </FullBleed90vw>

        {/* Mejor valoradas (solo películas) */}
        <FullBleed90vw>
          <CarouselSection
            title="Mejor valoradas"
            items={(bestRatedMovies.results ?? []).slice(0, 22)}
          />
        </FullBleed90vw>

        {/* Moods / ¿Qué te apetece sentir hoy? */}
        <FullBleed90vw>
          <MoodsSection />
        </FullBleed90vw>

        {/* Lo más visto en tus plataformas */}
        <FullBleed90vw>
          <CarouselSection
            title="Lo más visto en tus plataformas"
            items={(mostWatchedAll.results ?? []).slice(0, 22)}
          />
        </FullBleed90vw>

        {/* Próximamente */}
        <FullBleed90vw>
          <CarouselSection
            title="Próximamente"
            items={(upcomingMovies.results ?? []).slice(0, 22)}
          />
        </FullBleed90vw>
      </main>
    </>
  );
}