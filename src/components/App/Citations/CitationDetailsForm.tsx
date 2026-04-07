// ============================================
// CitationDetailsForm.tsx - Citation Metadata Input Form
// ============================================

// ============================================
// PART 1: IMPORTS & DEPENDENCIES
// ============================================

import React from "react";
import { Card } from "../../shared/ui";
import {
  BookOpen,
  FileText,
  User,
  Globe,
  Building,
  Calendar,
  Link as LinkIcon,
} from "lucide-react";
import { CitationData } from "./citationUtils";

// ============================================
// PART 2: TYPE DEFINITIONS
// ============================================

interface CitationDetailsFormProps {
  citationData: CitationData;
  onChange: (data: CitationData) => void;
}

// ============================================
// PART 3: COMPONENT
// ============================================

const CitationDetailsForm: React.FC<CitationDetailsFormProps> = ({
  citationData,
  onChange,
}) => {
  const update = (patch: Partial<CitationData>) =>
    onChange({ ...citationData, ...patch });

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Citation Details
      </h3>

      <div className="space-y-3">
        {/* Title */}
        <div>
          <label
            htmlFor="citation-title"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            <FileText className="w-3 h-3 inline mr-1" />
            Title
          </label>
          <input
            id="citation-title"
            type="text"
            value={citationData.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Article or page title"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {/* Author */}
        <div>
          <label
            htmlFor="citation-author"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            <User className="w-3 h-3 inline mr-1" />
            Author
          </label>
          <input
            id="citation-author"
            type="text"
            value={citationData.author}
            onChange={(e) => update({ author: e.target.value })}
            placeholder="Last Name, First Name"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {/* Website Name */}
        <div>
          <label
            htmlFor="citation-website"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            <Globe className="w-3 h-3 inline mr-1" />
            Website Name
          </label>
          <input
            id="citation-website"
            type="text"
            value={citationData.websiteName}
            onChange={(e) => update({ websiteName: e.target.value })}
            placeholder="e.g., Wikipedia, BBC News"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {/* Publisher */}
        <div>
          <label
            htmlFor="citation-publisher"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            <Building className="w-3 h-3 inline mr-1" />
            Publisher (optional)
          </label>
          <input
            id="citation-publisher"
            type="text"
            value={citationData.publisher}
            onChange={(e) => update({ publisher: e.target.value })}
            placeholder="Publishing organization"
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {/* URL */}
        <div>
          <label
            htmlFor="citation-url"
            className="block text-xs font-medium text-gray-500 mb-1"
          >
            <LinkIcon className="w-3 h-3 inline mr-1" />
            URL
          </label>
          <input
            id="citation-url"
            type="url"
            value={citationData.url}
            onChange={(e) => update({ url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="citation-publish-date"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              Publish Date
            </label>
            <input
              id="citation-publish-date"
              type="date"
              value={citationData.publishDate.split("T")[0]}
              onChange={(e) =>
                update({ publishDate: new Date(e.target.value).toISOString() })
              }
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="citation-access-date"
              className="block text-xs font-medium text-gray-500 mb-1"
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              Access Date
            </label>
            <input
              id="citation-access-date"
              type="date"
              value={citationData.accessDate.split("T")[0]}
              onChange={(e) =>
                update({ accessDate: new Date(e.target.value).toISOString() })
              }
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CitationDetailsForm;
