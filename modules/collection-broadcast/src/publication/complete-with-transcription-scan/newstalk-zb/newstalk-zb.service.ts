import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DateTime } from 'luxon';
import { WinstonLoggerService } from 'src/logger';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps, ScannerProps } from '../../types';

@Injectable()
export class NewstalkZBService implements ScannerProps {
  constructor(
    protected configService: ConfigService,
    protected logger: WinstonLoggerService
  ) {
    this.logger.setContext(NewstalkZBService.name);
  }

  async authenticate({}: AuthenticateFnProps) {
    throw new Error('Method not implemented.');
  }

  async getLinks({ page, name }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    const articles = [];
    const regions = await page.locator('#auRegion option').all();
    const days = await page.locator('#auDay option').all();
    const times = await page.locator('#auTime option').all();

    const regionsValues = await Promise.all(regions.map((region) => region.getAttribute('value')));
    const regionValue = regionsValues.find((region) => name.toLowerCase().includes(region));
    await page.locator('#auRegion').selectOption(regionValue);

    for (const day of days) {
      const dayValue = String(await day.getAttribute('value'));
      await page.locator('#auDay').selectOption(dayValue);

      const lastHour =
        DateTime.fromFormat(dayValue, 'yyyy.MM.dd').startOf('day') < DateTime.now().startOf('day')
          ? null
          : DateTime.now().set({ minute: 0, second: 0, millisecond: 0 });

      for (const time of times) {
        const timeValue = String(await time.getAttribute('value'));

        if (!timeValue.endsWith('00')) {
          continue;
        } else if (lastHour && DateTime.fromFormat(timeValue, 'hh.mm') > lastHour) {
          continue;
        } else {
          await page.locator('#auTime').selectOption(timeValue);
        }

        await page.locator('dl[data-test-ui="article-publish-date"]').first().waitFor();
        await page.locator('div[data-test-ui="week-on-demand-player"]').waitFor();

        // Find all articles under each sub-section
        const link = await page.locator('div[data-test-ui="week-on-demand-player"] audio').getAttribute('src');
        const title = `${regionValue} - ${await day.textContent()} - ${await time.textContent()}`;
        articles.push({
          link,
          title,
          description: title,
          audioSource: link
        });
      }
    }

    // Extract & return all links, titles & descriptions for each article
    return [...articles];
  }

  async scanHome({ page, url, name }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    await page.locator('header[data-test-ui="article-header"]').first().waitFor();

    try {
      // Create a list of all links
      const newsItems: Array<ArticleLinkProps> = [].concat(await this.getLinks({ page, url, name }));

      return newsItems;
    } catch (e: any) {
      this.logger.error(e.message);
      return [];
    }
  }

  async scanArticle({}: ScanFnProps): Promise<ArticleProps> {
    throw new Error('Method not implemented.');
  }

  async logout({}: AuthenticateFnProps) {
    throw new Error('Method not implemented.');
  }
}
