import { expect, test } from '@playwright/test';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps } from './types';

[{ name: 'Radio New Zealand - Morning Report', url: 'https://www.rnz.co.nz/national/programmes/morningreport/library' }].forEach(
  ({ name, url }) => {
    test(`testing ${name} at ${url}`, async ({ page }) => {
      await page.goto(url);

      await authenticate({ page });

      const articles = await getLinks({ page, url });

      // Pick a random article from the list returned
      let article = articles[Math.floor(Math.random() * articles.length)];
      // & keep picking again until it has a valid link url
      while (!article.link) {
        article = articles[Math.floor(Math.random() * articles.length)];
      }

      const { description, audioSource, text } = await scanArticle({ page, url: article.link });
      expect(description.length).toBeGreaterThan(0);
      expect(audioSource.length).toBeGreaterThan(0);
      expect(text.length).toBeGreaterThan(0);

      await logout({ page });
    });
  }
);

async function authenticate({}: AuthenticateFnProps) {}

async function getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
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

async function scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
  await page.goto(url);
  await page.locator('div.article').waitFor();

  // Article Description
  const media = await page.locator('rnz-queue-media').getAttribute('media');

  let audioSource = '';
  try {
    audioSource = JSON.parse(media).audioSrc;
  } catch (e) {
    //
  }

  // Article Text
  const textContents: Array<string> = ([] as Array<string>).concat(await page.locator('div.article__summary p').allTextContents());

  return {
    description: textContents.join(''),
    audioSource,
    text: textContents.join('')
  };
}

async function logout({}: AuthenticateFnProps) {}
