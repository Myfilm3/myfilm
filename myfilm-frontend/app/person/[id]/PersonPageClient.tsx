'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Container from '@/components/layout/Container';
import PosterCard from '@/components/cards/PosterCard';
import { getPerson, type PersonDetails, type PersonCreditEntry } from '@/lib/api';

function formatLifespan(person: PersonDetails) {
  const birth = person.birthday;
  const death = person.deathday;

  if (!birth && !death) return null;

  const fmt = (d?: string | null) => (d ? d.slice(0, 10) : '¿?');
  if (!death) return `${fmt(birth)} — presente`;
  return `${fmt(birth)} — ${fmt(death)}`;
}

function sortCredits(list: PersonCreditEntry[] = []) {
  return [...list].sort((a, b) => {
    const pa = a.popularity ?? 0;
    const pb = b.popularity ?? 0;
    if (pb !== pa) return pb - pa;
    const va = a.vote_count ?? 0;
    const vb = b.vote_count ?? 0;
    return vb - va;
  });
}

export default function PersonPageClient() {
  const params = useParams();
  const rawId =
    typeof params?.id === 'string'
      ? params.id
      : Array.isArray(params?.id)
      ? params.id[0]
      : null;

  const [person, setPerson] = useState<PersonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rawId) {
      setError('ID de persona no encontrado.');
      setLoading(false);
      return;
    }

    const id = Number(rawId);
    if (!Number.isFinite(id) || id <= 0) {
      setError('ID de persona no válido.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getPerson(id);
        if (cancelled) return;

        if (!data) {
          setError('Persona no encontrada.');
          setLoading(false);
          return;
        }

        setPerson(data);
      } catch (e) {
        console.error('Error cargando persona', e);
        if (!cancelled) setError('Error cargando la persona.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [rawId]);

  const { movieCredits, tvCredits } = useMemo(() => {
    const cast = person?.combined_credits?.cast ?? [];
    const crew = person?.combined_credits?.crew ?? [];

    const all = [...cast, ...crew];

    const movies = sortCredits(
      all.filter((c) => c.media_type === 'movie'),
    );
    const tv = sortCredits(
      all.filter((c) => c.media_type === 'tv'),
    );

    return { movieCredits: movies, tvCredits: tv };
  }, [person]);

  if (loading) {
    return (
      <Container>
        <div className="min-h-[60vh] flex items-center justify-center text-white">
          Cargando persona…
        </div>
      </Container>
    );
  }

  if (error || !person) {
    return (
      <Container>
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-2">
          <p className="text-lg font-semibold">
            {error ?? 'Persona no encontrada.'}
          </p>
          <code className="text-xs bg-black/60 px-2 py-1 rounded border border-white/10">
            /person/&lt;id_tmdb&gt;
          </code>
        </div>
      </Container>
    );
  }

  const profileSrc = person.profile_path
    ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
    : null;

  const lifespan = formatLifespan(person);

  return (
    <div className="relative min-h-screen text-white bg-gradient-to-b from-black via-slate-950 to-black">
      <Container>
        <main className="py-10 space-y-10">
          {/* CABECERA PERSONA */}
          <section className="flex flex-col gap-8 lg:flex-row lg:items-start">
            {/* FOTO */}
            <div className="w-full max-w-[260px] mx-auto lg:mx-0">
              <div className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-white/5 border border-white/10 shadow-2xl shadow-black/70">
                {profileSrc ? (
                  <img
                    src={profileSrc}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm text-slate-300">
                    Sin foto
                  </div>
                )}
              </div>
            </div>

            {/* DATOS */}
            <div className="flex-1 space-y-4">
              <header className="space-y-2">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                  {person.name}
                </h1>

                <div className="flex flex-wrap gap-3 text-sm text-slate-200/90">
                  {person.known_for_department && (
                    <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/20">
                      {person.known_for_department}
                    </span>
                  )}
                  {lifespan && <span>{lifespan}</span>}
                  {person.place_of_birth && (
                    <span>{person.place_of_birth}</span>
                  )}
                </div>
              </header>

              {person.biography && (
                <p className="max-w-3xl text-sm sm:text-base text-slate-100/90 leading-relaxed whitespace-pre-line">
                  {person.biography}
                </p>
              )}
            </div>
          </section>

          {/* FILMOGRAFÍA – PELÍCULAS */}
          {movieCredits.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Películas destacadas
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {movieCredits.map((c) => (
                  <PosterCard
                    key={`${c.media_type}-${c.id}`}
                    id={c.id}
                    title={c.title || c.name || ''}
                    poster_path={c.poster_path || null}
                    backdrop_path={c.poster_path || null}
                    year={
                      // TMDB a veces sólo da release_date, aquí no viene
                      undefined
                    }
                    rating={undefined}
                    href={`/movies/${c.id}`}
                  />
                ))}
              </div>
            </section>
          )}

          {/* FILMOGRAFÍA – SERIES */}
          {tvCredits.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-semibold">
                Series destacadas
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {tvCredits.map((c) => (
                  <PosterCard
                    key={`${c.media_type}-${c.id}`}
                    id={c.id}
                    title={c.name || c.title || ''}
                    poster_path={c.poster_path || null}
                    backdrop_path={c.poster_path || null}
                    year={undefined}
                    rating={undefined}
                    href={`/series/${c.id}`}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
      </Container>
    </div>
  );
}