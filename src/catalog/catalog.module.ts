import { Module } from '@nestjs/common';
import { TmdbModule } from '../tmdb/tmdb.module';

import { TopController } from './top/top.controller';
import { TitleController } from './title/title.controller';
import { PersonController } from './person/person.controller';
import { GenreController } from './genre/genre.controller';
import { ConfigController } from './config/config.controller';
import { DiscoverController } from './discover/discover.controller';

// Si tu SearchController está fuera de /catalog/, impórtalo así:
import { SearchController } from '../search/search.controller';

@Module({
  imports: [TmdbModule],
  controllers: [
    TopController,
    SearchController,
    TitleController,
    PersonController,
    GenreController,
    ConfigController,
    DiscoverController,
  ],
})
export class CatalogModule {}
