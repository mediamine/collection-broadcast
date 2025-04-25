import { test } from '@playwright/test';
import { ArticleLinkProps, ArticleProps, AuthenticateFnProps, ScanFnProps } from './types';

[{ name: 'TVNZ - 1News at Six', url: 'https://www.tvnz.co.nz/shows/one-news-at-6pm' }].forEach(({ name, url }) => {
  test(`testing ${name} at ${url}`, async ({ page, context }) => {
    await page.goto(url);

    // Start by making sure the 'assemblyai' package is installed.
    // If not, you can install it by running the following command:
    // npm install assemblyai

    // const client = new AssemblyAI({
    //   apiKey: '3026aabe124944d787aed8df054ff358'
    // });

    const page1 = await context.newPage();
    await page1.goto('http://localhost:8501/');
    await page1.getByRole('button', { name: 'Start transcribing' }).click();

    await authenticate({ page });

    const articles = await getLinks({ page, url });

    // Pick a random article from the list returned
    let article = articles[Math.floor(Math.random() * articles.length)];
    // & keep picking again until it has a valid link url
    while (!article.link) {
      article = articles[Math.floor(Math.random() * articles.length)];
    }

    console.log(article);

    const { description, audioSource, text } = await scanArticle({ page, url: article.link });

    await page1.getByRole('button', { name: 'Stop listening' }).click();

    // expect(description.length).toBeGreaterThan(0);
    // expect(audioSource.length).toBeGreaterThan(0);
    // expect(text.length).toBeGreaterThan(0);

    await logout({ page });
  });
});

async function authenticate({ page }: AuthenticateFnProps) {
  await page.getByRole('link', { name: 'Login' }).click();
  await page.getByLabel('Email address').fill('mohsin.khan.4@outlook.com');
  await page.getByLabel('PasswordShow Password').fill('+cCs.a26+JqJLm6');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: 'Mohsin Mohsin' }).click();
}

async function getLinks({ page, url }: ScanFnProps): Promise<Array<ArticleLinkProps>> {
  url = 'https://www.tvnz.co.nz';

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
          link: `${url}${await a.getAttribute('href')}`,
          title: (await a.textContent()).trim(),
          description: (await article.locator(page.locator('div.Episode-description')).textContent()).trim()
        };
      })
    ))
  ];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function scanArticle({ page, url }: ScanFnProps): Promise<ArticleProps> {
  await page.goto(url);
  await page.locator('div.Player-grid').waitFor();

  await page.pause();
  await page.getByRole('button', { name: 'Pause' }).click();

  await page.pause();
  await page.getByRole('button', { name: 'Play', exact: true }).click();

  await page.pause();
  await page.getByRole('button', { name: 'Pause' }).click();

  // // Article Description
  // const media = await page.locator('rnz-queue-media').getAttribute('media');

  // let audioSource = '';
  // try {
  //   audioSource = JSON.parse(media).audioSrc;
  // } catch (e) {
  //   this.logger.error(e.message);
  // }

  // // Article Text
  // const textContents: Array<string> = ([] as Array<string>).concat(await page.locator('div.article__summary p').allTextContents());

  // return {
  //   description: textContents.join(''),
  //   audioSource,
  //   text: textContents.join('')
  // };

  return {
    description: '',
    audioSource: '',
    text: ''
  };
}

async function logout({ page }: AuthenticateFnProps) {
  await page.locator('#User-dropdown').getByText('Mohsin').click();
  await page.getByRole('link', { name: 'Logout' }).click();
}

// const FILE_URL =
//   'https://tvnz-prod-01.brightcovecdn.com/media/v1/dash/live/cenc/963482467001/ebada9b8-4a24-48f5-b2d2-8caeb769caa7/ece332ec-58ff-491f-8c01-90ba84f7a2d0/a9aecbf7-ef39-4332-bd06-c9ece5e52108/3x/segment5.m4f?fastly_token=NjgxYzcyY2FfZDExMzY3YTlmOGVkZmEzNDRkODk5NDY0ZWZkMzBiMWM1NzMwNmZjYmMzNDgwNzBiMjAzZGFkZGI0ZDZiZjM4Nl8vL3R2bnotcHJvZC0wMS5icmlnaHRjb3ZlY2RuLmNvbS9tZWRpYS92MS9kYXNoL2xpdmUvY2VuYy85NjM0ODI0NjcwMDEvZWJhZGE5YjgtNGEyNC00OGY1LWIyZDItOGNhZWI3NjljYWE3L2VjZTMzMmVjLTU4ZmYtNDkxZi04YzAxLTkwYmE4NGY3YTJkMC8%3D';

// You can also transcribe a local file by passing in a file path
// const FILE_URL = './path/to/file.mp3';

// Request parameters
// const data = {
//   audio: FILE_URL
// };

// await page.pause();

// const transcript = await client.transcripts.transcribe(data);
// console.log(transcript.text);
