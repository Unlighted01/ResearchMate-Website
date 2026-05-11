// ============================================
// KnowledgeGraphPage.tsx - Visual Research Map (3D)
// ============================================

import React, { useState, useEffect, useMemo, useRef } from "react";
// @ts-ignore
import ForceGraph3D from "react-force-graph-3d";
import * as THREE from "three";
// @ts-ignore
import SpriteText from "three-spritetext";
import { getAllItems, StorageItem } from "../../../services/storageService";
import { Search, Info, Filter, ZoomIn, ZoomOut, Maximize2, X, FileText, Tag, Calendar, Network, Link as LinkIcon } from "lucide-react";
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
  extractedKeywords: string[];
  x?: number;
  y?: number;
  z?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  commonTags: string[];
  commonKeywords: string[];
  isSourceLink: boolean;
  linkType: "tag" | "source" | "topic";
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// ============================================
// PART 2: NLP ENGINE
// ============================================

const STOP_WORDS = new Set([
  "the", "and", "that", "this", "with", "from", "for", "are", "was", "will", "have", "you", 
  "not", "your", "can", "has", "how", "but", "what", "all", "were", "they", "there", "their", 
  "when", "about", "which", "would", "like", "one", "more", "some", "out", "into", "just", 
  "also", "could", "than", "over", "only", "most", "been", "much", "very", "such", "through", 
  "before", "after", "these", "those"
]);

function extractKeywords(text: string): string[] {
  if (!text) return [];
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const counts: Record<string, number> = {};
  words.forEach(w => {
    if (!STOP_WORDS.has(w)) counts[w] = (counts[w] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(e => e[0]);
}

// ============================================
// PART 3: COMPONENT
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
  const [showTopicLinks, setShowTopicLinks] = useState(true);
  
  const fgRef = useRef<any>();
  const isDark = document.documentElement.classList.contains("dark");

  // ---------- DATA LOADING ----------

  useEffect(() => {
    const load = async () => {
      try {
        const allItems = await getAllItems(1000); 
        setItems(allItems);
      } catch (err) {
        console.error("Failed to load items for graph:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---------- PHYSICS & GALAXY THEME ----------
  useEffect(() => {
    if (fgRef.current && !loading) {
      fgRef.current.d3Force("charge").strength(-150);
      fgRef.current.d3Force("link").distance(80);
      
      // Camera and Controls tuning
      if (fgRef.current.controls) {
        const controls = fgRef.current.controls();
        if (controls) {
          controls.zoomSpeed = 0.5; // less sensitive zoom
          controls.rotateSpeed = 0.4; // less sensitive rotation
          controls.panSpeed = 0.5;
        }
      }

      // Galaxy Starfield Background
      const scene = fgRef.current.scene();
      
      // Remove old stars if re-running
      const oldStars = scene.getObjectByName('galaxyStars');
      if (oldStars) scene.remove(oldStars);

      const starGeo = new THREE.BufferGeometry();
      const starCount = 3000;
      const posArray = new Float32Array(starCount * 3);
      const colorArray = new Float32Array(starCount * 3);
      
      for(let i = 0; i < starCount * 3; i+=3) {
        // Spread stars in a large sphere
        posArray[i] = (Math.random() - 0.5) * 3000;
        posArray[i+1] = (Math.random() - 0.5) * 3000;
        posArray[i+2] = (Math.random() - 0.5) * 3000;
        
        // Slight color variations for stars (white to pale blue/purple)
        colorArray[i] = 0.8 + Math.random() * 0.2; // R
        colorArray[i+1] = 0.8 + Math.random() * 0.2; // G
        colorArray[i+2] = 0.9 + Math.random() * 0.1; // B
      }
      
      starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      starGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
      
      const starMat = new THREE.PointsMaterial({ 
        size: 2, 
        vertexColors: true,
        transparent: true, 
        opacity: 0.6,
        sizeAttenuation: true
      });
      const starMesh = new THREE.Points(starGeo, starMat);
      starMesh.name = 'galaxyStars';
      scene.add(starMesh);
    }
  }, [loading]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in the search box
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key.toLowerCase() === 'r') {
        fgRef.current?.zoomToFit(400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ---------- GRAPH CALCULATION ----------

  const itemsWithKeywords = useMemo(() => {
    return items.map((item) => ({
      ...item,
      extractedKeywords: extractKeywords(`${item.sourceTitle || ""} ${item.aiSummary || ""} ${item.text}`)
    }));
  }, [items]);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = itemsWithKeywords.map((item) => ({
      id: item.id,
      name: item.sourceTitle || item.text.substring(0, 30) + "...",
      val: 3 + (item.tags?.length || 0) * 1.5, // Size by tag count
      color: item.color ? getHexColor(item.color) : "#007AFF",
      item: item,
      extractedKeywords: item.extractedKeywords
    }));

    const links: GraphLink[] = [];
    
    for (let i = 0; i < itemsWithKeywords.length; i++) {
      for (let j = i + 1; j < itemsWithKeywords.length; j++) {
        const itemA = itemsWithKeywords[i];
        const itemB = itemsWithKeywords[j];

        const tagsA = itemA.tags || [];
        const tagsB = itemB.tags || [];
        const commonTags = tagsA.filter((t) => tagsB.includes(t));

        const isSourceLink = !!(itemA.sourceUrl && itemA.sourceUrl === itemB.sourceUrl);
        const commonKeywords = itemA.extractedKeywords.filter(k => itemB.extractedKeywords.includes(k));

        if (commonTags.length > 0 || isSourceLink || commonKeywords.length >= 2) {
          let linkType: "tag" | "source" | "topic" = "topic";
          if (commonTags.length > 0) linkType = "tag";
          else if (isSourceLink) linkType = "source";

          links.push({
            source: itemA.id,
            target: itemB.id,
            commonTags,
            commonKeywords,
            isSourceLink,
            linkType
          });
        }
      }
    }

    return { nodes, links };
  }, [itemsWithKeywords]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  // ---------- UTILS & FILTERING ----------

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
        if (!showTopicLinks && l.linkType === "topic") return false;
        const sid = typeof l.source === 'object' ? (l.source as any).id : l.source;
        const tid = typeof l.target === 'object' ? (l.target as any).id : l.target;
        return nodeIds.has(sid) && nodeIds.has(tid);
      }
    );
    return { nodes: filteredNodes, links: filteredLinks };
  }, [graphData, searchQuery, selectedTags, showTopicLinks]);

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

  // ---------- RENDER ----------

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#007AFF]"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-[#0b081a] dark:bg-[#030008] rounded-3xl border border-indigo-900/30 shadow-2xl">
      
      {/* 3D Scene Lighting via ForceGraph3D internal scene config, but defaults are fine */}
      
      {/* Header / Controls */}
      <div className="absolute top-6 left-6 right-6 z-10 flex items-start justify-between pointer-events-none">
        <div className="flex flex-col gap-4 pointer-events-auto">
          <div className="glass-card p-4 rounded-2xl flex flex-col gap-1 w-64 shadow-2xl border-white/10 bg-black/40 backdrop-blur-md">
            <h1 className="text-lg font-bold flex items-center gap-2 text-white">
              <WaypointsIcon className="w-5 h-5 text-indigo-400" />
              Galaxy Map
            </h1>
            <p className="text-[10px] text-indigo-200/70 font-medium uppercase tracking-widest">
              Immersive Research Clusters
            </p>
          </div>

          <div className="flex gap-2">
            <div className="glass-card p-2 rounded-xl flex items-center gap-2 w-64 shadow-lg border-white/10 bg-black/40 backdrop-blur-md">
              <Search className="w-4 h-4 text-indigo-300 ml-2" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search constellations..."
                className="bg-transparent border-none text-sm focus:ring-0 w-full placeholder:text-indigo-400/50 text-white"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}>
                  <X className="w-3.5 h-3.5 text-gray-400 mr-2" />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowTopicLinks(!showTopicLinks)}
              className={`glass-card p-2 px-3 rounded-xl flex items-center gap-2 shadow-sm border-white/50 text-sm font-bold transition-colors ${showTopicLinks ? 'bg-sky-500 text-white border-sky-500 shadow-sky-500/20 shadow-md' : 'bg-white/60 dark:bg-black/60 text-gray-600 dark:text-gray-300 hover:bg-white/90 dark:hover:bg-white/10 backdrop-blur-md'}`}
              title="Toggle Auto-Topic Links"
            >
              <Network className="w-4 h-4" />
              <span>Topics</span>
            </button>

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
          </div>
        </div>
      </div>

      {/* Graph Area */}
      <div className="flex-1 w-full h-full relative group cursor-crosshair">
        <ForceGraph3D
          ref={fgRef}
          graphData={filteredData}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={(d: any) => d.linkType === 'tag' ? 0.005 : 0.002}
          linkWidth={(link: any) => highlightLinks.has(link) ? 1.5 : 0.3}
          linkColor={(link: any) => {
            if (hoverNode && !highlightLinks.has(link)) return 'rgba(255,255,255,0.01)';
            if (highlightLinks.has(link)) {
              if (link.linkType === 'tag') return '#c084fc'; // Bright purple
              if (link.linkType === 'source') return '#fbbf24'; // Bright amber
              return '#38bdf8'; // Bright Sky Blue
            }
            return "rgba(255,255,255,0.05)"; // Constellation lines
          }}
          linkDirectionalParticleWidth={(link: any) => highlightLinks.has(link) ? 3 : 1}
          onNodeHover={(node: any) => setHoverNode(node)}
          onNodeClick={(node: any) => setSelectedNode(node)}
          onLinkHover={(link: any) => setHoverLink(link)}
          nodeThreeObject={(node: any) => {
            const group = new THREE.Group();

            const isHovered = node === hoverNode;
            const isHighlighted = highlightNodes.has(node.id);
            const dimNode = hoverNode && !isHighlighted;
            
            // Sphere
            const geometry = new THREE.SphereGeometry(node.val, 16, 16);
            const material = new THREE.MeshStandardMaterial({
              color: node.color,
              transparent: true,
              opacity: dimNode ? 0.05 : 0.9,
              emissive: node.color,
              emissiveIntensity: isHovered || node === selectedNode ? 2.0 : 0.5,
              roughness: 0.2,
              metalness: 0.8
            });
            const sphere = new THREE.Mesh(geometry, material);
            
            // Add point light to highlighted nodes (stars)
            if (isHovered || node === selectedNode) {
               const light = new THREE.PointLight(node.color, 1.5, 100);
               group.add(light);
            }
            
            group.add(sphere);

            // Sprite Label
            if (!dimNode && (isHovered || isHighlighted || node.val > 6)) {
              const label = node.name;
              const displayLabel = isHovered ? label : (label.length > 25 ? label.substring(0, 25) + "..." : label);
              const sprite = new SpriteText(displayLabel);
              sprite.color = "#ffffff";
              sprite.textHeight = 4;
              sprite.backgroundColor = "rgba(10, 5, 20, 0.85)";
              sprite.borderColor = node.color;
              sprite.borderWidth = 0.5;
              sprite.borderRadius = 4;
              sprite.padding = [4, 2];
              sprite.position.y = node.val + 6;
              group.add(sprite);
            }

            return group;
          }}
        />
      </div>

      {/* Legend / Stats */}
      <div className="absolute bottom-6 left-6 z-10 glass-card p-4 rounded-2xl flex flex-col gap-3 shadow-lg border border-white/20 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <div className="flex items-center gap-4 text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
           <span>{filteredData.nodes.length} Items</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {filteredData.links.filter((l: any) => l.linkType === 'tag').length} Tag Links
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {filteredData.links.filter((l: any) => l.linkType === 'topic').length} Topic Links
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {filteredData.links.filter((l: any) => l.linkType === 'source').length} Source Links
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

                {selectedNode.extractedKeywords && selectedNode.extractedKeywords.length > 0 && (
                  <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-3 text-gray-500 dark:text-gray-400">
                      <Network className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">Top Keywords</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedNode.extractedKeywords.map(k => (
                        <span key={k} className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 text-[10px] font-medium rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

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
      
      {/* Link Hover Detail Popup */}
      <AnimatePresence>
        {hoverLink && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 glass-card p-3 rounded-2xl shadow-xl border border-white/20 bg-white/90 dark:bg-black/90 backdrop-blur-xl flex flex-col items-center pointer-events-none"
          >
            <div className="flex items-center gap-2 mb-1">
              <LinkIcon className={`w-4 h-4 ${hoverLink.linkType === 'tag' ? 'text-purple-500' : hoverLink.linkType === 'source' ? 'text-amber-500' : 'text-sky-500'}`} />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-800 dark:text-gray-200">
                {hoverLink.linkType} Connection
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1 justify-center max-w-[250px]">
              {hoverLink.linkType === 'tag' && hoverLink.commonTags.map(t => (
                <span key={t} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px] font-bold rounded">
                  {t}
                </span>
              ))}
              {hoverLink.linkType === 'topic' && hoverLink.commonKeywords.map(k => (
                <span key={k} className="px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 text-[10px] font-bold rounded">
                  {k}
                </span>
              ))}
              {hoverLink.linkType === 'source' && (
                <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold rounded text-center">
                  Clipped from the same Website
                </span>
              )}
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
