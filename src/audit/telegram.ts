import type { Coverage, Finding, Lang, WpApiData, FreshnessData } from '../types.js';
import { t, checkTitle } from '../utils/i18n.js';

function grade(lang: Lang, score: number) {
  if (score >= 90) return t(lang, 'grade_excellent');
  if (score >= 75) return t(lang, 'grade_good');
  if (score >= 60) return t(lang, 'grade_ok');
  return t(lang, 'grade_bad');
}

function progressBar(score: number, filled: string = '▰', empty: string = '▱'): string {
  const filledCount = Math.round(score / 10);
  const emptyCount = 10 - filledCount;
  return filled.repeat(filledCount) + empty.repeat(emptyCount);
}

const PILLAR_LABELS: Record<Lang, Record<string, string>> = {
  en: {
    indexability: 'Indexability',
    crawlability: 'Crawlability',
    onpage: 'On-Page SEO',
    technical: 'Technical',
    freshness: 'Freshness'
  },
  fa: {
    indexability: 'ایندکس‌پذیری',
    crawlability: 'قابلیت خزش',
    onpage: 'سئوی داخلی',
    technical: 'فنی',
    freshness: 'تازگی محتوا'
  }
};

export function buildTelegram(lang: Lang, args: {
  url: string;
  overall: number;
  coverage: Coverage;
  topIssues: string[];
  quickWins: string[];
  pillars?: Record<string, number>;
  wpData?: WpApiData;
  freshnessData?: FreshnessData;
}) {
  const c = args.coverage;
  const checked = c.checked_pages;
  const disc = c.discovered_pages;
  const est = c.estimated_total_pages;

  const ratio = (c.checked_ratio ?? (est ? checked/est : (disc ? checked/disc : null)));
  const ratioTxt = ratio !== null && ratio !== undefined ? `${(ratio*100).toFixed(1)}%` : '—';

  const issues = args.topIssues.length
    ? args.topIssues.map(id=>`🟠 ${checkTitle(lang,id)}`).join('\n')
    : '—';

  const wins = args.quickWins.length
    ? args.quickWins.map(id=>`🟢 ${checkTitle(lang,id)}`).join('\n')
    : '—';

  let pillarsSection = '';
  if (args.pillars && Object.keys(args.pillars).length > 0) {
    const pillarLabels = PILLAR_LABELS[lang];
    const pillarLines = Object.entries(args.pillars).map(([key, value]) => {
      const label = pillarLabels[key] || key;
      const bar = progressBar(value);
      return `🎯 ${label}: ${bar} ${value.toFixed(1)}%`;
    });
    pillarsSection = `\n${pillarLines.join('\n')}\n`;
  }

  let wpSection = '';
  if (args.wpData && args.wpData.available && args.wpData.postTypes) {
    const postTypes = Object.entries(args.wpData.postTypes)
      .map(([type, count]) => `   • ${type}: ${count}`)
      .join('\n');
    const total = args.wpData.totalItems;
    wpSection = `\n📱 ${t(lang, 'wp_info') || 'WordPress Info'}:\n${postTypes}\n   ${t(lang, 'total') || 'Total'}: ${total} ${t(lang, 'items') || 'items'}\n`;
  }

  let freshnessSection = '';
  if (args.freshnessData) {
    const fd = args.freshnessData;
    freshnessSection = `\n🔄 ${t(lang, 'freshness') || 'Content Freshness'}:\n`;
    freshnessSection += `${t(lang, 'score') || 'Score'}: ${fd.score}/100\n`;
    freshnessSection += `${t(lang, 'stale_content') || 'Stale content'}: ${fd.stale_count}\n`;

    if (fd.latest_products && fd.latest_products.length > 0) {
      freshnessSection += `\n📦 ${t(lang, 'latest_products') || 'Latest Products'}:\n`;
      freshnessSection += fd.latest_products.slice(0, 3).map(p => `   • ${p.title}`).join('\n');
    }

    if (fd.latest_posts && fd.latest_posts.length > 0) {
      freshnessSection += `\n📝 ${t(lang, 'latest_posts') || 'Latest Posts'}:\n`;
      freshnessSection += fd.latest_posts.slice(0, 3).map(p => `   • ${p.title}`).join('\n');
    }
  }

  return (
    `📊 ${t(lang,'audit_complete')}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🌐 ${args.url}\n\n` +
    `⚪️ ${t(lang,'score')}: ${args.overall.toFixed(1)}/100\n` +
    `📊 ${t(lang,'grade') || 'Grade'}: ${grade(lang, args.overall)}\n` +
    `${pillarsSection}` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `${t(lang,'coverage')}:\n` +
    `   ${t(lang,'checked')}: ${checked}\n` +
    `   ${t(lang,'discovered')}: ${disc}\n` +
    `   ${t(lang,'estimated')}: ${est ?? '—'}\n` +
    `   ${t(lang,'ratio') || 'Ratio'}: ${ratioTxt}\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `${t(lang,'top_issues')}:\n${issues}\n\n` +
    `${t(lang,'quick_wins')}:\n${wins}` +
    wpSection +
    freshnessSection
  );
}
