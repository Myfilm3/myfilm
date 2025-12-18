// app/que-ver-hoy/types.ts

export type QVHType = 'movie' | 'series' | 'documentary';

export type QVHMood =
  | 'pensar'
  | 'risas'
  | 'tension'
  | 'cana_al_mono'
  | 'joya'
  | 'llorar'
  | 'otro_mundo'
  | 'miedo'
  | 'colegas'
  | 'hechos_reales'
  | 'direccion'
  | 'rapida';

export type QVHTime = '<90' | '90-120' | '>120';

export type QVHContext = 'solo' | 'pareja' | 'amigos' | 'familia';

// Documentales: temática + tiempo simple
export type DocTheme =
  | 'true_crime'
  | 'historias_reales'
  | 'historia'
  | 'naturaleza_animales'
  | 'ciencia_tecnologia'
  | 'sociedad_actualidad'
  | 'biografias'
  | 'deportes'
  | 'cultura_entretenimiento'
  | 'misterio_enigmas'
  | 'guerra_conflictos'
  | 'economia_poder';

export type DocTime = '<40' | '>40';

export const MOODS: { key: QVHMood; label: string }[] = [
  { key: 'pensar', label: 'Pensar un rato' },
  { key: 'risas', label: 'Noche de risas' },
  { key: 'tension', label: 'Estar en tensión' },
  { key: 'cana_al_mono', label: 'Caña al mono' },
  { key: 'joya', label: 'Joya escondida' },
  { key: 'llorar', label: 'Quiero llorar' },
  { key: 'otro_mundo', label: 'Ir a otro mundo' },
  { key: 'miedo', label: 'Pasarlo de miedo' },
  { key: 'colegas', label: 'Para ver con colegas' },
  { key: 'hechos_reales', label: 'Basado en hechos reales' },
  { key: 'direccion', label: 'La dirección importa' },
  { key: 'rapida', label: 'Rápida y ligera' },
];

// TMDB keyword IDs (placeholder):
// Mañana lo afinamos con tus keywords reales de TMDB.
// Hoy solo necesitamos que el flujo y el fetch funcionen.
export const DOC_THEMES: { key: DocTheme; label: string; tmdbKeywordIds: number[] }[] = [
  { key: 'true_crime', label: 'True Crime', tmdbKeywordIds: [] },
  { key: 'historias_reales', label: 'Historias reales', tmdbKeywordIds: [] },
  { key: 'historia', label: 'Historia', tmdbKeywordIds: [] },
  { key: 'naturaleza_animales', label: 'Naturaleza y animales', tmdbKeywordIds: [] },
  { key: 'ciencia_tecnologia', label: 'Ciencia y tecnología', tmdbKeywordIds: [] },
  { key: 'sociedad_actualidad', label: 'Sociedad y actualidad', tmdbKeywordIds: [] },
  { key: 'biografias', label: 'Biografías', tmdbKeywordIds: [] },
  { key: 'deportes', label: 'Deportes', tmdbKeywordIds: [] },
  { key: 'cultura_entretenimiento', label: 'Cultura y entretenimiento', tmdbKeywordIds: [] },
  { key: 'misterio_enigmas', label: 'Misterio y enigmas', tmdbKeywordIds: [] },
  { key: 'guerra_conflictos', label: 'Guerra y conflictos', tmdbKeywordIds: [] },
  { key: 'economia_poder', label: 'Economía y poder', tmdbKeywordIds: [] },
];