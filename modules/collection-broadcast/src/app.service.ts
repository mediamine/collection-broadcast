import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FEEDS_TO_IDS_COMPLETE_SCAN, WORKFLOW, WORKFLOW_COMPLETE_SCAN } from './constant';
import { PrismaService } from './db';
import { WinstonLoggerService } from './logger';
import { CompleteScanService } from './workflow';

@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService,
    private logger: WinstonLoggerService,
    private prismaService: PrismaService,
    private completeScanService: CompleteScanService
  ) {
    this.logger.setContext(AppService.name);
  }

  async scrape(): Promise<void> {
    this.logger.log('Invoking a scraping session');

    const workflow = this.configService.get<string>(WORKFLOW) ?? '';

    switch (workflow) {
      case WORKFLOW_COMPLETE_SCAN:
        try {
          const feedsToIdsCompleteScan: Record<string, Array<string>> = JSON.parse(
            this.configService.get<string>(FEEDS_TO_IDS_COMPLETE_SCAN) ?? '{}'
          );

          const feeds = Object.entries(feedsToIdsCompleteScan).reduce((memo, [feedType, feedIds]) => {
            feedIds.forEach((f) => {
              memo[f] = feedType;
            });
            return memo;
          }, {});
          this.logger.debug(`Received feeds for complete scans: ${JSON.stringify(feeds)}`);

          for (const feedId of Object.keys(feeds)) {
            const feed = await this.prismaService.feed.findUnique({ where: { id: Number(feedId) } });

            try {
              await this.completeScanService.scan({ feed, feedScraper: feeds[feedId] });
            } catch (e) {
              this.logger.error(`Failed scan for: ${feed.name}. ${e.message}`);
            }
          }
        } catch (e) {
          this.logger.error(`Error parsing feed list: ${FEEDS_TO_IDS_COMPLETE_SCAN}. ${e.message}`);
        }
        break;

      default:
    }
  }
}
