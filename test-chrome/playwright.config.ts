import { defineConfig, devices } from '@playwright/test';
import type { MsTeamsReporterOptions } from 'playwright-msteams-reporter';

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.TESTS_WEBHOOK_URL
    ? [
        ['html'],
        [
          'playwright-msteams-reporter',
          <MsTeamsReporterOptions>{
            webhookUrl: process.env.TESTS_WEBHOOK_URL,
            webhookType: 'powerautomate',
            title: 'Playwright Test Results for Broadcast collection jobs',
            mentionOnFailure: process.env.TESTS_MENTION_ON_FAILURE,
            mentionOnFailureText: 'Hi {mentions}, please verify tests failing for one or more scrapers.',
            enableEmoji: true
          }
        ]
      ]
    : [['html']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    // baseURL: 'http://127.0.0.1:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* https://github.com/microsoft/playwright/issues/22894 */
    launchOptions: {
      ignoreDefaultArgs: ['--disable-component-update']
    }
  },
  /* Configure projects for major browsers */
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome'
      }
    }
  ],
  // Each test is given 60 seconds.
  timeout: 300000

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
