// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface ItemData {
  text: string;
  tags?: string[];
  sourceUrl?: string;
  note?: string;
}

// ============================================
// PART 2: ITEM VALIDATION
// ============================================

/**
 * Validate research item data before saving
 * Matches extension's validation rules for consistency
 */
export function validateItemData(data: ItemData): ValidationResult {
  const errors: string[] = [];

  // Text validation
  if (!data.text || typeof data.text !== 'string') {
    errors.push('Text content is required');
  } else if (data.text.length < 1) {
    errors.push('Text content cannot be empty');
  } else if (data.text.length > 10000) {
    errors.push('Text content exceeds maximum length (10,000 characters)');
  }

  // Tags validation
  if (data.tags && !Array.isArray(data.tags)) {
    errors.push('Tags must be an array');
  }

  if (data.tags && data.tags.length > 20) {
    errors.push('Maximum 20 tags allowed');
  }

  // Validate individual tags
  if (data.tags) {
    data.tags.forEach((tag, index) => {
      if (typeof tag !== 'string') {
        errors.push(`Tag at index ${index} must be a string`);
      } else if (tag.length > 50) {
        errors.push(`Tag "${tag.slice(0, 20)}..." exceeds maximum length (50 characters)`);
      }
    });
  }

  // URL validation
  if (data.sourceUrl && !isValidUrl(data.sourceUrl)) {
    errors.push('Invalid source URL format');
  }

  // Note validation
  if (data.note && typeof data.note !== 'string') {
    errors.push('Note must be a string');
  } else if (data.note && data.note.length > 5000) {
    errors.push('Note exceeds maximum length (5,000 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// PART 3: URL VALIDATION
// ============================================

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

// ============================================
// PART 4: TEXT SANITIZATION
// ============================================

/**
 * Sanitize text content
 * Removes extra whitespace and enforces max length
 */
export function sanitizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // normalize whitespace
    .slice(0, 10000); // enforce max length
}

/**
 * Sanitize HTML to prevent XSS
 * Simple implementation - for production, use a library like DOMPurify
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Escape HTML entities
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================
// PART 5: EMAIL VALIDATION
// ============================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Optional: Add more rules
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================
// PART 6: TAG UTILITIES
// ============================================

/**
 * Parse tags from comma-separated string
 */
export function parseTags(tagString: string): string[] {
  return tagString
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter((tag) => tag.length > 0 && tag.length <= 50)
    .slice(0, 20); // Max 20 tags
}

/**
 * Format tags for display
 */
export function formatTags(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Validate a single tag
 */
export function isValidTag(tag: string): boolean {
  const trimmed = tag.trim();
  return trimmed.length > 0 && trimmed.length <= 50 && !/[<>]/.test(trimmed);
}

// ============================================
// PART 7: DATE UTILITIES
// ============================================

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get relative time (e.g., "2 hours ago")
 */
export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
}

// ============================================
// PART 8: EXPORTS
// ============================================

export default {
  validateItemData,
  isValidUrl,
  getDomainFromUrl,
  sanitizeText,
  sanitizeHtml,
  escapeHtml,
  isValidEmail,
  validatePassword,
  parseTags,
  formatTags,
  isValidTag,
  formatDate,
  formatDateTime,
  getRelativeTime,
};
