import type { Lang } from '../types.js';

const STR: Record<Lang, Record<string,string>> = {
  en: {
    audit_complete: 'SEO Audit Results',
    coverage: 'Coverage',
    checked: 'Checked',
    discovered: 'Discovered',
    estimated: 'Estimated total',
    link_checks: 'Link checks',
    score: 'Overall score',
    top_issues: 'Top issues',
    quick_wins: 'Quick wins',
    note_sample: 'Note: sample-based audit (smart). For exact counts, run a deeper crawl.',
    grade_excellent: 'Excellent',
    grade_good: 'Good',
    grade_ok: 'Needs work',
    grade_bad: 'Critical',
    not_ready: 'Report not ready yet',
    not_found: 'Audit not found',

    // Issue titles
    'issue.E01.title': 'Pages set to noindex',
    'issue.E02.title': '4xx pages found',
    'issue.E04.title': 'Redirect chains',
    'issue.E06.title': 'Canonical mismatch',
    'issue.F01.title': 'Missing or too short title',
    'issue.F04.title': 'Missing or too short meta description',
    'issue.F07.title': 'Missing H1',
    'issue.F08.title': 'Multiple H1 tags',
    'issue.G01.title': 'Images missing alt text',

    // Issue descriptions
    'issue.E01.desc': 'Pages marked as noindex (meta robots or X-Robots-Tag) may not appear in Google results. Ensure only pages you truly want hidden are noindex.',
    'issue.E02.desc': 'Broken pages (4xx) waste crawl budget and hurt user experience. Fix or redirect them.',
    'issue.E04.desc': 'Long redirect chains slow crawling and can dilute signals. Replace with a single direct redirect.',
    'issue.E06.desc': 'Canonical URL should match the final URL of the page. Mismatches can confuse indexing and duplicate handling.',
    'issue.F01.desc': 'Title tag is missing or too short. Write unique, descriptive titles for important pages.',
    'issue.F04.desc': 'Meta description is missing or too short. Write helpful snippets to improve CTR.',
    'issue.F07.desc': 'Missing H1 can weaken page clarity. Add one clear H1 per page.',
    'issue.F08.desc': 'Multiple H1 tags can reduce clarity. Prefer a single main H1.',
    'issue.G01.desc': 'Alt text improves accessibility and image search understanding. Add meaningful alt text for informative images.'
  },
  fa: {
    audit_complete: 'نتایج بررسی سئو',
    coverage: 'پوشش بررسی',
    checked: 'بررسی‌شده',
    discovered: 'کشف‌شده',
    estimated: 'تخمین کل صفحات',
    link_checks: 'بررسی لینک',
    score: 'امتیاز کلی',
    top_issues: 'مهم‌ترین مشکلات',
    quick_wins: 'اقدامات سریع',
    note_sample: 'یادداشت: این گزارش نمونه‌برداری‌شده است (smart). برای آمار دقیق‌تر خزش عمیق‌تر انجام دهید.',
    grade_excellent: 'عالی',
    grade_good: 'خوب',
    grade_ok: 'نیازمند بهبود',
    grade_bad: 'بحرانی',
    not_ready: 'گزارش هنوز آماده نیست',
    not_found: 'گزارش پیدا نشد',

    // Issue titles
    'issue.E01.title': 'صفحات دارای noindex',
    'issue.E02.title': 'صفحات 4xx',
    'issue.E04.title': 'زنجیره ریدایرکت',
    'issue.E06.title': 'عدم تطابق canonical',
    'issue.F01.title': 'title وجود ندارد یا خیلی کوتاه است',
    'issue.F04.title': 'meta description وجود ندارد یا خیلی کوتاه است',
    'issue.F07.title': 'H1 وجود ندارد',
    'issue.F08.title': 'چندین H1 در صفحه',
    'issue.G01.title': 'تصاویر بدون alt',

    // Issue descriptions
    'issue.E01.desc': 'اگر صفحه noindex باشد (meta robots یا X-Robots-Tag)، احتمالاً در نتایج گوگل نمایش داده نمی‌شود. فقط صفحاتی که واقعاً نمی‌خواهید ایندکس شوند را noindex کنید.',
    'issue.E02.desc': 'صفحات خراب (4xx) بودجه خزش را هدر می‌دهند و تجربه کاربر را خراب می‌کنند. آن‌ها را اصلاح یا ریدایرکت کنید.',
    'issue.E04.desc': 'زنجیره‌های ریدایرکت خزش را کند می‌کنند. بهتر است فقط یک ریدایرکت مستقیم داشته باشید.',
    'issue.E06.desc': 'Canonical باید با URL نهایی صفحه هم‌خوان باشد. عدم تطابق می‌تواند باعث سردرگمی در ایندکس و مدیریت محتوای تکراری شود.',
    'issue.F01.desc': 'Title صفحه وجود ندارد یا خیلی کوتاه است. برای صفحات مهم title یکتا و توصیفی بنویسید.',
    'issue.F04.desc': 'Meta description وجود ندارد یا خیلی کوتاه است. برای بهبود CTR توضیح مفید بنویسید.',
    'issue.F07.desc': 'نبودن H1 می‌تواند شفافیت موضوع صفحه را کم کند. یک H1 واضح اضافه کنید.',
    'issue.F08.desc': 'وجود چند H1 می‌تواند شفافیت را کم کند. بهتر است یک H1 اصلی داشته باشید.',
    'issue.G01.desc': 'Alt به دسترسی‌پذیری و درک تصاویر توسط موتور جستجو کمک می‌کند. برای تصاویر مهم alt معنادار بنویسید.'
  }
};

const CHECK: Record<Lang, Record<string,string>> = {
  en: {
    E01: 'Pages set to noindex',
    E02: '4xx pages found',
    E04: 'Redirect chains',
    E06: 'Canonical mismatch with page URL',
    F01: 'Missing/short title',
    F04: 'Missing meta description',
    F07: 'Missing H1',
    F08: 'Multiple H1 tags',
    G01: 'Images missing alt text'
  },
  fa: {
    E01: 'صفحات دارای noindex',
    E02: 'صفحات 4xx',
    E04: 'زنجیره ریدایرکت',
    E06: 'عدم تطابق canonical با URL صفحه',
    F01: 'title وجود ندارد/کوتاه',
    F04: 'meta description وجود ندارد',
    F07: 'H1 وجود ندارد',
    F08: 'چندین H1 در صفحه',
    G01: 'تصاویر بدون alt'
  }
};

export function t(lang: Lang, key: string): string {
  return STR[lang]?.[key] ?? STR.en[key] ?? key;
}
export function checkTitle(lang: Lang, id: string): string {
  return CHECK[lang]?.[id] ?? CHECK.en[id] ?? id;
}
export function inferLang(q?: string, h?: string): Lang {
  const qs=(q??'').toLowerCase();
  if (qs.startsWith('fa')) return 'fa';
  if (qs.startsWith('en')) return 'en';
  const hs=(h??'').toLowerCase();
  if (hs.includes('fa')) return 'fa';
  return 'en';
}
