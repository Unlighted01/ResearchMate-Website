import React, { useEffect } from 'react';
import { X, Command, Search, RefreshCw, Grid3X3, HelpCircle } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const ctrlKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: [`${ctrlKey}`, 'K'], description: 'Focus search' },
        { keys: [`${ctrlKey}`, 'R'], description: 'Refresh items' },
        { keys: ['G'], description: 'Toggle grid/list view' },
        { keys: ['Esc'], description: 'Close modals' },
      ],
    },
    {
      category: 'Actions',
      items: [
        { keys: [`${ctrlKey}`, 'N'], description: 'Create new item' },
        { keys: [`${ctrlKey}`, 'S'], description: 'Save changes' },
        { keys: ['Delete'], description: 'Delete selected item' },
        { keys: ['Enter'], description: 'Confirm action' },
      ],
    },
    {
      category: 'Help',
      items: [
        { keys: ['?'], description: 'Show keyboard shortcuts (this modal)' },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative z-10 bg-white dark:bg-[#1C1C1E] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <Command className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2
              id="shortcuts-modal-title"
              className="text-xl font-bold text-gray-900 dark:text-white"
            >
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {shortcuts.map((section, idx) => (
            <div key={idx}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                {section.category}
              </h3>
              <div className="space-y-3">
                {section.items.map((shortcut, itemIdx) => (
                  <div
                    key={itemIdx}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIdx) => (
                        <React.Fragment key={keyIdx}>
                          {keyIdx > 0 && (
                            <span className="text-gray-400 mx-1">+</span>
                          )}
                          <kbd className="px-2.5 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm">
                            {key}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Footer Tip */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Pro Tip
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Keyboard shortcuts don't work when you're typing in a text field.
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded">Esc</kbd> to exit the field and use shortcuts.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
