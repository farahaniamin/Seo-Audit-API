import { normalizeUrl, isCrawlableUrl } from './url.js';

export type ValidationResult = {
  valid: boolean;
  error?: string;
  normalizedUrl?: string;
};

/**
 * Validates if a string is a proper URL
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return { valid: false, error: 'URL is required' };
  }

  // Check for obvious non-URLs
  if (url.includes(' ') || url.includes('\n') || url.includes('\t')) {
    return { valid: false, error: 'URL contains invalid characters (spaces or newlines)' };
  }

  // Must start with http:// or https://
  if (!url.match(/^https?:\/\//i)) {
    return { valid: false, error: 'URL must start with http:// or https://' };
  }

  try {
    const parsed = new URL(url);
    
    // Must have a hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return { valid: false, error: 'URL must have a valid hostname' };
    }

    // Must have a valid TLD (at least one dot in hostname, not localhost)
    if (parsed.hostname === 'localhost' || !parsed.hostname.includes('.')) {
      return { valid: false, error: 'URL must have a valid domain (not localhost or IP)' };
    }

    // Check for private/local IP addresses
    if (isPrivateIp(parsed.hostname)) {
      return { valid: false, error: 'Cannot audit private/internal IP addresses' };
    }

    // Normalize the URL
    const normalized = normalizeUrl(url);
    if (!normalized) {
      return { valid: false, error: 'Failed to normalize URL' };
    }

    // Check if crawlable
    if (!isCrawlableUrl(normalized)) {
      return { valid: false, error: 'URL is not crawlable (may be an API endpoint or static asset)' };
    }

    return { valid: true, normalizedUrl: normalized };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Check if hostname is a private/internal IP
 */
function isPrivateIp(hostname: string): boolean {
  // Check for localhost variants
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Check for private IP ranges
  const privateRanges = [
    /^10\./,                              // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,    // 172.16.0.0/12
    /^192\.168\./,                        // 192.168.0.0/16
    /^127\./,                             // 127.0.0.0/8
    /^0\./,                               // 0.0.0.0/8
    /^169\.254\./,                        // Link-local
    /^fc00:/i,                            // IPv6 private
    /^fe80:/i,                            // IPv6 link-local
  ];

  return privateRanges.some(range => range.test(hostname));
}

// Simple rate limiter per domain
const domainRequests: Map<string, { count: number; resetTime: number }> = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5; // Max 5 audits per domain per minute

/**
 * Check if domain is under rate limit
 */
export function checkDomainRateLimit(domain: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const domainData = domainRequests.get(domain);

  if (!domainData || now > domainData.resetTime) {
    // Reset or create new window
    domainRequests.set(domain, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }

  if (domainData.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.ceil((domainData.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  domainData.count++;
  return { allowed: true };
}

/**
 * Check if URL has robots.txt that allows crawling
 */
export async function checkRobotsAllow(url: string): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    
    const response = await fetch(`${origin}/robots.txt`, {
      method: 'GET',
      headers: { 'User-Agent': 'SEOAuditBot/1.0' }
    });

    if (!response.ok) {
      // If robots.txt doesn't exist or errors, assume allowed
      return { allowed: true };
    }

    const robotsText = await response.text();
    const normalizedPath = parsed.pathname || '/';

    // Parse robots.txt
    const lines = robotsText.split('\n');
    let userAgentRelevant = false;

    for (const line of lines) {
      const trimmed = line.trim().toLowerCase();
      
      if (trimmed.startsWith('user-agent:')) {
        const ua = trimmed.substring(11).trim();
        // Check if this applies to us or wildcard
        userAgentRelevant = (ua === '*' || ua.includes('seo') || ua.includes('bot'));
      }
      
      if (userAgentRelevant && trimmed.startsWith('disallow:')) {
        const disallowPath = trimmed.substring(9).trim();
        if (normalizedPath.startsWith(disallowPath)) {
          return { 
            allowed: false, 
            reason: `robots.txt blocks this URL (Disallow: ${disallowPath})` 
          };
        }
      }
    }

    return { allowed: true };
  } catch (e) {
    // If we can't fetch robots.txt, assume allowed
    return { allowed: true };
  }
}
