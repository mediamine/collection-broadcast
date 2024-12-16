import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from 'src/logger';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps, ScannerProps } from '../../types';

@Injectable()
export class RadioNewZealandService implements ScannerProps {
  constructor(
    protected configService: ConfigService,
    protected logger: WinstonLoggerService
  ) {
    this.logger.setContext(RadioNewZealandService.name);
  }

  async authenticate({}: AuthenticateFnProps) {}

  async getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    // TODO: temp. hardcoding till a better solution is found
    url = 'https://www.rnz.co.nz';

    // Wait for page to load
    await page.locator('#documentContent').waitFor();
    await page.locator('div.episode-summaries ul li > a').first().waitFor();

    // Find all articles under each sub-section
    const articles = [...(await page.locator('div.episode-summaries ul li > a').all())];

    // Extract & return all links, titles & descriptions for each article
    return [
      ...(await Promise.all(
        articles.map(async (article) => ({
          link: `${url}${await article.getAttribute('href')}`,
          title: ((await article.textContent()) as string).replace(/^\s*\d{1,2}:\d{2}\s*/, ''),
          description: ''
        }))
      ))
    ];
  }

  async scanHome({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    await page.locator('div.wrapper').waitFor();

    try {
      // Create a list of all links
      const newsItems: Array<ArticleLinkProps> = ([] as Array<ArticleLinkProps>).concat(await this.getLinks({ page, url }));

      return newsItems;
    } catch (e: any) {
      console.error(e.message);
      return [];
    }
  }

  async scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
    await page.goto(url);
    await page.locator('div.article').waitFor();

    // Article Description
    const media = await page.locator('rnz-queue-media').getAttribute('media');

    let audioSource = null;
    try {
      audioSource = JSON.parse(media).audioSrc;
    } catch (e) {
      console.error(e.message);
    }

    // Article Text
    const textContents: Array<string> = ([] as Array<string>).concat(await page.locator('div.article__summary p').allTextContents());

    return {
      description: textContents.join(''),
      audioSource,
      text: textContents.join('')
    };
  }

  async logout({}: AuthenticateFnProps) {}
}
