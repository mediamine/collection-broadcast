import { Test, TestingModule } from '@nestjs/testing';
import { CompleteLiveAudioScanService } from './complete-live-audio-scan.service';

describe('CompleteLiveAudioScanService', () => {
  let service: CompleteLiveAudioScanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CompleteLiveAudioScanService]
    }).compile();

    service = module.get<CompleteLiveAudioScanService>(CompleteLiveAudioScanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
