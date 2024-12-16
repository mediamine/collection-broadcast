import { Test, TestingModule } from '@nestjs/testing';
import { AssemblyAiService } from './assembly-ai.service';

describe('AssemblyAiService', () => {
  let service: AssemblyAiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AssemblyAiService]
    }).compile();

    service = module.get<AssemblyAiService>(AssemblyAiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
