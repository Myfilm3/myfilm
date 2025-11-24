import { Module } from '@nestjs/common';
import { ListsController } from './lists.controller';

@Module({
  controllers: [ListsController],
})
export class ListsModule {}
