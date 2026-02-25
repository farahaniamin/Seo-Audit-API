# SEO Scoring Algorithm - 6 Pillar System (v3.0)

**Version:** 3.0  
**Last Updated:** February 25, 2026  

## Overview
Honest, accurate scoring based only on metrics we can actually measure. No fake scores. Fixed critical bug where issues with 0 affected pages were receiving penalties.

## The 6 Pillars

### 1. **Indexability** (15% weight)
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

### 2. **Crawlability** (12% weight)
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

### 3. **On-Page SEO** (20-22% weight)
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

### 4. **Technical** (18-19% weight)
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

### 5. **Freshness** (15% weight)
**What it measures:** How recently has content been updated?

**Issues Tracked:**
- **C01 (stale blog posts)** - Posts not updated in 3+ months
  - Weight: 18 (High)
  - Impact: Content marketing critical
  
- **C02 (stale products)** - Products not updated in 6+ months
  - Weight: 12 (Medium)
  - Impact: E-commerce relevance
  
- **C04 (stale pages)** - Static pages not updated in 12+ months
  - Weight: 8 (Low)
  - Impact: Lower priority for static content

**Display Format (v3.0):**
```
📝 Blog Posts    Last updated: 6 days ago     🟢
🛍️ Products      Last updated: 4 days ago     🟢
📄 Pages         Last updated: 5 months ago   🔴
```

**Score Calculation:**
```
Score = Raw freshness score from WordPress data
Based on content age distribution per type
```

**Data Source:** WordPress REST API (when available)
- Fetches last modified dates
- Shows "last updated X ago" format (v3.0)
- Filters only main types: post, product, page

---

### 6. **Performance** (18-20% weight)
**What it measures:** Page speed and Core Web Vitals

**Issues Tracked:**
- **L01 (Poor Lighthouse score)** - Performance < 50
  - Weight: 20 (Critical)
  - Impact: Major ranking factor
  
- **L02 (Slow LCP)** - Largest Contentful Paint > 2.5s
  - Weight: 18 (High)
  - Impact: Poor loading experience
  
- **L03 (Poor CLS)** - Cumulative Layout Shift > 0.1
  - Weight: 16 (High)
  - Impact: Visual stability issues
  
- **L04 (High TBT)** - Total Blocking Time > 200ms
  - Weight: 14 (Medium)
  - Impact: Input delay

**Score Calculation:**
```
Hybrid Formula (v3.0):
Performance = 40% × Lighthouse Score + 60% × (100 - issue_penalties)

Example:
Lighthouse: 55
Issue penalties: 15
Performance = 0.4 × 55 + 0.6 × 85 = 22 + 51 = 73
```

**Data Source:** Lighthouse (when available)

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

## Site Type Weights (v3.0)

### E-commerce
```javascript
indexability:  0.15  // Was 0.24
crawlability:  0.12  // Was 0.18
onpage:        0.20  // Was 0.26
technical:     0.18  // Increased
performance:   0.20  // NEW
freshness:     0.15  // Was 0.14
```

### Corporate
```javascript
indexability:  0.14  // Was 0.22
crawlability:  0.11  // Was 0.17
onpage:        0.22  // Was 0.28
technical:     0.19  // Increased
performance:   0.18  // NEW
freshness:     0.16  // Was 0.16
```

### Content/Blog
```javascript
indexability:  0.15  // Was 0.23
crawlability:  0.12  // Was 0.17
onpage:        0.21  // Was 0.27
technical:     0.18  // Increased
performance:   0.19  // NEW
freshness:     0.15  // Was 0.16
```

### Key Changes (v3.0)
- **Indexability reduced:** 22-24% → 14-15% (was over-weighted)
- **Performance added:** 18-20% (Core Web Vitals importance)
- **Technical increased:** 17% → 18-19% (security + performance)
- **On-Page reduced:** 26-28% → 20-22% (more balanced)
- **Crawlability reduced:** 17-18% → 11-12% (navigation focus)

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

## Critical Bug Fixed in v3.0

### The Problem
**Issues with 0 affected pages were receiving penalties!**

```javascript
// OLD (Bug):
ratio_factor = 0.2 + 2.0 × (ratio ^ 0.75)
// When ratio = 0: factor = 0.2 (minimum penalty applied!)

// Example - E01 (noindex) with 0 pages:
penalty = 25 × 1.0 × 0.2 = 5.0 points
// Even with NO pages blocked, you lost 5 points!
```

### The Fix (v3.0)
```javascript
// NEW (Fixed):
function penaltyFor(def, ratio) {
  if (ratio <= 0) return 0;  // No penalty if no pages affected
  
  const r = clamp01(ratio);
  const scaled = Math.pow(r, 0.75);
  const ratioFactor = 0.2 + 2.0 * scaled;
  
  return def.weight * SEVERITY_MULT[def.severity] * ratioFactor;
}
```

### Impact
```
Before: Indexability 83.4/100 (with 0 real issues!)
After:  Indexability 100/100 (clean when no issues)
```

---

## Key Improvements Over Original Algorithm

### v3.0 Improvements
1. **Fixed Critical Bug**
   - No penalties for issues with 0 affected pages
   - Accurate pass/fail logic based on actual penalties

2. **Added Performance Pillar**
   - 18-20% weight (Core Web Vitals)
   - Hybrid scoring: 40% Lighthouse + 60% issues
   - LCP, CLS, TBT tracking

3. **Better Weight Distribution**
   - Indexability: 22-24% → 14-15% (was over-weighted)
   - Technical: 17% → 18-19% (security + performance)
   - Performance: NEW 18-20%
   - More balanced scoring

4. **New Indexability Issues**
   - E07: robots.txt blocking
   - E12: X-Robots-Tag header
   - E14: Cross-domain canonical
   - E18: Password protection
   - E19: Redirect loops

5. **UI Transparency**
   - Shows exact penalty points (-X.X pts)
   - Clear pass/fail badges
   - Clickable page lists

### Previous Improvements (v2.0)
- Fixed False Positives (E04 redirects)
- Added Freshness pillar
- Removed fake metrics
- Grade system (A-F)

## Example: mazebox.ir (v3.0 - Smart Mode)

**Calculated Scores:**
```
Overall:      84.3/100 (Grade: B)
Indexability:  90.5%  ✅ Fixed (was 83.4 with false penalties)
Crawlability:  88.5%  ✅
On-Page:       92.8%  ✅
Technical:     86.0%  ✅
Freshness:     67.0%  ⚠️ (shown as "Last updated X ago")
Performance:   79.9%  ✅ NEW
```

**Why B Grade?**
- Good technical implementation
- Recent blog posts and products
- Pages need updating (5 months old)
- No false penalties (v3.0 fix)
- Performance needs improvement

**v3.0 Improvements Visible:**
- ✓ Indexability 90.5 (accurate, no false penalties)
- ✓ Freshness shows "6 days ago" not confusing percentages
- ✓ Pages breakdown: 25 Products, 11 Pages, 9 Taxonomy, 5 Blog Posts
- ✓ Penalty transparency: -9.5 pts for E01, -6.1 pts for E06

---

## Example: mahoorab.com (v2.0 - For Comparison)

**Calculated Scores (OLD):**
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

### Key Functions (v3.0)

```typescript
// Main scoring function - now with 6 pillars
scoreSite(
  pages: Page[], 
  totals: Map<string, number>, 
  lang: Lang, 
  siteType: SiteType,
  freshnessData?: { score: number; stale_count: number; total_items: number },
  lighthouseScore?: number  // NEW: Performance pillar
) → Returns: { 
  overall_score: number, 
  grade: string, 
  pillars: {
    indexability: number,
    crawlability: number,
    onpage: number,
    technical: number,
    freshness: number,
    performance: number  // NEW
  },
  breakdown: {
    checked_pages: number,
    total_penalty: number,
    freshness_penalty: number,
    pillar_penalties: Record<string, number>,  // NEW: Transparency
    scoring_methodology: {  // NEW: Documentation
      grade_thresholds: Record<string, string>,
      performance_formula: string,
      freshness_formula: string,
      other_pillars_formula: string,
      overall_formula: string
    },
    items: ScoringItem[]
  }
}

// Fixed penalty calculation - v3.0
penaltyFor(def: IssueDef, ratio: number): number {
  // CRITICAL FIX: Return 0 if no pages affected
  if (ratio <= 0) return 0;
  
  const cappedRatio = def.max_ratio 
    ? Math.min(ratio, def.max_ratio) 
    : ratio;
  const r = clamp01(cappedRatio);
  const scaled = Math.pow(r, 0.75);
  const ratioFactor = 0.2 + 2.0 * scaled;
  
  return def.weight * SEVERITY_MULT[def.severity] * ratioFactor;
}
```

### v3.0 Changes

**1. Fixed Penalty Bug**
- Added `if (ratio <= 0) return 0;` at start of `penaltyFor()`
- Eliminates false penalties for issues with 0 affected pages
- Indexability now correctly shows 100/100 when clean

**2. Added Performance Pillar**
- Hybrid scoring: 40% Lighthouse + 60% issue penalties
- Tracks LCP, CLS, TBT from Lighthouse data
- Weight: 18-20% depending on site type

**3. Enhanced Transparency**
- Returns `pillar_penalties` breakdown
- Includes `scoring_methodology` explanation
- Shows exact formulas used

**4. Updated Issue Definitions**
- Added 5 new indexability issues (E07, E12, E14, E18, E19)
- Added performance issues (L01, L02, L03, L04)
- Rebalanced all weights

**Integration:**
- Called from `runAudit.ts` after crawling
- Freshness data passed when WP API available
- Lighthouse data passed when performance audit enabled
- Results included in final report with full transparency

---

## Summary (v3.0)

✅ **Honest:** Only scores what we can measure  
✅ **Accurate:** Fixed critical bug - no penalties for 0-page issues  
✅ **Transparent:** Shows exact penalty points and formulas  
✅ **Complete:** 6 pillars including Performance (Core Web Vitals)  
✅ **Balanced:** Better weight distribution across pillars  
✅ **Clear:** A-F grades + detailed breakdown  
✅ **Fair:** Non-linear penalties, capped ratios

### What v3.0 Fixed
- **Critical Bug:** Issues with 0 affected pages no longer get penalties
- **Indexability Accuracy:** Now shows 100/100 when truly clean
- **Performance Integration:** Added Lighthouse-based scoring
- **Transparency:** Users can see exactly how scores are calculated

### What v3.0 Added
- **6th Pillar:** Performance (18-20% weight)
- **5 New Issues:** robots.txt, X-Robots-Tag, cross-domain canonical, password, redirect loops
- **Penalty Transparency:** Shows -X.X pts for each issue
- **Scoring Methodology:** Documents all formulas in report

**Accurate, Transparent, and Honest.** 🎯
