// ============================================
// ActivityFeed - Activity Timeline Component
// ============================================

import React from "react";
import { Laptop, Smartphone, PenTool, Globe, Mic, Bookmark, Clock, Sparkles } from "lucide-react";
import { StorageItem } from "../../../services/storageService";

interface ActivityFeedProps {
  items: StorageItem[];
}

const getActivityIcon = (source: string) => {
  switch (source) {
    case "extension":
      return <Laptop className="w-4 h-4 text-[#007AFF]" />;
    case "mobile":
      return <Smartphone className="w-4 h-4 text-[#5856D6]" />;
    case "smart_pen":
      return <PenTool className="w-4 h-4 text-[#FF9500]" />;
    case "web":
      return <Globe className="w-4 h-4 text-[#34C759]" />;
    case "transcription":
      return <Mic className="w-4 h-4 text-[#FF2D55]" />;
    default:
      return <Bookmark className="w-4 h-4 text-gray-500" />;
  }
};

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const truncateText = (text: string, max: number) => {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "..." : text;
};

const ActivityFeed: React.FC<ActivityFeedProps> = ({ items }) => {
  const recentItems = items.slice(0, 15); // Show last 15 items

  return (
    <div className="theme-surface glass-card rounded-3xl p-6 border border-slate-200/60 dark:border-slate-800/80 shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl flex items-center justify-center border border-purple-500/10 shadow-sm animate-float-slow">
            <Clock className="w-5 h-5 text-[#5856D6]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              Activity Timeline
              <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
            </h3>
            <p className="text-[11px] text-slate-400">Real-time chronicle of research captures</p>
          </div>
        </div>
      </div>

      <div className="relative border-l border-gray-200 dark:border-gray-800 ml-4 pl-6 space-y-6 max-h-[400px] overflow-y-auto pr-2">
        {recentItems.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-sm py-4">No recent research activities found.</p>
        ) : (
          recentItems.map((item) => {
            const sourceLabel = item.deviceSource === "extension"
              ? "Browser Extension"
              : item.deviceSource === "mobile"
              ? "Mobile App"
              : item.deviceSource === "smart_pen"
              ? "Smart Pen Scan"
              : item.deviceSource === "transcription"
              ? "Audio Transcription"
              : "Web Application";

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node */}
                <div className="absolute -left-[35px] top-1.5 w-6 h-6 rounded-full bg-white dark:bg-[#1C1C1E] border-2 border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-[#5856D6] transition-colors shadow-sm">
                  {getActivityIcon(item.deviceSource)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate flex-1">
                      {item.sourceTitle || "Snipped Text"}
                    </h4>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      {formatTimeAgo(item.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono capitalize">
                    Saved from {sourceLabel} {item.tags.length > 0 && `· Tags: ${item.tags.join(", ")}`}
                  </p>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-lg p-2.5 mt-1 border border-slate-100 dark:border-white/5 line-clamp-2 leading-relaxed">
                    {truncateText(item.text, 200)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
