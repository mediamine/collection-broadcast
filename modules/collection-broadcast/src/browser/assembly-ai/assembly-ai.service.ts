import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrowserContext, defineConfig } from '@playwright/test';
import { AssemblyAI } from 'assemblyai';
import { WinstonLoggerService } from 'src/logger';

defineConfig({
  globalTimeout: 5 * 60 * 1000
});

@Injectable()
export class AssemblyAiService {
  private assemblyAiClient: AssemblyAI;
  private context: BrowserContext;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService
  ) {
    this.logger.setContext(AssemblyAiService.name);
  }

  async initialize() {
    this.logger.debug('Starting an AssemblyAI instance.');
    this.assemblyAiClient = await new AssemblyAI({
      apiKey: '3026aabe124944d787aed8df054ff358'
    });
  }

  async transcribe({ audio }: { audio: string }): Promise<{ text: string }> {
    this.logger.debug(`Transcribing the audio at: ${audio}`);
    const transcript = await this.assemblyAiClient.transcripts.transcribe({ audio });
    return { text: transcript.text };
  }
}
