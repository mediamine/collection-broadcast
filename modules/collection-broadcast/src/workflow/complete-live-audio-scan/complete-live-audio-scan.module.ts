import { Module } from '@nestjs/common';
import { PlaywrightService, RabbitMQService } from 'src/browser';
import { NEWS_ITEM_SOURCE_TVNZ } from 'src/constant/feedScrapers';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { TVNZService } from 'src/publication/complete-live-audio-scan';
import { CompleteLiveAudioScanService } from './complete-live-audio-scan.service';

@Module({
  providers: [
    WinstonLoggerService,
    PrismaService,
    PrismaCollectionBroadcastService,
    PlaywrightService,
    CompleteLiveAudioScanService,
    RabbitMQService,
    { provide: NEWS_ITEM_SOURCE_TVNZ, useClass: TVNZService }
  ],
  exports: [CompleteLiveAudioScanService, NEWS_ITEM_SOURCE_TVNZ]
})
export class CompleteLiveAudioScanModule {}
