import type { WpContentItem } from './wpApi.js';
import type { Finding } from '../types.js';

/**
 * Content type thresholds (in months)
 * Different content types have different freshness expectations
 */
export const FRESHNESS_THRESHOLDS = {
  post: 3,        // Blog posts: should be updated every 3 months
  product: 6,     // Products: 6 months is acceptable
  page: 12,       // Static pages: 12 months okay
  default: 6      // Default: 6 months
};

/**
 * Calculate content freshness score (0-100) with type-specific thresholds
 */
export function calculateFreshnessScore(
  items: WpContentItem[],
  contentType?: string
): number {
  if (items.length === 0) return 0;
  
  const now = Date.now();
  const thresholdMonths = contentType && FRESHNESS_THRESHOLDS[contentType as keyof typeof FRESHNESS_THRESHOLDS] 
    ? FRESHNESS_THRESHOLDS[contentType as keyof typeof FRESHNESS_THRESHOLDS]
    : FRESHNESS_THRESHOLDS.default;
  const threshold = thresholdMonths * 30 * 24 * 60 * 60 * 1000;
  
  const publishedItems = items.filter(item => item.status === 'publish');
  if (publishedItems.length === 0) return 0;
  
  const freshCount = publishedItems.filter(item => {
    const modified = new Date(item.modified).getTime();
    return (now - modified) < threshold;
  }).length;
  
  return Math.round((freshCount / publishedItems.length) * 100);
}

/**
 * Calculate freshness score by content type
 * Returns detailed breakdown for each type
 */
export function calculateFreshnessByType(
  items: WpContentItem[]
): Record<string, { score: number; total: number; fresh: number; stale: number; threshold: number }> {
  const byType: Record<string, WpContentItem[]> = {};
  
  // Group by type
  items.forEach(item => {
    if (item.status === 'publish') {
      if (!byType[item.type]) byType[item.type] = [];
      byType[item.type].push(item);
    }
  });
  
  // Calculate score for each type
  const results: Record<string, { score: number; total: number; fresh: number; stale: number; threshold: number }> = {};
  
  Object.entries(byType).forEach(([type, typeItems]) => {
    const thresholdMonths = FRESHNESS_THRESHOLDS[type as keyof typeof FRESHNESS_THRESHOLDS] || FRESHNESS_THRESHOLDS.default;
    const threshold = thresholdMonths * 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    let fresh = 0;
    let stale = 0;
    
    typeItems.forEach(item => {
      const modified = new Date(item.modified).getTime();
      if ((now - modified) < threshold) {
        fresh++;
      } else {
        stale++;
      }
    });
    
    results[type] = {
      score: Math.round((fresh / typeItems.length) * 100),
      total: typeItems.length,
      fresh,
      stale,
      threshold: thresholdMonths
    };
  });
  
  return results;
}

/**
 * Identify stale content items
 * Returns items not updated within threshold months
 */
export function identifyStaleContent(
  items: WpContentItem[],
  thresholdMonths: number = 6
): WpContentItem[] {
  const now = Date.now();
  const threshold = thresholdMonths * 30 * 24 * 60 * 60 * 1000;
  
  return items.filter(item => {
    if (item.status !== 'publish') return false;
    const modified = new Date(item.modified).getTime();
    return (now - modified) >= threshold;
  });
}

/**
 * Get the most recent update date
 */
export function getLastUpdateDate(modifiedDates: string[]): string | null {
  if (modifiedDates.length === 0) return null;
  
  const sorted = modifiedDates
    .map(d => new Date(d).getTime())
    .sort((a, b) => b - a);
  
  return new Date(sorted[0]).toISOString();
}

/**
 * Find thin content types (post types with very few items)
 */
export function findThinContentTypes(
  items: WpContentItem[],
  minItems: number = 5
): Record<string, number> {
  const counts: Record<string, number> = {};
  
  items.forEach(item => {
    if (item.status === 'publish') {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
  });
  
  return Object.entries(counts)
    .filter(([_, count]) => count < minItems && count > 0)
    .reduce((acc, [type, count]) => {
      acc[type] = count;
      return acc;
    }, {} as Record<string, number>);
}

/**
 * Get stale content by type with specific thresholds
 */
export function getStaleContentByType(
  items: WpContentItem[]
): Array<{ type: string; items: WpContentItem[]; threshold: number; severity: 'high' | 'medium' | 'low' }> {
  const byType = calculateFreshnessByType(items);
  const results: Array<{ type: string; items: WpContentItem[]; threshold: number; severity: 'high' | 'medium' | 'low' }> = [];
  
  const now = Date.now();
  
  Object.entries(byType).forEach(([type, data]) => {
    if (data.stale > 0) {
      // Determine severity based on percentage stale
      const staleRatio = data.stale / data.total;
      let severity: 'high' | 'medium' | 'low' = 'low';
      if (staleRatio > 0.7) severity = 'high';
      else if (staleRatio > 0.4) severity = 'medium';
      
      // Get actual stale items for this type
      const thresholdMs = data.threshold * 30 * 24 * 60 * 60 * 1000;
      const staleItems = items.filter(item => {
        if (item.type !== type || item.status !== 'publish') return false;
        const modified = new Date(item.modified).getTime();
        return (now - modified) >= thresholdMs;
      });
      
      results.push({
        type,
        items: staleItems,
        threshold: data.threshold,
        severity
      });
    }
  });
  
  return results.sort((a, b) => b.items.length - a.items.length);
}

/**
 * Generate freshness-related findings with type-specific details
 */
export function generateFreshnessFindings(
  items: WpContentItem[],
  lang: 'en' | 'fa' = 'en'
): Finding[] {
  const findings: Finding[] = [];
  const publishedItems = items.filter(i => i.status === 'publish');
  
  if (publishedItems.length === 0) return findings;
  
  // Get stale content by type
  const staleByType = getStaleContentByType(items);
  
  // C01: Stale blog posts (high priority - content marketing)
  const stalePosts = staleByType.find(s => s.type === 'post');
  if (stalePosts && stalePosts.items.length > 0) {
    findings.push({
      id: 'C01',
      affected_pages: Math.min(stalePosts.items.length, 100),
      checked_pages: publishedItems.filter(i => i.type === 'post').length,
      prevalence: stalePosts.items.length / publishedItems.filter(i => i.type === 'post').length,
      severity: stalePosts.severity,
    });
  }
  
  // C02: Stale products (medium priority - e-commerce)
  const staleProducts = staleByType.find(s => s.type === 'product');
  if (staleProducts && staleProducts.items.length > 0) {
    findings.push({
      id: 'C02',
      affected_pages: Math.min(staleProducts.items.length, 100),
      checked_pages: publishedItems.filter(i => i.type === 'product').length,
      prevalence: staleProducts.items.length / publishedItems.filter(i => i.type === 'product').length,
      severity: staleProducts.severity,
    });
  }
  
  // C04: Stale pages (lower priority - static content)
  const stalePages = staleByType.find(s => s.type === 'page');
  if (stalePages && stalePages.items.length > 0) {
    findings.push({
      id: 'C04',
      affected_pages: Math.min(stalePages.items.length, 100),
      checked_pages: publishedItems.filter(i => i.type === 'page').length,
      prevalence: stalePages.items.length / publishedItems.filter(i => i.type === 'page').length,
      severity: 'low', // Pages are less critical
    });
  }
  
  // C05: Overall site freshness (if >50% stale)
  const overallScore = calculateFreshnessScore(items);
  if (overallScore < 50) {
    findings.push({
      id: 'C05',
      affected_pages: publishedItems.length - Math.round((overallScore / 100) * publishedItems.length),
      checked_pages: publishedItems.length,
      prevalence: (100 - overallScore) / 100,
      severity: 'high',
    });
  }
  
  return findings;
}

/**
 * Get latest updated products and posts
 */
export function getLatestContent(
  items: WpContentItem[],
  count: number = 5
): { latest_products: any[]; latest_posts: any[] } {
  const now = Date.now();
  
  // Filter and sort products
  const products = items
    .filter(item => item.type === 'product' && item.status === 'publish')
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    .slice(0, count)
    .map(item => ({
      title: item.title,
      url: item.url,
      modified: item.modified,
      type: 'product' as const,
      days_ago: Math.floor((now - new Date(item.modified).getTime()) / (1000 * 60 * 60 * 24))
    }));
  
  // Filter and sort posts
  const posts = items
    .filter(item => item.type === 'post' && item.status === 'publish')
    .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
    .slice(0, count)
    .map(item => ({
      title: item.title,
      url: item.url,
      modified: item.modified,
      type: 'post' as const,
      days_ago: Math.floor((now - new Date(item.modified).getTime()) / (1000 * 60 * 60 * 24))
    }));
  
  return { latest_products: products, latest_posts: posts };
}

/**
 * Format freshness data for report with type-specific details
 */
export function formatFreshnessData(
  items: WpContentItem[],
  score: number
): {
  score: number;
  stale_count: number;
  last_updated: string | null;
  freshness_grade: string;
  latest_products: any[];
  latest_posts: any[];
  by_type: Record<string, { score: number; total: number; fresh: number; stale: number; threshold: number }>;
  thresholds: Record<string, number>;
  recommendations: string[];
} {
  const staleItems = identifyStaleContent(items, 6);
  const lastUpdated = getLastUpdateDate(
    items.filter(i => i.status === 'publish').map(i => i.modified)
  );
  
  // Get latest products and posts
  const { latest_products, latest_posts } = getLatestContent(items, 5);
  
  // Get type-specific breakdown
  const byType = calculateFreshnessByType(items);
  
  // Grade based on score
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  
  // Generate specific recommendations
  const recommendations = getFreshnessRecommendations(items);
  
  return {
    score,
    stale_count: staleItems.length,
    last_updated: lastUpdated,
    freshness_grade: grade,
    latest_products,
    latest_posts,
    by_type: byType,
    thresholds: FRESHNESS_THRESHOLDS,
    recommendations,
  };
}

/**
 * Get freshness recommendations
 */
export function getFreshnessRecommendations(
  items: WpContentItem[],
  lang: 'en' | 'fa' = 'en'
): string[] {
  const recommendations: string[] = [];
  
  const staleItems = identifyStaleContent(items, 6);
  const thinTypes = findThinContentTypes(items, 5);
  
  if (staleItems.length > 0) {
    if (lang === 'fa') {
      recommendations.push(`${staleItems.length} صفحه بیش از ۶ ماه است که به‌روزرسانی نشده‌اند. محتوای قدیمی ممکن است رتبه‌بندی را کاهش دهد.`);
    } else {
      recommendations.push(`${staleItems.length} pages haven't been updated in 6+ months. Stale content may hurt rankings.`);
    }
  }
  
  if (Object.keys(thinTypes).length > 0) {
    const types = Object.keys(thinTypes).join(', ');
    if (lang === 'fa') {
      recommendations.push(`نوع محتوای "${types}" تعداد کمی صفحه دارد. در صورت عدم استفاده، حذف یا ادغام کنید.`);
    } else {
      recommendations.push(`Content type(s) "${types}" have few pages. Consider removing or merging if not needed.`);
    }
  }
  
  return recommendations;
}
