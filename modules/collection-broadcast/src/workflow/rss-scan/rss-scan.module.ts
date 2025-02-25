import { Module } from '@nestjs/common';
import { PlaywrightService } from 'src/browser';
import { AssemblyAiService } from 'src/browser/assembly-ai/assembly-ai.service';
import { RssParserService } from 'src/browser/rss-parser/rss-parser.service';
import { NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND_RSS } from 'src/constant/feedScrapers';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { RadioNewZealandService as RadioNewZealandServiceRSS } from 'src/publication/rss-scan';
import { RssScanService } from './rss-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PrismaCollectionBroadcastService,
    PlaywrightService,
    AssemblyAiService,
    RssParserService,
    RssScanService,
    { provide: NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND_RSS, useClass: RadioNewZealandServiceRSS }
  ],
  exports: [RssScanService, NEWS_ITEM_SOURCE_RADIO_NEW_ZEALAND_RSS]
})
export class RssScanModule {}
