import { useEffect, useCallback } from 'react';

// ============================================
// KEYBOARD SHORTCUTS HOOK
// ============================================

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  handler: () => void;
  preventDefault?: boolean;
}

/**
 * Global keyboard shortcuts hook
 * Usage:
 * useKeyboardShortcuts([
 *   { key: 's', ctrlKey: true, description: 'Save', handler: handleSave },
 *   { key: 'k', ctrlKey: true, description: 'Search', handler: handleSearch }
 * ]);
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true';

      if (isTyping) return;

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Format keyboard shortcut for display
 * Example: { key: 's', ctrlKey: true } => "Ctrl+S" or "⌘S"
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const parts: string[] = [];

  if (shortcut.ctrlKey || shortcut.metaKey) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (shortcut.shiftKey) {
    parts.push(isMac ? '⇧' : 'Shift');
  }
  if (shortcut.altKey) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  parts.push(shortcut.key.toUpperCase());

  return parts.join(isMac ? '' : '+');
}

/**
 * Common keyboard shortcuts
 */
export const COMMON_SHORTCUTS = {
  SAVE: { key: 's', ctrlKey: true, metaKey: true } as const,
  SEARCH: { key: 'k', ctrlKey: true, metaKey: true } as const,
  NEW: { key: 'n', ctrlKey: true, metaKey: true } as const,
  DELETE: { key: 'Delete' } as const,
  ESCAPE: { key: 'Escape' } as const,
  ENTER: { key: 'Enter' } as const,
  REFRESH: { key: 'r', ctrlKey: true, metaKey: true } as const,
  HELP: { key: '?', shiftKey: true } as const,
};

export default useKeyboardShortcuts;
