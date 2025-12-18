// src/mfb/embedding-texts.ts
import type { TmdbAny } from './tmdb.service';

function clean(s?: string | null) {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

export function buildEmbeddingTexts(t: TmdbAny) {
  const title = clean(t.title ?? t.name);
  const overview = clean((t as any).overview);
  const genres = (t.genres ?? []).map(g => g.name).join(', ');
  const year =
    t.release_date?.slice(0, 4) ??
    t.first_air_date?.slice(0, 4) ??
    '';

  return {
    theme: clean(`
      Themes and subjects of the story.
      ${overview}
      Genres: ${genres}.
    `),

    mood: clean(`
      Overall emotional atmosphere.
      Dark or light, oppressive or hopeful.
      ${overview}
    `),

    pace: clean(`
      Narrative rhythm and intensity.
      Is it slow-burning or fast-paced?
      ${overview}
    `),

    tone: clean(`
      Narrative tone and attitude.
      Serious, grounded, cerebral, raw or poetic.
      ${overview}
    `),

    visual: clean(`
      Visual style and cinematography.
      Lighting, colors, realism or stylization.
    `),

    depth: clean(`
      Intellectual and philosophical depth.
      Does it provoke thought or interpretation?
      ${overview}
    `),

    tension: clean(`
      Level and type of tension.
      Suspense, psychological pressure or danger.
      ${overview}
    `),

    emotion: clean(`
      Emotional impact on the viewer.
      What feeling remains after watching?
      ${overview}
    `),

    target: clean(`
      Intended audience.
      Mature viewers, casual audiences or cinephiles.
      Genres: ${genres}.
    `),

    experience: clean(`
      Overall viewing experience.
      Immersive, intense, heavy or entertaining.
      ${title} (${year})
    `),
  };
}