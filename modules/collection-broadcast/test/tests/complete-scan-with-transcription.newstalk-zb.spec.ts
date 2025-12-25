import { expect, test } from '@playwright/test';
import { DateTime } from 'luxon';
import { ArticleLinkProps, AuthenticateFnProps, ScanFnProps } from './types';

[
  { name: 'NewsTalk ZB Broadcast - News Bulletin Auckland', url: 'https://www.newstalkzb.co.nz/on-demand/week-on-demand/' },
  { name: 'NewsTalk ZB Broadcast - News Bulletin Wellington', url: 'https://www.newstalkzb.co.nz/on-demand/week-on-demand/' },
  { name: 'NewsTalk ZB Broadcast - News Bulletin Christchurch', url: 'https://www.newstalkzb.co.nz/on-demand/week-on-demand/' }
].forEach(({ name, url }) => {
  test.skip(`testing ${name} at ${url}`, async ({ page }) => {
    await page.goto(url);

    await authenticate({ page });

    const articles = await getLinks({ page, url, name });

    for (const article of articles) {
      expect(article.link).toBeDefined();
      expect(
        article.link.match(
          /https:\/\/weekondemand\.newstalkzb\.co\.nz\/WeekOnDemand\/ZB\/(auckland|wellington|christchurch)\/\d{4}.\d{2}.\d{2}-\d{2}.\d{2}.\d{2}-(D|S).mp3/g
        ).length
      ).toBeGreaterThanOrEqual(1);
    }

    // Pick a random article from the list returned
    let article = articles[Math.floor(Math.random() * articles.length)];

    // & keep picking again until it has a valid link url
    while (!article.link) {
      article = articles[Math.floor(Math.random() * articles.length)];
    }

    await scanArticle({ page, url: article.link });

    await logout({ page });
  });
});

async function authenticate({}: AuthenticateFnProps) {}

async function getLinks({ page, name }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
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

async function scanArticle({}: ScanFnProps) {}

async function logout({}: AuthenticateFnProps) {}
