// app/page.tsx
import type { ReactNode } from 'react';
import { getTop } from '@/lib/api';
import Hero from './Hero';
import CarouselSection from '@/components/layout/CarouselSection';
import MoodsSection from '@/components/home/MoodsSection';
import MostWatchedSection from '@/components/home/MostWatchedSection';
import UpcomingSection from '@/components/home/UpcomingSection';
import GenresSection from '@/components/home/GenresSection';

function FullBleed90vw({ children }: { children: ReactNode }) {
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
      {heroItems.length > 0 && <Hero items={heroItems} fullBleed />}

      <main className="relative z-[5] pt-0 space-y-12">
        {/* Recomendaciones para ti → asomando 250px dentro del hero */}
        <div className="-mt-[250px]">
          <FullBleed90vw>
            <CarouselSection
              title="Recomendaciones para ti"
              items={(popularAll.results ?? []).slice(0, 22)}
            />
          </FullBleed90vw>
        </div>

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

        {/* Lo más visto en tus plataformas (panel grande + carrusel derecha) */}
        <FullBleed90vw>
          <MostWatchedSection
            items={(mostWatchedAll.results ?? []).slice(0, 12)}
          />
        </FullBleed90vw>

        {/* Relacionado con lo último que has visto (de momento falseado con trendingWeek) */}
        <FullBleed90vw>
          <CarouselSection
            title="Relacionado con lo último que has visto"
            items={(trendingWeek.results ?? []).slice(0, 22)}
          />
        </FullBleed90vw>

        {/* NUEVA sección: géneros + CTA “¿Aún con todo…?” */}
        <FullBleed90vw>
          <GenresSection />
        </FullBleed90vw>

        {/* Próximamente → con texto de estreno al hacer hover */}
        <FullBleed90vw>
          <UpcomingSection items={(upcomingMovies.results ?? []).slice(0, 22)} />
        </FullBleed90vw>
      </main>
    </>
  );
}