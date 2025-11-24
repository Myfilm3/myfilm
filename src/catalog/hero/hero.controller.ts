import { Controller, Get } from '@nestjs/common';
import axios from 'axios';

@Controller('hero')
export class HeroController {
  @Get()
  async getHero() {
    try {
      const base = process.env.TMDB_BASE || 'https://api.themoviedb.org/3';
      const key = process.env.TMDB_API_KEY;
      const lang = process.env.TMDB_LANG || 'es-ES';

      if (!key) throw new Error('Falta TMDB_API_KEY en .env');

      const url = `${base}/trending/movie/day?api_key=${key}&language=${lang}`;
      const { data } = await axios.get(url);

      return (data?.results || []).slice(0, 5).map((m) => ({
        id: m.id,
        title: m.title,
        overview: m.overview,
        backdrop: m.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`
          : null,
      }));
    } catch (e: any) {
      // esto evita 500 silenciosos y te devuelve el motivo
      const msg = e?.response?.data || e?.message || 'Error desconocido';
      console.error('TMDB /hero error ->', msg);
      return { error: msg };
    }
  }
}
console.log('TMDB_API_KEY:', process.env.TMDB_API_KEY?.slice(0, 6));
