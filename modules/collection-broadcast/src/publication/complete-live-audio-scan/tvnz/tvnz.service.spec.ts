import { Test, TestingModule } from '@nestjs/testing';
import { TVNZService } from './tvnz.service';

describe('TVNZService', () => {
  let service: TVNZService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TVNZService]
    }).compile();

    service = module.get<TVNZService>(TVNZService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
