// ============================================
// DATA EXPORT UTILITY
// ============================================
// Export research items to various formats (JSON, CSV, Markdown)

import { StorageItem } from '../services/storageService';
import { EXPORT_FORMATS } from '../constants';

/**
 * Export items to JSON format
 */
export function exportToJSON(items: StorageItem[], filename: string = 'research-data.json'): void {
  const data = JSON.stringify(items, null, 2);
  downloadFile(data, filename, 'application/json');
}

/**
 * Export items to CSV format
 */
export function exportToCSV(items: StorageItem[], filename: string = 'research-data.csv'): void {
  if (items.length === 0) {
    throw new Error('No items to export');
  }

  // CSV headers
  const headers = [
    'ID',
    'Title',
    'Text',
    'Source URL',
    'Source Title',
    'Tags',
    'AI Summary',
    'Device Source',
    'Created At',
    'Updated At',
  ];

  // Convert items to CSV rows
  const rows = items.map((item) => [
    escapeCSV(item.id),
    escapeCSV(item.title || ''),
    escapeCSV(item.text || ''),
    escapeCSV(item.sourceUrl || ''),
    escapeCSV(item.sourceTitle || ''),
    escapeCSV(item.tags?.join(', ') || ''),
    escapeCSV(item.aiSummary || ''),
    escapeCSV(item.deviceSource || ''),
    escapeCSV(new Date(item.createdAt).toISOString()),
    escapeCSV(new Date(item.updatedAt).toISOString()),
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export items to Markdown format
 */
export function exportToMarkdown(items: StorageItem[], filename: string = 'research-data.md'): void {
  const markdown = items
    .map((item) => {
      const parts: string[] = [];

      // Title
      parts.push(`# ${item.title || item.sourceTitle || 'Untitled'}\n`);

      // Metadata
      if (item.sourceUrl) {
        parts.push(`**Source:** [${item.sourceTitle || 'Link'}](${item.sourceUrl})\n`);
      }
      if (item.tags && item.tags.length > 0) {
        parts.push(`**Tags:** ${item.tags.map((tag) => `\`${tag}\``).join(', ')}\n`);
      }
      if (item.deviceSource) {
        parts.push(`**Device:** ${item.deviceSource}\n`);
      }
      parts.push(`**Created:** ${new Date(item.createdAt).toLocaleDateString()}\n`);

      // AI Summary
      if (item.aiSummary) {
        parts.push(`\n## AI Summary\n\n${item.aiSummary}\n`);
      }

      // Content
      if (item.text) {
        parts.push(`\n## Content\n\n${item.text}\n`);
      }

      parts.push('\n---\n');

      return parts.join('\n');
    })
    .join('\n');

  downloadFile(markdown, filename, 'text/markdown');
}

/**
 * Export selected items based on format
 */
export function exportItems(
  items: StorageItem[],
  format: 'json' | 'csv' | 'md',
  filename?: string
): void {
  if (items.length === 0) {
    throw new Error('No items to export');
  }

  const timestamp = new Date().toISOString().split('T')[0];
  const defaultFilename = `researchmate-export-${timestamp}`;

  switch (format) {
    case EXPORT_FORMATS.JSON:
      exportToJSON(items, filename || `${defaultFilename}.json`);
      break;
    case EXPORT_FORMATS.CSV:
      exportToCSV(items, filename || `${defaultFilename}.csv`);
      break;
    case EXPORT_FORMATS.MARKDOWN:
      exportToMarkdown(items, filename || `${defaultFilename}.md`);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(value: string): string {
  if (!value) return '""';

  // Escape double quotes and wrap in quotes if contains comma, newline, or quote
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return `"${escaped}"`;
}

/**
 * Download file to user's computer
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy items to clipboard as JSON
 */
export async function copyToClipboard(items: StorageItem[]): Promise<void> {
  const data = JSON.stringify(items, null, 2);
  await navigator.clipboard.writeText(data);
}

/**
 * Get export statistics
 */
export function getExportStats(items: StorageItem[]): {
  totalItems: number;
  withAiSummary: number;
  withTags: number;
  totalTags: number;
  deviceSources: Record<string, number>;
  dateRange: { earliest: Date; latest: Date } | null;
} {
  if (items.length === 0) {
    return {
      totalItems: 0,
      withAiSummary: 0,
      withTags: 0,
      totalTags: 0,
      deviceSources: {},
      dateRange: null,
    };
  }

  const dates = items.map((item) => new Date(item.createdAt));
  const deviceSources: Record<string, number> = {};

  items.forEach((item) => {
    if (item.deviceSource) {
      deviceSources[item.deviceSource] = (deviceSources[item.deviceSource] || 0) + 1;
    }
  });

  return {
    totalItems: items.length,
    withAiSummary: items.filter((item) => item.aiSummary).length,
    withTags: items.filter((item) => item.tags && item.tags.length > 0).length,
    totalTags: items.reduce((sum, item) => sum + (item.tags?.length || 0), 0),
    deviceSources,
    dateRange: {
      earliest: new Date(Math.min(...dates.map((d) => d.getTime()))),
      latest: new Date(Math.max(...dates.map((d) => d.getTime()))),
    },
  };
}

export default exportItems;
