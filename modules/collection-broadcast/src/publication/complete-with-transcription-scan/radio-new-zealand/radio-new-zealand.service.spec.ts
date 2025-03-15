import { Test, TestingModule } from '@nestjs/testing';
import { RadioNewZealandService } from './radio-new-zealand.service';

describe('RadioNewZealandService', () => {
  let service: RadioNewZealandService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RadioNewZealandService]
    }).compile();

    service = module.get<RadioNewZealandService>(RadioNewZealandService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
