import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import hashIt from 'hash-it';
import { uniqBy } from 'lodash';
import { DateTime } from 'luxon';
import { PlaywrightBrowserType, PlaywrightService, RabbitMQService } from 'src/browser';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { ScannerProps } from 'src/publication/types';
import { isCompleteLiveAudioScanExcludedConditions, isCompleteScanExcludedConditions } from './excluded-conditions';

@Injectable()
export class CompleteLiveAudioScanService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private logger: WinstonLoggerService,
    private prismaService: PrismaService,
    private prismaCollectionBroadcastService: PrismaCollectionBroadcastService,
    private playwrightService: PlaywrightService,
    private rabbitMQService: RabbitMQService
  ) {
    this.logger.setContext(CompleteLiveAudioScanService.name);
  }

  async scan({ feed: { id, name, url }, feedScraper }): Promise<void> {
    try {
      this.logger.log(`Invoked ${this.scan.name} with ${JSON.stringify({ id, name, url })} of type: ${feedScraper}`);

      this.logger.debug('Initializing RabbitMQ service');
      await this.rabbitMQService.initialize();

      this.logger.log(`Navigating to ${url}`);
      const { page } = await this.playwrightService.openBrowser({
        url,
        channel: PlaywrightBrowserType.CHROME,
        /**
         * To play DRM based content: https://github.com/microsoft/playwright/issues/22894
         */
        ignoreDefaultArgs: ['--disable-component-update']
      });

      const feedScraperService = this.moduleRef.get<ScannerProps>(feedScraper, { strict: false });
      feedScraperService.authenticate({ page });

      this.logger.debug('Scraping home pages for links.');
      const $newsItems = uniqBy(await feedScraperService.scanHome({ page, url }), 'link');

      this.logger.debug('Find highest newsItem id in db.');
      const newsItemMaxId = await this.prismaService.news_item.findFirstOrThrow({ orderBy: { id: 'desc' } });
      for (const [index, $newsItem] of $newsItems.entries()) {
        const hashcode = hashIt(id.toString() + $newsItem.title + $newsItem.link + $newsItem.description);
        const existingNewsItemHash = await this.prismaService.news_item.findMany({ where: { hashcode } });

        // If no existing duplicate item is found and the link is not explicitly excluded, create a new news item
        if (existingNewsItemHash.length === 0 && !isCompleteLiveAudioScanExcludedConditions($newsItem.link)) {
          const date = DateTime.now().toISO();
          await this.prismaService.news_item.create({
            data: {
              id: BigInt(newsItemMaxId.id ?? 0) + BigInt(index + 1),
              link: $newsItem.link,
              title: $newsItem.title,
              description: $newsItem.description,
              source: name,
              date,
              date_downloaded: date,
              feed_fk: id,
              hashcode,
              page_text: ''
            }
          });
          this.logger.debug(`Created News Item with title: ${$newsItem.title.slice(0, 25)}...`);
        }
      }

      this.logger.debug(`Fetching News Items with blank page text for feed id: ${id}`);
      // Fetch news items that have been downloaded in the last month and have no (blank / null) page text
      // This is to avoid re-downloading the same news items and to ensure that we only scrape the latest news items
      const existingNewsItemsQuery = { feed_fk: id, date_downloaded: { gte: DateTime.now().minus({ month: 1 }).toISO()! } };
      const existingNewsItemHashWithNoPageText = [
        ...(await this.prismaService.news_item.findMany({ where: { ...existingNewsItemsQuery, page_text: '' } })),
        ...(await this.prismaService.news_item.findMany({ where: { ...existingNewsItemsQuery, page_text: null } }))
      ];

      this.logger.log(`Scraping article pages for News Items: [${existingNewsItemHashWithNoPageText.map((ni) => ni.id)}]`);
      for (const [, newsItem] of existingNewsItemHashWithNoPageText.entries()) {
        const { id, link } = newsItem;

        this.logger.log(`Navigating to ${'http://localhost:8501'}?newsItemId=${id} to start transcribing`);
        const { page: page1 } = await this.playwrightService.openNewPage({ url: `http://localhost:8501?newsItemId=${id}` });
        await page1.getByRole('button', { name: 'Start transcribing' }).click();

        // RabbitMQ consumer to receive messages from the queue
        const { consumerTag } = await this.rabbitMQService.consume(async (msg) => {
          const text = msg.content.toString();

          // Process the message
          const liveAudioItem = await this.prismaCollectionBroadcastService.live_audio.findFirst({
            where: { news_item_fk: id }
          });

          this.logger.log(`Persisting Page Text: ${text.slice(0, 15)}...${text.slice(-15)} for News Item: ${id}`);
          if (!liveAudioItem) {
            await this.prismaCollectionBroadcastService.live_audio.create({
              data: { news_item_fk: id, page_text: text }
            });
          } else {
            await this.prismaCollectionBroadcastService.live_audio.update({
              data: { page_text: liveAudioItem.page_text.concat(text) },
              where: { id: liveAudioItem.id }
            });
          }
        });

        if (link && isCompleteScanExcludedConditions(link)) {
          try {
            // this is expected for a long time
            await feedScraperService.scanArticle({ page, url: link });
          } catch (e) {
            this.logger.error(`Error scanning text for ${link}. Exception: ${e.message}`);
          }
        }

        this.logger.debug(`Closing the transcribing page for News Item: ${id}`);
        await page1.getByRole('button', { name: 'Stop transcribing' }).click();
        await page1.close();

        this.logger.debug(`Cancelling RabbitMQ consumer for News Item: ${id}`);
        await this.rabbitMQService.cancelConsumer(consumerTag);

        const liveAudioItem = await this.prismaCollectionBroadcastService.live_audio.findFirst({
          where: { news_item_fk: id }
        });
        await this.prismaService.news_item.update({
          where: { id },
          data: { page_text: liveAudioItem.page_text }
        });
      }

      this.logger.debug('Update Last Download Date in db.');
      await this.prismaService.feed.update({
        where: { id },
        data: { last_download_date: new Date() }
      });

      this.logger.debug('Logging out the browser session.');
      await feedScraperService.logout({ page });
    } catch (e) {
      this.logger.error(e.message);
    } finally {
      await this.playwrightService.closeBrowser();
      await this.rabbitMQService.closeConnection();
    }
  }
}
