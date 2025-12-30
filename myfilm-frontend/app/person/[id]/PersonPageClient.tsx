'use client';

import Image from 'next/image';
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

function formatDateString(input?: string | null) {
  if (!input) return null;
  try {
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return input.slice(0, 10);
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return input.slice(0, 10);
  }
}

function dedupeCredits(entries: PersonCreditEntry[]): PersonCreditEntry[] {
  const byKey = new Map<string, PersonCreditEntry>();
  for (const entry of entries) {
    if (!entry.media_type || entry.id == null) continue;
    const key = `${entry.media_type}-${entry.id}`;
    const best = byKey.get(key);
    if (!best || (entry.popularity ?? 0) > (best.popularity ?? 0)) {
      byKey.set(key, entry);
    }
  }
  return Array.from(byKey.values());
}

function creditYear(entry: PersonCreditEntry) {
  return entry.release_date?.slice(0, 4) ?? entry.first_air_date?.slice(0, 4) ?? undefined;
}

function creditHref(entry: PersonCreditEntry) {
  return entry.media_type === 'tv' ? `/series/${entry.id}` : `/movies/${entry.id}`;
}

const TALK_SHOW_GENRE_ID = 10767;
const NEWS_GENRE_ID = 10763;

function isExcludedTvGenre(entry: PersonCreditEntry) {
  if (entry.media_type !== 'tv') return false;
  const genreIds = entry.genre_ids ?? entry.genres?.map((g) => g.id) ?? [];
  return genreIds.some((id) => id === TALK_SHOW_GENRE_ID || id === NEWS_GENRE_ID);
}

function sortCredits(list: PersonCreditEntry[] = []) {
  return [...list].sort((a, b) => {
    const pa = a.popularity ?? 0;
    const pb = b.popularity ?? 0;
    return pb - pa;
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
  const [bioExpanded, setBioExpanded] = useState(false);

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

  const { knownFor, restCredits, totalCredits } = useMemo(() => {
    const cast = person?.combined_credits?.cast ?? [];
    const crew = person?.combined_credits?.crew ?? [];

    const all = dedupeCredits([...cast, ...crew]).filter((entry) => !isExcludedTvGenre(entry));
    const sorted = sortCredits(all);
    const known = sorted.slice(0, 10);
    const knownKeys = new Set(known.map((entry) => `${entry.media_type}-${entry.id}`));

    const rest = sorted.filter((c) => !knownKeys.has(`${c.media_type}-${c.id}`));

    return { knownFor: known, restCredits: rest, totalCredits: all.length };
  }, [person]);

  useEffect(() => {
    setBioExpanded(false);
  }, [person?.id]);

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
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-white gap-0">
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
  const formattedBirthDate = formatDateString(person.birthday);
  const knownCredits = totalCredits;
  const biography = person.biography?.trim() ?? '';
  const shouldTruncateBio = biography.length > 600;
  const displayedBio =
    bioExpanded || !shouldTruncateBio
      ? biography
      : `${biography.slice(0, 600).trimEnd()}…`;

  return (
    <Container>
      <main className="py-12 space-y-12">
        <section className="flex flex-col gap-0 lg:flex-row lg:items-start rounded-3xl border border-white/10 bg-white/5 backdrop-blur p-6 lg:p-8 shadow-2xl shadow-black/30">
          <div className="w-full max-w-[280px] mx-auto lg:mx-0 lg:mr-6 xl:mr-8">
            <div className="relative w-full aspect-[3/4] rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 shadow-2xl shadow-black/70">
              {profileSrc ? (
                <Image
                  src={profileSrc}
                  alt={person.name}
                  fill
                  sizes="(max-width: 1024px) 280px, 320px"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-slate-300">
                  Sin foto
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <header className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                {person.name}
              </h1>
              <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm text-slate-200/90">
                {formattedBirthDate && (
                  <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-white/60">Fecha de nacimiento:</span>{' '}
                    <span className="font-semibold text-white/90">{formattedBirthDate}</span>
                    {lifespan && (
                      <span className="text-white/60"> ({lifespan})</span>
                    )}
                  </span>
                )}
                {person.place_of_birth && (
                  <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-white/60">Lugar de nacimiento:</span>{' '}
                    <span className="font-semibold text-white/90">{person.place_of_birth}</span>
                  </span>
                )}
                {person.known_for_department && (
                  <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-white/60">Departamento:</span>{' '}
                    <span className="font-semibold text-white/90">
                      {person.known_for_department}
                    </span>
                  </span>
                )}
                {knownCredits > 0 && (
                  <span className="px-4 py-2 rounded-2xl bg-white/10 border border-white/15">
                    <span className="text-white/60">Créditos:</span>{' '}
                    <span className="font-semibold text-white/90">{knownCredits}</span>
                  </span>
                )}
              </div>
            </header>

            {biography && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-amber-300 uppercase tracking-wide">
                  Biografía
                </h3>
                <p className="text-sm sm:text-base text-slate-100/90 leading-relaxed whitespace-pre-line">
                  {displayedBio}
                </p>
                {shouldTruncateBio && (
                  <button
                    type="button"
                    onClick={() => setBioExpanded((prev) => !prev)}
                    className="inline-flex items-center rounded-2xl bg-amber-400/90 text-black px-5 py-2 text-xs font-semibold shadow hover:bg-amber-300 transition"
                  >
                    {bioExpanded ? 'Mostrar menos' : 'Ver todo'}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {knownFor.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Conocido por</h2>
              <span className="text-xs uppercase tracking-widest text-white/50">
                {knownFor.length} títulos
              </span>
            </div>
            <div className="-mx-4">
              <div className="flex gap-4 overflow-x-auto px-4 py-2 snap-x snap-mandatory">
                {knownFor.map((c) => (
                  <div key={`${c.media_type}-${c.id}`} className="snap-start">
                    <PosterCard
                      id={c.id}
                      title={c.title || c.name || ''}
                      poster_path={c.poster_path || null}
                      backdrop_path={c.poster_path || null}
                      year={creditYear(c)}
                      rating={undefined}
                      href={creditHref(c)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {restCredits.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Resto de contenido de {person.name}
              </h2>
              <span className="text-xs text-white/60">{restCredits.length} títulos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-0">
              {restCredits.map((c) => (
                <div
                  key={`${c.media_type}-${c.id}`}
                  className="scale-[0.80] sm:scale-[0.80] md:scale-[0.80] origin-top-left -mb-12"
                >
                  <PosterCard
                    id={c.id}
                    title={c.title || c.name || ''}
                    poster_path={c.poster_path || null}
                    backdrop_path={c.poster_path || null}
                    year={creditYear(c)}
                    rating={undefined}
                    href={creditHref(c)}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </Container>
  );
}
