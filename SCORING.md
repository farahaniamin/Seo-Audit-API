# SEO Scoring Algorithm - 5 Pillar System

## Overview
Honest, accurate scoring based only on metrics we can actually measure. No fake scores.

## The 5 Pillars

### 1. **Indexability** (24% weight)
**What it measures:** Can Google index your pages?

**Issues Tracked:**
- **E01 (noindex)** - Pages blocked from indexing
  - Weight: 25 (Critical)
  - Impact: Prevents pages from appearing in search results

**Score Calculation:**
```
Score = 100 - (penalty for noindex pages)
Penalty = weight × severity × ratio_factor
```

---

### 2. **Crawlability** (18% weight)
**What it measures:** Can Googlebot access and crawl your pages?

**Issues Tracked:**
- **E02 (4xx errors)** - Broken pages (404, 500, etc.)
  - Weight: 20 (Critical)
  - Impact: Wastes crawl budget, hurts user experience

- **E04 (redirect chains)** - Multiple redirects
  - Weight: 4 (Medium) - *Reduced from 6, capped at 50%*
  - Impact: Slows crawling, wastes resources
  - **Note:** Capped to prevent Persian URL encoding false positives

**Score Calculation:**
```
Score = 100 - (penalty for 4xx + penalty for redirect chains)
```

---

### 3. **On-Page SEO** (26% weight)
**What it measures:** Are pages optimized for target keywords?

**Issues Tracked:**
- **F01 (missing/short title)** - No page title or < 10 chars
  - Weight: 10 (High)
  - Impact: Critical ranking factor

- **F04 (missing/short meta description)** - No description or < 50 chars
  - Weight: 8 (High)
  - Impact: Affects click-through rate

- **F07 (missing H1)** - No H1 heading
  - Weight: 6 (Medium)
  - Impact: Poor content structure

- **F08 (multiple H1s)** - More than one H1
  - Weight: 5 (Medium)
  - Impact: Confuses content hierarchy

**Score Calculation:**
```
Score = 100 - (sum of on-page penalties)
```

---

### 4. **Technical** (18% weight)
**What it measures:** Technical implementation quality

**Issues Tracked:**
- **E06 (canonical mismatch)** - Canonical URL doesn't match actual URL
  - Weight: 12 (High)
  - Impact: Duplicate content issues, indexing confusion
  - Capped at 80% to prevent over-penalization

- **G01 (missing alt text)** - Images without alt attributes
  - Weight: 5 (Low) - *Reduced from 7*
  - Impact: Accessibility issues, missed image SEO
  - Capped at 90% (most sites have many images)

**Score Calculation:**
```
Score = 100 - (penalty for canonical + penalty for alt text)
```

---

### 5. **Freshness** (14% weight)
**What it measures:** How recently has content been updated?

**Issues Tracked:**
- **C01 (stale content)** - Content not updated in 6+ months
  - Weight: 15 (High)
  - Impact: Google prefers fresh content for many queries
  - **Note:** Only available when WordPress REST API is detected

**Score Calculation:**
```
Score = 100 - (penalty based on % of stale content)
Stale Ratio = stale_pages / total_wp_items
Penalty = 15 × 1.0 × ratio_factor
```

**Data Source:** WordPress REST API (when available)
- Fetches last modified dates for all content
- Calculates freshness score: 0-100
- Identifies content older than 6 months

---

## Severity Multipliers

```javascript
critical: 1.0  // Full weight
high:     0.85 // 85% of weight
medium:   0.65 // 65% of weight
low:      0.4  // 40% of weight
```

## Ratio Factor (Non-linear Scaling)

Prevents small issues from exploding scores:

```javascript
ratio_factor = 0.2 + 2.0 × (ratio ^ 0.75)
```

**Examples:**
- 10% affected → ~0.4 factor (mild penalty)
- 50% affected → ~1.4 factor (moderate penalty)
- 100% affected → ~2.2 factor (high penalty)

## Grade Scale

```
A: 90-100 (Excellent)
B: 80-89  (Good)
C: 70-79  (Fair)
D: 60-69  (Needs Work)
F: <60    (Critical Issues)
```

## Site Type Weights

### E-commerce
```javascript
indexability: 0.24
crawlability: 0.18
onpage:       0.26
technical:    0.18
freshness:    0.14
```

### Corporate
```javascript
indexability: 0.22
crawlability: 0.17
onpage:       0.28
technical:    0.17
freshness:    0.16
```

### Content/Blog
```javascript
indexability: 0.23
crawlability: 0.17
onpage:       0.27
technical:    0.17
freshness:    0.16
```

## What We DON'T Score (Honest Limitations)

### Content Quality
- ❌ Word count analysis (thin content)
- ❌ Duplicate content detection
- ❌ Readability scoring
- ❌ Content structure depth

**Why:** Would require full HTML parsing and text analysis beyond current scope.

### Performance
- ❌ Core Web Vitals (LCP, FID, CLS)
- ❌ Page load time
- ❌ Time to First Byte (TTFB)

**Why:** Requires performance testing tools (Lighthouse, PageSpeed Insights).

### Structured Data
- ❌ Schema.org validation
- ❌ JSON-LD correctness
- ❌ Rich snippet eligibility

**Why:** Would require schema parsing and validation library.

### Backlinks
- ❌ Domain authority
- ❌ Backlink count/quality
- ❌ Referring domains

**Why:** Requires external SEO API (Ahrefs, Moz, Majestic).

## Key Improvements Over Original Algorithm

1. **Fixed False Positives**
   - E04 (redirects): Reduced weight 6→4, capped at 50%
   - No more Persian URL encoding penalties

2. **Added Freshness**
   - New 14% weight pillar
   - Content age matters for SEO

3. **Better Weight Distribution**
   - Critical issues get full weight (25-20)
   - Low impact issues reduced (5-4)
   - Gentler penalty curve

4. **Removed Fake Metrics**
   - No hardcoded 100% scores
   - No content_quality (wasn't measuring anything)

5. **Grade System**
   - Clear A-F ratings
   - Easier to understand than just numbers

## Example: mahoorab.com (Full Mode)

**Calculated Scores:**
```
Overall:      78.2/100 (Grade: C)
Indexability:  95.2%
Crawlability:  87.4%
On-Page:       81.3%
Technical:     72.8%
Freshness:     37.0%  ← Stale content penalty
```

**Why C Grade?**
- 86 out of 136 pages (63%) are stale
- Freshness penalty: ~10 points
- Redirect chain false positives eliminated
- More honest assessment than original 85.8

## Implementation

**File:** `src/audit/score.ts`

**Key Functions:**
```typescript
scoreSite(pages, totals, lang, siteType, freshnessData)
  → Returns: { overall_score, grade, pillars, breakdown }

penaltyFor(issueDef, ratio)
  → Calculates weighted penalty with non-linear scaling
```

**Integration:**
- Called from `runAudit.ts` after crawling
- Freshness data passed when WP API available
- Results included in final report

---

## Summary

✅ **Honest:** Only scores what we can measure
✅ **Accurate:** Fixed false positive issues
✅ **Freshness:** Content age now impacts score
✅ **Clear:** A-F grades + detailed breakdown
✅ **Fair:** Non-linear penalties, capped ratios

**Not Perfect, But Honest.**
