import { Module } from '@nestjs/common';
import { AssemblyAiService, PlaywrightService } from 'src/browser';
import { NEWS_ITEM_SOURCE_NEWSTALK_ZB, NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND } from 'src/constant/feedScrapers';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { NewstalkZBService, RadioNewZealandService } from 'src/publication/complete-with-transcription-scan';
import { CompleteScanWithTranscriptionService } from './complete-with-transcription-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PrismaCollectionBroadcastService,
    PlaywrightService,
    AssemblyAiService,
    CompleteScanWithTranscriptionService,
    { provide: NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND, useClass: RadioNewZealandService },
    { provide: NEWS_ITEM_SOURCE_NEWSTALK_ZB, useClass: NewstalkZBService }
  ],
  exports: [CompleteScanWithTranscriptionService, NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND, NEWS_ITEM_SOURCE_NEWSTALK_ZB]
})
export class CompleteScanWithTranscriptionModule {}
