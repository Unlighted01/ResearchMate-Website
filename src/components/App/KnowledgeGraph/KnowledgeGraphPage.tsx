// ============================================
// KnowledgeGraphPage.tsx - Visual Research Map
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { getAllItems, StorageItem } from "../../../services/storageService";
import { Search, Info, Filter, ZoomIn, ZoomOut, Maximize2, X, FileText, Tag, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ============================================
// PART 1: TYPE DEFINITIONS
// ============================================

interface GraphNode {
  id: string;
  name: string;
  val: number;
  color: string;
  item: StorageItem;
}

interface GraphLink {
  source: string;
  target: string;
  commonTags: string[];
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ============================================
// PART 2: COMPONENT
// ============================================

const KnowledgeGraphPage: React.FC = () => {
  const [items, setItems] = useState<StorageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fgRef = useRef<any>();

  // ---------- PART 2A: DATA LOADING ----------

  useEffect(() => {
    const load = async () => {
      try {
        const allItems = await getAllItems(1000); // Fetch up to 1000 items
        setItems(allItems);
      } catch (err) {
        console.error("Failed to load items for graph:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---------- PART 2B: GRAPH CALCULATION ----------

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = items.map((item) => ({
      id: item.id,
      name: item.sourceTitle || item.text.substring(0, 30) + "...",
      val: 2 + (item.tags?.length || 0), // Size by tag count
      color: item.color ? getHexColor(item.color) : "#007AFF",
      item: item,
    }));

    const links: GraphLink[] = [];
    // Link items that share tags
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const tags1 = items[i].tags || [];
        const tags2 = items[j].tags || [];
        const commonTags = tags1.filter((t) => tags2.includes(t));

        if (commonTags.length > 0) {
          links.push({
            source: items[i].id,
            target: items[j].id,
            commonTags: commonTags,
          });
        }
      }
    }

    return { nodes, links };
  }, [items]);

  // ---------- PART 2C: UTILS ----------

  function getHexColor(colorName: string): string {
    const colors: Record<string, string> = {
      yellow: "#FFCC00",
      green: "#34C759",
      blue: "#007AFF",
      red: "#FF3B30",
      purple: "#AF52DE",
    };
    return colors[colorName] || "#007AFF";
  }

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return graphData;
    const query = searchQuery.toLowerCase();
    const filteredNodes = graphData.nodes.filter(
      (n) =>
        n.name.toLowerCase().includes(query) ||
        n.item.tags.some((t) => t.toLowerCase().includes(query))
    );
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = graphData.links.filter(
      (l) => nodeIds.has(l.source) && nodeIds.has(l.target)
    );
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, searchQuery]);

  // ---------- PART 2D: RENDER ----------

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-gray-50 dark:bg-black rounded-3xl border border-gray-200 dark:border-gray-800 shadow-apple-lg">
      {/* Header / Controls */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="glass-card p-4 rounded-2xl flex flex-col gap-1 w-64">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <WaypointsIcon className="w-5 h-5 text-[#007AFF]" />
              Knowledge Graph
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
              Mapping your research clusters
            </p>
          </div>

          <div className="glass-card p-2 rounded-xl flex items-center gap-2 w-64 shadow-sm border-white/50">
            <Search className="w-4 h-4 text-gray-400 ml-2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title or tag..."
              className="bg-transparent border-none text-sm focus:ring-0 w-full placeholder:text-gray-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}>
                <X className="w-3.5 h-3.5 text-gray-400 mr-2" />
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="glass-card p-1 rounded-xl flex flex-col items-center">
            <button
              onClick={() => fgRef.current?.zoomToFit(400)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Zoom to Fit"
            >
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="h-px w-6 bg-gray-200 dark:bg-white/10 my-1" />
            <button
              onClick={() => {
                const current = fgRef.current?.zoom();
                fgRef.current?.zoom(current * 1.2);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => {
                const current = fgRef.current?.zoom();
                fgRef.current?.zoom(current / 1.2);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 w-full h-full relative group">
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          backgroundColor="rgba(0,0,0,0)"
          nodeLabel="name"
          nodeRelSize={6}
          nodeAutoColorBy="color"
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={(d) => (d as any).commonTags.length * 0.005}
          linkWidth={(d) => (d as any).commonTags.length * 0.5}
          linkColor={() => (document.documentElement.classList.contains("dark") ? "#444" : "#ddd")}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Inter`;
            const textWidth = ctx.measureText(label).width;
            const bckgDimensions = [textWidth, fontSize].map((n) => n + fontSize * 0.2); // some padding

            ctx.fillStyle = "rgba(0, 0, 0, 0)";
            ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions as [number, number]);

            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillStyle = node.color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fill();

            // Only show labels when zoomed in or hovering
            if (globalScale > 3 || node === hoverNode) {
              ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#fff" : "#333";
              ctx.fillText(label, node.x, node.y + node.val + 4);
            }
          }}
          onNodeHover={(node: any) => setHoverNode(node)}
          onNodeClick={(node: any) => setSelectedNode(node)}
          cooldownTicks={100}
        />
      </div>

      {/* Legend / Stats */}
      <div className="absolute bottom-6 left-6 z-10 glass-card p-3 rounded-2xl flex flex-col gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
              {graphData.nodes.length} Items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-tighter">
              {graphData.links.length} Connections
            </span>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="absolute top-0 right-0 w-80 h-full glass-card border-y-0 border-r-0 rounded-none z-30 flex flex-col shadow-2xl"
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                  style={{ backgroundColor: selectedNode.color }}
                >
                  <FileText className="w-6 h-6" />
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div>
                  <h2 className="text-xl font-bold leading-tight mb-2">
                    {selectedNode.item.sourceTitle || "Untitled Clip"}
                  </h2>
                  {selectedNode.item.sourceUrl && (
                    <a
                      href={selectedNode.item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#007AFF] hover:underline"
                    >
                      View Source
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedNode.item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-0.5 bg-[#007AFF]/10 text-[#007AFF] text-[10px] font-bold rounded-full uppercase italic"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Item Details</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      "{selectedNode.item.text}"
                    </div>
                    {selectedNode.item.note && (
                      <div className="p-3 bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100/50 dark:border-yellow-900/20 rounded-xl text-sm italic">
                        {selectedNode.item.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                  <Calendar className="w-3 h-3" />
                  Captured {new Date(selectedNode.item.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const WaypointsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
     <circle cx="12" cy="12" r="3" />
     <path d="M16.2 3.8L12 8" />
     <path d="M7.8 3.8l4.2 4.2" />
     <path d="M3.8 7.8L8 12" />
     <path d="M3.8 16.2l4.2-4.2" />
     <path d="M7.8 20.2L12 16" />
     <path d="M16.2 20.2l-4.2-4.2" />
     <path d="M20.2 16.2L16 12" />
     <path d="M20.2 7.8l-4.2 4.2" />
  </svg>
)

export default KnowledgeGraphPage;
