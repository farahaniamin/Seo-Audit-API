// Modern SEO Audit Report Generator
// Beautiful visual design with pass/fail indicators

export function generateStandaloneHtmlReport(report: any, lang: 'en' | 'fa' = 'en'): string {
  const isRTL = lang === 'fa';
  const overallScore = report.scores?.overall || 0;
  const grade = getGrade(overallScore);
  const gradeColor = getGradeColor(overallScore);
  const pillars = report.scores?.pillars || {};
  const breakdown = report.scores?.breakdown;
  
  // Freshness data
  const freshnessData = report.freshness;
  const freshnessScore = freshnessData?.score || 0;
  
  // Issues by severity
  const findings = report.findings || [];
  const critical = findings.filter((f: any) => f.severity === 'critical');
  const high = findings.filter((f: any) => f.severity === 'high');
  const medium = findings.filter((f: any) => f.severity === 'medium');
  const low = findings.filter((f: any) => f.severity === 'low');
  
  // Group issues by pillar
  const issuesByPillar = {
    indexability: findings.filter((f: any) => f.pillar === 'indexability'),
    crawlability: findings.filter((f: any) => f.pillar === 'crawlability'),
    onpage: findings.filter((f: any) => f.pillar === 'onpage'),
    technical: findings.filter((f: any) => f.pillar === 'technical'),
    freshness: findings.filter((f: any) => f.pillar === 'freshness'),
    performance: findings.filter((f: any) => f.pillar === 'performance'),
  };
  
  // Lighthouse data
  const lighthouse = report.lighthouse;
  const hasLighthouse = lighthouse && lighthouse.performance !== null;
  
  return `<!DOCTYPE html>
<html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SEO Audit Report - ${escapeHtml(report.url)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    :root {
      --color-success: #10b981;
      --color-success-light: #d1fae5;
      --color-warning: #f59e0b;
      --color-warning-light: #fef3c7;
      --color-error: #ef4444;
      --color-error-light: #fee2e2;
      --color-info: #3b82f6;
      --color-info-light: #dbeafe;
      --color-gray-50: #f9fafb;
      --color-gray-100: #f3f4f6;
      --color-gray-200: #e5e7eb;
      --color-gray-300: #d1d5db;
      --color-gray-600: #4b5563;
      --color-gray-700: #374151;
      --color-gray-800: #1f2937;
      --color-gray-900: #111827;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --radius-sm: 6px;
      --radius: 8px;
      --radius-lg: 12px;
      --radius-xl: 16px;
    }
    
    body { 
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--color-gray-100);
      color: var(--color-gray-800);
      line-height: 1.6;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    
    /* Header */
    .header {
      background: white;
      border-radius: var(--radius-xl);
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: var(--shadow-md);
    }
    
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    
    .logo { 
      display: flex; 
      align-items: center; 
      gap: 16px; 
    }
    
    .logo-icon {
      width: 48px; 
      height: 48px;
      background: linear-gradient(135deg, var(--color-info), #8b5cf6);
      border-radius: var(--radius);
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: white; 
      font-weight: 700;
      font-size: 18px;
      box-shadow: var(--shadow);
    }
    
    /* Score Section */
    .score-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 48px;
      align-items: center;
    }
    
    @media (max-width: 768px) {
      .score-section { grid-template-columns: 1fr; gap: 32px; }
    }
    
    .score-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    
    .grade-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 100px;
      font-size: 14px;
      font-weight: 600;
      width: fit-content;
    }
    
    .score-display {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    
    .score-number { 
      font-size: 56px; 
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    
    .score-total {
      font-size: 24px;
      font-weight: 600;
      color: var(--color-gray-400);
    }
    
    .score-meta {
      color: var(--color-gray-600);
      font-size: 14px;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-top: 8px;
    }
    
    .stat-card {
      background: var(--color-gray-50);
      padding: 20px;
      border-radius: var(--radius-lg);
      text-align: center;
      border: 1px solid var(--color-gray-200);
    }
    
    .stat-value { 
      font-size: 28px; 
      font-weight: 700;
      color: var(--color-gray-900);
      line-height: 1;
      margin-bottom: 4px;
    }
    
    .stat-label { 
      font-size: 13px; 
      color: var(--color-gray-600);
      font-weight: 500;
    }
    
    /* Score Gauge */
    .score-gauge-container {
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    .score-gauge {
      position: relative;
      width: 220px; 
      height: 220px;
    }
    
    .score-gauge svg {
      transform: rotate(-90deg);
    }
    
    .score-gauge-bg {
      fill: none;
      stroke: var(--color-gray-200);
      stroke-width: 12;
    }
    
    .score-gauge-fill {
      fill: none;
      stroke-width: 12;
      stroke-linecap: round;
      transition: stroke-dashoffset 1.5s ease-out;
    }
    
    .score-gauge-text {
      position: absolute;
      top: 50%; 
      left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    
    .score-gauge-value { 
      font-size: 48px; 
      font-weight: 800;
      line-height: 1;
    }
    
    .score-gauge-label { 
      font-size: 14px; 
      color: var(--color-gray-500);
      font-weight: 500;
    }
    
    /* Section Cards */
    .section {
      background: white;
      border-radius: var(--radius-xl);
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: var(--shadow);
      border: 1px solid var(--color-gray-200);
    }
    
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;
    }
    
    .section-icon {
      width: 40px;
      height: 40px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    
    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: var(--color-gray-900);
      flex: 1;
    }
    
    .section-score {
      font-size: 24px;
      font-weight: 700;
    }
    
    /* Pillar Cards Grid */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }
    
    .pillar-card {
      background: var(--color-gray-50);
      border-radius: var(--radius-lg);
      padding: 24px;
      border: 1px solid var(--color-gray-200);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    
    .pillar-card:hover {
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }
    
    .pillar-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    
    .pillar-icon {
      width: 44px;
      height: 44px;
      border-radius: var(--radius);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    
    .pillar-info {
      flex: 1;
    }
    
    .pillar-name { 
      font-size: 15px;
      font-weight: 600;
      color: var(--color-gray-700);
    }
    
    .pillar-score { 
      font-size: 28px;
      font-weight: 800;
      line-height: 1;
    }
    
    .pillar-status {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 4px;
    }
    
    .progress-bar {
      height: 8px;
      background: var(--color-gray-200);
      border-radius: 100px;
      overflow: hidden;
      margin-bottom: 12px;
    }
    
    .progress-fill {
      height: 100%;
      border-radius: 100px;
      transition: width 1s ease-out;
    }
    
    .pillar-issues {
      font-size: 13px;
      color: var(--color-gray-600);
    }
    
    /* Issue Check Cards */
    .checks-grid {
      display: grid;
      gap: 12px;
    }
    
    .check-card {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px 20px;
      border-radius: var(--radius);
      border: 1px solid var(--color-gray-200);
      transition: all 0.2s ease;
    }
    
    .check-card:hover {
      box-shadow: var(--shadow-sm);
    }
    
    .check-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
      font-weight: 700;
    }
    
    .check-icon.pass {
      background: var(--color-success-light);
      color: var(--color-success);
    }
    
    .check-icon.fail {
      background: var(--color-error-light);
      color: var(--color-error);
    }
    
    .check-icon.warning {
      background: var(--color-warning-light);
      color: var(--color-warning);
    }
    
    .check-card.check-passed {
      background: var(--color-success-light);
      border-color: var(--color-success);
      opacity: 0.8;
    }
    
    .check-card.check-failed {
      background: white;
      border-color: var(--color-error);
    }
    
    .check-card.check-expanded {
      border-radius: var(--radius) var(--radius) 0 0;
      box-shadow: var(--shadow-md);
    }
    
    .check-content {
      flex: 1;
    }
    
    .check-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-gray-900);
      margin-bottom: 2px;
    }
    
    .check-desc {
      font-size: 13px;
      color: var(--color-gray-600);
    }
    
    .check-meta {
      text-align: right;
      font-size: 12px;
      color: var(--color-gray-500);
    }
    
    .check-meta span {
      display: block;
    }
    
    .check-count {
      font-weight: 600;
      font-size: 14px;
      color: var(--color-gray-700);
    }
    
    .check-status-line {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
      flex-wrap: wrap;
    }
    
    .pass-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      background: var(--color-success-light);
      color: var(--color-success);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 700;
    }
    
    .view-pages {
      font-size: 12px;
      color: var(--color-info);
      font-weight: 600;
      cursor: pointer;
    }
    
    /* Check Details (Expandable) */
    .check-details {
      background: var(--color-gray-50);
      border: 1px solid var(--color-gray-200);
      border-top: none;
      border-radius: 0 0 var(--radius) var(--radius);
      padding: 16px 20px;
      margin: -1px 0 0 0;
      animation: slideDown 0.3s ease;
    }
    
    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .check-details-header {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-gray-700);
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-gray-200);
    }
    
    .affected-pages-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    
    .affected-pages-list li {
      margin-bottom: 8px;
    }
    
    .affected-pages-list a {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      background: white;
      border-radius: var(--radius-sm);
      color: var(--color-info);
      font-size: 13px;
      text-decoration: none;
      word-break: break-all;
      transition: all 0.2s ease;
    }
    
    .affected-pages-list a:hover {
      background: var(--color-info-light);
      transform: translateX(4px);
    }
    
    .more-pages {
      font-size: 12px;
      color: var(--color-gray-500);
      font-style: italic;
      margin-top: 8px;
      padding: 8px;
      text-align: center;
      background: var(--color-gray-100);
      border-radius: var(--radius-sm);
    }
    
    /* Severity Badge */
    .severity-badge {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 100px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    
    .severity-critical { 
      background: var(--color-error-light); 
      color: #991b1b; 
    }
    
    .severity-high { 
      background: #ffedd5; 
      color: #9a3412; 
    }
    
    .severity-medium { 
      background: var(--color-warning-light); 
      color: #92400e; 
    }
    
    .severity-low { 
      background: var(--color-info-light); 
      color: #1e40af; 
    }
    
    /* Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-gray-200);
      text-align: center;
    }
    
    .summary-value {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    
    .summary-label {
      font-size: 13px;
      color: var(--color-gray-600);
      font-weight: 500;
    }
    
    /* Charts */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    
    .chart-container {
      background: var(--color-gray-50);
      border-radius: var(--radius-lg);
      padding: 20px;
      height: 320px;
      border: 1px solid var(--color-gray-200);
    }
    
    .chart-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--color-gray-700);
    }
    
    canvas {
      width: 100% !important;
      height: calc(100% - 40px) !important;
    }
    
    /* Lighthouse Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
    }
    
    .metric-card {
      background: var(--color-gray-50);
      padding: 24px 16px;
      border-radius: var(--radius-lg);
      text-align: center;
      border: 1px solid var(--color-gray-200);
    }
    
    .metric-value {
      font-size: 36px;
      font-weight: 800;
      margin-bottom: 4px;
      line-height: 1;
    }
    
    .metric-label { 
      font-size: 13px; 
      color: var(--color-gray-600);
      font-weight: 600;
    }
    
    .metric-sublabel { 
      font-size: 11px; 
      color: var(--color-gray-400);
      margin-top: 4px;
    }
    
    /* Color Utilities */
    .text-green { color: var(--color-success); }
    .text-yellow { color: var(--color-warning); }
    .text-orange { color: #f97316; }
    .text-red { color: var(--color-error); }
    .text-blue { color: var(--color-info); }
    .bg-green { background: var(--color-success); }
    .bg-yellow { background: var(--color-warning); }
    .bg-orange { background: #f97316; }
    .bg-red { background: var(--color-error); }
    .bg-blue { background: var(--color-info); }
    
    /* Freshness Section */
    .freshness-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    
    .freshness-card {
      background: var(--color-gray-50);
      padding: 20px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--color-gray-200);
    }
    
    .freshness-type {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-gray-600);
      margin-bottom: 8px;
    }
    
    .freshness-score {
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    
    .freshness-detail {
      font-size: 12px;
      color: var(--color-gray-500);
    }
    
    /* Footer */
    .footer {
      text-align: center;
      padding: 40px 0;
      color: var(--color-gray-500);
      font-size: 14px;
    }
    
    /* Button */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      background: var(--color-info);
      color: white;
      border: none;
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .btn:hover {
      background: #2563eb;
      transform: translateY(-1px);
      box-shadow: var(--shadow-md);
    }
    
    /* Responsive */
    @media (max-width: 640px) {
      .container { padding: 16px; }
      .header { padding: 24px; }
      .score-number { font-size: 40px; }
      .section { padding: 24px; }
      .pillars-grid { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="header-top">
        <div class="logo">
          <div class="logo-icon">SEO</div>
          <div>
            <h1 style="font-size: 22px; font-weight: 700; color: var(--color-gray-900);">SEO Audit Report</h1>
            <p style="font-size: 14px; color: var(--color-gray-500);">${escapeHtml(report.url)}</p>
          </div>
        </div>
        <button onclick="downloadReport()" class="btn">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          ${isRTL ? 'دانلود گزارش' : 'Download Report'}
        </button>
      </div>
      
      <div class="score-section">
        <div class="score-info">
          <div class="grade-badge" style="background: ${gradeColor}15; color: ${gradeColor};">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            ${grade} - ${getGradeLabel(overallScore)}
          </div>
          
          <div class="score-display">
            <span class="score-number" style="color: ${gradeColor};">${overallScore.toFixed(1)}</span>
            <span class="score-total">/100</span>
          </div>
          
          <p class="score-meta">${isRTL ? 'مدت زمان حسابرسی:' : 'Audit completed in'} ${formatDuration(report.duration_ms || 0)}</p>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${report.coverage?.checked_pages || 0}</div>
              <div class="stat-label">${isRTL ? 'صفحات بررسی‌شده' : 'Pages Checked'}</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${report.coverage?.discovered_pages || 0}</div>
              <div class="stat-label">${isRTL ? 'صفحات کشف‌شده' : 'Pages Discovered'}</div>
            </div>
          </div>
        </div>
        
        <div class="score-gauge-container">
          <div class="score-gauge">
            <svg width="220" height="220" viewBox="0 0 100 100">
              <circle class="score-gauge-bg" cx="50" cy="50" r="42"/>
              <circle id="score-circle" class="score-gauge-fill" cx="50" cy="50" r="42" 
                      stroke="${gradeColor}"
                      stroke-dasharray="264" 
                      stroke-dashoffset="264"/>
            </svg>
            <div class="score-gauge-text">
              <div class="score-gauge-value" style="color: ${gradeColor};">${overallScore.toFixed(0)}</div>
              <div class="score-gauge-label">${isRTL ? 'از ۱۰۰' : 'of 100'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Issues Summary -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-value" style="color: ${critical.length > 0 ? '#ef4444' : '#10b981'};">${critical.length}</div>
        <div class="summary-label">${isRTL ? 'بحرانی' : 'Critical'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: ${high.length > 0 ? '#f97316' : '#10b981'};">${high.length}</div>
        <div class="summary-label">${isRTL ? 'بالا' : 'High'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: ${medium.length > 0 ? '#f59e0b' : '#10b981'};">${medium.length}</div>
        <div class="summary-label">${isRTL ? 'متوسط' : 'Medium'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-value" style="color: ${low.length > 0 ? '#3b82f6' : '#10b981'};">${low.length}</div>
        <div class="summary-label">${isRTL ? 'پایین' : 'Low'}</div>
      </div>
    </div>
    
    <!-- Pillar Scores with Visual Checks -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white;">📊</div>
        <div class="section-title">${isRTL ? 'امتیازات محوری' : 'Pillar Scores'}</div>
      </div>
      
      <div class="pillars-grid">
        ${generateModernPillarCards(pillars, issuesByPillar, lang)}
      </div>
    </div>
    
    <!-- Detailed Checks by Pillar -->
    ${generateDetailedChecksSection(pillars, issuesByPillar, breakdown, lang)}
    
    <!-- Charts -->
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background: linear-gradient(135deg, #10b981, #059669); color: white;">📈</div>
        <div class="section-title">${isRTL ? 'تحلیل و نمودارها' : 'Analysis & Charts'}</div>
      </div>
      
      <div class="charts-grid">
        <div class="chart-container">
          <div class="chart-title">${isRTL ? 'امتیازات محوری' : 'Pillar Scores'}</div>
          <canvas id="pillarsCanvas"></canvas>
        </div>
        <div class="chart-container">
          <div class="chart-title">${isRTL ? 'توزیع مشکلات' : 'Issues Distribution'}</div>
          <canvas id="issuesCanvas"></canvas>
        </div>
      </div>
    </div>
    
    ${hasLighthouse ? generateModernLighthouseSection(lighthouse, lang) : ''}
    
    ${freshnessData && freshnessData.by_type ? generateModernFreshnessSection(freshnessData, lang) : ''}
    
    <div class="footer">
      <p>${isRTL ? 'تولید شده توسط SEO Audit Bot' : 'Generated by SEO Audit Bot'}</p>
      <p style="font-size: 12px; margin-top: 4px; color: var(--color-gray-400);">${new Date(report.finished_at).toLocaleString()}</p>
    </div>
  </div>
  
  <script>
    // Animate score gauge
    setTimeout(() => {
      const circle = document.getElementById('score-circle');
      if (circle) {
        const circumference = 2 * Math.PI * 42;
        const offset = circumference - (${overallScore} / 100) * circumference;
        circle.style.strokeDashoffset = offset;
      }
    }, 200);
    
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
    
    // Toggle check details (expandable page lists)
    function toggleCheckDetails(checkId) {
      const detailsDiv = document.getElementById('check-details-' + checkId);
      const checkCard = document.querySelector('[data-check-id="' + checkId + '"]');
      const viewPagesSpan = checkCard?.querySelector('.view-pages');
      
      if (detailsDiv) {
        const isVisible = detailsDiv.style.display !== 'none';
        detailsDiv.style.display = isVisible ? 'none' : 'block';
        
        // Update the arrow icon
        if (viewPagesSpan) {
          viewPagesSpan.textContent = isVisible 
            ? (document.dir === 'rtl' ? 'مشاهده صفحات ▼' : 'View pages ▼')
            : (document.dir === 'rtl' ? 'مخفی کردن صفحات ▲' : 'Hide pages ▲');
        }
        
        // Add/remove active class for styling
        if (checkCard) {
          if (!isVisible) {
            checkCard.classList.add('check-expanded');
          } else {
            checkCard.classList.remove('check-expanded');
          }
        }
      }
    }
    
    // Canvas charts (same as before but modernized)
    function drawBarChart(canvasId, labels, data, colors) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const padding = 50;
      const chartWidth = rect.width - padding * 2;
      const chartHeight = rect.height - padding * 2;
      const barWidth = chartWidth / data.length * 0.5;
      const spacing = chartWidth / data.length;
      const maxValue = 100;
      
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      data.forEach((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + i * spacing + (spacing - barWidth) / 2;
        const y = rect.height - padding - barHeight;
        
        // Bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, colors[i]);
        gradient.addColorStop(1, colors[i] + '80');
        ctx.fillStyle = gradient;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 6);
        ctx.fill();
        
        // Value on top
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(0), x + barWidth / 2, y - 8);
        
        // Label at bottom
        ctx.save();
        ctx.translate(x + barWidth / 2, rect.height - padding + 20);
        ctx.rotate(-Math.PI / 8);
        ctx.fillStyle = '#6b7280';
        ctx.font = '11px Inter, sans-serif';
        ctx.fillText(labels[i], 0, 0);
        ctx.restore();
      });
      
      // Grid lines
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = rect.height - padding - (i / 5) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(rect.width - padding, y);
        ctx.stroke();
        
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText((i * 20).toString(), padding - 8, y + 3);
      }
    }
    
    function drawDoughnutChart(canvasId, labels, data, colors) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2 - 10;
      const radius = Math.min(centerX, centerY) - 30;
      const innerRadius = radius * 0.55;
      
      const total = data.reduce((a, b) => a + b, 0);
      let currentAngle = -Math.PI / 2;
      
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      if (total === 0) {
        ctx.fillStyle = '#9ca3af';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('${isRTL ? 'مشکلی یافت نشد' : 'No issues found'}', centerX, centerY);
        return;
      }
      
      data.forEach((value, i) => {
        if (value === 0) return;
        
        const sliceAngle = (value / total) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        
        currentAngle += sliceAngle;
      });
      
      // Center text
      ctx.fillStyle = '#1f2937';
      ctx.font = 'bold 28px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(total.toString(), centerX, centerY + 5);
      
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText('${isRTL ? 'مشکل' : 'Issues'}', centerX, centerY + 22);
      
      // Legend at bottom
      let legendY = rect.height - 25;
      let legendX = 20;
      const legendItemWidth = (rect.width - 40) / labels.length;
      
      labels.forEach((label, i) => {
        if (data[i] === 0) return;
        
        const x = legendX + i * legendItemWidth;
        
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(x + 6, legendY + 6, 5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#374151';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label + ' (' + data[i] + ')', x + 16, legendY + 10);
      });
    }
    
    // Initialize charts
    window.addEventListener('load', () => {
      drawBarChart('pillarsCanvas', 
        ${JSON.stringify(getPillarLabels(lang))},
        [${pillars.indexability || 0}, ${pillars.crawlability || 0}, ${pillars.onpage || 0}, ${pillars.technical || 0}, ${pillars.freshness || 0}, ${pillars.performance || 0}],
        ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9']
      );
      
      drawDoughnutChart('issuesCanvas',
        ${JSON.stringify([isRTL ? 'بحرانی' : 'Critical', isRTL ? 'بالا' : 'High', isRTL ? 'متوسط' : 'Medium', isRTL ? 'پایین' : 'Low'])},
        [${critical.length}, ${high.length}, ${medium.length}, ${low.length}],
        ['#ef4444', '#f97316', '#f59e0b', '#3b82f6']
      );
    });
    
    // Redraw on resize
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        drawBarChart('pillarsCanvas', 
          ${JSON.stringify(getPillarLabels(lang))},
          [${pillars.indexability || 0}, ${pillars.crawlability || 0}, ${pillars.onpage || 0}, ${pillars.technical || 0}, ${pillars.freshness || 0}, ${pillars.performance || 0}],
          ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9']
        );
        drawDoughnutChart('issuesCanvas',
          ${JSON.stringify([isRTL ? 'بحرانی' : 'Critical', isRTL ? 'بالا' : 'High', isRTL ? 'متوسط' : 'Medium', isRTL ? 'پایین' : 'Low'])},
          [${critical.length}, ${high.length}, ${medium.length}, ${low.length}],
          ['#ef4444', '#f97316', '#f59e0b', '#3b82f6']
        );
      }, 250);
    });
  </script>
</body>
</html>`;
}

// Modern helper functions
function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Needs Work';
  return 'Poor';
}

function getGradeColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function getScoreStatus(score: number): 'pass' | 'warning' | 'fail' {
  if (score >= 80) return 'pass';
  if (score >= 60) return 'warning';
  return 'fail';
}

function getPillarLabels(lang: 'en' | 'fa'): string[] {
  if (lang === 'fa') {
    return ['ایندکس‌پذیری', 'خزش‌پذیری', 'محتوایی', 'فنی', 'تازگی', 'عملکرد'];
  }
  return ['Indexability', 'Crawlability', 'On-Page', 'Technical', 'Freshness', 'Performance'];
}

function getPillarIcons(): string[] {
  return ['🔍', '🕷️', '📝', '⚙️', '🕐', '⚡'];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const mins = Math.floor(ms / 60000);
  const secs = ((ms % 60000) / 1000).toFixed(0);
  return `${mins}m ${secs}s`;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generateModernPillarCards(pillars: any, issuesByPillar: any, lang: 'en' | 'fa'): string {
  const labels = getPillarLabels(lang);
  const icons = getPillarIcons();
  const keys = ['indexability', 'crawlability', 'onpage', 'technical', 'freshness', 'performance'];
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];
  
  const isRTL = lang === 'fa';
  
  return keys.map((key, i) => {
    const score = pillars[key] || 0;
    const color = colors[i];
    const status = getScoreStatus(score);
    const issues = issuesByPillar[key] || [];
    const issueCount = issues.length;
    
    let statusText = isRTL ? 'عالی' : 'Excellent';
    let statusIcon = '✓';
    if (status === 'warning') {
      statusText = isRTL ? 'نیاز به بهبود' : 'Needs Improvement';
      statusIcon = '!';
    } else if (status === 'fail') {
      statusText = isRTL ? 'نیاز به توجه' : 'Needs Attention';
      statusIcon = '✕';
    }
    
    return `
    <div class="pillar-card">
      <div class="pillar-header">
        <div class="pillar-icon" style="background: ${color}20; color: ${color};">
          ${icons[i]}
        </div>
        <div class="pillar-info">
          <div class="pillar-name">${labels[i]}</div>
          <div class="pillar-score" style="color: ${color};">${score.toFixed(1)}</div>
          <div class="pillar-status" style="color: ${status === 'pass' ? '#10b981' : status === 'warning' ? '#f59e0b' : '#ef4444'};">
            <span style="font-weight: 700;">${statusIcon}</span> ${statusText}
          </div>
        </div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${score}%; background: ${color};"></div>
      </div>
      <div class="pillar-issues">
        ${issueCount > 0 
          ? (isRTL ? `${issueCount} مشکل یافت شد` : `${issueCount} issues found`) 
          : (isRTL ? 'هیچ مشکلی یافت نشد ✓' : 'No issues found ✓')}
      </div>
    </div>
    `;
  }).join('');
}

// Define all possible checks for each pillar
const ALL_CHECKS: Record<string, Array<{id: string, title: string, desc: string}>> = {
  indexability: [
    { id: 'E01', title: 'Noindex meta tag', desc: 'Pages blocked from indexing via meta robots tag' },
    { id: 'E07', title: 'robots.txt blocking', desc: 'Pages blocked via robots.txt file' },
    { id: 'E12', title: 'X-Robots-Tag header', desc: 'Server headers blocking indexing' },
    { id: 'E14', title: 'Cross-domain canonical', desc: 'Canonical URLs pointing to external domains' },
    { id: 'E18', title: 'Password protected', desc: 'Pages requiring authentication' },
  ],
  crawlability: [
    { id: 'E02', title: '4xx errors', desc: 'Broken pages returning client errors' },
    { id: 'E19', title: 'Redirect loops', desc: 'Infinite redirect chains' },
    { id: 'E04', title: 'Redirect chains', desc: 'Multiple redirects in sequence' },
    { id: 'L06', title: 'Deep pages', desc: 'Pages more than 3 clicks from homepage' },
  ],
  onpage: [
    { id: 'F01', title: 'Missing title', desc: 'Pages without title tags or too short' },
    { id: 'F04', title: 'Missing meta description', desc: 'Pages without meta descriptions' },
    { id: 'F07', title: 'Missing H1', desc: 'Pages without H1 heading' },
    { id: 'F08', title: 'Multiple H1s', desc: 'Pages with more than one H1' },
    { id: 'C03', title: 'Thin content', desc: 'Pages with less than 300 words' },
  ],
  technical: [
    { id: 'E06', title: 'Canonical mismatch', desc: 'Canonical URL does not match page URL' },
    { id: 'M01', title: 'Missing viewport', desc: 'No mobile viewport meta tag' },
    { id: 'S01', title: 'Not using HTTPS', desc: 'Pages on HTTP instead of HTTPS' },
    { id: 'S02', title: 'Mixed content', desc: 'HTTP resources on HTTPS pages' },
    { id: 'P01', title: 'Slow TTFB', desc: 'Time to First Byte over 800ms' },
    { id: 'L05', title: 'Orphan pages', desc: 'Pages with no inbound links' },
    { id: 'E13', title: 'Soft 404s', desc: 'Missing pages returning 200 status' },
    { id: 'G01', title: 'Missing alt text', desc: 'Images without alt attributes' },
  ],
  freshness: [
    { id: 'C01', title: 'Stale blog posts', desc: 'Blog posts not updated in 3+ months' },
    { id: 'C02', title: 'Stale products', desc: 'Products not updated in 6+ months' },
    { id: 'C04', title: 'Stale pages', desc: 'Static pages not updated in 12+ months' },
    { id: 'C05', title: 'Overall freshness', desc: 'Less than 50% content is fresh' },
  ],
  performance: [
    { id: 'L01', title: 'Poor Lighthouse score', desc: 'Performance score below 50' },
    { id: 'L02', title: 'Slow LCP', desc: 'Largest Contentful Paint over 2.5s' },
    { id: 'L03', title: 'Poor CLS', desc: 'Cumulative Layout Shift over 0.1' },
    { id: 'L04', title: 'High TBT', desc: 'Total Blocking Time over 200ms' },
  ],
};

function generateDetailedChecksSection(pillars: any, issuesByPillar: any, breakdown: any, lang: 'en' | 'fa'): string {
  const isRTL = lang === 'fa';
  const keys = ['indexability', 'crawlability', 'onpage', 'technical', 'freshness', 'performance'];
  const labels = getPillarLabels(lang);
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9'];
  
  let html = '';
  
  keys.forEach((key, i) => {
    const issues = issuesByPillar[key] || [];
    const allChecks = ALL_CHECKS[key] || [];
    const color = colors[i];
    
    // Create a map of found issues for quick lookup
    const foundIssues = new Map(issues.map((issue: any) => [issue.id, issue]));
    
    html += `
    <div class="section">
      <div class="section-header">
        <div class="section-icon" style="background: ${color}20; color: ${color};">
          ${i === 0 ? '🔍' : i === 1 ? '🕷️' : i === 2 ? '📝' : i === 3 ? '⚙️' : i === 4 ? '🕐' : '⚡'}
        </div>
        <div class="section-title">${labels[i]} ${isRTL ? '- بررسی کامل' : '- Complete Checks'}</div>
        <div class="section-score" style="color: ${color};">${pillars[key]?.toFixed(1) || 0}</div>
      </div>
      
      <div class="checks-grid">
        ${allChecks.map((check: any) => {
          const foundIssue: any = foundIssues.get(check.id);
          const isPassed = !foundIssue;
          const severity = foundIssue?.severity || '';
          const icon = isPassed ? '✓' : severity === 'critical' || severity === 'high' ? '✕' : '!';
          const statusClass = isPassed ? 'pass' : severity === 'critical' || severity === 'high' ? 'fail' : 'warning';
          const affectedPages = foundIssue?.affected_pages || 0;
          const exampleUrls = foundIssue?.example_urls || [];
          
          let cardHtml = `
          <div class="check-card ${isPassed ? 'check-passed' : 'check-failed'}" data-check-id="${check.id}" style="cursor: ${foundIssue ? 'pointer' : 'default'};" ${foundIssue ? `onclick="toggleCheckDetails('${check.id}')"` : ''}>
            <div class="check-icon ${statusClass}">${icon}</div>
            <div class="check-content">
              <div class="check-title">${check.id} - ${escapeHtml(check.title)}</div>
              <div class="check-desc">${escapeHtml(check.desc)}</div>
              ${foundIssue ? `
                <div class="check-status-line">
                  <span class="severity-badge severity-${severity}">${severity}</span>
                  <span class="check-count">${affectedPages} ${isRTL ? 'صفحه' : 'pages affected'}</span>
                  ${exampleUrls.length > 0 ? `<span class="view-pages">${isRTL ? 'مشاهده صفحات' : 'View pages'} ▼</span>` : ''}
                </div>
              ` : `
                <div class="check-status-line">
                  <span class="pass-badge">${isRTL ? '✓ عبور' : '✓ Pass'}</span>
                </div>
              `}
            </div>
          </div>
          `;
          
          // Add expandable section for affected pages if issue exists
          if (foundIssue && exampleUrls.length > 0) {
            const displayUrls = exampleUrls.slice(0, 10);
            const remainingCount = exampleUrls.length - 10;
            
            cardHtml += `
            <div id="check-details-${check.id}" class="check-details" style="display: none;">
              <div class="check-details-header">
                ${isRTL ? 'صفحات دارای این مشکل:' : 'Pages with this issue:'} ${affectedPages} ${isRTL ? 'صفحه' : 'pages'}
              </div>
              <ul class="affected-pages-list">
                ${displayUrls.map((url: string) => `
                  <li>
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
                      ${escapeHtml(url)}
                      <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                    </a>
                  </li>
                `).join('')}
              </ul>
              ${remainingCount > 0 ? `<div class="more-pages">${isRTL ? `و ${remainingCount} صفحه دیگر...` : `And ${remainingCount} more pages...`}</div>` : ''}
            </div>
            `;
          }
          
          return cardHtml;
        }).join('')}
      </div>
    </div>
    `;
  });
  
  return html;
}

function generateModernLighthouseSection(lighthouse: any, lang: 'en' | 'fa'): string {
  const isRTL = lang === 'fa';
  const lcp = lighthouse?.lcp;
  const cls = lighthouse?.cls;
  const tbt = lighthouse?.tbt;
  const perf = lighthouse?.performance;
  
  const getMetricStatus = (value: number | null, type: string): { color: string; status: string } => {
    if (value === null) return { color: '#9ca3af', status: 'N/A' };
    if (type === 'lcp') {
      if (value <= 2500) return { color: '#10b981', status: 'good' };
      if (value <= 4000) return { color: '#f59e0b', status: 'needs-improvement' };
      return { color: '#ef4444', status: 'poor' };
    }
    if (type === 'cls') {
      if (value <= 0.1) return { color: '#10b981', status: 'good' };
      if (value <= 0.25) return { color: '#f59e0b', status: 'needs-improvement' };
      return { color: '#ef4444', status: 'poor' };
    }
    if (type === 'tbt') {
      if (value <= 200) return { color: '#10b981', status: 'good' };
      if (value <= 600) return { color: '#f59e0b', status: 'needs-improvement' };
      return { color: '#ef4444', status: 'poor' };
    }
    if (type === 'perf') {
      if (value >= 90) return { color: '#10b981', status: 'good' };
      if (value >= 70) return { color: '#f59e0b', status: 'needs-improvement' };
      return { color: '#ef4444', status: 'poor' };
    }
    return { color: '#9ca3af', status: 'unknown' };
  };
  
  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white;">⚡</div>
      <div class="section-title">Core Web Vitals</div>
    </div>
    
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value" style="color: ${getMetricStatus(lcp, 'lcp').color};">${lcp ? (lcp / 1000).toFixed(2) + 's' : 'N/A'}</div>
        <div class="metric-label">LCP</div>
        <div class="metric-sublabel">${isRTL ? 'بزرگ‌ترین رنگ محتوا' : 'Largest Contentful Paint'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${getMetricStatus(cls, 'cls').color};">${cls ? cls.toFixed(3) : 'N/A'}</div>
        <div class="metric-label">CLS</div>
        <div class="metric-sublabel">${isRTL ? 'تغییر چیدمان تجمعی' : 'Cumulative Layout Shift'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${getMetricStatus(tbt, 'tbt').color};">${tbt ? tbt + 'ms' : 'N/A'}</div>
        <div class="metric-label">TBT</div>
        <div class="metric-sublabel">${isRTL ? 'زمان مسدودسازی کل' : 'Total Blocking Time'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-value" style="color: ${getMetricStatus(perf, 'perf').color};">${perf || 'N/A'}</div>
        <div class="metric-label">${isRTL ? 'عملکرد' : 'Performance'}</div>
        <div class="metric-sublabel">Lighthouse Score</div>
      </div>
    </div>
  </div>
  `;
}

function generateModernFreshnessSection(freshness: any, lang: 'en' | 'fa'): string {
  const isRTL = lang === 'fa';
  const score = freshness.score || 0;
  const color = getGradeColor(score);
  const byType = freshness.by_type || {};
  
  let typeCards = '';
  Object.entries(byType).forEach(([type, data]: [string, any]) => {
    const typeColor = getGradeColor(data.score);
    const typeLabel = isRTL 
      ? (type === 'post' ? 'پست‌ها' : type === 'product' ? 'محصولات' : type === 'page' ? 'صفحات' : type)
      : (type === 'post' ? 'Blog Posts' : type === 'product' ? 'Products' : type === 'page' ? 'Pages' : type);
    
    typeCards += `
    <div class="freshness-card">
      <div class="freshness-type">${typeLabel}</div>
      <div class="freshness-score" style="color: ${typeColor};">${data.score}%</div>
      <div class="freshness-detail">
        ${isRTL 
          ? `${data.fresh} تازه / ${data.stale} قدیمی (${data.threshold} ماه)`
          : `${data.fresh} fresh / ${data.stale} stale (${data.threshold}mo threshold)`}
      </div>
    </div>
    `;
  });
  
  return `
  <div class="section">
    <div class="section-header">
      <div class="section-icon" style="background: linear-gradient(135deg, #ec4899, #db2777); color: white;">🕐</div>
      <div class="section-title">${isRTL ? 'تازگی محتوا' : 'Content Freshness'}</div>
      <div class="section-score" style="color: ${color};">${score}%</div>
    </div>
    
    <div class="freshness-grid">
      ${typeCards}
    </div>
    
    ${freshness.recommendations && freshness.recommendations.length > 0 ? `
    <div style="margin-top: 20px; padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <div style="font-weight: 600; color: #92400e; margin-bottom: 8px;">${isRTL ? 'توصیه‌ها:' : 'Recommendations:'}</div>
      <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 14px;">
        ${freshness.recommendations.map((rec: string) => `<li style="margin-bottom: 4px;">${rec}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>
  `;
}
