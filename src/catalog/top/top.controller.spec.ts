import { Test, TestingModule } from '@nestjs/testing';
import { TopController } from './top.controller';

describe('TopController', () => {
  let controller: TopController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TopController],
    }).compile();

    controller = module.get<TopController>(TopController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
