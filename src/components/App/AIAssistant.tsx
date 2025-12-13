import React, { useState, useEffect } from "react";
import { Zap, RefreshCw, Search, CheckCircle2 } from "lucide-react";
import { Button, Card, Badge, Modal } from "../shared/UIComponents";
import {
  getAllItems,
  updateItem,
  StorageItem,
} from "../../services/storageService";
import { generateSummary } from "../../services/geminiService";

interface AIProps {
  useToast: () => {
    showToast: (msg: string, type: "success" | "error" | "info") => void;
  };
}

const AIAssistant: React.FC<AIProps> = ({ useToast }) => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<StorageItem | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    getAllItems().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const itemsWithoutSummary = items.filter(
    (i) =>
      !i.aiSummary &&
      (searchQuery
        ? i.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        : true)
  );
  const itemsWithSummary = items.filter(
    (i) =>
      i.aiSummary &&
      (searchQuery
        ? i.sourceTitle?.toLowerCase().includes(searchQuery.toLowerCase())
        : true)
  );

  const handleSummarize = async (item: StorageItem) => {
    setSummarizing(true);
    try {
      const summary = await generateSummary(item.text || item.ocrText || "");
      if (summary) {
        await updateItem(item.id, { aiSummary: summary });
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, aiSummary: summary } : i))
        );
        showToast("Summary generated!", "success");
      }
    } catch (e) {
      showToast("Failed to summarize", "error");
    }
    setSummarizing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
            <Zap className="text-primary-600" /> AI Assistant
          </h1>
          <p className="text-gray-500">Batch process your research summaries</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 outline-none"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" /> Needs
            Summary ({itemsWithoutSummary.length})
          </h2>
          <div className="space-y-3">
            {itemsWithoutSummary.map((item) => (
              <Card key={item.id} className="p-4">
                <h4 className="font-medium line-clamp-1 dark:text-white">
                  {item.sourceTitle || "Untitled"}
                </h4>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleSummarize(item)}
                    disabled={summarizing}
                  >
                    Summarize
                  </Button>
                </div>
              </Card>
            ))}
            {itemsWithoutSummary.length === 0 && (
              <div className="text-gray-500 text-sm">All caught up!</div>
            )}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Completed (
            {itemsWithSummary.length})
          </h2>
          <div className="space-y-3">
            {itemsWithSummary.map((item) => (
              <Card
                key={item.id}
                className="p-4 cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <h4 className="font-medium line-clamp-1 dark:text-white">
                  {item.sourceTitle || "Untitled"}
                </h4>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 line-clamp-2 italic">
                  "{item.aiSummary}"
                </p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        title="AI Summary"
      >
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-green-800 dark:text-green-200">
            {selectedItem?.aiSummary}
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AIAssistant;
