import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from 'src/logger';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps, ScannerProps } from '../../types';

@Injectable()
export class NewstalkZBService implements ScannerProps {
  constructor(
    protected configService: ConfigService,
    protected logger: WinstonLoggerService
  ) {}

  async authenticate({}: AuthenticateFnProps) {}

  async getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    url = 'https://www.iheart.com';

    // Wait for page to load
    await page.locator('[data-test="podcast-profile-body"]').waitFor();
    await page.locator('[data-test="podcast-episode-card"]').first().waitFor();

    // Find all articles under each sub-section
    await page.getByRole('button', { name: 'See More' }).click();
    const articles = [...(await page.locator('[data-test="podcast-episode-card"] [data-test="podcast-episode-name"] a').all())];

    // Extract & return all links, titles & descriptions for each article
    return [
      ...(await Promise.all(
        articles
          .filter(async (article) => await article.isVisible())
          .map(async (article) => ({
            link: `${url}${await article.getAttribute('href')}`,
            title: await article.textContent(),
            description: ''
          }))
      ))
    ];
  }

  async scanHome({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    await page.locator('div#page-view-container').waitFor();

    try {
      // Create a list of all links
      const newsItems: Array<ArticleLinkProps> = ([] as Array<ArticleLinkProps>).concat(await this.getLinks({ page, url }));

      return newsItems;
    } catch (e: any) {
      this.logger.error(e.message);
      return [];
    }
  }

  async scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
    await page.goto(url);
    await page.locator('[data-test="podcast-episode-card"]').waitFor();

    // Article Text
    const textContents: Array<string> = ([] as Array<string>).concat(
      await page.locator('div[itemprop="podcastDescription"] p').allTextContents(),
      await page.locator('div#transcription span').allTextContents()
    );

    return {
      description: textContents.join(''),
      text: textContents.join('')
    };
  }

  async logout({}: AuthenticateFnProps) {}
}
