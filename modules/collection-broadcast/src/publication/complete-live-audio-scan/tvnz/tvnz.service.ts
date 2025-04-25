import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonLoggerService } from 'src/logger';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps, ScannerProps } from '../../types';

@Injectable()
export class TVNZService implements ScannerProps {
  private readonly baseUrl = 'https://www.tvnz.co.nz';

  constructor(
    protected configService: ConfigService,
    protected logger: WinstonLoggerService
  ) {}

  async authenticate({ page }: AuthenticateFnProps) {
    await page.getByRole('link', { name: 'Login' }).click();
    await page.getByLabel('Email address').fill(this.configService.get('TVNZ_LOGIN_USERNAME'));
    await page.getByLabel('PasswordShow Password').fill(this.configService.get('TVNZ_LOGIN_PASSWORD'));
    await page.getByRole('button', { name: 'Login' }).click();

    // Select the profile
    const profile = this.configService.get('TVNZ_LOGIN_PROFILE');
    await page.getByRole('link', { name: `${profile} ${profile}` }).click();
  }

  async getLinks({ page }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    // Wait for page to load
    await page.locator('ul.Episodes-list').waitFor();
    await page.locator('ul.Episodes-list li.Grid').first().waitFor();

    // Find all articles under each sub-section
    const articles = [...(await page.locator('ul.Episodes-list li.Grid > div.Episode').all())];

    // Extract & return all links, titles & descriptions for each article
    return [
      ...(await Promise.all(
        articles.map(async (article) => {
          const a = await article.locator(page.locator('a').first());
          return {
            link: `${this.baseUrl}${await a.getAttribute('href')}`,
            title: (await a.textContent()).trim(),
            description: (await article.locator(page.locator('div.Episode-description')).textContent()).trim()
          };
        })
      ))
    ];
  }

  async scanHome({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
    await page.locator('div.application-container').waitFor();

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

    await page.locator('div.Player-grid').waitFor();
    // wait for 1 hour maximum for the Replay button to appear
    await page.getByTitle('Replay').waitFor({ state: 'attached', timeout: 3600000 });

    return;
  }

  async logout({ page }: AuthenticateFnProps) {
    const profile = this.configService.get('TVNZ_LOGIN_PROFILE');
    await page.locator('#User-dropdown').getByText(profile).click();
    await page.getByRole('link', { name: 'Logout' }).click();
  }
}
