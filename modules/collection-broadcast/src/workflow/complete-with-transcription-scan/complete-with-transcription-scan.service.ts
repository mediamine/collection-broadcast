import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import hashIt from 'hash-it';
import { uniqBy } from 'lodash';
import { DateTime } from 'luxon';
import { PlaywrightService } from 'src/browser';
import { AssemblyAiService } from 'src/browser/assembly-ai/assembly-ai.service';
import { PrismaCollectionBroadcastService, PrismaService } from 'src/db';
import { WinstonLoggerService } from 'src/logger';
import { ScannerProps } from 'src/publication/types';

@Injectable()
export class CompleteScanWithTranscriptionService {
  constructor(
    private readonly moduleRef: ModuleRef,
    private logger: WinstonLoggerService,
    private prismaService: PrismaService,
    private prismaCollectionBroadcastService: PrismaCollectionBroadcastService,
    private playwrightService: PlaywrightService,
    private assemblyAiService: AssemblyAiService
  ) {
    this.logger.setContext(CompleteScanWithTranscriptionService.name);
  }

  async scan({ feed: { id, name, url }, feedScraper }): Promise<void> {
    try {
      this.logger.log(`Invoked ${this.scan.name} with ${JSON.stringify({ id, name, url })} of type: ${feedScraper}`);

      this.assemblyAiService.initialize();

      this.logger.log(`Navigating to ${url}`);
      const { page } = await this.playwrightService.openBrowser({ url });

      const feedScraperService = this.moduleRef.get<ScannerProps>(feedScraper, { strict: false });

      this.logger.debug('Scraping home pages for links.');
      const $newsItems = uniqBy(await feedScraperService.scanHome({ page, url, name }), 'link');

      this.logger.debug('Find highest newsItem id in db.');
      const newsItemMaxId = await this.prismaService.news_item.findFirstOrThrow({ orderBy: { id: 'desc' } });
      for (const [index, $newsItem] of $newsItems.entries()) {
        const hashcode = hashIt(id.toString() + $newsItem.title + $newsItem.link + $newsItem.description);
        const existingNewsItemHash = await this.prismaService.news_item.findMany({ where: { hashcode } });

        // If no existing duplicate item is found
        if (existingNewsItemHash.length === 0) {
          const newsItemId = BigInt(newsItemMaxId.id ?? 0) + BigInt(index + 1);

          const audioSourcePreExistingForNewsItem = await this.prismaCollectionBroadcastService.audio_source.findFirst({
            where: { news_item_fk: newsItemId }
          });

          if (!audioSourcePreExistingForNewsItem) {
            const audioSource = $newsItem.audioSource;
            if (audioSource) {
              await this.prismaCollectionBroadcastService.audio_source.create({
                data: {
                  audio_source: audioSource,
                  audio_source_text: '',
                  page_text: $newsItem.description,
                  news_item_fk: newsItemId
                }
              });
            }
          }

          const date = DateTime.now().toISO();
          await this.prismaService.news_item.create({
            data: {
              id: newsItemId,
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
      const existingNewsItemsQuery = { feed_fk: id, date_downloaded: { gte: DateTime.now().minus({ month: 1 }).toISO()! } };
      const existingNewsItemHashWithNoPageText = [
        ...(await this.prismaService.news_item.findMany({ where: { ...existingNewsItemsQuery, page_text: '' } })),
        ...(await this.prismaService.news_item.findMany({ where: { ...existingNewsItemsQuery, page_text: null } }))
      ];

      let count = 0; // TODO: remove once live

      this.logger.log(`Scraping article pages for News Items: [${existingNewsItemHashWithNoPageText.map((ni) => ni.id)}]`);

      for (const [, newsItem] of existingNewsItemHashWithNoPageText.entries()) {
        const { id } = newsItem;

        const audioSource = await this.prismaCollectionBroadcastService.audio_source.findFirst({
          where: {
            news_item_fk: id
          }
        });

        if (
          count < 5 && // TODO: remove once live
          audioSource &&
          audioSource.audio_source
        ) {
          count++; // TODO: remove once live

          try {
            const audioSourceText = (await this.assemblyAiService.transcribe({ audio: audioSource.audio_source }))?.text;

            this.logger.log(
              `Persisting Audio Source Text: ${audioSourceText.slice(0, 15)}...${audioSourceText.slice(-15)} for News Item: ${id}`
            );
            await this.prismaCollectionBroadcastService.audio_source.update({
              data: {
                audio_source_text: audioSourceText
              },
              where: {
                id: audioSource.id
              }
            });

            this.logger.log(`Persisting Page Text: ${audioSourceText.slice(0, 15)}...${audioSourceText.slice(-15)} for News Item: ${id}`);
            await this.prismaService.news_item.update({
              where: { id },
              data: { page_text: audioSourceText }
            });
          } catch (e) {
            this.logger.error(`Error scanning text for ${audioSource.audio_source}. Exception: ${e.message}`);
          }
        }
      }

      this.logger.debug('Update Last Download Date in db.');
      await this.prismaService.feed.update({
        where: { id },
        data: { last_download_date: new Date() }
      });
    } catch (e) {
      this.logger.error(e.message);
    } finally {
      await this.playwrightService.closeBrowser();
    }
  }
}
