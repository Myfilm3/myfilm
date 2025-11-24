import { Test, TestingModule } from '@nestjs/testing';
import { MfbController } from './mfb.controller';

describe('MfbController', () => {
  let controller: MfbController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MfbController],
    }).compile();

    controller = module.get<MfbController>(MfbController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
