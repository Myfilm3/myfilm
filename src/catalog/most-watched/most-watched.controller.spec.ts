import { Test, TestingModule } from '@nestjs/testing';
import { MostWatchedController } from './most-watched.controller';

describe('MostWatchedController', () => {
  let controller: MostWatchedController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MostWatchedController],
    }).compile();

    controller = module.get<MostWatchedController>(MostWatchedController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
