import { fetchText } from './fetcher.js';
import type { Limits } from '../types.js';

// Rate limiting configuration
const WP_API_DELAY = 600; // ms between requests (100 req/min max)
const MAX_WP_PAGES = 10;  // Max pagination requests (1000 items total with per_page=100)
const WP_API_TIMEOUT = 5000; // 5 second timeout for API detection

export type WpPostType = {
  slug: string;
  name: string;
  rest_base: string;
};

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
  postTypes: Record<string, number>; // {post: 45, page: 12, product: 89}
  contentItems: WpContentItem[];
  totalItems: number;
  taxonomies: string[];
  lastModifiedDates: string[];
  draftCount: number;
  error?: string;
};

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Detect if WordPress REST API is available
 * Returns true if /wp-json/ endpoint responds successfully
 */
export async function detectWpApi(origin: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WP_API_TIMEOUT);
    
    const response = await fetch(`${origin}/wp-json/`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) return false;
    
    const data = await response.json();
    // Verify it's actually WP REST API
    return data && data.namespaces && data.namespaces.includes('wp/v2');
  } catch {
    return false;
  }
}

/**
 * Fetch all available post types from WP API
 */
async function fetchPostTypes(origin: string): Promise<WpPostType[]> {
  try {
    const response = await fetch(`${origin}/wp-json/wp/v2/types`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return Object.values(data).map((type: any) => ({
      slug: type.slug,
      name: type.name,
      rest_base: type.rest_base || type.slug,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch paginated content from WP API with rate limiting
 */
async function fetchPaginatedContent(
  origin: string,
  endpoint: string,
  limits: Limits
): Promise<any[]> {
  const items: any[] = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore && page <= MAX_WP_PAGES) {
    try {
      // Rate limiting
      if (page > 1) await sleep(WP_API_DELAY);
      
      const url = `${origin}/wp-json/wp/v2/${endpoint}?per_page=100&page=${page}&_fields=id,link,modified,status,type,title,date`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) break;
      
      const data = await response.json();
      if (!Array.isArray(data) || data.length === 0) {
        hasMore = false;
        break;
      }
      
      items.push(...data);
      
      // Check if there are more pages from headers
      const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '0');
      if (page >= totalPages) {
        hasMore = false;
      }
      
      page++;
    } catch {
      break;
    }
  }
  
  return items;
}

/**
 * Fetch all content from WP API across all post types
 */
async function fetchAllContent(
  origin: string,
  postTypes: WpPostType[],
  limits: Limits
): Promise<WpContentItem[]> {
  const allItems: WpContentItem[] = [];
  
  for (const postType of postTypes) {
    // Skip attachments and nav_menu_item
    if (['attachment', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part'].includes(postType.slug)) {
      continue;
    }
    
    const items = await fetchPaginatedContent(origin, postType.rest_base, limits);
    
    const mappedItems: WpContentItem[] = items.map((item: any) => ({
      id: item.id,
      url: item.link,
      modified: item.modified,
      status: item.status,
      type: postType.slug,
      title: item.title?.rendered || '',
      date: item.date,
    }));
    
    allItems.push(...mappedItems);
  }
  
  return allItems;
}

/**
 * Fetch available taxonomies from WP API
 */
async function fetchTaxonomies(origin: string): Promise<string[]> {
  try {
    const response = await fetch(`${origin}/wp-json/wp/v2/taxonomies`);
    if (!response.ok) return [];
    
    const data = await response.json();
    return Object.keys(data);
  } catch {
    return [];
  }
}

/**
 * Main function to fetch all WP API data
 * Gracefully degrades if API is unavailable
 */
export async function fetchWpData(
  origin: string,
  limits: Limits
): Promise<WpApiData> {
  // First, check if WP API is available
  const isAvailable = await detectWpApi(origin);
  
  if (!isAvailable) {
    return {
      available: false,
      detected: false,
      postTypes: {},
      contentItems: [],
      totalItems: 0,
      taxonomies: [],
      lastModifiedDates: [],
      draftCount: 0,
    };
  }
  
  try {
    // Fetch post types
    const postTypes = await fetchPostTypes(origin);
    
    // Fetch all content
    const contentItems = await fetchAllContent(origin, postTypes, limits);
    
    // Fetch taxonomies
    const taxonomies = await fetchTaxonomies(origin);
    
    // Calculate post type distribution
    const postTypeDistribution: Record<string, number> = {};
    contentItems.forEach(item => {
      postTypeDistribution[item.type] = (postTypeDistribution[item.type] || 0) + 1;
    });
    
    // Extract last modified dates
    const lastModifiedDates = contentItems
      .filter(item => item.status === 'publish')
      .map(item => item.modified);
    
    // Count drafts
    const draftCount = contentItems.filter(item => 
      item.status === 'draft' || item.status === 'private'
    ).length;
    
    return {
      available: true,
      detected: true,
      postTypes: postTypeDistribution,
      contentItems,
      totalItems: contentItems.length,
      taxonomies,
      lastModifiedDates,
      draftCount,
    };
  } catch (error: any) {
    return {
      available: false,
      detected: true,
      postTypes: {},
      contentItems: [],
      totalItems: 0,
      taxonomies: [],
      lastModifiedDates: [],
      draftCount: 0,
      error: error.message,
    };
  }
}

/**
 * Get priority score for post types
 * Higher = more important for SEO sampling
 */
export function getPostTypePriority(type: string): number {
  const priorities: Record<string, number> = {
    'page': 10,      // Static pages (about, contact, etc.)
    'product': 9,    // E-commerce products
    'post': 8,       // Blog posts
    'portfolio': 7,  // Portfolio items
    'service': 7,    // Service pages
    'case-study': 6,
    'testimonial': 5,
    'faq': 5,
    'team': 4,
    'category': 3,
    'tag': 2,
  };
  
  return priorities[type] || 1;
}

/**
 * Filter and sort content items by priority and freshness
 * Returns top N URLs for sampling
 */
export function getPriorityUrls(
  items: WpContentItem[],
  limit: number,
  maxAgeDays: number = 180 // 6 months
): string[] {
  const now = Date.now();
  const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
  
  return items
    .filter(item => item.status === 'publish')
    .map(item => ({
      ...item,
      priority: getPostTypePriority(item.type),
      age: now - new Date(item.modified).getTime(),
      isRecent: (now - new Date(item.modified).getTime()) < maxAge,
    }))
    .sort((a, b) => {
      // Sort by: recent first, then by priority, then by modification date
      if (a.isRecent && !b.isRecent) return -1;
      if (!a.isRecent && b.isRecent) return 1;
      if (a.priority !== b.priority) return b.priority - a.priority;
      return new Date(b.modified).getTime() - new Date(a.modified).getTime();
    })
    .slice(0, limit)
    .map(item => item.url);
}
