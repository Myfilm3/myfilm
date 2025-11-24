import { Test, TestingModule } from '@nestjs/testing';
import { WatchmodeService } from './watchmode.service';

describe('WatchmodeService', () => {
  let service: WatchmodeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WatchmodeService],
    }).compile();

    service = module.get<WatchmodeService>(WatchmodeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
