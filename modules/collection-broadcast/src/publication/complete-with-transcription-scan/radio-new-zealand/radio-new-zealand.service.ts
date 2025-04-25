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

  async authenticate({}: AuthenticateFnProps) {
    throw new Error('Method not implemented.');
  }

  async getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    // TODO: temp. hardcoding till a better solution is found
    url = 'https://www.rnz.co.nz';

    // Wait for page to load
    await page.locator('#documentContent').waitFor();
    await page.locator('div.programme-stories ul li').first().waitFor();

    // Find all articles under each sub-section
    const articles = [...(await page.locator('div.programme-stories ul li').all())];

    // Extract & return all links, titles & descriptions for each article
    return [
      ...(await Promise.all(
        articles.map(async (article) => {
          const title = await article.locator('p').first().textContent();

          const media = await article.locator('rnz-queue-media').getAttribute('media');
          let audioSource = null;
          try {
            audioSource = JSON.parse(media).audioSrc;
          } catch (e) {
            this.logger.error(e.message);
          }

          return {
            link: `${url}${await article.locator('a').getAttribute('href')}`,
            title,
            description: title,
            audioSource
          };
        })
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
