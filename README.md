# SEO Audit Bot (Hono + SQLite) — v1.5

A production-friendly SEO audit service designed for Telegram bots:
- **smart sampling** (polite, low-request, lower block risk)
- **full crawl** (more accurate, riskier)
- **dual language Telegram summary** (FA/EN)
- **coverage reporting** (checked vs discovered vs estimated total)

## Run (dev)
```bash
npm i
cp .env.example .env
npm run dev:api
npm run dev:worker
```

## API
Create an audit:
```bash
curl -X POST http://localhost:8787/v1/audits -H "content-type: application/json" -d '{
  "url":"https://example.com",
  "profile":"smart"
}'
```

Get report:
```bash
curl http://localhost:8787/v1/audits/<id>/report
```

Telegram text (language):
```bash
curl http://localhost:8787/v1/audits/<id>/telegram?lang=fa
curl http://localhost:8787/v1/audits/<id>/telegram?lang=en
```

## Profiles
- **smart (default)**: sample-based, polite delays, good accuracy for template issues
- **full**: larger crawl (higher traffic)


PDF Report:
- Download: /v1/audits/<id>/report.pdf?lang=fa|en
