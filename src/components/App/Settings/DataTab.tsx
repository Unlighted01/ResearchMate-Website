// ============================================
// DataTab.tsx - Data Settings Tab
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Download, Upload, FileJson, FileText, FileSpreadsheet } from "lucide-react";
import { Card } from "../../shared/ui";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface DataTabProps {
  importLoading: boolean;
  handleExport: (format: "json" | "txt" | "csv") => Promise<void>;
  handleImport: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const DataTab: React.FC<DataTabProps> = ({
  importLoading,
  handleExport,
  handleImport,
}) => {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="w-5 h-5 text-primary-600" /> Export Data
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Download your research data in various formats.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleExport("json")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
          >
            <FileJson className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white">JSON</p>
            <p className="text-xs text-gray-500">
              Full data backup for developers
            </p>
          </button>

          <button
            onClick={() => handleExport("csv")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
          >
            <FileSpreadsheet className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white">CSV</p>
            <p className="text-xs text-gray-500">
              Spreadsheet friendly format
            </p>
          </button>

          <button
            onClick={() => handleExport("txt")}
            className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left group"
          >
            <FileText className="w-8 h-8 text-gray-400 group-hover:text-primary-500 mb-3" />
            <p className="font-semibold text-gray-900 dark:text-white">
              Text File
            </p>
            <p className="text-xs text-gray-500">
              Readable summaries and notes
            </p>
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary-600" /> Import Data
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          Restore data from a JSON backup file.
        </p>

        <div className="relative">
          <input
            type="file"
            accept=".json,.pdf,.png,.jpg,.jpeg"
            multiple
            title="Import Data"
            aria-label="Import Data"
            onChange={handleImport}
            disabled={importLoading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2.5 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100
              dark:file:bg-primary-900/30 dark:file:text-primary-400
              transition-all cursor-pointer
            "
          />
          {importLoading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

// ============================================
// PART 4: EXPORTS
// ============================================

export default DataTab;
