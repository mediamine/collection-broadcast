import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { PrismaCollectionBroadcastService, PrismaService } from './db';
import { WinstonLoggerService } from './logger';
import { CompleteLiveAudioScanModule, CompleteScanModule, CompleteScanWithTranscriptionModule, RssScanModule } from './workflow';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '.env.dev', '.env.prod']
    }),
    CompleteLiveAudioScanModule,
    CompleteScanModule,
    CompleteScanWithTranscriptionModule,
    RssScanModule
  ],
  controllers: [],
  providers: [AppService, WinstonLoggerService, PrismaCollectionBroadcastService, PrismaService]
})
export class AppModule {}
