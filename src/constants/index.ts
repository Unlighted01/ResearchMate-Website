// ============================================
// APPLICATION CONSTANTS
// ============================================
// Centralized configuration to avoid hardcoded values

// ============================================
// PAGINATION
// ============================================
export const PAGINATION = {
  DEFAULT_LIMIT: 100,
  DEFAULT_OFFSET: 0,
  MAX_ITEMS_PER_PAGE: 1000,
} as const;

// ============================================
// DEBOUNCE/THROTTLE TIMINGS (milliseconds)
// ============================================
export const TIMING = {
  SEARCH_DEBOUNCE: 300,
  BUTTON_DEBOUNCE: 500,
  MOUSEMOVE_THROTTLE: 60,
  TOAST_DURATION: 3000,
  CACHE_CLEANUP_INTERVAL: 600000, // 10 minutes
  OFFLINE_NOTIFICATION_DURATION: 3000,
} as const;

// ============================================
// CACHE
// ============================================
export const CACHE = {
  MAX_SIZE: 50,
  TTL: 3600000, // 1 hour
} as const;

// ============================================
// VALIDATION
// ============================================
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
} as const;

// ============================================
// UI
// ============================================
export const UI = {
  COLORS: {
    PRIMARY: '#007AFF',
    SUCCESS: '#34C759',
    WARNING: '#FF9500',
    ERROR: '#FF3B30',
    INFO: '#5856D6',
  },
  BREAKPOINTS: {
    SM: 640,
    MD: 768,
    LG: 1024,
    XL: 1280,
    '2XL': 1536,
  },
  SKELETON_COUNT: {
    DASHBOARD_GRID: 8,
    DASHBOARD_LIST: 5,
    COLLECTIONS: 6,
  },
} as const;

// ============================================
// API & NETWORK
// ============================================
export const API = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT: 30000, // 30 seconds
} as const;

// ============================================
// STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  THEME: 'researchmate_theme',
  AUTH_TOKEN: 'researchmate_auth_token',
  USER_PREFERENCES: 'researchmate_preferences',
  RECENT_SEARCHES: 'researchmate_recent_searches',
} as const;

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  DASHBOARD: '/app/dashboard',
  COLLECTIONS: '/app/collections',
  AI_ASSISTANT: '/app/ai-assistant',
  CITATIONS: '/app/citations',
  SMART_PEN: '/app/smart-pen',
  STATISTICS: '/app/statistics',
  SETTINGS: '/app/settings',
} as const;

// ============================================
// FEATURES FLAGS
// ============================================
export const FEATURES = {
  ENABLE_ANALYTICS: true,
  ENABLE_EXPORT: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_ADVANCED_SEARCH: true,
  ENABLE_KEYBOARD_SHORTCUTS: true,
  ENABLE_OFFLINE_MODE: true,
} as const;

// ============================================
// COLLECTION COLORS
// ============================================
export const COLLECTION_COLORS = [
  { name: 'Indigo', value: '#4F46E5' },
  { name: 'Blue', value: '#007AFF' },
  { name: 'Green', value: '#34C759' },
  { name: 'Orange', value: '#FF9500' },
  { name: 'Red', value: '#FF3B30' },
  { name: 'Purple', value: '#5856D6' },
  { name: 'Pink', value: '#FF2D55' },
  { name: 'Teal', value: '#5AC8FA' },
] as const;

// ============================================
// EXPORT FORMATS
// ============================================
export const EXPORT_FORMATS = {
  JSON: 'json',
  CSV: 'csv',
  MARKDOWN: 'md',
} as const;

// ============================================
// DATE FORMATS
// ============================================
export const DATE_FORMATS = {
  SHORT: 'MM/DD/YYYY',
  LONG: 'MMMM D, YYYY',
  WITH_TIME: 'MM/DD/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss',
} as const;

// ============================================
// ERROR MESSAGES
// ============================================
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your internet connection and try again.',
  AUTH_ERROR: 'Authentication failed. Please sign in again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again.',
  VALIDATION_EMAIL: 'Please enter a valid email address.',
  VALIDATION_PASSWORD: 'Password must be at least 8 characters long.',
  FETCH_FAILED: 'Failed to load data. Please try again.',
  DELETE_FAILED: 'Failed to delete. Please try again.',
  UPDATE_FAILED: 'Failed to update. Please try again.',
  CREATE_FAILED: 'Failed to create. Please try again.',
} as const;

// ============================================
// SUCCESS MESSAGES
// ============================================
export const SUCCESS_MESSAGES = {
  ITEM_DELETED: 'Item deleted successfully',
  ITEM_CREATED: 'Item created successfully',
  ITEM_UPDATED: 'Item updated successfully',
  COLLECTION_DELETED: 'Collection deleted successfully',
  COLLECTION_CREATED: 'Collection created successfully',
  COLLECTION_UPDATED: 'Collection updated successfully',
  EXPORT_SUCCESS: 'Export completed successfully',
  BULK_DELETE_SUCCESS: 'Items deleted successfully',
} as const;

export default {
  PAGINATION,
  TIMING,
  CACHE,
  VALIDATION,
  UI,
  API,
  STORAGE_KEYS,
  ROUTES,
  FEATURES,
  COLLECTION_COLORS,
  EXPORT_FORMATS,
  DATE_FORMATS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
};
