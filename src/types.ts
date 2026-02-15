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
};

export type Finding = {
  id: string; // e.g. E06
  affected_pages: number;
  checked_pages: number;
  prevalence: number; // 0..1
  severity: 'critical' | 'high' | 'medium' | 'low';
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

  debug?: any;
};
