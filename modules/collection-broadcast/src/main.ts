import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
const BigIntPrototype: BigInt & { toJSON?: () => string } = BigInt.prototype;
BigIntPrototype.toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Run onModuleDestroy hooks (Prisma $disconnect) if the process is signalled mid-run.
  app.enableShutdownHooks();

  try {
    await app.get(AppService).scrape();
  } finally {
    // Triggers onModuleDestroy -> $disconnect(), releasing DB connections before exit.
    await app.close();
  }
}
bootstrap();
