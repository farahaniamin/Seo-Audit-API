# SEO Audit Bot — v1.7

A production-ready SEO audit service with WordPress integration, content freshness analysis, and intelligent scoring.

## Key Features

- **Dual Audit Modes**: Smart sampling (50 pages) or Full crawl (120 pages)
- **WordPress REST API Integration**: Enhanced accuracy for WP sites with content freshness tracking
- **5-Pillar Scoring System**: Indexability, Crawlability, On-Page SEO, Technical, Freshness
- **Content Freshness Analysis**: Tracks last modified dates, identifies stale content (>6 months)
- **Latest Content Tracking**: Shows 5 most recent products and blog posts
- **Bilingual Support**: Telegram summaries in Persian (FA) and English (EN)
- **Comprehensive Reports**: JSON, PDF, and Telegram-formatted outputs

## Run (Development)

```bash
npm install
cp .env.example .env

# Terminal 1: Start API server
npm run dev:api

# Terminal 2: Start worker
npm run dev:worker
```

## API Endpoints

### Create Audit
```bash
curl -X POST http://localhost:8787/v1/audits \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "profile": "smart"
  }'
```

### Get Full Report
```bash
curl http://localhost:8787/v1/audits/<audit_id>/report
```

### Get Telegram Summary
```bash
# Persian
curl http://localhost:8787/v1/audits/<audit_id>/telegram?lang=fa

# English
curl http://localhost:8787/v1/audits/<audit_id>/telegram?lang=en
```

### Download PDF Report
```bash
curl http://localhost:8787/v1/audits/<audit_id>/report.pdf?lang=fa -o report.pdf
```

## Audit Profiles

- **smart** (default): Sample-based, polite crawling, 50 pages, lower resource usage
- **full**: Comprehensive crawl, 120 pages, higher accuracy, longer processing time

## WordPress Integration

For WordPress sites, the audit automatically:
- Detects WP REST API availability
- Fetches content type distribution (posts, pages, products)
- Analyzes content freshness (last modified dates)
- Identifies stale content (>6 months old)
- Shows latest updated products and posts
- Enhances site type classification (ecommerce vs blog vs corporate)

### Report Fields (WP Sites)

```json
{
  "wp_api": {
    "available": true,
    "postTypes": {
      "product": 48,
      "post": 76,
      "page": 11
    },
    "totalItems": 136
  },
  "freshness": {
    "score": 37,
    "stale_count": 86,
    "freshness_grade": "F",
    "latest_products": [...],
    "latest_posts": [...]
  }
}
```

## Scoring System

The 5-pillar scoring algorithm provides honest, actionable assessments:

| Pillar | Weight | Description |
|--------|--------|-------------|
| **Indexability** | 24% | Can search engines index your pages? |
| **Crawlability** | 18% | Can crawlers access your content? |
| **On-Page SEO** | 26% | Are pages optimized for keywords? |
| **Technical** | 18% | Implementation quality |
| **Freshness** | 14% | How recently was content updated? |

### Grade Scale
- **A** (90-100): Excellent
- **B** (80-89): Good
- **C** (70-79): Fair
- **D** (60-69): Needs Work
- **F** (<60): Critical Issues

See [SCORING.md](SCORING.md) for detailed algorithm documentation.

## Project Structure

```
src/
├── server.ts              # Hono API server
├── worker.ts              # Background job processor
├── db.ts                  # SQLite database
├── types.ts               # TypeScript definitions
├── env.ts                 # Environment helpers
├── audit/
│   ├── runAudit.ts        # Main orchestration
│   ├── wpApi.ts           # WordPress REST API integration ⭐ NEW
│   ├── freshness.ts       # Content freshness analysis ⭐ NEW
│   ├── score.ts           # 5-pillar scoring algorithm
│   ├── smart.ts           # Smart sampling
│   ├── siteType.ts        # Site classification
│   ├── summary.ts         # Findings aggregation
│   ├── telegram.ts        # Telegram formatting
│   ├── pdf.ts             # PDF generation
│   ├── fetcher.ts         # HTTP requests
│   ├── html.ts            # HTML parsing
│   ├── url.ts             # URL utilities
│   └── ...
└── utils/
    └── i18n.ts            # Translations
```

## Recent Updates (v1.7)

- ✅ WordPress REST API integration with content freshness tracking
- ✅ Improved 5-pillar scoring algorithm with grade system (A-F)
- ✅ Latest products and posts tracking
- ✅ Fixed false positive issues (Persian URL encoding, static assets)
- ✅ Enhanced site type detection using WP data
- ✅ Comprehensive scoring documentation

## Documentation

- [SCORING.md](SCORING.md) - Detailed scoring algorithm explanation
- [AGENTS.md](AGENTS.md) - Development guidelines for contributors

## Requirements

- Node.js 18+
- SQLite3
- 2GB RAM minimum (for PDF generation)

## License

MIT
