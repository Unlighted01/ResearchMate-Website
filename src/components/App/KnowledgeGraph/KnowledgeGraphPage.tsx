// ============================================
// KnowledgeGraphPage.tsx - Visual Research Map
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import * as d3 from "d3";
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
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
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
  const [hoverLink, setHoverLink] = useState<GraphLink | null>(null);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showTagFilter, setShowTagFilter] = useState(false);
  
  const fgRef = useRef<ForceGraphMethods | null>(null);
  const isDark = document.documentElement.classList.contains("dark");

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

  // ---------- PART 2A.5: PHYSICS TUNING ----------
  useEffect(() => {
    if (fgRef.current && !loading) {
      fgRef.current.d3Force("charge")?.strength(-350);
      fgRef.current.d3Force("link")?.distance(140);
      fgRef.current.d3Force("collide", d3.forceCollide().radius((d: any) => d.val + 15));
    }
  }, [loading]);

  // ---------- PART 2B: GRAPH CALCULATION ----------

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = items.map((item) => ({
      id: item.id,
      name: item.sourceTitle || item.text.substring(0, 30) + "...",
      val: 3 + (item.tags?.length || 0) * 1.5, // Size by tag count
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

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  // ---------- PART 2C: UTILS & FILTERING ----------

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
    let filteredNodes = graphData.nodes;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredNodes = filteredNodes.filter(
        (n) =>
          n.name.toLowerCase().includes(query) ||
          n.item.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }
    
    if (selectedTags.size > 0) {
      filteredNodes = filteredNodes.filter(n => n.item.tags?.some(t => selectedTags.has(t)));
    }

    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredLinks = graphData.links.filter(
      (l) => {
        const sid = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tid = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return nodeIds.has(sid) && nodeIds.has(tid);
      }
    );
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, searchQuery, selectedTags]);

  // Precompute neighbors for hover highlighting
  const highlightNodes = useMemo(() => {
    const set = new Set<string>();
    if (hoverNode) {
      set.add(hoverNode.id);
      filteredData.links.forEach(link => {
        const sid = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const tid = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (sid === hoverNode.id) set.add(tid);
        if (tid === hoverNode.id) set.add(sid);
      });
    }
    return set;
  }, [hoverNode, filteredData.links]);

  const highlightLinks = useMemo(() => {
    const set = new Set<GraphLink>();
    if (hoverNode) {
      filteredData.links.forEach(link => {
        const sid = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const tid = typeof link.target === 'object' ? (link.target as any).id : link.target;
        if (sid === hoverNode.id || tid === hoverNode.id) {
          set.add(link);
        }
      });
    }
    if (hoverLink) {
      set.add(hoverLink);
    }
    return set;
  }, [hoverNode, hoverLink, filteredData.links]);

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
          <div className="glass-card p-4 rounded-2xl flex flex-col gap-1 w-64 shadow-xl border-white/20">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <WaypointsIcon className="w-5 h-5 text-[#007AFF]" />
              Knowledge Graph
            </h1>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
              Mapping your research clusters
            </p>
          </div>

          <div className="flex gap-2">
            <div className="glass-card p-2 rounded-xl flex items-center gap-2 w-64 shadow-sm border-white/50 bg-white/60 dark:bg-black/60 backdrop-blur-md">
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

            <div className="relative">
              <button 
                onClick={() => setShowTagFilter(!showTagFilter)}
                className={`glass-card p-2 px-3 rounded-xl flex items-center gap-2 shadow-sm border-white/50 text-sm font-bold transition-colors ${selectedTags.size > 0 ? 'bg-[#007AFF] text-white border-[#007AFF]' : 'bg-white/60 dark:bg-black/60 text-gray-600 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 backdrop-blur-md'}`}
              >
                <Filter className="w-4 h-4" />
                <span>
                  {selectedTags.size > 0 ? `${selectedTags.size} Tags` : 'Filter Tags'}
                </span>
              </button>
              
              <AnimatePresence>
                {showTagFilter && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                    className="absolute top-full left-0 mt-2 w-72 glass-card p-4 rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 z-50 max-h-80 overflow-y-auto custom-scrollbar bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filter by Tag</h3>
                      {selectedTags.size > 0 && (
                        <button 
                          onClick={() => setSelectedTags(new Set())}
                          className="text-[10px] text-[#007AFF] font-bold hover:underline"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {allTags.map(tag => {
                        const isSelected = selectedTags.has(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const next = new Set(selectedTags);
                              if (isSelected) next.delete(tag);
                              else next.add(tag);
                              setSelectedTags(next);
                            }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all border ${
                              isSelected 
                                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-blue-500/20' 
                                : 'bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                      {allTags.length === 0 && (
                        <p className="text-xs text-gray-400 text-center w-full py-2">No tags available</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="glass-card p-1 rounded-xl flex flex-col items-center bg-white/60 dark:bg-black/60 backdrop-blur-md shadow-sm border-white/50">
            <button
              onClick={() => fgRef.current?.zoomToFit(400)}
              className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="Zoom to Fit"
            >
              <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <div className="h-px w-6 bg-gray-200 dark:bg-white/10 my-1" />
            <button
              onClick={() => {
                const current = fgRef.current?.zoom();
                if (current) fgRef.current?.zoom(current * 1.2, 400);
              }}
              className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => {
                const current = fgRef.current?.zoom();
                if (current) fgRef.current?.zoom(current / 1.2, 400);
              }}
              className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
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
          nodeRelSize={6}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={(d) => (d as any).commonTags.length * 0.005}
          linkWidth={(link: any) => highlightLinks.has(link) ? 3 : Math.max(1, (link.commonTags.length * 0.5))}
          linkColor={(link: any) => {
            if (hoverNode && !highlightLinks.has(link)) return isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
            return highlightLinks.has(link) ? (isDark ? 'rgba(147,51,234,0.8)' : 'rgba(168,85,247,0.8)') : (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)");
          }}
          linkDirectionalParticleWidth={(link: any) => highlightLinks.has(link) ? 4 : 2}
          onNodeHover={(node: any) => setHoverNode(node)}
          onNodeClick={(node: any) => setSelectedNode(node)}
          onLinkHover={(link: any) => setHoverLink(link)}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const isHovered = node === hoverNode;
            const isHighlighted = highlightNodes.has(node.id);
            const dimNode = hoverNode && !isHighlighted;
            
            // Draw node circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
            ctx.fillStyle = dimNode ? (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : node.color;
            ctx.fill();

            // Node Outline & Glow
            if (isHovered || node === selectedNode) {
              ctx.strokeStyle = isDark ? 'white' : 'black';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              if (isHovered) {
                // Subtle glow
                ctx.shadowColor = node.color;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0; // reset
              }
            }

            // Label Drawing
            if (!dimNode && (globalScale > 1.2 || isHovered || isHighlighted)) {
              const label = node.name;
              const displayLabel = isHovered ? label : (label.length > 25 ? label.substring(0, 25) + "..." : label);
              const fontSize = 12 / globalScale;
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;
              const textWidth = ctx.measureText(displayLabel).width;
              
              const paddingX = fontSize * 0.8;
              const paddingY = fontSize * 0.5;
              const bckgW = textWidth + paddingX * 2;
              const bckgH = fontSize + paddingY * 2;
              const labelY = node.y + node.val + bckgH / 2 + 4; // Position below node

              // Pill Background
              ctx.fillStyle = isDark ? "rgba(20, 20, 20, 0.95)" : "rgba(255, 255, 255, 0.95)";
              ctx.beginPath();
              // @ts-ignore - roundRect is in modern TS DOM libs but might complain
              if (ctx.roundRect) {
                ctx.roundRect(node.x - bckgW / 2, labelY - bckgH / 2, bckgW, bckgH, bckgH / 2);
              } else {
                ctx.rect(node.x - bckgW / 2, labelY - bckgH / 2, bckgW, bckgH);
              }
              ctx.fill();
              
              // Outline for pill
              ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
              ctx.lineWidth = 1 / globalScale;
              ctx.stroke();

              // Text
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillStyle = isDark ? "#fff" : "#111";
              ctx.fillText(displayLabel, node.x, labelY);
            }
          }}
          nodePointerAreaPaint={(node: any, color: string, ctx, globalScale) => {
            // Circle hitbox
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, node.val + 4, 0, 2 * Math.PI, false); // generous hit area for circle
            ctx.fill();

            // Text Pill Hitbox (only if drawn)
            const isHovered = node === hoverNode;
            const isHighlighted = highlightNodes.has(node.id);
            if (globalScale > 1.2 || isHovered || isHighlighted) {
              const label = node.name;
              const displayLabel = isHovered ? label : (label.length > 25 ? label.substring(0, 25) + "..." : label);
              const fontSize = 12 / globalScale;
              ctx.font = `600 ${fontSize}px Inter, sans-serif`;
              const textWidth = ctx.measureText(displayLabel).width;
              
              const paddingX = fontSize * 0.8;
              const paddingY = fontSize * 0.5;
              const bckgW = textWidth + paddingX * 2;
              const bckgH = fontSize + paddingY * 2;
              const labelY = node.y + node.val + bckgH / 2 + 4;

              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(node.x - bckgW / 2, labelY - bckgH / 2, bckgW, bckgH, bckgH / 2);
              } else {
                ctx.rect(node.x - bckgW / 2, labelY - bckgH / 2, bckgW, bckgH);
              }
              ctx.fill();
            }
          }}
          linkCanvasObjectMode={() => 'after'}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            if (link === hoverLink && link.commonTags?.length) {
              // Draw a label on the link
              const start = link.source;
              const end = link.target;
              if (typeof start !== 'object' || typeof end !== 'object') return;
              
              const midX = start.x + (end.x - start.x) / 2;
              const midY = start.y + (end.y - start.y) / 2;
              
              const label = `${link.commonTags.length} shared tag${link.commonTags.length > 1 ? 's' : ''}`;
              const fontSize = 10 / globalScale;
              ctx.font = `800 ${fontSize}px Inter, sans-serif`;
              const textWidth = ctx.measureText(label).width;
              const paddingX = fontSize * 0.8;
              const paddingY = fontSize * 0.4;
              
              // Draw background pill
              ctx.fillStyle = isDark ? "rgba(147, 51, 234, 0.95)" : "rgba(168, 85, 247, 0.95)"; // Purple pill
              ctx.beginPath();
              if (ctx.roundRect) {
                ctx.roundRect(midX - textWidth/2 - paddingX, midY - fontSize/2 - paddingY, textWidth + paddingX*2, fontSize + paddingY*2, fontSize);
              } else {
                ctx.rect(midX - textWidth/2 - paddingX, midY - fontSize/2 - paddingY, textWidth + paddingX*2, fontSize + paddingY*2);
              }
              ctx.fill();
              
              // Draw text
              ctx.fillStyle = "#ffffff";
              ctx.textAlign = "center";
              ctx.textBaseline = "middle";
              ctx.fillText(label, midX, midY);
            }
          }}
          cooldownTicks={100}
        />
      </div>

      {/* Legend / Stats */}
      <div className="absolute bottom-6 left-6 z-10 glass-card p-4 rounded-2xl flex flex-col gap-2 shadow-lg border border-white/20 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#007AFF] shadow-sm" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {filteredData.nodes.length} Items
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              {filteredData.links.length} Links
            </span>
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 w-80 h-full glass-card border-y-0 border-r-0 rounded-none z-30 flex flex-col shadow-2xl bg-white/95 dark:bg-black/95 backdrop-blur-2xl"
          >
            <div className="p-6 flex flex-col h-full">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg"
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
                  <h2 className="text-xl font-bold leading-tight mb-2 text-gray-900 dark:text-white">
                    {selectedNode.item.sourceTitle || "Untitled Clip"}
                  </h2>
                  {selectedNode.item.sourceUrl && (
                    <a
                      href={selectedNode.item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#007AFF] hover:underline font-medium"
                    >
                      View Source
                    </a>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(selectedNode.item.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#007AFF]/10 dark:bg-[#007AFF]/20 text-[#007AFF] dark:text-blue-400 text-[10px] font-bold rounded-full uppercase tracking-wider"
                    >
                      <Tag className="w-3 h-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
                    <Info className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Item Details</span>
                  </div>
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                      "{selectedNode.item.text}"
                    </div>
                    {selectedNode.item.note && (
                      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-2xl text-sm italic text-yellow-900 dark:text-yellow-200">
                        {selectedNode.item.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex items-center gap-2 text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                  <Calendar className="w-3.5 h-3.5" />
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
