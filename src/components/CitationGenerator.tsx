// ============================================
// CitationGenerator.tsx - Citation Generation Tool
// ============================================
import AICitationExtractor from "./AICitationExtractor";
import React, { useState, useEffect } from "react";
import { Button, Card, Input, Badge } from "./UIComponents";
import {
  Copy,
  Quote,
  BookOpen,
  FileText,
  CheckCircle2,
  Search,
  Globe,
  Calendar,
  User,
  Building,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { getAllItems, StorageItem } from "../services/storageService";

// ============================================
// PART 1: TYPES & INTERFACES
// ============================================

type CitationFormat = "apa" | "mla" | "chicago" | "harvard" | "ieee" | "bibtex";

interface CitationData {
  title: string;
  author: string;
  publishDate: string;
  accessDate: string;
  url: string;
  publisher: string;
  websiteName: string;
}

// ============================================
// PART 2: CITATION FORMATTERS
// ============================================

const formatDate = (
  dateStr: string,
  format: "full" | "year" | "mla" | "chicago"
) => {
  const date = new Date(dateStr);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthsShort = [
    "Jan.",
    "Feb.",
    "Mar.",
    "Apr.",
    "May",
    "June",
    "July",
    "Aug.",
    "Sept.",
    "Oct.",
    "Nov.",
    "Dec.",
  ];

  switch (format) {
    case "year":
      return date.getFullYear().toString();
    case "mla":
      return `${date.getDate()} ${
        monthsShort[date.getMonth()]
      } ${date.getFullYear()}`;
    case "chicago":
      return `${
        months[date.getMonth()]
      } ${date.getDate()}, ${date.getFullYear()}`;
    case "full":
    default:
      return `${
        months[date.getMonth()]
      } ${date.getDate()}, ${date.getFullYear()}`;
  }
};

const generateCitation = (
  data: CitationData,
  format: CitationFormat
): string => {
  const {
    title,
    author,
    publishDate,
    accessDate,
    url,
    publisher,
    websiteName,
  } = data;
  const authorDisplay = author || "Unknown Author";
  const titleDisplay = title || "Untitled";

  switch (format) {
    case "apa":
      // APA 7th Edition
      return `${authorDisplay}. (${formatDate(
        publishDate,
        "year"
      )}). ${titleDisplay}. ${
        websiteName || publisher || "Website"
      }. Retrieved ${formatDate(accessDate, "full")}, from ${url}`;

    case "mla":
      // MLA 9th Edition
      return `${authorDisplay}. "${titleDisplay}." ${
        websiteName || publisher || "Website"
      }, ${formatDate(publishDate, "mla")}, ${url}. Accessed ${formatDate(
        accessDate,
        "mla"
      )}.`;

    case "chicago":
      // Chicago 17th Edition
      return `${authorDisplay}. "${titleDisplay}." ${
        websiteName || publisher || "Website"
      }. ${formatDate(publishDate, "chicago")}. ${url}.`;

    case "harvard":
      // Harvard Style
      return `${authorDisplay} (${formatDate(
        publishDate,
        "year"
      )}) ${titleDisplay}. Available at: ${url} (Accessed: ${formatDate(
        accessDate,
        "mla"
      )}).`;

    case "ieee":
      // IEEE Style
      return `${authorDisplay}, "${titleDisplay}," ${
        websiteName || publisher || "Website"
      }, ${formatDate(
        publishDate,
        "year"
      )}. [Online]. Available: ${url}. [Accessed: ${formatDate(
        accessDate,
        "mla"
      )}].`;

    case "bibtex":
      // BibTeX Format
      const key =
        titleDisplay.split(" ")[0].toLowerCase() +
        formatDate(publishDate, "year");
      return `@misc{${key},
  author = {${authorDisplay}},
  title = {${titleDisplay}},
  year = {${formatDate(publishDate, "year")}},
  url = {${url}},
  note = {Accessed: ${formatDate(accessDate, "mla")}}
}`;

    default:
      return "";
  }
};

// ============================================
// PART 3: MAIN COMPONENT
// ============================================

const CitationGenerator: React.FC = () => {
  // State for saved items
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // State for citation form
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);
  const [citationData, setCitationData] = useState<CitationData>({
    title: "",
    author: "",
    publishDate: new Date().toISOString(),
    accessDate: new Date().toISOString(),
    url: "",
    publisher: "",
    websiteName: "",
  });

  // State for generated citations
  const [copiedFormat, setCopiedFormat] = useState<CitationFormat | null>(null);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await getAllItems();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
    setLoading(false);
  };

  // Filter items by search
  const filteredItems = items.filter(
    (item) =>
      item.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.text?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle item selection
  const handleSelectItem = (item: StorageItem) => {
    setSelectedItem(item);
    setCitationData({
      title: item.sourceTitle || "Untitled",
      author: "", // User can fill this in
      publishDate: item.createdAt,
      accessDate: new Date().toISOString(),
      url: item.sourceUrl || "",
      publisher: "",
      websiteName: extractDomain(item.sourceUrl || ""),
    });
  };

  // Extract domain from URL for website name
  const extractDomain = (url: string): string => {
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      // Capitalize first letter
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    } catch {
      return "";
    }
  };

  // Copy citation to clipboard
  const handleCopy = async (format: CitationFormat) => {
    const citation = generateCitation(citationData, format);
    await navigator.clipboard.writeText(citation);
    setCopiedFormat(format);
    setTimeout(() => setCopiedFormat(null), 2000);
  };

  // Citation format info
  const citationFormats: {
    id: CitationFormat;
    name: string;
    description: string;
  }[] = [
    {
      id: "apa",
      name: "APA 7th",
      description: "American Psychological Association",
    },
    { id: "mla", name: "MLA 9th", description: "Modern Language Association" },
    { id: "chicago", name: "Chicago", description: "Chicago Manual of Style" },
    { id: "harvard", name: "Harvard", description: "Harvard Referencing" },
    {
      id: "ieee",
      name: "IEEE",
      description: "Institute of Electrical and Electronics Engineers",
    },
    { id: "bibtex", name: "BibTeX", description: "LaTeX Bibliography Format" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Quote className="w-6 h-6 text-primary-600" />
            Citation Generator
          </h1>
          <p className="text-gray-500 mt-1">
            Generate properly formatted citations for your research
          </p>
        </div>
      </div>

      {/* AI Citation Extractor */}
      <AICitationExtractor
        onCitationExtracted={(metadata) => {
          setCitationData({
            title: metadata.title,
            author: metadata.author,
            publishDate: metadata.publishDate || new Date().toISOString(),
            accessDate: metadata.accessDate,
            url: metadata.url,
            publisher: "",
            websiteName: metadata.siteName,
          });
          setSelectedItem(null);
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Select Research Item */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Select Research Item
            </h3>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search your research..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>

            {/* Items List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4 text-gray-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  No items found
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedItem?.id === item.id
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <h4 className="font-medium text-sm line-clamp-1">
                      {item.sourceTitle || "Untitled"}
                    </h4>
                    <p className="text-xs text-gray-500 truncate mt-1">
                      {item.sourceUrl || "No URL"}
                    </p>
                  </button>
                ))
              )}
            </div>

            {/* Or enter manually */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setSelectedItem(null);
                  setCitationData({
                    title: "",
                    author: "",
                    publishDate: new Date().toISOString(),
                    accessDate: new Date().toISOString(),
                    url: "",
                    publisher: "",
                    websiteName: "",
                  });
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Enter Manually
              </Button>
            </div>
          </Card>
        </div>

        {/* Middle: Citation Details Form */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Citation Details
            </h3>

            <div className="space-y-3">
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
                  onChange={(e) =>
                    setCitationData({ ...citationData, title: e.target.value })
                  }
                  placeholder="Article or page title"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

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
                  onChange={(e) =>
                    setCitationData({ ...citationData, author: e.target.value })
                  }
                  placeholder="Last Name, First Name"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

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
                  onChange={(e) =>
                    setCitationData({
                      ...citationData,
                      websiteName: e.target.value,
                    })
                  }
                  placeholder="e.g., Wikipedia, BBC News"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

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
                  onChange={(e) =>
                    setCitationData({
                      ...citationData,
                      publisher: e.target.value,
                    })
                  }
                  placeholder="Publishing organization"
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

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
                  onChange={(e) =>
                    setCitationData({ ...citationData, url: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

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
                      setCitationData({
                        ...citationData,
                        publishDate: new Date(e.target.value).toISOString(),
                      })
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
                      setCitationData({
                        ...citationData,
                        accessDate: new Date(e.target.value).toISOString(),
                      })
                    }
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Generated Citations */}
        <div className="lg:col-span-1">
          <Card className="p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Quote className="w-4 h-4" />
              Generated Citations
            </h3>

            <div className="space-y-3">
              {citationFormats.map((format) => (
                <div
                  key={format.id}
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-primary-600">
                        {format.name}
                      </span>
                      <p className="text-xs text-gray-400">
                        {format.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(format.id)}
                      className={`p-1.5 rounded-lg transition-all ${
                        copiedFormat === format.id
                          ? "bg-green-100 text-green-600"
                          : "text-gray-400 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                      title={`Copy ${format.name} citation`}
                      aria-label={`Copy ${format.name} citation`}
                    >
                      {copiedFormat === format.id ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p
                    className={`text-xs text-gray-600 dark:text-gray-400 break-all ${
                      format.id === "bibtex"
                        ? "font-mono whitespace-pre-wrap"
                        : ""
                    }`}
                  >
                    {generateCitation(citationData, format.id) ||
                      "Fill in the details to generate citation"}
                  </p>
                </div>
              ))}
            </div>

            {/* Copy All Button */}
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={async () => {
                const allCitations = citationFormats
                  .map(
                    (f) => `${f.name}:\n${generateCitation(citationData, f.id)}`
                  )
                  .join("\n\n");
                await navigator.clipboard.writeText(allCitations);
                setCopiedFormat("apa"); // Just to show feedback
                setTimeout(() => setCopiedFormat(null), 2000);
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy All Formats
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CitationGenerator;
