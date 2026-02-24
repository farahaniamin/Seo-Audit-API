// Standalone HTML Report Generator with embedded Chart.js
// This version includes Chart.js inline to avoid CDN loading issues

export function generateStandaloneHtmlReport(report: any, lang: 'en' | 'fa' = 'en'): string {
  const isRTL = lang === 'fa';
  const overallScore = report.scores?.overall || 0;
  const grade = getGrade(overallScore);
  const gradeColor = getGradeColor(overallScore);
  const pillars = report.scores?.pillars || {};
  
  // Freshness data
  const freshnessData = report.freshness;
  const freshnessScore = freshnessData?.score || 0;
  
  // Issues by severity
  const findings = report.findings || [];
  const critical = findings.filter((f: any) => f.severity === 'critical');
  const high = findings.filter((f: any) => f.severity === 'high');
  const medium = findings.filter((f: any) => f.severity === 'medium');
  const low = findings.filter((f: any) => f.severity === 'low');
  
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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f3f4f6;
      color: #1f2937;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    
    /* Header */
    .header {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon {
      width: 40px; height: 40px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: white; font-weight: bold;
    }
    
    /* Score Display */
    .score-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      align-items: center;
    }
    @media (max-width: 768px) {
      .score-section { grid-template-columns: 1fr; }
    }
    
    .score-gauge-container {
      display: flex;
      justify-content: center;
    }
    .score-gauge {
      position: relative;
      width: 200px; height: 200px;
    }
    .score-gauge svg {
      transform: rotate(-90deg);
    }
    .score-value {
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      text-align: center;
    }
    .score-number { font-size: 48px; font-weight: bold; }
    .score-label { font-size: 14px; color: #6b7280; }
    
    .grade-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 12px;
    }
    
    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 20px;
    }
    .stat-card {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-value { font-size: 24px; font-weight: bold; }
    .stat-label { font-size: 12px; color: #6b7280; }
    
    /* Section Cards */
    .section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 20px;
      color: #111827;
    }
    
    /* Pillar Cards */
    .pillars-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .pillar-card {
      background: #f9fafb;
      padding: 16px;
      border-radius: 8px;
      text-align: center;
    }
    .pillar-icon {
      width: 40px; height: 40px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 8px;
      font-size: 20px;
    }
    .pillar-name { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
    .pillar-score { font-size: 24px; font-weight: bold; }
    .progress-bar {
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      margin-top: 8px;
      overflow: hidden;
    }
    .progress-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 1s ease-out;
    }
    
    /* Charts */
    .charts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 24px;
    }
    .chart-container {
      background: #f9fafb;
      border-radius: 8px;
      padding: 16px;
      height: 300px;
      position: relative;
    }
    .chart-title {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #374151;
    }
    canvas {
      width: 100% !important;
      height: calc(100% - 30px) !important;
    }
    
    /* Issues Table */
    .issues-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .issues-table th,
    .issues-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    .issues-table th {
      font-size: 12px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .severity-badge {
      display: inline-flex;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .severity-critical { background: #fee2e2; color: #991b1b; }
    .severity-high { background: #ffedd5; color: #9a3412; }
    .severity-medium { background: #fef3c7; color: #92400e; }
    .severity-low { background: #dbeafe; color: #1e40af; }
    
    /* Clickable Issue Rows */
    .issue-row {
      transition: background-color 0.2s;
    }
    .issue-row:hover {
      background-color: #f9fafb;
    }
    
    /* Lighthouse Metrics */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .metric-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-value {
      font-size: 32px;
      font-weight: bold;
      margin-bottom: 4px;
    }
    .metric-label { font-size: 14px; color: #6b7280; }
    .metric-sublabel { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    
    /* Colors */
    .text-green { color: #10b981; }
    .text-yellow { color: #f59e0b; }
    .text-orange { color: #f97316; }
    .text-red { color: #ef4444; }
    .bg-green { background: #10b981; }
    .bg-yellow { background: #f59e0b; }
    .bg-orange { background: #f97316; }
    .bg-red { background: #ef4444; }
    .bg-blue { background: #3b82f6; }
    .bg-purple { background: #8b5cf6; }
    .bg-pink { background: #ec4899; }
    
    /* Responsive */
    @media (max-width: 640px) {
      .container { padding: 12px; }
      .score-number { font-size: 36px; }
      .pillars-grid { grid-template-columns: repeat(2, 1fr); }
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
            <h1 style="font-size: 20px; font-weight: 600;">SEO Audit Report</h1>
            <p style="font-size: 14px; color: #6b7280;">${escapeHtml(report.url)}</p>
          </div>
        </div>
        <button onclick="downloadReport()" style="
          padding: 8px 16px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        ">
          Download Report
        </button>
      </div>
      
      <div class="score-section">
        <div>
          <div class="grade-badge" style="background: ${gradeColor}20; color: ${gradeColor};">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${gradeColor};"></span>
            ${grade} - ${getGradeLabel(overallScore)}
          </div>
          <h2 style="font-size: 28px; font-weight: bold; margin-bottom: 8px;">
            Overall score: ${overallScore.toFixed(1)}/100
          </h2>
          <p style="color: #6b7280;">Audit completed in ${formatDuration(report.duration_ms || 0)}</p>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${report.coverage?.checked_pages || 0}</div>
              <div class="stat-label">Pages Checked</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${report.coverage?.discovered_pages || 0}</div>
              <div class="stat-label">Pages Discovered</div>
            </div>
          </div>
        </div>
        
        <div class="score-gauge-container">
          <div class="score-gauge">
            <svg width="200" height="200" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" stroke-width="8"/>
              <circle id="score-circle" cx="50" cy="50" r="45" fill="none" stroke="${gradeColor}" 
                      stroke-width="8" stroke-linecap="round"
                      stroke-dasharray="${Math.PI * 90}" 
                      stroke-dashoffset="${Math.PI * 90}"
                      style="transition: stroke-dashoffset 1s ease-out;"/>
            </svg>
            <div class="score-value">
              <div class="score-number">${overallScore.toFixed(1)}</div>
              <div class="score-label">/100</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Pillar Scores -->
    <div class="section">
      <h2 class="section-title">Pillar Scores</h2>
      <div class="pillars-grid">
        ${generatePillarCards(pillars, lang)}
      </div>
    </div>
    
    ${generateChartsSection(pillars, critical, high, medium, low, lighthouse, lang)}
    
    ${generateScoringMethodologySection(report.scores?.breakdown?.scoring_methodology, lang)}
    
    ${generateIssuesSection(findings, lang)}
    
    ${generateIssueThresholdsSection(lang)}
    
    ${hasLighthouse ? generateLighthouseSection(lighthouse, lang) : ''}
    
    ${freshnessData ? generateFreshnessSection(freshnessData, lang) : ''}
    
    <footer style="text-align: center; padding: 40px 0; color: #9ca3af; font-size: 14px;">
      <p>Generated by SEO Audit Bot</p>
      <p style="font-size: 12px; margin-top: 4px;">${new Date(report.finished_at).toLocaleString()}</p>
    </footer>
  </div>
  
  <script>
    // Animate score gauge
    setTimeout(() => {
      const circle = document.getElementById('score-circle');
      if (circle) {
        const circumference = Math.PI * 90;
        const offset = circumference - (${overallScore} / 100) * circumference;
        circle.style.strokeDashoffset = offset;
      }
    }, 100);
    
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
    
    // Draw simple bar chart using Canvas API
    function drawBarChart(canvasId, labels, data, colors) {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      const padding = 40;
      const chartWidth = rect.width - padding * 2;
      const chartHeight = rect.height - padding * 2;
      const barWidth = chartWidth / data.length * 0.6;
      const spacing = chartWidth / data.length;
      const maxValue = 100;
      
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Draw bars
      data.forEach((value, i) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + i * spacing + (spacing - barWidth) / 2;
        const y = rect.height - padding - barHeight;
        
        // Draw bar
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, y, barWidth, barHeight);
        
        // Draw value on top
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(0), x + barWidth / 2, y - 5);
        
        // Draw label at bottom
        ctx.save();
        ctx.translate(x + barWidth / 2, rect.height - padding + 15);
        ctx.rotate(-Math.PI / 6);
        ctx.fillText(labels[i], 0, 0);
        ctx.restore();
      });
      
      // Draw Y axis
      ctx.strokeStyle = '#e5e7eb';
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, rect.height - padding);
      ctx.stroke();
      
      // Draw Y axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const y = rect.height - padding - (i / 5) * chartHeight;
        ctx.fillText((i * 20).toString(), padding - 5, y + 3);
        
        // Grid line
        if (i > 0) {
          ctx.strokeStyle = '#f3f4f6';
          ctx.beginPath();
          ctx.moveTo(padding, y);
          ctx.lineTo(rect.width - padding, y);
          ctx.stroke();
        }
      }
    }
    
    // Draw doughnut chart
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
      const centerY = rect.height / 2 - 20;
      const radius = Math.min(centerX, centerY) - 20;
      const innerRadius = radius * 0.6;
      
      const total = data.reduce((a, b) => a + b, 0);
      let currentAngle = -Math.PI / 2;
      
      // Clear canvas
      ctx.clearRect(0, 0, rect.width, rect.height);
      
      // Draw segments
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
      
      // Draw legend
      let legendY = rect.height - 30;
      const legendX = centerX - (labels.length * 60) / 2;
      
      labels.forEach((label, i) => {
        if (data[i] === 0) return;
        
        const x = legendX + i * 60;
        
        ctx.fillStyle = colors[i];
        ctx.fillRect(x, legendY, 10, 10);
        
        ctx.fillStyle = '#374151';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(label, x + 14, legendY + 9);
      });
    }
    
    // Initialize charts when page loads
    window.addEventListener('load', () => {
      // Pillar scores bar chart
      drawBarChart('pillarsCanvas', 
        ${JSON.stringify(getPillarLabels(lang))},
        [${pillars.indexability || 0}, ${pillars.crawlability || 0}, ${pillars.onpage || 0}, ${pillars.technical || 0}, ${pillars.freshness || 0}, ${pillars.performance || 0}],
        ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#0ea5e9']
      );
      
      // Issues distribution doughnut chart
      drawDoughnutChart('issuesCanvas',
        ${JSON.stringify([lang === 'fa' ? 'بحرانی' : 'Critical', lang === 'fa' ? 'بالا' : 'High', lang === 'fa' ? 'متوسط' : 'Medium', lang === 'fa' ? 'پایین' : 'Low'])},
        [${critical.length}, ${high.length}, ${medium.length}, ${low.length}],
        ['#ef4444', '#f97316', '#eab308', '#22c55e']
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
          ${JSON.stringify([lang === 'fa' ? 'بحرانی' : 'Critical', lang === 'fa' ? 'بالا' : 'High', lang === 'fa' ? 'متوسط' : 'Medium', lang === 'fa' ? 'پایین' : 'Low'])},
          [${critical.length}, ${high.length}, ${medium.length}, ${low.length}],
          ['#ef4444', '#f97316', '#eab308', '#22c55e']
        );
      }, 250);
    });
  </script>
</body>
</html>`;
}

// Helper functions
// Unified grade scale: A(90+), B(80+), C(70+), D(60+), F(<60)
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
  if (score >= 90) return '#10b981'; // Green
  if (score >= 80) return '#3b82f6'; // Blue
  if (score >= 70) return '#f59e0b'; // Orange
  if (score >= 60) return '#f97316'; // Dark Orange
  return '#ef4444'; // Red
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function getPillarLabels(lang: 'en' | 'fa'): string[] {
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
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function generatePillarCards(pillars: any, lang: 'en' | 'fa'): string {
  const labels = getPillarLabels(lang);
  const keys = ['indexability', 'crawlability', 'onpage', 'technical', 'freshness', 'performance'];
  const icons = ['🔍', '🕷️', '📝', '⚙️', '🕐', '⚡'];
  
  return keys.map((key, i) => {
    const score = pillars[key] || 0;
    const color = getScoreColor(score);
    return `
    <div class="pillar-card">
      <div class="pillar-icon" style="background: ${color}20; color: ${color};">
        ${icons[i]}
      </div>
      <div class="pillar-name">${labels[i]}</div>
      <div class="pillar-score" style="color: ${color};">${score.toFixed(1)}</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${score}%; background: ${color};"></div>
      </div>
    </div>
    `;
  }).join('');
}

function generateChartsSection(pillars: any, critical: any[], high: any[], medium: any[], low: any[], lighthouse: any, lang: 'en' | 'fa'): string {
  return `
  <div class="section">
    <h2 class="section-title">${lang === 'fa' ? 'نمودارها' : 'Charts'}</h2>
    <div class="charts-grid">
      <div class="chart-container">
        <div class="chart-title">${lang === 'fa' ? 'امتیازات محوری' : 'Pillar Scores'}</div>
        <canvas id="pillarsCanvas"></canvas>
      </div>
      <div class="chart-container">
        <div class="chart-title">${lang === 'fa' ? 'توزیع مشکلات' : 'Issues Distribution'}</div>
        <canvas id="issuesCanvas"></canvas>
      </div>
    </div>
  </div>
  `;
}

function generateIssuesSection(findings: any[], lang: 'en' | 'fa'): string {
  if (findings.length === 0) return '';
  
  const isRTL = lang === 'fa';
  
  const rows = findings.map((finding, index) => {
    const prevalence = finding.prevalence || (finding.checked_pages ? finding.affected_pages / finding.checked_pages : 0);
    const prevalencePct = (prevalence * 100).toFixed(1);
    const hasExamples = finding.example_urls && finding.example_urls.length > 0;
    const exampleCount = finding.example_urls?.length || 0;
    
    // Create expandable page list HTML
    let pageListHtml = '';
    if (hasExamples) {
      const displayUrls = finding.example_urls.slice(0, 10);
      const remainingCount = exampleCount - 10;
      
      pageListHtml = `
        <div id="pages-${finding.id}" style="display: none; margin-top: 12px; padding: 12px; background: #f9fafb; border-radius: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 8px;">
            ${isRTL ? `صفحات دارای این مشکل (${exampleCount} مورد):` : `Pages with this issue (${exampleCount} total):`}
          </div>
          <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #374151; line-height: 1.8;">
            ${displayUrls.map((url: string) => `<li><a href="${escapeHtml(url)}" target="_blank" style="color: #3b82f6; text-decoration: none;">${escapeHtml(url)}</a></li>`).join('')}
          </ul>
          ${remainingCount > 0 ? `
            <div style="margin-top: 8px; font-size: 11px; color: #9ca3af; font-style: italic;">
              ${isRTL ? `و ${remainingCount} مورد دیگر...` : `And ${remainingCount} more...`}
            </div>
          ` : ''}
        </div>
      `;
    }
    
    return `
    <tr style="cursor: ${hasExamples ? 'pointer' : 'default'};" onclick="${hasExamples ? `togglePages('${finding.id}')` : ''}" class="issue-row">
      <td><span class="severity-badge severity-${finding.severity}">${finding.severity}</span></td>
      <td><strong>${finding.id}</strong></td>
      <td>
        <div>${escapeHtml(finding.title || finding.id)}</div>
        ${finding.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${escapeHtml(finding.description)}</div>` : ''}
        ${finding.weight ? `<div style="font-size: 11px; color: #9ca3af; margin-top: 4px;">Weight: ${finding.weight} | Penalty: ${finding.penalty?.toFixed(2) || 'N/A'}</div>` : ''}
      </td>
      <td>
        ${finding.affected_pages}
        ${hasExamples ? `<div style="font-size: 11px; color: #3b82f6;">${isRTL ? '(برای مشاهده کلیک کنید)' : '(click to view)'}</div>` : ''}
      </td>
      <td>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden;">
            <div style="width: ${prevalencePct}%; height: 100%; background: #3b82f6; border-radius: 3px;"></div>
          </div>
          <span style="font-size: 12px; color: #6b7280; min-width: 45px;">${prevalencePct}%</span>
        </div>
        ${pageListHtml}
      </td>
    </tr>
    `;
  }).join('');
  
  return `
  <div class="section">
    <h2 class="section-title">${isRTL ? 'مشکلات یافت شده' : 'Detected Issues'}</h2>
    <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
      ${isRTL 
        ? 'برای مشاهده صفحات دارای هر مشکل، روی ردیف آن کلیک کنید. هر مشکل دارای وزن و جریمه مشخص است.'
        : 'Click on any issue row to see affected pages. Each issue has a specific weight and penalty impact.'}
    </p>
    <table class="issues-table">
      <thead>
        <tr>
          <th>${isRTL ? 'شدت' : 'Severity'}</th>
          <th>${isRTL ? 'کد' : 'Code'}</th>
          <th>${isRTL ? 'مشکل / توضیحات' : 'Issue / Description'}</th>
          <th>${isRTL ? 'صفحات' : 'Pages'}</th>
          <th>${isRTL ? 'نسبت' : 'Ratio'}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    
    <script>
      function togglePages(issueId) {
        const pagesDiv = document.getElementById('pages-' + issueId);
        if (pagesDiv) {
          const isVisible = pagesDiv.style.display !== 'none';
          pagesDiv.style.display = isVisible ? 'none' : 'block';
        }
      }
    </script>
  </div>
  `;
}

function generateLighthouseSection(lighthouse: any, lang: 'en' | 'fa'): string {
  const lcp = lighthouse?.lcp;
  const cls = lighthouse?.cls;
  const tbt = lighthouse?.tbt;
  const perf = lighthouse?.performance;
  
  const getColor = (value: number | null, type: string) => {
    if (value === null) return 'text-gray';
    if (type === 'lcp') {
      if (value <= 2500) return 'text-green';
      if (value <= 4000) return 'text-yellow';
      return 'text-red';
    }
    if (type === 'cls') {
      if (value <= 0.1) return 'text-green';
      if (value <= 0.25) return 'text-yellow';
      return 'text-red';
    }
    if (type === 'tbt') {
      if (value <= 200) return 'text-green';
      if (value <= 600) return 'text-yellow';
      return 'text-red';
    }
    if (type === 'perf') {
      if (value >= 90) return 'text-green';
      if (value >= 70) return 'text-yellow';
      return 'text-red';
    }
    return 'text-gray';
  };
  
  return `
  <div class="section">
    <h2 class="section-title">Core Web Vitals</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value ${getColor(lcp, 'lcp')}">${lcp ? (lcp / 1000).toFixed(2) + 's' : 'N/A'}</div>
        <div class="metric-label">LCP</div>
        <div class="metric-sublabel">Largest Contentful Paint</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${getColor(cls, 'cls')}">${cls ? cls.toFixed(3) : 'N/A'}</div>
        <div class="metric-label">CLS</div>
        <div class="metric-sublabel">Cumulative Layout Shift</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${getColor(tbt, 'tbt')}">${tbt ? tbt + 'ms' : 'N/A'}</div>
        <div class="metric-label">TBT</div>
        <div class="metric-sublabel">Total Blocking Time</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${getColor(perf, 'perf')}">${perf || 'N/A'}</div>
        <div class="metric-label">Performance</div>
        <div class="metric-sublabel">Lighthouse Score</div>
      </div>
    </div>
  </div>
  `;
}

function generateFreshnessSection(freshness: any, lang: 'en' | 'fa'): string {
  const score = freshness.score || 0;
  const color = getScoreColor(score);
  
  return `
  <div class="section">
    <h2 class="section-title">${lang === 'fa' ? 'تازگی محتوا' : 'Content Freshness'}</h2>
    <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 20px;">
      <div style="font-size: 48px; font-weight: bold; color: ${color};">${score}</div>
      <div>
        <div style="font-size: 14px; color: #6b7280;">${lang === 'fa' ? 'از 100' : 'out of 100'}</div>
        <div style="margin-top: 8px; width: 200px; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden;">
          <div style="width: ${score}%; height: 100%; background: ${color}; border-radius: 4px; transition: width 1s ease-out;"></div>
        </div>
      </div>
    </div>
    <p style="color: #6b7280; margin-bottom: 16px;">
      ${lang === 'fa' ? 'محتوای قدیمی:' : 'Stale content:'} <strong style="color: ${color};">${freshness.stale_count || 0}</strong>
    </p>
  </div>
  `;
}

function generateScoringMethodologySection(methodology: any, lang: 'en' | 'fa'): string {
  if (!methodology) return '';
  
  const isRTL = lang === 'fa';
  
  return `
  <div class="section">
    <h2 class="section-title">${isRTL ? 'نحوه محاسبه امتیازات' : 'How Scores Are Calculated'}</h2>
    
    <div style="margin-bottom: 24px;">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #374151;">
        ${isRTL ? 'مقیاس نمره‌دهی' : 'Grade Scale'}
      </h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
        <div style="background: #dcfce7; padding: 8px 12px; border-radius: 6px; text-align: center;">
          <div style="font-weight: 600; color: #166534;">A (90-100)</div>
          <div style="font-size: 12px; color: #15803d;">${isRTL ? 'عالی' : 'Excellent'}</div>
        </div>
        <div style="background: #dbeafe; padding: 8px 12px; border-radius: 6px; text-align: center;">
          <div style="font-weight: 600; color: #1e40af;">B (80-89)</div>
          <div style="font-size: 12px; color: #1d4ed8;">${isRTL ? 'خوب' : 'Good'}</div>
        </div>
        <div style="background: #fef3c7; padding: 8px 12px; border-radius: 6px; text-align: center;">
          <div style="font-weight: 600; color: #92400e;">C (70-79)</div>
          <div style="font-size: 12px; color: #b45309;">${isRTL ? 'متوسط' : 'Fair'}</div>
        </div>
        <div style="background: #ffedd5; padding: 8px 12px; border-radius: 6px; text-align: center;">
          <div style="font-weight: 600; color: #9a3412;">D (60-69)</div>
          <div style="font-size: 12px; color: #c2410c;">${isRTL ? 'نیاز به بهبود' : 'Needs Work'}</div>
        </div>
        <div style="background: #fee2e2; padding: 8px 12px; border-radius: 6px; text-align: center;">
          <div style="font-weight: 600; color: #991b1b;">F (0-59)</div>
          <div style="font-size: 12px; color: #dc2626;">${isRTL ? 'ضعیف' : 'Poor'}</div>
        </div>
      </div>
    </div>
    
    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
      <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #374151;">
        ${isRTL ? 'فرمول‌های محاسبه' : 'Calculation Formulas'}
      </h3>
      
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; color: #6b7280; margin-bottom: 4px;">
          ${isRTL ? 'امتیاز کلی:' : 'Overall Score:'}
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #374151;">
          ${isRTL ? 'میانگین وزنی ۶ محور اصلی' : 'Weighted average of 6 pillar scores'}
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; color: #6b7280; margin-bottom: 4px;">
          ${isRTL ? 'محورهای محتوا/فنی/خزش/ایندکس:' : 'Content/Technical/Crawl/Index Pillars:'}
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #374151;">
          Score = 100 - Σ(issue penalties)
        </div>
      </div>
      
      <div style="margin-bottom: 12px;">
        <div style="font-weight: 500; color: #6b7280; margin-bottom: 4px;">
          ${isRTL ? 'محور تازگی:' : 'Freshness Pillar:'}
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #374151;">
          ${escapeHtml(methodology.freshness_formula || (isRTL ? 'بر اساس توزیع سن محتوا' : 'Based on content age distribution'))}
        </div>
      </div>
      
      <div>
        <div style="font-weight: 500; color: #6b7280; margin-bottom: 4px;">
          ${isRTL ? 'محور عملکرد:' : 'Performance Pillar:'}
        </div>
        <div style="background: white; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; color: #374151;">
          ${escapeHtml(methodology.performance_formula || (isRTL ? 'ترکیبی از Lighthouse و جریمه‌ها' : 'Hybrid: Lighthouse + penalties'))}
        </div>
      </div>
    </div>
    
    <div style="background: #eff6ff; padding: 12px 16px; border-radius: 8px; border-left: 4px solid #3b82f6;">
      <div style="font-size: 13px; color: #1e40af;">
        <strong>${isRTL ? 'نکته:' : 'Note:'}</strong> 
        ${isRTL 
          ? 'هر محور بر اساس وزن خاص خود در امتیاز کلی تأثیر می‌گذارد. مشکلات بحرانی بیشترین تأثیر منفی را دارند.'
          : 'Each pillar contributes to the overall score based on its specific weight. Critical issues have the highest negative impact.'}
      </div>
    </div>
  </div>
  `;
}

function generateIssueThresholdsSection(lang: 'en' | 'fa'): string {
  const isRTL = lang === 'fa';
  
  const thresholds = [
    { id: 'E01', name: isRTL ? 'noindex' : 'noindex', threshold: isRTL ? 'وجود تگ noindex' : 'noindex tag present', severity: 'critical' },
    { id: 'E02', name: isRTL ? 'خطای 4xx' : '4xx Error', threshold: isRTL ? 'کد وضعیت 400-499' : 'Status code 400-499', severity: 'critical' },
    { id: 'E04', name: isRTL ? 'زنجیره ریدایرکت' : 'Redirect Chain', threshold: isRTL ? '>1 ریدایرکت' : '>1 redirect', severity: 'medium' },
    { id: 'E06', name: isRTL ? 'عدم تطابق canonical' : 'Canonical Mismatch', threshold: isRTL ? 'URL نهایی ≠ canonical' : 'Final URL ≠ canonical', severity: 'high' },
    { id: 'F01', name: isRTL ? 'عنوان خیلی کوتاه' : 'Title Too Short', threshold: isRTL ? '<10 کاراکتر' : '<10 chars', severity: 'high' },
    { id: 'F04', name: isRTL ? 'توضیحات متا خیلی کوتاه' : 'Meta Description Short', threshold: isRTL ? '<50 کاراکتر' : '<50 chars', severity: 'high' },
    { id: 'F07', name: isRTL ? 'فاقد H1' : 'Missing H1', threshold: isRTL ? '0 تگ H1' : '0 H1 tags', severity: 'medium' },
    { id: 'F08', name: isRTL ? 'چندین H1' : 'Multiple H1s', threshold: isRTL ? '>1 تگ H1' : '>1 H1 tags', severity: 'medium' },
    { id: 'G01', name: isRTL ? 'تصاویر بدون alt' : 'Images Missing Alt', threshold: isRTL ? '>0 تصویر بدون alt' : '>0 images without alt', severity: 'low' },
    { id: 'M01', name: isRTL ? 'فاقد viewport' : 'Missing Viewport', threshold: isRTL ? 'فاقد متا viewport' : 'No viewport meta', severity: 'high' },
    { id: 'C03', name: isRTL ? 'محتوای نازک' : 'Thin Content', threshold: isRTL ? '<300 کلمه' : '<300 words', severity: 'medium' },
    { id: 'S01', name: isRTL ? 'عدم استفاده HTTPS' : 'Not Using HTTPS', threshold: isRTL ? 'URL با HTTP' : 'HTTP URL', severity: 'critical' },
    { id: 'S02', name: isRTL ? 'محتوای ترکیبی' : 'Mixed Content', threshold: isRTL ? 'منابع HTTP روی HTTPS' : 'HTTP resources on HTTPS', severity: 'high' },
    { id: 'P01', name: isRTL ? 'پاسخ کند سرور' : 'Slow Server Response', threshold: isRTL ? 'TTFB >800ms' : 'TTFB >800ms', severity: 'medium' },
    { id: 'L01', name: isRTL ? 'امتیاز عملکرد ضعیف' : 'Poor Performance', threshold: isRTL ? 'امتیاز Lighthouse <50' : 'Lighthouse score <50', severity: 'critical' },
    { id: 'L02', name: isRTL ? 'LCP کند' : 'Slow LCP', threshold: isRTL ? 'LCP >2.5s' : 'LCP >2.5s', severity: 'high' },
    { id: 'L03', name: isRTL ? 'CLS ضعیف' : 'Poor CLS', threshold: isRTL ? 'CLS >0.1' : 'CLS >0.1', severity: 'high' },
    { id: 'L04', name: isRTL ? 'TBT بالا' : 'High TBT', threshold: isRTL ? 'TBT >200ms' : 'TBT >200ms', severity: 'medium' },
    { id: 'L05', name: isRTL ? 'صفحه یتیم' : 'Orphan Page', threshold: isRTL ? '0 لینک ورودی' : '0 inbound links', severity: 'high' },
    { id: 'L06', name: isRTL ? 'صفحه عمیق' : 'Deep Page', threshold: isRTL ? '>3 سطح از صفحه اصلی' : '>3 levels from homepage', severity: 'medium' },
  ];
  
  const rows = thresholds.map(t => `
    <tr>
      <td><span class="severity-badge severity-${t.severity}">${t.severity}</span></td>
      <td><strong>${t.id}</strong></td>
      <td>${t.name}</td>
      <td style="font-family: monospace; font-size: 12px; color: #6b7280;">${t.threshold}</td>
    </tr>
  `).join('');
  
  return `
  <div class="section">
    <h2 class="section-title">${isRTL ? 'آستانه‌های تشخیص مشکلات' : 'Issue Detection Thresholds'}</h2>
    <p style="color: #6b7280; margin-bottom: 16px; font-size: 14px;">
      ${isRTL 
        ? 'صفحات زیر در صورت برآورده کردن این شرایط علامت‌گذاری می‌شوند:'
        : 'Pages are flagged when they meet these conditions:'}
    </p>
    <table class="issues-table">
      <thead>
        <tr>
          <th>${isRTL ? 'شدت' : 'Severity'}</th>
          <th>${isRTL ? 'کد' : 'Code'}</th>
          <th>${isRTL ? 'مشکل' : 'Issue'}</th>
          <th>${isRTL ? 'آستانه' : 'Threshold'}</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
  `;
}
