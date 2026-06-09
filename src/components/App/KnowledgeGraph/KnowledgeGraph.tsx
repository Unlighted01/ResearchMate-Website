import React, { useState, useEffect, useRef, useCallback } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useTheme } from "../../../context/ThemeContext";
import { motion, AnimatePresence } from "motion/react";
import * as d3 from "d3";

// --- Types ---
interface GraphNode {
  id: string;
  name: string;
  group: number;
  val: number; // size
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

// --- Mock Data ---
const MOCK_DATA = {
  nodes: [
    { id: "1", name: "(PDF) Extending the self through AI-mediated communication: functional, ontological, and anthropomorphic extensions", group: 1, val: 20 },
    { id: "2", name: "Notions of explainability and evaluation approaches for explainable artificial intelligence - ScienceDirect", group: 1, val: 15 },
    { id: "3", name: "Start the first chapter of Harry Potter online now - Starting Harry Potter", group: 2, val: 15 },
    { id: "4", name: "A Review of Artificial Intelligence (AI) in Education from 2010 to 2020 - Zhai - 2021 - Complexity - Wiley Online Library", group: 1, val: 18 },
    { id: "5", name: "Zenobia - Wikipedia", group: 2, val: 12 },
    { id: "6", name: "Breaking the Family Silence on Alcoholism - Longreads", group: 3, val: 14 },
    { id: "7", name: "Phantom Pains (pinned) - The Georgia Review", group: 3, val: 12 },
    { id: "8", name: "View of Role of AI in Education", group: 1, val: 16 },
    { id: "9", name: "Artificial Intelligence-assisted academic writing: recommendations for ethical use - PubMed", group: 1, val: 17 },
    { id: "10", name: "[2310.17143] Techniques for evaluating generative AI", group: 1, val: 19 },
    { id: "11", name: "ResearchGate - Wikipedia", group: 4, val: 13 },
  ],
  links: [
    { source: "1", target: "2" },
    { source: "1", target: "4" },
    { source: "1", target: "8" },
    { source: "2", target: "4" },
    { source: "4", target: "8" },
    { source: "4", target: "9" },
    { source: "9", target: "10" },
    { source: "2", target: "10" },
    { source: "3", target: "5" },
    { source: "6", target: "7" },
    { source: "1", target: "11" },
    { source: "9", target: "11" },
    { source: "1", target: "3" }, // Cross-domain weak links
    { source: "6", target: "1" },
  ]
};

// --- Helper functions ---
const truncateText = (text: string, maxLen: number) => {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "...";
};

// Map group to color
const getGroupColor = (group: number, isDark: boolean) => {
  const colors = [
    isDark ? "#3B82F6" : "#2563EB", // Blue
    isDark ? "#10B981" : "#059669", // Green
    isDark ? "#F59E0B" : "#D97706", // Orange
    isDark ? "#8B5CF6" : "#6D28D9", // Purple
    isDark ? "#EF4444" : "#DC2626", // Red
  ];
  return colors[(group - 1) % colors.length];
};

export const KnowledgeGraph: React.FC = () => {
  const fgRef = useRef<ForceGraphMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const isDark = theme === "dark";
  
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoverNode, setHoverNode] = useState<GraphNode | null>(null);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Configure physics forces on mount
  useEffect(() => {
    const fg = fgRef.current;
    if (fg) {
      // De-cluster: increase charge to push nodes further apart
      fg.d3Force("charge")?.strength(-300);
      
      // Increase link distance
      fg.d3Force("link")?.distance(120);

      // Add a custom collision force based on node size
      fg.d3Force("collide", d3.forceCollide().radius((d: any) => d.val + 10));
    }
  }, []);

  // Handle zooming to fit on data load
  const handleEngineStop = useCallback(() => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(400, 50);
    }
  }, []);

  return (
    <div className="h-full w-full flex flex-col p-6 animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="text-[#007AFF]">❖</span> Knowledge Graph
          </h1>
          <p className="text-sm text-gray-500 mt-1 uppercase tracking-wider">
            Mapping your research clusters
          </p>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="flex-1 theme-surface rounded-2xl shadow-sm border overflow-hidden relative"
      >
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={MOCK_DATA}
          nodeRelSize={6}
          onEngineStop={handleEngineStop}
          
          // Hover interactions
          onNodeHover={(node) => {
            setHoverNode((node as GraphNode) || null);
            // Optionally change cursor
            if (containerRef.current) {
               containerRef.current.style.cursor = node ? "pointer" : "default";
            }
          }}
          
          // Physics/Visuals
          backgroundColor={isDark ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)"}
          linkColor={() => isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)"}
          linkWidth={1.5}
          
          // Custom Node Rendering
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            const size = node.val || 8;
            const color = getGroupColor(node.group, isDark);
            
            // Draw Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
            
            // Hover effect (halo)
            if (node === hoverNode) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI, false);
              ctx.fillStyle = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)";
              ctx.fill();
            }

            // LOD: Only draw text if zoomed in enough (scale > 1.2)
            if (globalScale > 1.2) {
              const fontSize = Math.max(10 / globalScale, 4);
              ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
              
              // Truncate to avoid clustering
              const truncatedLabel = truncateText(label, 25);
              
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              
              // Text outline for readability
              ctx.lineWidth = 2 / globalScale;
              ctx.strokeStyle = isDark ? "#111827" : "#FFFFFF";
              ctx.strokeText(truncatedLabel, node.x, node.y + size + 2);
              
              // Text fill
              ctx.fillStyle = isDark ? "#E5E7EB" : "#374151";
              ctx.fillText(truncatedLabel, node.x, node.y + size + 2);
            }
          }}
        />
        
        {/* Hover Tooltip Overlay */}
        <AnimatePresence>
          {hoverNode && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-sm w-full pointer-events-none"
            >
              <div className="theme-panel-elevated p-4 rounded-xl shadow-2xl border flex items-start gap-3 backdrop-blur-xl backdrop-saturate-150">
                <div 
                  className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: getGroupColor(hoverNode.group, isDark) }}
                />
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                    {hoverNode.name}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1">
                    Cluster Group {hoverNode.group} • Connections: {MOCK_DATA.links.filter(l => l.source === hoverNode.id || l.target === hoverNode.id || (l.source as any).id === hoverNode.id || (l.target as any).id === hoverNode.id).length}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Controls Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <button 
            onClick={() => fgRef.current?.zoomToFit(400, 50)}
            className="theme-icon-button p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur border shadow-sm hover:scale-105 transition-all"
            title="Fit to Screen"
          >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h6M20 10V4h-6M10 20H4v-6M14 4h6v6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
