// ============================================
// EMPTY STATE COMPONENT
// Beautiful illustrations for empty states
// ============================================

import React from "react";
import { motion } from "motion/react";
import {
  FolderOpen,
  Search,
  FileText,
  MessageSquare,
  BarChart2,
  Quote,
  Sparkles,
} from "lucide-react";
import { Button } from "./UIComponents";

interface EmptyStateProps {
  type?:
    | "no-items"
    | "no-search"
    | "no-collections"
    | "no-chat"
    | "no-stats"
    | "no-citations"
    | "generic";
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const illustrations = {
  "no-items": {
    icon: FileText,
    gradient: "from-blue-500 to-indigo-600",
    bgGlow: "bg-blue-500/10",
  },
  "no-search": {
    icon: Search,
    gradient: "from-purple-500 to-pink-600",
    bgGlow: "bg-purple-500/10",
  },
  "no-collections": {
    icon: FolderOpen,
    gradient: "from-orange-500 to-red-600",
    bgGlow: "bg-orange-500/10",
  },
  "no-chat": {
    icon: MessageSquare,
    gradient: "from-green-500 to-teal-600",
    bgGlow: "bg-green-500/10",
  },
  "no-stats": {
    icon: BarChart2,
    gradient: "from-cyan-500 to-blue-600",
    bgGlow: "bg-cyan-500/10",
  },
  "no-citations": {
    icon: Quote,
    gradient: "from-violet-500 to-purple-600",
    bgGlow: "bg-violet-500/10",
  },
  generic: {
    icon: Sparkles,
    gradient: "from-gray-500 to-gray-600",
    bgGlow: "bg-gray-500/10",
  },
};

const defaultContent = {
  "no-items": {
    title: "No research items yet",
    description:
      "Start by clipping content from websites or uploading documents. Your research journey begins here!",
  },
  "no-search": {
    title: "No results found",
    description:
      "Try adjusting your search terms or filters to find what you're looking for.",
  },
  "no-collections": {
    title: "No collections yet",
    description:
      "Create your first collection to organize your research items by topic or project.",
  },
  "no-chat": {
    title: "Start a conversation",
    description:
      "Ask questions about your research and get AI-powered insights instantly.",
  },
  "no-stats": {
    title: "No statistics available",
    description:
      "Once you start adding research items, you'll see insights and trends here.",
  },
  "no-citations": {
    title: "No citations yet",
    description:
      "Generate citations for your research items in APA, MLA, or Chicago formats.",
  },
  generic: {
    title: "Nothing here yet",
    description: "Get started by adding some content.",
  },
};

const EmptyState: React.FC<EmptyStateProps> = ({
  type = "generic",
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const config = illustrations[type];
  const content = defaultContent[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      {/* Illustration */}
      <div className="relative mb-8">
        {/* Background glow */}
        <div
          className={`absolute inset-0 ${config.bgGlow} blur-3xl scale-150 opacity-60`}
        />

        {/* Icon container */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className={`
            relative w-24 h-24 rounded-3xl
            bg-gradient-to-br ${config.gradient}
            flex items-center justify-center
            shadow-xl shadow-current/20
          `}
        >
          <Icon className="w-10 h-10 text-white" strokeWidth={1.5} />

          {/* Decorative dots */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute -top-2 left-1/2 w-2 h-2 rounded-full bg-white/40" />
            <div className="absolute -right-2 top-1/2 w-1.5 h-1.5 rounded-full bg-white/30" />
            <div className="absolute -bottom-1 left-1/3 w-1 h-1 rounded-full bg-white/20" />
          </motion.div>
        </motion.div>
      </div>

      {/* Content */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
      >
        {title || content.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed"
      >
        {description || content.description}
      </motion.p>

      {/* Action button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6"
        >
          <Button onClick={onAction} size="md">
            <Sparkles className="w-4 h-4" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EmptyState;
