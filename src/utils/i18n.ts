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
    grade: 'Grade',
    ratio: 'Ratio',
    wp_info: 'WordPress Info',
    total: 'Total',
    items: 'items',
    freshness: 'Content Freshness',
    stale_content: 'Stale content',
    latest_products: 'Latest Products',
    latest_posts: 'Latest Posts',

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
    'issue.M01.title': 'Missing mobile viewport',
    'issue.C03.title': 'Thin content (<300 words)',
    'issue.S01.title': 'Not using HTTPS',
    'issue.S02.title': 'Mixed content (HTTP on HTTPS)',
    'issue.P01.title': 'Slow server response (>800ms)',
    'issue.L01.title': 'Poor performance score (<50)',
    'issue.L02.title': 'Slow Largest Contentful Paint (>2.5s)',
    'issue.L03.title': 'Poor Cumulative Layout Shift (>0.1)',
    'issue.L04.title': 'High Total Blocking Time (>200ms)',

    // Issue descriptions
    'issue.E01.desc': 'Pages marked as noindex (meta robots or X-Robots-Tag) may not appear in Google results. Ensure only pages you truly want hidden are noindex.',
    'issue.E02.desc': 'Broken pages (4xx) waste crawl budget and hurt user experience. Fix or redirect them.',
    'issue.E04.desc': 'Long redirect chains slow crawling and can dilute signals. Replace with a single direct redirect.',
    'issue.E06.desc': 'Canonical URL should match the final URL of the page. Mismatches can confuse indexing and duplicate handling.',
    'issue.F01.desc': 'Title tag is missing or too short. Write unique, descriptive titles for important pages.',
    'issue.F04.desc': 'Meta description is missing or too short. Write helpful snippets to improve CTR.',
    'issue.F07.desc': 'Missing H1 can weaken page clarity. Add one clear H1 per page.',
    'issue.F08.desc': 'Multiple H1 tags can reduce clarity. Prefer a single main H1.',
    'issue.G01.desc': 'Alt text improves accessibility and image search understanding. Add meaningful alt text for informative images.',
    'issue.M01.desc': 'Missing viewport meta tag prevents proper mobile rendering. Google uses mobile-first indexing, so this is critical.',
    'issue.C03.desc': 'Pages with less than 300 words of content may be considered thin content. Add more valuable, unique content.',
    'issue.S01.desc': 'Not using HTTPS is a security risk and ranking factor. Migrate to HTTPS with a valid SSL certificate.',
    'issue.S02.desc': 'Loading HTTP resources on HTTPS pages triggers browser security warnings. Update all links to use HTTPS.',
    'issue.P01.desc': 'Time to First Byte (TTFB) over 800ms indicates slow server response. Optimize server configuration or upgrade hosting.',
    'issue.L01.desc': 'Lighthouse performance score below 50 indicates significant performance issues. Core Web Vitals are a ranking factor.',
    'issue.L02.desc': 'Largest Contentful Paint (LCP) measures loading performance. Over 2.5s provides poor user experience and affects rankings.',
    'issue.L03.desc': 'Cumulative Layout Shift (CLS) measures visual stability. Over 0.1 causes layout shifts that frustrate users.',
    'issue.L04.desc': 'Total Blocking Time (TBT) measures interactivity. Over 200ms causes input delays and poor user experience.',
    'issue.L05.title': 'Orphan page (no inbound links)',
    'issue.L06.title': 'Deep page (>3 levels from homepage)',
    'issue.L05.desc': 'Pages with no internal links pointing to them are invisible to search engine crawlers. Add links from relevant pages to help discovery.',
    'issue.L06.desc': 'Pages more than 3 clicks from homepage are hard for users and crawlers to find. Improve site architecture and internal linking.',
    
    // New Indexability Issues
    'issue.E07.title': 'robots.txt blocking pages',
    'issue.E07.desc': 'robots.txt file is blocking important pages from being crawled. Review and update disallow rules to allow crawling of valuable content.',
    'issue.E12.title': 'X-Robots-Tag blocking indexing',
    'issue.E12.desc': 'Server is sending X-Robots-Tag header that blocks indexing. Check server configuration and remove unnecessary noindex headers.',
    'issue.E14.title': 'Cross-domain canonical URL',
    'issue.E14.desc': 'Canonical URL points to a different domain. This passes all SEO value to the external site. Ensure canonicals point to your own URLs.',
    'issue.E18.title': 'Password protected pages',
    'issue.E18.desc': 'Pages require authentication to access. Search engines cannot crawl password-protected content. Consider making important pages public.',
    'issue.E19.title': 'Infinite redirect loop',
    'issue.E19.desc': 'Pages are stuck in redirect loops. This prevents crawlers and users from accessing the content. Fix redirect configuration.',
    
    // Enhanced Freshness Issues
    'issue.C01.title': 'Stale blog posts (>3 months)',
    'issue.C01.desc': 'Blog posts haven\'t been updated in 3+ months. Fresh content performs better in search. Update old posts with new information.',
    'issue.C02.title': 'Stale products (>6 months)',
    'issue.C02.desc': 'Product pages haven\'t been updated in 6+ months. Keep product information current for better rankings and user experience.',
    'issue.C04.title': 'Stale pages (>12 months)',
    'issue.C04.desc': 'Static pages haven\'t been updated in 12+ months. Review and update important pages to maintain relevance.',
    'issue.C05.title': 'Overall site freshness low',
    'issue.C05.desc': 'Less than 50% of content is fresh. Google favors sites with regularly updated content. Establish a content update schedule.',
    
    // New Technical Issues
    'issue.E13.title': 'Soft 404 error pages',
    'issue.E13.desc': 'Pages return 200 status but display "not found" content. This confuses search engines. Return proper 404 status for missing pages.'
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
    grade: 'رتبه',
    ratio: 'نسبت',
    wp_info: 'اطلاعات WordPress',
    total: 'مجموع',
    items: 'آیتم',
    freshness: 'تازگی محتوا',
    stale_content: 'محتوای قدیمی',
    latest_products: 'آخرین محصولات',
    latest_posts: 'آخرین پست‌ها',

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
    'issue.M01.title': 'viewport موبایل وجود ندارد',
    'issue.C03.title': 'محتوای نازک (<300 کلمه)',
    'issue.S01.title': 'HTTPS فعال نیست',
    'issue.S02.title': 'محتوای ترکیبی (HTTP روی HTTPS)',
    'issue.P01.title': 'پاسخ سرور کند (>800ms)',
    'issue.L01.title': 'امتیاز عملکرد ضعیف (<50)',
    'issue.L02.title': 'LCP کند (>2.5 ثانیه)',
    'issue.L03.title': 'CLS ضعیف (>0.1)',
    'issue.L04.title': 'TBT بالا (>200ms)',

    // Issue descriptions
    'issue.E01.desc': 'اگر صفحه noindex باشد (meta robots یا X-Robots-Tag)، احتمالاً در نتایج گوگل نمایش داده نمی‌شود. فقط صفحاتی که واقعاً نمی‌خواهید ایندکس شوند را noindex کنید.',
    'issue.E02.desc': 'صفحات خراب (4xx) بودجه خزش را هدر می‌دهند و تجربه کاربر را خراب می‌کنند. آن‌ها را اصلاح یا ریدایرکت کنید.',
    'issue.E04.desc': 'زنجیره‌های ریدایرکت خزش را کند می‌کنند. بهتر است فقط یک ریدایرکت مستقیم داشته باشید.',
    'issue.E06.desc': 'Canonical باید با URL نهایی صفحه هم‌خوان باشد. عدم تطابق می‌تواند باعث سردرگمی در ایندکس و مدیریت محتوای تکراری شود.',
    'issue.F01.desc': 'Title صفحه وجود ندارد یا خیلی کوتاه است. برای صفحات مهم title یکتا و توصیفی بنویسید.',
    'issue.F04.desc': 'Meta description وجود ندارد یا خیلی کوتاه است. برای بهبود CTR توضیح مفید بنویسید.',
    'issue.F07.desc': 'نبودن H1 می‌تواند شفافیت موضوع صفحه را کم کند. یک H1 واضح اضافه کنید.',
    'issue.F08.desc': 'وجود چند H1 می‌تواند شفافیت را کم کند. بهتر است یک H1 اصلی داشته باشید.',
    'issue.G01.desc': 'Alt به دسترسی‌پذیری و درک تصاویر توسط موتور جستجو کمک می‌کند. برای تصاویر مهم alt معنادار بنویسید.',
    'issue.M01.desc': 'عدم وجود viewport متا تگ باعث نمایش نامناسب در موبایل می‌شود. گوگل از mobile-first indexing استفاده می‌کند.',
    'issue.C03.desc': 'صفحات با کمتر از 300 کلمه محتوا ممکن است به عنوان محتوای نازک در نظر گرفته شوند. محتوای ارزشمندتر اضافه کنید.',
    'issue.S01.desc': 'عدم استفاده از HTTPS خطر امنیتی است و فاکتور رتبه‌بندی. با گواهی SSL معتبر به HTTPS مهاجرت کنید.',
    'issue.S02.desc': 'بارگذاری منابع HTTP روی صفحات HTTPS هشدار امنیتی مرورگر را فعال می‌کند. همه لینک‌ها را به HTTPS به‌روزرسانی کنید.',
    'issue.P01.desc': 'Time to First Byte (TTFB) بیشتر از 800ms نشان‌دهنده پاسخ کند سرور است. تنظیمات سرور را بهینه کنید یا هاست را ارتقا دهید.',
    'issue.L01.desc': 'امتیاز عملکرد Lighthouse زیر 50 نشان‌دهنده مشکلات عملکردی قابل توجه است. Core Web Vitals فاکتور رتبه‌بندی هستند.',
    'issue.L02.desc': 'Largest Contentful Paint (LCP) سرعت بارگذاری را اندازه‌گیری می‌کند. بیش از 2.5 ثانیه تجربه کاربری ضعیفی ایجاد می‌کند.',
    'issue.L03.desc': 'Cumulative Layout Shift (CLS) پایداری بصری را اندازه‌گیری می‌کند. بیش از 0.1 باعث تغییر چیدمان آزاردهنده می‌شود.',
    'issue.L04.desc': 'Total Blocking Time (TBT) تعامل‌پذیری را اندازه‌گیری می‌کند. بیش از 200ms باعث تأخیر در ورودی می‌شود.',
    'issue.L05.title': 'صفحه یتیم (بدون لینک ورودی)',
    'issue.L06.title': 'صفحه عمیق (>3 سطح از صفحه اصلی)',
    'issue.L05.desc': 'صفحاتی که هیچ لینک داخلی به آن‌ها اشاره نمی‌کند برای خزنده‌های موتور جستجو نامرئی هستند. لینک‌هایی از صفحات مرتبط اضافه کنید تا کشف شوند.',
    'issue.L06.desc': 'صفحاتی که بیش از 3 کلیک از صفحه اصلی فاصله دارند برای کاربران و خزنده‌ها سخت برای پیدا کردن هستند. معماری سایت و لینک‌دهی داخلی را بهبود دهید.',
    
    // New Indexability Issues - Persian
    'issue.E07.title': 'robots.txt صفحات را بلاک کرده',
    'issue.E07.desc': 'فایل robots.txt صفحات مهم را از خزش بلاک کرده است. قوانین disallow را بررسی و به‌روز کنید تا خزش محتوای ارزشمند مجاز شود.',
    'issue.E12.title': 'هدر X-Robots-Tag بلاک می‌کند',
    'issue.E12.desc': 'سرور هدر X-Robots-Tag ارسال می‌کند که ایندکس را بلاک می‌کند. تنظیمات سرور را بررسی و هدرهای noindex غیرضروری را حذف کنید.',
    'issue.E14.title': 'Canonical دامنه خارجی',
    'issue.E14.desc': 'Canonical URL به دامنه دیگری اشاره می‌کند. این باعث انتقال تمام ارزش SEO به سایت خارجی می‌شود. Canonicalها باید به URLهای خودتان اشاره کنند.',
    'issue.E18.title': 'صفحات محافظت‌شده با رمز',
    'issue.E18.desc': 'صفحات نیاز به احراز هویت دارند. موتورهای جستجو نمی‌توانند محتوای محافظت‌شده با رمز را بخزند. صفحات مهم را عمومی کنید.',
    'issue.E19.title': 'حلقه ریدایرکت بی‌نهایت',
    'issue.E19.desc': 'صفحات در حلقه ریدایرکت گیر افتاده‌اند. این مانع دسترسی خزنده‌ها و کاربران به محتوا می‌شود. تنظیمات ریدایرکت را اصلاح کنید.',
    
    // Enhanced Freshness Issues - Persian
    'issue.C01.title': 'پست‌های وبلاگ قدیمی (>3 ماه)',
    'issue.C01.desc': 'پست‌های وبلاگ بیش از 3 ماه است که به‌روزرسانی نشده‌اند. محتوای تازه در جستجو بهتر عمل می‌کند. پست‌های قدیمی را با اطلاعات جدید به‌روز کنید.',
    'issue.C02.title': 'محصولات قدیمی (>6 ماه)',
    'issue.C02.desc': 'صفحات محصول بیش از 6 ماه است که به‌روزرسانی نشده‌اند. اطلاعات محصول را به‌روز نگه دارید برای رتبه‌بهتر و تجربه کاربری.',
    'issue.C04.title': 'صفحات قدیمی (>12 ماه)',
    'issue.C04.desc': 'صفحات استاتیک بیش از 12 ماه است که به‌روزرسانی نشده‌اند. صفحات مهم را بررسی و به‌روز کنید تا relevance حفظ شود.',
    'issue.C05.title': 'تازگی کلی سایت پایین',
    'issue.C05.desc': 'کمتر از 50% محتوا تازه است. گوگل سایت‌های با محتوای مرتباً به‌روزرسانی‌شده را ترجیح می‌دهد. برنامه به‌روزرسانی محتوا تنظیم کنید.',
    
    // New Technical Issues - Persian
    'issue.E13.title': 'صفحات Soft 404',
    'issue.E13.desc': 'صفحات وضعیت 200 برمی‌گردانند اما محتوای "not found" نمایش می‌دهند. این موتورهای جستجو را سردرگم می‌کند. برای صفحات مفقودی وضعیت 404 صحیح برگردانید.'
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
    G01: 'Images missing alt text',
    C01: 'Stale content',
    C02: 'Thin content',
    M01: 'Missing mobile viewport',
    C03: 'Thin content (<300 words)',
    S01: 'Not using HTTPS',
    S02: 'Mixed content',
    P01: 'Slow server response',
    L01: 'Poor performance score',
    L02: 'Slow LCP',
    L03: 'Poor CLS',
    L04: 'High TBT',
    L05: 'Orphan page',
    L06: 'Deep page'
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
    G01: 'تصاویر بدون alt',
    C01: 'محتوای قدیمی',
    C02: 'محتوای نازک',
    M01: 'viewport موبایل وجود ندارد',
    C03: 'محتوای نازک (<300 کلمه)',
    S01: 'HTTPS فعال نیست',
    S02: 'محتوای ترکیبی',
    P01: 'پاسخ سرور کند',
    L01: 'امتیاز عملکرد ضعیف',
    L02: 'LCP کند',
    L03: 'CLS ضعیف',
    L04: 'TBT بالا',
    L05: 'صفحه یتیم',
    L06: 'صفحه عمیق'
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
