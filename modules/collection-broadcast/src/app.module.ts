import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { PrismaCollectionBroadcastService, PrismaService } from './db';
import { WinstonLoggerService } from './logger';
import { CompleteScanModule } from './workflow';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '.env.dev', '.env.prod']
    }),
    CompleteScanModule
  ],
  controllers: [],
  providers: [AppService, WinstonLoggerService, PrismaCollectionBroadcastService, PrismaService]
})
export class AppModule {}
