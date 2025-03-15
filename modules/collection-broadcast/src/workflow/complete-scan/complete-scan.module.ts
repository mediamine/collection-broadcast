import { Module } from '@nestjs/common';
import { PlaywrightService } from 'src/browser';
import { NEWS_ITEM_SOURCE_NEWSTALK_ZB } from 'src/constant/feedScrapers';
import { PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { NewstalkZBService } from 'src/publication/complete-scan';
import { CompleteScanService } from './complete-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PlaywrightService,
    CompleteScanService,
    { provide: NEWS_ITEM_SOURCE_NEWSTALK_ZB, useClass: NewstalkZBService }
  ],
  exports: [CompleteScanService, NEWS_ITEM_SOURCE_NEWSTALK_ZB]
})
export class CompleteScanModule {}
