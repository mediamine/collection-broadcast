import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { defineConfig } from '@playwright/test';
import { AssemblyAI } from 'assemblyai';
import { ASSEMBLY_AI_API_KEY } from 'src/constant';
import { WinstonLoggerService } from 'src/logger';

defineConfig({
  globalTimeout: 5 * 60 * 1000
});

@Injectable()
export class AssemblyAiService {
  private assemblyAiClient: AssemblyAI;

  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService
  ) {
    this.logger.setContext(AssemblyAiService.name);
  }

  async initialize() {
    this.logger.debug('Starting an AssemblyAI instance.');
    const apiKey = this.configService.get<string>(ASSEMBLY_AI_API_KEY);
    if (!apiKey) {
      const errorMessage = `${ASSEMBLY_AI_API_KEY} is undefined`;
      this.logger.error(errorMessage);
      return Promise.reject(errorMessage);
    }

    this.assemblyAiClient = await new AssemblyAI({ apiKey });
  }

  async transcribe({ audio }: { audio: string }): Promise<{ text: string }> {
    this.logger.debug(`Transcribing the audio at: ${audio}`);
    const transcript = await this.assemblyAiClient.transcripts.transcribe({ audio });
    return { text: transcript.text };
  }
}
