import { Module } from '@nestjs/common';
import { PlaywrightService } from 'src/browser';
import { AssemblyAiService } from 'src/browser/assembly-ai/assembly-ai.service';
import { NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND } from 'src/constant/feedScrapers';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { RadioNewZealandService } from 'src/publication/complete-scan';
import { CompleteScanService } from './complete-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PrismaCollectionBroadcastService,
    PlaywrightService,
    AssemblyAiService,
    CompleteScanService,
    { provide: NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND, useClass: RadioNewZealandService }
  ],
  exports: [CompleteScanService, NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND]
})
export class CompleteScanModule {}
