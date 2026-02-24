import type { Report, Finding } from '../types.js'
import { t } from '../utils/i18n.js'

type Lang = 'en' | 'fa'

export function generateHtmlReport(report: Report, lang: Lang = 'en'): string {
  const isRTL = lang === 'fa'
  const direction = isRTL ? 'rtl' : 'ltr'
  const overallScore = report.scores.overall
  const grade = getGrade(overallScore)
  const gradeColor = getGradeColor(overallScore)
  const pillars = report.scores.pillars || {}

  const orphanCount = report.findings.find((f) => f.id === 'L05')?.affected_pages || 0
  const deepCount = report.findings.find((f) => f.id === 'L06')?.affected_pages || 0

  const findings = report.findings || []
  const critical = findings.filter((f) => f.severity === 'critical')
  const high = findings.filter((f) => f.severity === 'high')
  const medium = findings.filter((f) => f.severity === 'medium')
  const low = findings.filter((f) => f.severity === 'low')

  const lighthouse = report.lighthouse
  const performanceScore = lighthouse?.performance ?? null
  const lcp = lighthouse?.lcp ?? null
  const cls = lighthouse?.cls ?? null
  const tbt = lighthouse?.tbt ?? null

  return `<!DOCTYPE html>
<html lang="${lang}" dir="${direction}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${t(lang, 'audit_complete')} - ${escapeHtml(report.url)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            primary: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');
    body { font-family: ${isRTL ? "'Vazirmatn', sans-serif" : "'Inter', sans-serif"}; }
    .score-gauge { transition: stroke-dashoffset 1s ease-out; }
    .fade-in { animation: fadeIn 0.6s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card-hover { transition: all 0.3s ease; }
    .card-hover:hover { transform: translateY(-2px); box-shadow: 0 10px 40px -10px rgba(0,0,0,0.2); }
  </style>
</head>
<body class="bg-gray-50 dark:bg-gray-900 min-h-screen">
  <!-- Header -->
  <header class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
            <i class="fas fa-search text-white text-lg"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold text-gray-900 dark:text-white">${t(lang, 'audit_complete')}</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400">${escapeHtml(report.url)}</p>
          </div>
        </div>
        <div class="flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}">
          <button onclick="toggleTheme()" class="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors" aria-label="Toggle theme">
            <i class="fas fa-moon dark:hidden"></i>
            <i class="fas fa-sun hidden dark:block"></i>
          </button>
          <button onclick="downloadReport()" class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 ${isRTL ? 'space-x-reverse' : ''}">
            <i class="fas fa-download"></i>
            <span>${lang === 'fa' ? 'دانلود گزارش' : 'Download Report'}</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
    <!-- Hero Section -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 fade-in">
      <div class="grid md:grid-cols-2 gap-8 items-center">
        <div>
          <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4" style="background-color: ${gradeColor}20; color: ${gradeColor}">
            <span class="w-2 h-2 rounded-full mr-2" style="background-color: ${gradeColor}"></span>
            ${grade}
          </div>
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">${t(lang, 'score')}: ${overallScore}/100</h2>
          <p class="text-gray-600 dark:text-gray-400">${lang === 'fa' ? 'بررسی در ' : 'Audit completed in '}${formatDuration(report.duration_ms)}${lang === 'fa' ? ' انجام شد' : ''}</p>
          <div class="mt-6 grid grid-cols-2 gap-4">
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">${t(lang, 'checked')}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">${report.coverage.checked_pages.toLocaleString()}</p>
            </div>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
              <p class="text-sm text-gray-500 dark:text-gray-400">${t(lang, 'discovered')}</p>
              <p class="text-2xl font-bold text-gray-900 dark:text-white">${report.coverage.discovered_pages.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div class="flex justify-center">
          <div class="relative w-48 h-48">
            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8" class="text-gray-200 dark:text-gray-700"/>
              <circle id="score-circle" cx="50" cy="50" r="45" fill="none" stroke="${gradeColor}" stroke-width="8" stroke-linecap="round"
                stroke-dasharray="${Math.PI * 90}" stroke-dashoffset="${Math.PI * 90}" class="score-gauge"/>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center">
              <span class="text-5xl font-bold text-gray-900 dark:text-white">${overallScore}</span>
              <span class="text-sm text-gray-500 dark:text-gray-400">/100</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pillar Scores -->
    <section class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      ${generatePillarCard('indexability', pillars.indexability || 0, 'fa-sitemap', lang)}
      ${generatePillarCard('crawlability', pillars.crawlability || 0, 'fa-spider', lang)}
      ${generatePillarCard('onpage', pillars.onpage || 0, 'fa-file-alt', lang)}
      ${generatePillarCard('technical', pillars.technical || 0, 'fa-cogs', lang)}
      ${generatePillarCard('freshness', pillars.freshness || 0, 'fa-clock', lang)}
      ${generatePillarCard('performance', performanceScore !== null ? performanceScore : (pillars.performance || 0), 'fa-tachometer-alt', lang)}
    </section>

    <!-- Charts Section -->
    <section class="grid md:grid-cols-2 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${lang === 'fa' ? 'امتیازات محوری' : 'Pillar Scores'}</h3>
        <div class="relative h-64">
          <canvas id="pillarsChart" width="400" height="256" class="w-full h-full"></canvas>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${lang === 'fa' ? 'توزیع مشکلات' : 'Issues Distribution'}</h3>
        <div class="relative h-64">
          <canvas id="issuesChart" width="400" height="256" class="w-full h-full"></canvas>
        </div>
      </div>
    </section>

    ${lighthouse ? `
    <!-- Lighthouse Radar Chart -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">${lang === 'fa' ? 'معیارهای عملکرد Lighthouse' : 'Lighthouse Performance Metrics'}</h3>
        <div class="relative h-72 max-w-md mx-auto">
          <canvas id="lighthouseChart" width="400" height="288" class="w-full h-full"></canvas>
        </div>
    </section>
    ` : ''}

    <!-- Issues Table -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${t(lang, 'top_issues')}</h3>
          <div class="flex flex-wrap gap-2" id="issue-filters">
            <button onclick="filterIssues('all')" class="filter-btn active px-3 py-1 rounded-full text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 transition-colors" data-filter="all">
              ${lang === 'fa' ? 'همه' : 'All'}
            </button>
            <button onclick="filterIssues('critical')" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 transition-colors" data-filter="critical">
              ${lang === 'fa' ? 'بحرانی' : 'Critical'} (${critical.length})
            </button>
            <button onclick="filterIssues('high')" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 transition-colors" data-filter="high">
              ${lang === 'fa' ? 'بالا' : 'High'} (${high.length})
            </button>
            <button onclick="filterIssues('medium')" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 transition-colors" data-filter="medium">
              ${lang === 'fa' ? 'متوسط' : 'Medium'} (${medium.length})
            </button>
            <button onclick="filterIssues('low')" class="filter-btn px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 transition-colors" data-filter="low">
              ${lang === 'fa' ? 'پایین' : 'Low'} (${low.length})
            </button>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left" dir="${direction}">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${lang === 'fa' ? 'سطح' : 'Severity'}</th>
              <th class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${lang === 'fa' ? 'کد' : 'Code'}</th>
              <th class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${lang === 'fa' ? 'عنوان' : 'Title'}</th>
              <th class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${lang === 'fa' ? 'صفحات' : 'Pages'}</th>
              <th class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${t(lang, 'ratio')}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700" id="issues-table-body">
            ${findings.map((f) => generateIssueRow(f, lang)).join('')}
          </tbody>
        </table>
      </div>
      ${findings.length === 0 ? `
      <div class="p-8 text-center text-gray-500 dark:text-gray-400">
        <i class="fas fa-check-circle text-4xl text-green-500 mb-3"></i>
        <p>${lang === 'fa' ? 'هیچ مشکلی یافت نشد!' : 'No issues found!'}</p>
      </div>
      ` : ''}
    </section>

    ${lighthouse ? `
    <!-- Lighthouse Metrics -->
    <section class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">${lang === 'fa' ? 'معیارهای Core Web Vitals' : 'Core Web Vitals'}</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-center">
          <div class="text-3xl font-bold ${getMetricColor(lcp, 'lcp')} mb-1">${lcp ? (lcp / 1000).toFixed(2) + 's' : 'N/A'}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">LCP</div>
          <div class="text-xs text-gray-500 mt-1">${lang === 'fa' ? 'بزرگترین رنگ محتوایی' : 'Largest Contentful Paint'}</div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-center">
          <div class="text-3xl font-bold ${getMetricColor(cls, 'cls')} mb-1">${cls !== null ? cls.toFixed(3) : 'N/A'}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">CLS</div>
          <div class="text-xs text-gray-500 mt-1">${lang === 'fa' ? 'تغییر چیدمان تجمعی' : 'Cumulative Layout Shift'}</div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-center">
          <div class="text-3xl font-bold ${getMetricColor(tbt, 'tbt')} mb-1">${tbt ? tbt + 'ms' : 'N/A'}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">TBT</div>
          <div class="text-xs text-gray-500 mt-1">${lang === 'fa' ? 'زمان مسدودسازی کل' : 'Total Blocking Time'}</div>
        </div>
        <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-5 text-center">
          <div class="text-3xl font-bold ${getMetricColor(performanceScore, 'score')} mb-1">${performanceScore !== null ? performanceScore : 'N/A'}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400">${lang === 'fa' ? 'امتیاز عملکرد' : 'Performance'}</div>
          <div class="text-xs text-gray-500 mt-1">${lang === 'fa' ? 'امتیاز کلی Lighthouse' : 'Lighthouse Score'}</div>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- Internal Links Analysis -->
    ${(orphanCount > 0 || deepCount > 0) ? `
    <section class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-6">${lang === 'fa' ? 'تحلیل لینک‌های داخلی' : 'Internal Links Analysis'}</h3>
      <div class="grid md:grid-cols-2 gap-6">
        <div class="flex items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800">
          <div class="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mr-4 ${isRTL ? 'mr-0 ml-4' : ''}">
            <i class="fas fa-unlink text-yellow-600 dark:text-yellow-400"></i>
          </div>
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 dark:text-white">${t(lang, 'issue.L05.title')}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${t(lang, 'issue.L05.desc')}</p>
          </div>
          <span class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">${orphanCount}</span>
        </div>
        <div class="flex items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div class="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-4 ${isRTL ? 'mr-0 ml-4' : ''}">
            <i class="fas fa-layer-group text-blue-600 dark:text-blue-400"></i>
          </div>
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 dark:text-white">${t(lang, 'issue.L06.title')}</h4>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${t(lang, 'issue.L06.desc')}</p>
          </div>
          <span class="text-2xl font-bold text-blue-600 dark:text-blue-400">${deepCount}</span>
        </div>
      </div>
    </section>
    ` : ''}

    <!-- WordPress & Freshness -->
    ${report.wp_api?.detected || report.freshness ? `
    <section class="grid md:grid-cols-2 gap-6">
      ${report.wp_api?.detected ? `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div class="flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''} mb-4">
          <i class="fab fa-wordpress text-4xl text-blue-500"></i>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${t(lang, 'wp_info')}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${report.wp_api.totalItems.toLocaleString()} ${t(lang, 'items')}</p>
          </div>
        </div>
        <div class="space-y-3">
          ${Object.entries(report.wp_api.postTypes).map(([type, count]) => `
          <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="text-gray-700 dark:text-gray-300 capitalize">${type}</span>
            <span class="font-semibold text-gray-900 dark:text-white">${count}</span>
          </div>
          `).join('')}
        </div>
      </div>
      ` : ''}
      
      ${report.freshness ? `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center space-x-3 ${isRTL ? 'space-x-reverse' : ''}">
            <i class="fas fa-clock text-2xl text-green-500"></i>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${t(lang, 'freshness')}</h3>
          </div>
          <span class="text-3xl font-bold" style="color: ${getScoreColor(report.freshness.score)}">${report.freshness.score}</span>
        </div>
        <div class="mb-4">
          <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div class="h-3 rounded-full transition-all duration-1000" style="width: 0%; background-color: ${getScoreColor(report.freshness.score)}" id="freshness-bar"></div>
          </div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${t(lang, 'stale_content')}: <span class="font-semibold text-red-600">${report.freshness.stale_count}</span></p>
        
        ${report.freshness.latest_products.length > 0 ? `
        <div class="mb-4">
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">${t(lang, 'latest_products')}</h4>
          <ul class="space-y-2">
            ${report.freshness.latest_products.slice(0, 3).map((p) => `
            <li class="text-sm text-gray-600 dark:text-gray-400 truncate">${escapeHtml(p.title)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        ${report.freshness.latest_posts.length > 0 ? `
        <div>
          <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">${t(lang, 'latest_posts')}</h4>
          <ul class="space-y-2">
            ${report.freshness.latest_posts.slice(0, 3).map((p) => `
            <li class="text-sm text-gray-600 dark:text-gray-400 truncate">${escapeHtml(p.title)}</li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}
    </section>
    ` : ''}

    <!-- Footer -->
    <footer class="text-center text-gray-500 dark:text-gray-400 py-8">
      <p class="text-sm">${lang === 'fa' ? 'تولید شده توسط' : 'Generated by'} SEO Audit Bot</p>
      <p class="text-xs mt-1">${new Date(report.finished_at).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-US')}</p>
    </footer>
  </main>

  <script>
    // Theme toggle
    function toggleTheme() {
      if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
      } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
      }
      updateCharts();
    }

    // Initialize theme
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }

    // Animate score gauge
    setTimeout(() => {
      const circle = document.getElementById('score-circle');
      if (circle) {
        const circumference = Math.PI * 90;
        const offset = circumference - (${overallScore} / 100) * circumference;
        circle.style.strokeDashoffset = offset;
      }
    }, 300);

    // Animate freshness bar
    setTimeout(() => {
      const bar = document.getElementById('freshness-bar');
      if (bar) {
        bar.style.width = '${report.freshness?.score || 0}%';
      }
    }, 500);

    // Download report
    function downloadReport() {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'seo-audit-report.html';
      a.click();
      URL.revokeObjectURL(url);
    }

    // Filter issues
    function filterIssues(severity) {
      const rows = document.querySelectorAll('#issues-table-body tr');
      const buttons = document.querySelectorAll('.filter-btn');
      
      buttons.forEach(btn => {
        btn.classList.remove('bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900');
        if (btn.dataset.filter === severity) {
          btn.classList.add('bg-gray-900', 'dark:bg-white', 'text-white', 'dark:text-gray-900');
        }
      });
      
      rows.forEach(row => {
        if (severity === 'all' || row.dataset.severity === severity) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    // Chart.js charts
    let charts = [];

    function initCharts() {
      const isDark = document.documentElement.classList.contains('dark');
      const textColor = isDark ? '#e5e7eb' : '#374151';
      const gridColor = isDark ? '#374151' : '#e5e7eb';

      // Pillars Bar Chart
      const pillarsCtx = document.getElementById('pillarsChart');
      if (pillarsCtx) {
        charts.push(new Chart(pillarsCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(getPillarLabels(lang))},
            datasets: [{
              label: '${lang === 'fa' ? 'امتیاز' : 'Score'}',
              data: [${pillars.indexability || 0}, ${pillars.crawlability || 0}, ${pillars.onpage || 0}, ${pillars.technical || 0}, ${pillars.freshness || 0}, ${performanceScore !== null ? performanceScore : (pillars.performance || 0)}],
              backgroundColor: [
                'rgba(59, 130, 246, 0.8)',
                'rgba(16, 185, 129, 0.8)',
                'rgba(245, 158, 11, 0.8)',
                'rgba(139, 92, 246, 0.8)',
                'rgba(236, 72, 153, 0.8)',
                'rgba(14, 165, 233, 0.8)'
              ],
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: { color: textColor },
                grid: { color: gridColor }
              },
              x: {
                ticks: { color: textColor },
                grid: { display: false }
              }
            }
          }
        }));
      }

      // Issues Doughnut Chart
      const issuesCtx = document.getElementById('issuesChart');
      if (issuesCtx) {
        charts.push(new Chart(issuesCtx, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify([lang === 'fa' ? 'بحرانی' : 'Critical', lang === 'fa' ? 'بالا' : 'High', lang === 'fa' ? 'متوسط' : 'Medium', lang === 'fa' ? 'پایین' : 'Low'])},
            datasets: [{
              data: [${critical.length}, ${high.length}, ${medium.length}, ${low.length}],
              backgroundColor: [
                'rgba(239, 68, 68, 0.8)',
                'rgba(249, 115, 22, 0.8)',
                'rgba(234, 179, 8, 0.8)',
                'rgba(34, 197, 94, 0.8)'
              ]
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: textColor }
              }
            }
          }
        }));
      }

      // Lighthouse Radar Chart
      const lighthouseCtx = document.getElementById('lighthouseChart');
      if (lighthouseCtx) {
        charts.push(new Chart(lighthouseCtx, {
          type: 'radar',
          data: {
            labels: ${JSON.stringify([lang === 'fa' ? 'عملکرد' : 'Performance', lang === 'fa' ? 'LCP' : 'LCP', lang === 'fa' ? 'CLS' : 'CLS', lang === 'fa' ? 'TBT' : 'TBT'])},
            datasets: [{
              label: '${lang === 'fa' ? 'امتیازات' : 'Scores'}',
              data: [${performanceScore !== null ? performanceScore : 0}, ${getLcpScore(lcp)}, ${getClsScore(cls)}, ${getTbtScore(tbt)}],
              backgroundColor: 'rgba(59, 130, 246, 0.2)',
              borderColor: 'rgba(59, 130, 246, 0.8)',
              pointBackgroundColor: 'rgba(59, 130, 246, 1)'
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { labels: { color: textColor } }
            },
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: { color: textColor, backdropColor: 'transparent' },
                grid: { color: gridColor },
                angleLines: { color: gridColor },
                pointLabels: { color: textColor }
              }
            }
          }
        }));
      }
    }

    function updateCharts() {
      charts.forEach(chart => chart.destroy());
      charts = [];
      initCharts();
    }

    // Initialize charts when DOM and Chart.js are ready
    function waitForChartJS(callback, maxAttempts = 50) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if (typeof Chart !== 'undefined') {
          clearInterval(interval);
          callback();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          console.error('Chart.js failed to load');
        }
      }, 100);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => waitForChartJS(initCharts));
    } else {
      waitForChartJS(initCharts);
    }
  </script>
</body>
</html>`;
}

function generatePillarCard(key: string, score: number, icon: string, lang: Lang): string {
  const labels: Record<string, { en: string; fa: string }> = {
    indexability: { en: 'Indexability', fa: 'ایندکس‌پذیری' },
    crawlability: { en: 'Crawlability', fa: 'خزش‌پذیری' },
    onpage: { en: 'On-Page', fa: 'محتوایی' },
    technical: { en: 'Technical', fa: 'فنی' },
    freshness: { en: 'Freshness', fa: 'تازگی' },
    performance: { en: 'Performance', fa: 'عملکرد' }
  };
  const label = labels[key]?.[lang] || key;
  const color = getScoreColor(score);
  
  return `
  <div class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 card-hover">
    <div class="flex items-center justify-between mb-3">
      <i class="fas ${icon} text-2xl" style="color: ${color}"></i>
      <span class="text-2xl font-bold text-gray-900 dark:text-white">${score}</span>
    </div>
    <h4 class="text-sm font-medium text-gray-600 dark:text-gray-400">${label}</h4>
    <div class="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div class="h-2 rounded-full transition-all duration-1000" style="width: ${score}%; background-color: ${color}"></div>
    </div>
  </div>
  `;
}

function generateIssueRow(finding: Finding, lang: Lang): string {
  const severityColors = {
    critical: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
    high: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
    medium: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
    low: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-yellow-200'
  };
  
  const severityLabels = {
    critical: lang === 'fa' ? 'بحرانی' : 'Critical',
    high: lang === 'fa' ? 'بالا' : 'High',
    medium: lang === 'fa' ? 'متوسط' : 'Medium',
    low: lang === 'fa' ? 'پایین' : 'Low'
  };
  
  const title = t(lang, `issue.${finding.id}.title`) || finding.id;
  const prevalenceValue = finding.prevalence || (finding.affected_pages / finding.checked_pages) || 0;
  const prevalence = (prevalenceValue * 100).toFixed(1);
  
  return `
  <tr data-severity="${finding.severity}" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
    <td class="px-6 py-4 whitespace-nowrap">
      <span class="px-2 py-1 text-xs font-semibold rounded-full ${severityColors[finding.severity]}">
        ${severityLabels[finding.severity]}
      </span>
    </td>
    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">${finding.id}</td>
    <td class="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">${escapeHtml(title)}</td>
    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">${finding.affected_pages.toLocaleString()}</td>
    <td class="px-6 py-4 whitespace-nowrap">
      <div class="flex items-center">
        <div class="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
          <div class="bg-primary-500 h-2 rounded-full" style="width: ${prevalence}%"></div>
        </div>
        <span class="text-sm text-gray-600 dark:text-gray-400">${prevalence}%</span>
      </div>
    </td>
  </tr>
  `;
}

function getGrade(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Critical';
}

function getGradeColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 70) return '#3b82f6';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

function getPillarLabels(lang: Lang): string[] {
  if (lang === 'fa') {
    return ['ایندکس‌پذیری', 'خزش‌پذیری', 'محتوایی', 'فنی', 'تازگی', 'عملکرد'];
  }
  return ['Indexability', 'Crawlability', 'On-Page', 'Technical', 'Freshness', 'Performance'];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

function getLcpScore(lcp: number | null): number {
  if (lcp === null) return 0;
  if (lcp <= 2500) return 90;
  if (lcp <= 4000) return 50;
  return 25;
}

function getClsScore(cls: number | null): number {
  if (cls === null) return 0;
  if (cls <= 0.1) return 90;
  if (cls <= 0.25) return 50;
  return 25;
}

function getTbtScore(tbt: number | null): number {
  if (tbt === null) return 0;
  if (tbt <= 200) return 90;
  if (tbt <= 600) return 50;
  return 25;
}

export function getMetricColor(value: number | null, type: 'lcp' | 'cls' | 'tbt' | 'score'): string {
  if (value === null) return 'text-gray-400';
  
  if (type === 'lcp') {
    if (value <= 2500) return 'text-green-600 dark:text-green-400';
    if (value <= 4000) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
  
  if (type === 'cls') {
    if (value <= 0.1) return 'text-green-600 dark:text-green-400';
    if (value <= 0.25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
  
  if (type === 'tbt') {
    if (value <= 200) return 'text-green-600 dark:text-green-400';
    if (value <= 600) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
  
  if (type === 'score') {
    if (value >= 90) return 'text-green-600 dark:text-green-400';
    if (value >= 70) return 'text-blue-600 dark:text-blue-400';
    if (value >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
  
  return 'text-gray-600 dark:text-gray-400';
}

export function getCWVColor(metric: 'lcp' | 'cls' | 'tbt', value: number | null): string {
  return getMetricColor(value, metric);
}
