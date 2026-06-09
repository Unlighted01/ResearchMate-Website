// ============================================
// TopTagsList - Ranked Research Tags Component
// ============================================

import React from "react";
import { Tag } from "lucide-react";

interface TagItem {
  tag: string;
  count: number;
}

interface TopTagsListProps {
  tags: TagItem[];
}

const TopTagsList: React.FC<TopTagsListProps> = ({ tags }) => {
  const maxCount = tags.length > 0 ? tags[0].count : 1;

  return (
    <div className="theme-surface glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Tag className="w-4 h-4 text-[#007AFF]" />
          Top Research Tags
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
          Most Used
        </span>
      </div>

      <div className="space-y-4 h-64 overflow-y-auto pr-2">
        {tags.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10">No tags added yet</p>
        ) : (
          tags.map((item, index) => {
            const percentage = Math.round((item.count / maxCount) * 100);
            return (
              <div key={item.tag} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <span className="text-[#007AFF] font-bold">#{index + 1}</span> {item.tag}
                  </span>
                  <span className="text-gray-500 font-mono">{item.count} items</span>
                </div>
                <div className="h-2 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#007AFF] to-[#5856D6] rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TopTagsList;
