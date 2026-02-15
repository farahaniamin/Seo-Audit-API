import type { WpContentItem } from './wpApi.js';
import type { Finding } from '../types.js';

/**
 * Calculate content freshness score (0-100)
 * Based on percentage of content updated within threshold
 */
export function calculateFreshnessScore(
  modifiedDates: string[],
  thresholdMonths: number = 6
): number {
  if (modifiedDates.length === 0) return 0;
  
  const now = Date.now();
  const threshold = thresholdMonths * 30 * 24 * 60 * 60 * 1000;
  
  const freshCount = modifiedDates.filter(date => {
    const modified = new Date(date).getTime();
    return (now - modified) < threshold;
  }).length;
  
  return Math.round((freshCount / modifiedDates.length) * 100);
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
 * Generate freshness-related findings
 */
export function generateFreshnessFindings(
  items: WpContentItem[],
  lang: 'en' | 'fa' = 'en'
): Finding[] {
  const findings: Finding[] = [];
  
  // Find stale content
  const staleItems = identifyStaleContent(items, 6);
  if (staleItems.length > 0) {
    const threshold = 6;
    const affectedPages = Math.min(staleItems.length, 100); // Cap at 100 for reporting
    
    findings.push({
      id: 'C01',
      affected_pages: affectedPages,
      checked_pages: items.filter(i => i.status === 'publish').length,
      prevalence: affectedPages / items.filter(i => i.status === 'publish').length,
      severity: staleItems.length > items.length * 0.5 ? 'high' : 'medium',
    });
  }
  
  // Find thin content types
  const thinTypes = findThinContentTypes(items, 5);
  const thinTypeCount = Object.keys(thinTypes).length;
  if (thinTypeCount > 0) {
    findings.push({
      id: 'C02',
      affected_pages: thinTypeCount,
      checked_pages: Object.keys(
        items.reduce((acc, i) => {
          if (i.status === 'publish') acc[i.type] = true;
          return acc;
        }, {} as Record<string, boolean>)
      ).length,
      prevalence: thinTypeCount / items.filter(i => i.status === 'publish').length,
      severity: 'low',
    });
  }
  
  return findings;
}

/**
 * Format freshness data for report
 */
export function formatFreshnessData(
  items: WpContentItem[],
  score: number
): {
  score: number;
  stale_count: number;
  last_updated: string | null;
  freshness_grade: string;
} {
  const staleItems = identifyStaleContent(items, 6);
  const lastUpdated = getLastUpdateDate(
    items.filter(i => i.status === 'publish').map(i => i.modified)
  );
  
  // Grade based on score
  let grade = 'F';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  
  return {
    score,
    stale_count: staleItems.length,
    last_updated: lastUpdated,
    freshness_grade: grade,
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
