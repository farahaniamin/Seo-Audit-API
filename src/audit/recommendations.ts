import type { Finding } from '../types.js';
import type { Lang } from '../types.js';

export type ActionableRecommendation = {
  id: string;
  issue: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  effort: 'quick' | 'medium' | 'large';
  fix: string;
  howTo: string;
  estimatedTime: string;
  affectedPages: number;
  exampleUrls?: string[];
  automatedFix?: boolean;
  codeExample?: string;
  resources?: string[];
};

/**
 * Generate actionable recommendations from findings
 */
export function generateActionableRecommendations(
  findings: Finding[],
  lang: Lang = 'en'
): ActionableRecommendation[] {
  const recommendations: ActionableRecommendation[] = [];

  for (const finding of findings) {
    const rec = createRecommendation(finding, lang);
    if (rec) {
      recommendations.push(rec);
    }
  }

  // Sort by impact × effort (high impact, low effort first)
  return recommendations.sort((a, b) => {
    const impactOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    const effortOrder = { quick: 3, medium: 2, large: 1 };
    
    const scoreA = impactOrder[a.impact] * effortOrder[a.effort];
    const scoreB = impactOrder[b.impact] * effortOrder[b.effort];
    
    return scoreB - scoreA;
  });
}

function createRecommendation(finding: Finding, lang: Lang): ActionableRecommendation | null {
  const isFa = lang === 'fa';
  
  const templates: Record<string, Partial<ActionableRecommendation>> = {
    'E01': {
      impact: 'critical',
      effort: 'quick',
      fix: isFa ? 'حذف متا تگ noindex' : 'Remove noindex meta tag',
      howTo: isFa 
        ? 'صفحات دارای noindex از نتایج جستجو حذف می‌شوند. این تگ را فقط برای صفحاتی که نمی‌خواهید ایندکس شوند نگه دارید (مثل صفحات پرداخت).'
        : 'Pages with noindex are excluded from search results. Only keep this tag for pages you don\'t want indexed (like checkout pages).',
      estimatedTime: isFa ? '۵ دقیقه' : '5 minutes',
      codeExample: '<!-- Remove this line -->\n<meta name="robots" content="noindex">',
      resources: ['https://developers.google.com/search/docs/crawling-indexing/block-indexing'],
    },
    'E02': {
      impact: 'critical',
      effort: 'medium',
      fix: isFa ? 'رفع خطاهای ۴۰۴ و ریدایرکت صفحات' : 'Fix 404 errors and redirect broken pages',
      howTo: isFa
        ? 'صفحات ۴۰۴ تجربه کاربری بد ایجاد می‌کنند. صفحات حذف شده را به صفحات مشابه ریدایرکت ۳۰۱ کنید یا لینک‌های شکسته را اصلاح کنید.'
        : '404 pages create bad user experience. Redirect deleted pages to similar pages with 301 or fix broken links.',
      estimatedTime: isFa ? '۳۰ دقیقه' : '30 minutes',
      automatedFix: false,
      resources: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/404'],
    },
    'E04': {
      impact: 'medium',
      effort: 'medium',
      fix: isFa ? 'حذف زنجیره ریدایرکت' : 'Eliminate redirect chains',
      howTo: isFa
        ? 'زنجیره ریدایرکت سرعت سایت را کاهش می‌دهد. مستقیماً از URL اولیه به URL نهایی ریدایرکت کنید.'
        : 'Redirect chains slow down your site. Redirect directly from the original URL to the final URL.',
      estimatedTime: isFa ? '۴۵ دقیقه' : '45 minutes',
      automatedFix: false,
    },
    'E06': {
      impact: 'high',
      effort: 'quick',
      fix: isFa ? 'تصحیح canonical URL' : 'Fix canonical URL mismatch',
      howTo: isFa
        ? ' canonical URL باید دقیقاً با URL فعلی صفحه مطابقت داشته باشد. این تگ به گوگل می‌گوید کدام نسخه از صفحه را ایندکس کند.'
        : 'Canonical URL must exactly match the current page URL. This tag tells Google which version of the page to index.',
      estimatedTime: isFa ? '۱۵ دقیقه' : '15 minutes',
      codeExample: '<link rel="canonical" href="https://example.com/correct-page/">',
      automatedFix: true,
    },
    'F01': {
      impact: 'high',
      effort: 'quick',
      fix: isFa ? 'نوشتن عنوان صفحه (Title)' : 'Write page title',
      howTo: isFa
        ? 'عنوان صفحه مهم‌ترین فاکتور سئو است. بین ۵۰-۶۰ کاراکتر بنویسید و کلمات کلیدی را در ابتدا بیاورید.'
        : 'Page title is the most important SEO factor. Write 50-60 characters and put keywords at the beginning.',
      estimatedTime: isFa ? '۵ دقیقه' : '5 minutes',
      codeExample: '<title>Keyword - Brand Name</title>',
      automatedFix: false,
    },
    'F04': {
      impact: 'high',
      effort: 'quick',
      fix: isFa ? 'نوشتن توضیحات متا (Meta Description)' : 'Write meta description',
      howTo: isFa
        ? 'توضیحات متا نرخ کلیک (CTR) را افزایش می‌دهد. بین ۱۵۰-۱۶۰ کاراکتر بنویسید و شامل call-to-action باشد.'
        : 'Meta descriptions increase click-through rate (CTR). Write 150-160 characters with a call-to-action.',
      estimatedTime: isFa ? '۱۰ دقیقه' : '10 minutes',
      codeExample: '<meta name="description" content=" compelling description with call-to-action here.">',
      automatedFix: false,
    },
    'F07': {
      impact: 'medium',
      effort: 'quick',
      fix: isFa ? 'اضافه کردن تگ H1' : 'Add H1 heading tag',
      howTo: isFa
        ? 'هر صفحه باید یک تگ H1 داشته باشد که موضوع اصلی صفحه را مشخص کند. کلمات کلیدی را در H1 بگنجانید.'
        : 'Every page should have one H1 tag defining the main topic. Include keywords in the H1.',
      estimatedTime: isFa ? '۵ دقیقه' : '5 minutes',
      codeExample: '<h1>Main Page Title with Keywords</h1>',
      automatedFix: false,
    },
    'F08': {
      impact: 'medium',
      effort: 'quick',
      fix: isFa ? 'حذف H1های اضافی' : 'Remove extra H1 tags',
      howTo: isFa
        ? 'هر صفحه فقط باید یک H1 داشته باشد. H1های اضافی را به H2 یا H3 تغییر دهید.'
        : 'Each page should have only one H1. Change extra H1s to H2 or H3.',
      estimatedTime: isFa ? '۱۰ دقیقه' : '10 minutes',
      codeExample: '<!-- Change this -->\n<h2>Subtitle</h2>  <!-- Instead of <h1> -->',
      automatedFix: true,
    },
    'G01': {
      impact: 'low',
      effort: 'medium',
      fix: isFa ? 'اضافه کردن متن جایگزین به تصاویر' : 'Add alt text to images',
      howTo: isFa
        ? 'متن جایگزین (alt) برای دسترسی و سئو تصاویر ضروری است. توصیف دقیق تصویر را بنویسید و کلمات کلیدی را طبیعی بگنجانید.'
        : 'Alt text is essential for accessibility and image SEO. Write accurate image descriptions with natural keyword inclusion.',
      estimatedTime: isFa ? '۲ ساعت' : '2 hours',
      codeExample: '<img src="photo.jpg" alt="Descriptive text about the image">',
      automatedFix: false,
    },
    'C01': {
      impact: 'high',
      effort: 'large',
      fix: isFa ? 'به‌روزرسانی محتوای قدیمی' : 'Update stale content',
      howTo: isFa
        ? 'محتوای قدیمی رتبه را کاهش می‌دهد. آمار و اطلاعات را به‌روز کنید، لینک‌های شکسته را تعمیر کنید و بخش‌های جدید اضافه کنید.'
        : 'Stale content hurts rankings. Update statistics, fix broken links, and add new sections.',
      estimatedTime: isFa ? '۴ ساعت' : '4 hours',
      automatedFix: false,
    },
  };

  const template = templates[finding.id];
  if (!template) return null;

  return {
    id: finding.id,
    issue: `Issue ${finding.id}`,
    impact: (template.impact || 'medium') as ActionableRecommendation['impact'],
    effort: (template.effort || 'medium') as ActionableRecommendation['effort'],
    fix: template.fix || `Fix ${finding.id}`,
    howTo: template.howTo || '',
    estimatedTime: template.estimatedTime || 'Unknown',
    affectedPages: finding.affected_pages,
    automatedFix: template.automatedFix || false,
    codeExample: template.codeExample,
    resources: template.resources,
  };
}

/**
 * Get quick wins (high impact, low effort)
 */
export function getQuickWins(recommendations: ActionableRecommendation[]): ActionableRecommendation[] {
  return recommendations.filter(r => 
    (r.impact === 'critical' || r.impact === 'high') && 
    r.effort === 'quick'
  );
}

/**
 * Calculate total estimated fix time
 */
export function calculateTotalFixTime(recommendations: ActionableRecommendation[]): string {
  // Simple estimation - in real implementation, parse time strings
  const quickCount = recommendations.filter(r => r.effort === 'quick').length;
  const mediumCount = recommendations.filter(r => r.effort === 'medium').length;
  const largeCount = recommendations.filter(r => r.effort === 'large').length;
  
  const totalMinutes = (quickCount * 15) + (mediumCount * 45) + (largeCount * 240);
  const totalHours = Math.ceil(totalMinutes / 60);
  
  if (totalHours < 8) {
    return `${totalHours} hours`;
  } else {
    const days = Math.ceil(totalHours / 8);
    return `${days} days`;
  }
}
