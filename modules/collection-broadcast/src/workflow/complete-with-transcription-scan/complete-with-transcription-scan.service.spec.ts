import { Test, TestingModule } from '@nestjs/testing';
import { CompleteScanWithTranscriptionService } from './complete-with-transcription-scan.service';

describe('CompleteScanWithTranscriptionService', () => {
  let service: CompleteScanWithTranscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompleteScanWithTranscriptionService]
    }).compile();

    service = module.get<CompleteScanWithTranscriptionService>(CompleteScanWithTranscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
