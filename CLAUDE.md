# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A NestJS-based web scraper that collects broadcast (radio/TV) news items for MediaMine. Despite the NestJS framework and `EXPOSE 3000` in the Dockerfile, **this is not an HTTP server** — it is a one-shot batch job. [src/main.ts](modules/collection-broadcast/src/main.ts) creates a standalone application context (`NestFactory.createApplicationContext`), calls `AppService.scrape()` once, and the process exits. It is meant to be invoked repeatedly (e.g. via cron or the `start.sh` loop), once per workflow run.

## Repository layout

Yarn workspaces monorepo (`workspaces: ["modules/*"]`). The app lives in **[modules/collection-broadcast](modules/collection-broadcast)** — almost all work happens there, and all the yarn scripts below must be run from that directory (the root `package.json` has no scripts; the root `README.md`'s bare `yarn start` is misleading). Other workspaces/dirs are Playwright test suites that exercise the live scraper selectors against real sites (not unit tests):
- `modules/collection-broadcast/test` — Playwright project, run via `yarn test:playwright`
- `test-chrome/` — Playwright project at the repo root (**not** a workspace), run via `yarn test-chrome:playwright`
- `modules/collection-broadcast-test` — a separate Playwright workspace

## Commands

Run from `modules/collection-broadcast` unless noted:

```bash
yarn                       # install (run at repo ROOT; postinstall generates BOTH prisma clients)
yarn build                 # nest build -> dist/
WORKFLOW=WORKFLOW_COMPLETE_SCAN yarn start   # run a single scrape; WORKFLOW env selects what runs
yarn start:dev             # watch mode
yarn lint                  # eslint --fix
yarn format                # prettier --write
yarn test                  # jest unit tests (*.spec.ts under src/)
yarn test path/to/x.spec.ts          # single test file
yarn test -t "describe or it name"   # single test by name
yarn test:cov              # coverage
yarn test:e2e              # jest with test/jest-e2e.json

# Prisma (two schemas / two databases — see below)
yarn prisma:generate                       # generates client for schema.prisma (DATABASE_URL)
yarn prisma:generate:collection-broadcast  # generates client for schema.collection-broadcast.prisma
yarn prisma:db:push:collection-broadcast   # push collection-broadcast schema

# Playwright site smoke tests (not unit tests)
yarn test:playwright            # ./test
yarn test-chrome:playwright     # repo-root ./test-chrome
```

Docker (from the module dir): `docker build -t mediamine/collection-broadcast .`. `docker-compose.yml` provisions the local Postgres only.

## Architecture

### Workflow dispatch (the central control flow)
[src/app.service.ts](modules/collection-broadcast/src/app.service.ts) `scrape()` is the entry point. It:
1. Reads the `WORKFLOW` env var and `switch`es on it (`WORKFLOW_COMPLETE_SCAN`, `WORKFLOW_COMPLETE_LIVE_AUDIO_SCAN`, `WORKFLOW_RSS_SCAN`, `WORKFLOW_COMPLETE_WITH_TRANSCRIPTION_SCAN`). All constants are in [src/constant/index.ts](modules/collection-broadcast/src/constant/index.ts).
2. Parses the matching `FEEDS_TO_IDS_*` env var, which is **JSON mapping a scraper-source name to an array of feed IDs**, e.g. `{"Newstalk ZB": ["123","124"]}`. It inverts this to `feedId -> scraperName`.
3. For each feed ID, loads the `feed` row from the DB and calls the workflow service's `scan({ feed, feedScraper })`, where `feedScraper` is the source-name string.

`WORKFLOW_COMPLETE_WITH_TRANSCRIPTION_SCAN` is currently **disabled** (commented out in `app.module.ts` and `app.service.ts`); that case is a no-op even though the module/service still exist.

### The scraper-source string token (key concept)
The source-name strings in [src/constant/feedScrapers.ts](modules/collection-broadcast/src/constant/feedScrapers.ts) (e.g. `'Newstalk ZB'`, `'TVNZ'`, `'Radio New Zealand'`, `'Radio New Zealand (RSS)'`) serve triple duty: they are the keys in the `FEEDS_TO_IDS_*` JSON, **and** the NestJS DI provider tokens, **and** the value passed as `feedScraper`. Workflow modules register scrapers as `{ provide: NEWS_ITEM_SOURCE_X, useClass: XService }`, and the workflow service resolves the right scraper at runtime with `this.moduleRef.get<ScannerProps>(feedScraper, { strict: false })`.

### Workflows and scrapers
- `src/workflow/<name>/` — each workflow is a NestJS Module + Service. The **Service owns the orchestration** (browser lifecycle, dedup, DB writes) and is generic across sources; the **Module wires which source scrapers are available**.
- `src/publication/<workflow>/<source>/` — each source scraper is a class implementing the `ScannerProps` interface from [src/publication/types.ts](modules/collection-broadcast/src/publication/types.ts): `authenticate`, `scanHome` (→ article links), `scanArticle` (→ page text), `logout`. These contain site-specific Playwright selectors.

Typical `scan()` flow (see [complete-scan.service.ts](modules/collection-broadcast/src/workflow/complete-scan/complete-scan.service.ts)): open browser → `authenticate` → `scanHome` for links → dedupe by link → compute `hashcode = hashIt(feedId + title + link + description)` → skip if that `hashcode` already exists in `news_item` → insert new `news_item` rows → re-query the last month's items with blank/null `page_text` → `scanArticle` each (gated by `excluded-conditions.ts`) → persist `page_text` → update `feed.last_download_date` → `logout` → `closeBrowser` in `finally`.

Note: `news_item.id` is assigned **manually** — it finds the current max id and adds `index + 1` (no DB autoincrement on this table).

### Live audio scan (the most complex workflow)
[complete-live-audio-scan.service.ts](modules/collection-broadcast/src/workflow/complete-live-audio-scan/complete-live-audio-scan.service.ts) transcribes live streams. It launches the real Chrome channel with `ignoreDefaultArgs: ['--disable-component-update']` to allow DRM (Widevine) playback, then drives an **external transcription web app at `http://localhost:8501`** (clicks "Start transcribing" / "Stop transcribing") and consumes the resulting transcript text from a **RabbitMQ** queue. Transcript chunks accumulate in the `live_audio` table (collection-broadcast DB), then are copied into `news_item.page_text`. `AssemblyAiService` also exists for transcription but is not what drives this flow.

### Two databases / two Prisma clients
This app talks to two Postgres databases via two generated Prisma clients (both regenerated on `postinstall`):
- **[src/db/prisma/prisma.service.ts](modules/collection-broadcast/src/db/prisma/prisma.service.ts)** → `prisma/schema.prisma`, env `DATABASE_URL`. The large **shared MediaMine DB** (`feed`, `news_item`, `app_user`, …). This schema is introspected from the existing DB — treat it as read-mostly and do not casually edit it.
- **[src/db/prisma-collection-broadcast/...](modules/collection-broadcast/src/db/prisma-collection-broadcast/prisma-collection-broadcast.service.ts)** → `prisma/schema.collection-broadcast.prisma`, env `DATABASE_URL_COLLECTION_BROADCAST`. This **app's own DB** (`audio_source`, `live_audio`). Its client is generated to `.prisma/client/collection-broadcast` and imported via a relative path, not `@prisma/client`.

After changing either schema, regenerate the corresponding client. BigInt serialization is patched globally in `main.ts` (`BigInt.prototype.toJSON`).

### Logging
Inject `WinstonLoggerService` and call `this.logger.setContext(ClassName.name)` in the constructor (every service does this). It is `Scope.TRANSIENT`, mirrors output to the Nest console logger, and writes daily-rotated files to `./logs`.

## Conventions
- Imports use the `src/...` baseUrl alias and barrel `index.ts` re-exports per directory (`src/db`, `src/browser`, `src/logger`, `src/workflow`, and each `publication/<workflow>` group). Prefer importing from the barrel.
- Config comes from `@nestjs/config` (global), reading `.env`, `.env.dev`, `.env.prod`. Key vars: `WORKFLOW`, `FEEDS_TO_IDS_*`, `DATABASE_URL`, `DATABASE_URL_COLLECTION_BROADCAST`, `HEADLESS`, `RABBITMQ_CONNECTION_URL`, `RABBITMQ_QUEUE_NAME`, `ASSEMBLY_AI_API_KEY`, `TVNZ_LOGIN_USERNAME`/`_PASSWORD`/`_PROFILE`.
- TypeScript is intentionally lax (`strictNullChecks: false`, `noImplicitAny: false`). Prettier: single quotes, no semicolons-off (semi true), width 140, 2 spaces, with `prettier-plugin-organize-imports`.

## Adding a new broadcast source
1. Add a source-name constant to `src/constant/feedScrapers.ts`.
2. Create `src/publication/<workflow>/<source>/<source>.service.ts` implementing `ScannerProps`.
3. Register it in that workflow's module `providers` as `{ provide: NEWS_ITEM_SOURCE_X, useClass: XService }` and add it to `exports`.
4. Add the source name as a key in the relevant `FEEDS_TO_IDS_*` env JSON, mapped to the feed IDs it should scan.
