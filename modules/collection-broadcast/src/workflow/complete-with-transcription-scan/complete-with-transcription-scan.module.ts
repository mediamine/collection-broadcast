import { Module } from '@nestjs/common';
import { AssemblyAiService, PlaywrightService } from 'src/browser';
import { NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND } from 'src/constant/feedScrapers';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { RadioNewZealandService } from 'src/publication/complete-with-transcription-scan';
import { CompleteScanWithTranscriptionService } from './complete-with-transcription-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PrismaCollectionBroadcastService,
    PlaywrightService,
    AssemblyAiService,
    CompleteScanWithTranscriptionService,
    { provide: NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND, useClass: RadioNewZealandService }
  ],
  exports: [CompleteScanWithTranscriptionService, NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND]
})
export class CompleteScanWithTranscriptionModule {}
