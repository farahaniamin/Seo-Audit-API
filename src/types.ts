export type Lang = 'fa' | 'en';
export type Profile = 'smart' | 'full';

export type AuditStatus = 'queued' | 'running' | 'done' | 'failed';

export type Limits = {
  // smart sampling / crawl
  sample_total_pages: number;
  request_delay_ms: number;
  request_jitter_ms: number;
  per_host_concurrency: number;
  global_concurrency: number;
  per_page_timeout_ms: number;
  max_html_bytes: number;
  /** Hard cap for extracted links per page to avoid mega-menus / link-farms exploding crawl */
  max_links_per_page: number;

  // link checks
  link_check_max: number;
  link_check_delay_ms: number;
  link_check_jitter_ms: number;
  link_check_timeout_ms: number;

  // sitemap safety
  sitemap_max_bytes: number;
  sitemap_files_max: number;
  sitemap_max_urls_per_file: number;
};

export type AuditCreateRequest = {
  url: string;
  profile?: Profile;
  limits?: Partial<Limits>;
  user_context?: {
    source?: 'telegram' | 'api';
    chat_id?: string;
    request_id?: string;
    lang?: Lang;
  };
};

export type Coverage = {
  mode: 'sample' | 'crawl';
  checked_pages: number;
  discovered_pages: number;
  estimated_total_pages?: number | null;
  checked_ratio?: number | null;
  link_checks: number;
  note?: string;
  /** Breakdown of checked pages by content type */
  pages_breakdown?: {
    total: number;
    by_type: Record<string, { count: number; percentage: number }>;
  };
};

export type Finding = {
  id: string; // e.g. E06
  affected_pages: number;
  checked_pages: number;
  prevalence: number; // 0..1
  severity: 'critical' | 'high' | 'medium' | 'low';
};

// WordPress REST API Types
export type WpContentItem = {
  id: number;
  url: string;
  modified: string;
  status: 'publish' | 'draft' | 'private' | 'future' | 'pending';
  type: string;
  title: string;
  date: string;
};

export type WpApiData = {
  available: boolean;
  detected: boolean;
  postTypes: Record<string, number>;
  contentItems: WpContentItem[];
  totalItems: number;
  taxonomies: string[];
  lastModifiedDates: string[];
  draftCount: number;
  error?: string;
};

export type LatestContentItem = {
  title: string;
  url: string;
  modified: string;
  type: 'product' | 'post';
};

export type FreshnessData = {
  score: number; // 0-100
  stale_count: number;
  last_updated: string | null;
  freshness_grade: string;
  recommendations: string[];
  latest_products: LatestContentItem[];
  latest_posts: LatestContentItem[];
  by_type?: Record<string, {
    score: number;
    total: number;
    fresh: number;
    stale: number;
    threshold: number;
  }>;
  thresholds?: Record<string, number>;
};

// Lighthouse Performance Data
export type LighthouseMetrics = {
  performance: number;
  lcp: number | null; // Largest Contentful Paint in ms
  cls: number | null; // Cumulative Layout Shift
  tbt: number | null; // Total Blocking Time in ms
  fcp: number | null; // First Contentful Paint in ms
  speedIndex: number | null;
};

export type LighthousePageResult = {
  url: string;
  metrics: LighthouseMetrics;
  error?: string;
};

export type LighthouseData = {
  performance: number; // 0-100
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  issues: string[];
  opportunities: string[];
  pages: LighthousePageResult[];
};


export type PageReport = {
  url: string;
  final_url: string;
  status: number;
  title: string | null;
  meta_desc: string | null;
  canonical: string | null;
  meta_robots: string | null;
  h1_count: number;
  images_missing_alt: number;
  issues: string[];
  // Phase 1: New quality metrics
  has_viewport?: boolean;
  word_count?: number;
  is_https?: boolean;
  has_mixed_content?: boolean;
  ttfb_ms?: number;
};

export type Report = {
  schema_version: '1.7.0';
  audit_id: string;
  url: string;
  profile: Profile;
  started_at: string;
  finished_at: string;
  duration_ms: number;

  coverage: Coverage;

  scores: {
    overall: number;
    pillars: Record<string, number>;
    /** heuristic; used to tune smart sampling + scoring weights */
    site_type?: 'ecommerce' | 'corporate' | 'content' | 'unknown';
    /** pillar weights used for overall score */
    weights?: Record<string, number>;
    /** detailed scoring breakdown and methodology */
    breakdown?: {
      checked_pages: number;
      total_penalty: number;
      freshness_penalty?: number;
      pillar_penalties?: Record<string, number>;
      scoring_methodology?: {
        grade_thresholds: Record<string, string>;
        performance_formula: string;
        freshness_formula: string;
        other_pillars_formula: string;
        overall_formula: string;
      };
    };
  };

  findings: Finding[];
  top_issues: string[];
  quick_wins: string[];

  // Detailed, page-level output
  pages: PageReport[];

  // Compact mapping (handy for filtering/reporting)
  pages_by_issue: Array<{ url: string; issue_ids: string[] }>;

  /** Back-compat alias; prefer pages_by_issue */
  pages_with_issues?: Array<{ url: string; issue_ids: string[] }>;

  telegram: {
    text: string;
    text_fa: string;
    text_en: string;
  };

  // WordPress REST API data (if available)
  wp_api?: WpApiData;
  
  // Content freshness analysis
  freshness?: FreshnessData;

  // Lighthouse performance data
  lighthouse?: LighthouseData;

  debug?: any;
};
