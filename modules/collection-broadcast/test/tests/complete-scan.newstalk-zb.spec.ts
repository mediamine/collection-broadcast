import { expect, test } from '@playwright/test';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps } from './types';

[
  { name: 'Newstalk ZB - The Mike Hosking Breakfast', url: 'https://www.iheart.com/podcast/211-the-mike-hosking-breakfast-24837692/' },
  { name: 'Newstalk ZB Broadcast - Politics Central', url: 'https://www.iheart.com/podcast/1049-politics-central-30202125/' },
  { name: 'Newstalk ZB Broadcast - Early Edition', url: 'https://www.iheart.com/podcast/211-early-edition-with-ryan-br-25086386/' },
  { name: 'Newstalk ZB Broadcast - Canterbury Mornings', url: 'https://www.iheart.com/podcast/211-canterbury-mornings-with-j-24837961/' },
  {
    name: 'Newstalk ZB Broadcast - Kerre Woodham Mornings',
    url: 'https://www.iheart.com/podcast/1049-kerre-woodham-mornings-po-46787367/'
  },
  { name: 'Newstalk ZB Broadcast - The Country', url: 'https://www.iheart.com/podcast/1049-the-country-28628176/' },
  { name: 'Newstalk ZB Broadcast - The Weekend Collective', url: 'https://www.iheart.com/podcast/1049-the-weekend-collective-29347422/' },
  { name: 'Newstalk ZB Broadcast - The Resident Builder', url: 'https://www.iheart.com/podcast/211-the-resident-builder-podca-54160827/' },
  { name: 'Newstalk ZB Broadcast - Wellington Mornings', url: 'https://www.iheart.com/podcast/1049-wellington-mornings-with-84297824/' },
  { name: 'The Front Page - Podcast', url: 'https://www.iheart.com/podcast/1049-the-front-page-30038501/' },
  {
    name: 'Newstalk ZB Broadcast - Matt Heath & Tyler Adams Afternoons',
    url: 'https://www.iheart.com/podcast/1049-matt-heath-tyler-adams-af-46787368/'
  },
  {
    name: 'Newstalk ZB Broadcast - Heather Du Plessis-Allan Drive',
    url: 'https://www.iheart.com/podcast/211-heather-du-plessis-allan-d-24837940/'
  }
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

async function scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
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

async function logout({}: AuthenticateFnProps) {}
