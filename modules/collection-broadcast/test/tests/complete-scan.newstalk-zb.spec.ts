import { expect, test } from '@playwright/test';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps } from './types';

[
  { name: 'Newstalk ZB - The Mike Hosking Breakfast', url: 'https://www.iheart.com/podcast/211-the-mike-hosking-breakfast-24837692/' }
].forEach(({ name, url }) => {
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

    const { description, text } = await scanArticle({ page, url: article.link });
    expect(description.length).toBeGreaterThan(0);
    expect(text.length).toBeGreaterThan(0);

    await logout({ page });
  });
});

async function authenticate({}: AuthenticateFnProps) {}

async function getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
  url = 'https://www.iheart.com';

  // Wait for page to load
  await page.locator('[data-test="podcast-profile-body"]').waitFor();
  await page.locator('[data-test="podcast-episode-card"]').first().waitFor();

  // Find all articles under each sub-section
  const articles = [...(await page.locator('[data-test="podcast-episode-card"] [data-test="podcast-episode-name"] a').all())];

  // Extract & return all links, titles & descriptions for each article
  return [
    ...(await Promise.all(
      articles.map(async (article) => ({
        link: `${url}${await article.getAttribute('href')}`,
        title: await article.textContent(),
        description: ''
      }))
    ))
  ];
}

async function scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
  await page.goto(url);
  await page.locator('[data-test="podcast-episode-card"]').waitFor();

  // Article Text
  const textContents: Array<string> = ([] as Array<string>).concat(
    await page.locator('div[itemprop="podcastDescription"] p').allTextContents()
  );

  return {
    description: textContents.join(''),
    text: textContents.join('')
  };
}

async function logout({}: AuthenticateFnProps) {}
