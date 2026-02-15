# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Architecture

- **Dual-process design**: API server (`src/server.ts`) and worker (`src/worker.ts`) run as separate processes. Both must be started for full functionality: `npm run dev:api` and `npm run dev:worker`.
- **Database**: SQLite with WAL mode (`db.pragma('journal_mode = WAL')`). Both processes call `initDb()` on startup.
- **Worker polling**: Worker claims queued audits via atomic UPDATE with 800ms polling interval.
- **Audit flow**: API receives requests → writes to DB → worker polls and processes → writes report → API serves results.
- **WordPress Integration**: When WP REST API is detected, fetches content metadata for enhanced analysis (freshness, site type, total content count).

## Build/Run Commands

```bash
# Development (run both in separate terminals)
npm run dev:api      # Start API server with hot reload on :8787
npm run dev:worker   # Start worker with hot reload

# Production
npm run build        # Compile TypeScript to dist/
npm run start:api    # Run compiled API server
npm run start:worker # Run compiled worker

# Code quality
npm run lint         # Run ESLint on all .ts files
npx eslint . --ext .ts --fix  # Auto-fix linting issues
```

**Note**: No test framework is currently configured. If adding tests, use a single test command pattern like `npm test -- src/path/to/file.test.ts`.

## Code Style Guidelines

### Imports
- **ESM with .js extensions**: All imports use `.js` extension despite TypeScript files (required for ES2022 modules with `moduleResolution: "Bundler"`)
- Group imports: 1) external libraries, 2) internal modules, 3) type-only imports
- Use `import type { Foo } from './file.js'` for type-only imports
- Example:
  ```typescript
  import { Hono } from 'hono';
  import { z } from 'zod';
  import { initDb } from './db.js';
  import type { AuditStatus } from './types.js';
  ```

### Formatting
- No trailing semicolons (except where required for ASI)
- Single quotes for strings
- Arrow functions: `(x) => x` with parens for single params
- Short functions on one line when readable: `const fn = () => value`
- Trailing commas in multiline objects/arrays
- No line length limit enforced, but keep under 120 chars for readability

### Types & Naming
- **Strict TypeScript**: All types defined in `src/types.ts`
- **Naming conventions**:
  - PascalCase: types, interfaces, enums (e.g., `AuditStatus`, `Report`)
  - camelCase: variables, functions, methods (e.g., `getAudit`, `runAudit`)
  - UPPER_SNAKE_CASE: constants (e.g., `STR`, `CHECK` in i18n)
- **Type exports**: Explicitly export types from `types.ts` for reuse
- **Zod schemas**: Define validation schemas inline near usage (e.g., `AuditCreateSchema` in server.ts)
- Use `as const` for literal type assertions where needed

### Error Handling
- Use try/catch in async functions with typed errors: `catch (e: any)`
- Return structured error responses: `{ error: { code: 'ERROR_CODE', message: '...' } }`
- Use HTTP status codes appropriately: 400 (bad request), 404 (not found), 409 (conflict), etc.
- Worker catches audit failures and updates DB with error status
- **WP API errors**: Gracefully degrade to pure crawling if WP REST API fails

### Functions & Patterns
- **Env helpers**: Use `env()`/`envInt()` from `src/env.ts` - throws on missing required vars, supports fallbacks
  ```typescript
  const dbPath = env('DB_PATH', './data/app.db');  // with fallback
  const port = envInt('PORT', 8787);               // numeric with fallback
  ```
- **i18n**: Use `t(lang, key)` from `src/utils/i18n.ts` for user-facing text. Supports FA/EN languages.
  ```typescript
  const message = t(lang, 'not_found');
  ```
- **Database**: Use better-sqlite3 with prepared statements. All SQL in `src/db.ts`.
- **Date handling**: Use `new Date().toISOString()` for consistent UTC timestamps
- **Progress callbacks**: Pass `(stage, value) => void` for long-running operations
- **WP API rate limiting**: Use 600ms delay between requests, max 10 pages (1000 items)

### Project Structure
```
src/
├── server.ts              # Hono API server
├── worker.ts              # Background job processor
├── db.ts                  # SQLite database operations
├── types.ts               # TypeScript type definitions
├── env.ts                 # Environment variable helpers
├── audit/                 # Audit logic
│   ├── runAudit.ts        # Main audit orchestration
│   ├── wpApi.ts           # WordPress REST API client ⭐ NEW v1.7
│   ├── freshness.ts       # Content freshness analysis ⭐ NEW v1.7
│   ├── score.ts           # 5-pillar scoring algorithm
│   ├── smart.ts           # Smart sampling algorithm
│   ├── summary.ts         # Findings aggregation
│   ├── telegram.ts        # Telegram message formatting
│   ├── pdf.ts             # PDF report generation
│   ├── fetcher.ts         # HTTP fetching
│   ├── html.ts            # HTML parsing
│   ├── sitemap.ts         # Sitemap parsing
│   ├── robots.ts          # robots.txt handling
│   ├── linkcheck.ts       # Link validation
│   ├── siteType.ts        # Site type detection
│   └── url.ts             # URL utilities
└── utils/
    └── i18n.ts            # Internationalization
```

## Key Files

- `src/audit/runAudit.ts` - Main audit orchestration, coordinates all modules
- `src/audit/wpApi.ts` - WordPress REST API integration, fetches content metadata
- `src/audit/freshness.ts` - Content freshness calculations and latest content tracking
- `src/audit/score.ts` - 5-pillar scoring algorithm (Indexability, Crawlability, On-Page, Technical, Freshness)
- `src/audit/smart.ts` - Smart sampling with stratified selection
- `src/audit/siteType.ts` - Site classification (ecommerce/corporate/content)
- `src/db.ts` - All database operations, SQLite schema
- `src/types.ts` - Core type definitions (AuditStatus, Limits, Report, WpApiData, etc.)
- `src/env.ts` - Environment variable access helpers
- `src/utils/i18n.ts` - Translation strings and language detection
- `SCORING.md` - Detailed scoring algorithm documentation

## WordPress Integration (v1.7)

### Detection
- Automatically detects WP sites via `/wp-json/wp/v2/types` endpoint
- 5-second timeout, gracefully degrades if unavailable
- Uses lightweight endpoint (25KB) vs root endpoint (2.4MB)

### Data Fetched
- **Post types**: products, posts, pages, custom types
- **Content items**: URL, modified date, status, title
- **Taxonomies**: categories, tags, product categories
- **Total count**: Exact content item count

### Freshness Analysis
- Calculates freshness score (0-100) based on last modified dates
- Identifies stale content (>6 months old)
- Tracks 5 most recent products and posts
- Generates recommendations for content updates

### Integration in Audit Flow
```typescript
// 1. Detect and fetch WP data (concurrent with robots/sitemap)
const wpData = await fetchWpData(origin, limits);

// 2. Use for site type classification
const siteType = detectSiteTypeWithWpData(wpData);

// 3. Add priority URLs to crawl candidates
const priorityUrls = getPriorityUrls(wpData.contentItems, 20, 180);

// 4. Include freshness in scoring
const scores = scoreSite(pages, totals, lang, siteType, freshnessData);
```

## Configuration

- **TypeScript**: ES2022, strict mode, Bundler module resolution
- **ESLint**: Uses typescript-eslint (config in package.json)
- **Environment**: Copy `.env.example` to `.env` for local development
- **Data directory**: SQLite DB stored in `./data/` (gitignored)
- **Port**: Default 8787 (Cloudflare Workers compatible)

## Common Patterns

### Adding a new API endpoint
1. Add route in `src/server.ts` using Hono app
2. Define Zod schema for validation if accepting body params
3. Call appropriate DB functions from `src/db.ts`
4. Return JSON with appropriate status codes

### Adding database operations
1. Add function to `src/db.ts`
2. Use `db.prepare()` with parameterized queries
3. Export function for use in server or worker
4. Update types in `src/types.ts` if needed

### Adding i18n strings
1. Add to `STR.en` and `STR.fa` objects in `src/utils/i18n.ts`
2. Use `t(lang, key)` to retrieve translated string
3. Fallback to English if translation missing

### Adding WP API features
1. Add fetch function to `src/audit/wpApi.ts`
2. Update `WpApiData` type in `src/types.ts`
3. Process data in `src/audit/freshness.ts` if freshness-related
4. Integrate into `src/audit/runAudit.ts` flow
5. Update report generation to include new fields

## Important Notes

- Always import with `.js` extension even for `.ts` files
- Both API and worker must be running for full functionality
- Worker uses atomic UPDATE to claim jobs (prevents race conditions)
- PDF generation uses pdfkit - check memory usage for large reports
- SQLite WAL mode enables concurrent reads during writes
- WP REST API requests are rate-limited (600ms between calls)
- Persian/Arabic URLs are properly handled (percent-encoding normalization)
- Static assets (CSS, JS, images) are filtered from crawl results
- API endpoints (/wp-json/, /xmlrpc.php) are blocked from crawling
- See `SCORING.md` for detailed scoring algorithm documentation
