"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { Loader2, Layers, FileText } from "lucide-react";
import api, { withRetry } from "@/lib/api";

/* ── Custom Node Component ─────────────────────────────────────── */

interface ComponentNodeData {
  label: string;
  role: string;
  roleLabel: string;
  color: string;
  fileCount: number;
  keyFiles: string[];
}

function ComponentNode({ data }: { data: ComponentNodeData }) {
  return (
    <div
      className="rounded-2xl shadow-lg border-2 min-w-[200px] max-w-[260px] overflow-hidden transition-transform hover:scale-[1.02]"
      style={{ borderColor: data.color, background: "white" }}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-2.5 !h-2.5" />

      {/* Header */}
      <div
        className="px-4 py-2.5 flex items-center gap-2"
        style={{ background: `${data.color}15` }}
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: data.color }}
        />
        <span className="font-bold text-sm text-slate-800 truncate">
          {data.label}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span
            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              color: data.color,
              background: `${data.color}18`,
            }}
          >
            {data.roleLabel}
          </span>
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {data.fileCount}
          </span>
        </div>

        {/* Key files */}
        {data.keyFiles && data.keyFiles.length > 0 && (
          <div className="space-y-0.5">
            {data.keyFiles.map((f, i) => (
              <div
                key={i}
                className="text-[11px] text-slate-500 font-mono truncate pl-1 border-l-2"
                style={{ borderColor: `${data.color}40` }}
              >
                {f}
              </div>
            ))}
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-2.5 !h-2.5" />
    </div>
  );
}

/* ── Legend Component ───────────────────────────────────────────── */

const ROLE_LEGEND = [
  { role: "frontend", color: "#8b5cf6", label: "Frontend" },
  { role: "backend", color: "#3b82f6", label: "Backend" },
  { role: "database", color: "#f59e0b", label: "Database" },
  { role: "config", color: "#6b7280", label: "Config" },
  { role: "tests", color: "#10b981", label: "Tests" },
  { role: "docs", color: "#64748b", label: "Docs" },
  { role: "scripts", color: "#f97316", label: "Scripts" },
  { role: "module", color: "#06b6d4", label: "Module" },
];

function ArchLegend({ activeRoles }: { activeRoles: Set<string> }) {
  const visible = ROLE_LEGEND.filter((r) => activeRoles.has(r.role));
  if (visible.length === 0) return null;
  return (
    <div className="absolute top-4 right-4 z-10 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3 shadow-md">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        Legend
      </p>
      <div className="space-y-1.5">
        {visible.map((r) => (
          <div key={r.role} className="flex items-center gap-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: r.color }}
            />
            <span className="text-xs text-slate-600 dark:text-slate-300">
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────── */

export default function ArchitectureDiagram({
  repoUrl,
}: {
  repoUrl: string;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [activeRoles, setActiveRoles] = useState<Set<string>>(new Set());

  // Memoize types to satisfy React Flow stability requirements
  const nodeTypes = useMemo(() => ({ componentNode: ComponentNode }), []);
  const edgeTypes = useMemo(() => ({}), []);

  useEffect(() => {
    if (!repoUrl) return;
    const fetchArchitecture = async () => {
      try {
        const response = await withRetry(() =>
          api.get(`/architecture?repo_url=${encodeURIComponent(repoUrl)}`)
        );
        const rawData = response.data as {
          nodes: Array<{
            id: string;
            position: { x: number; y: number };
            data: ComponentNodeData;
          }>;
          edges: Array<{
            id: string;
            source: string;
            target: string;
            label?: string;
          }>;
          summary?: string;
        };

        // Collect active roles for legend
        const roles = new Set<string>();

        const styledNodes = (rawData.nodes || []).map((node) => {
          const color = node.data?.color || "#06b6d4";
          if (node.data?.role) roles.add(node.data.role);
          return {
            ...node,
            type: "componentNode",
            data: {
              ...node.data,
              color,
            },
          };
        });

        setActiveRoles(roles);

        const seenEdgeKeys = new Set<string>();
        const styledEdges = (rawData.edges || [])
          .filter((edge) => {
            const key = `${edge.source}-${edge.target}`;
            if (seenEdgeKeys.has(key)) return false;
            seenEdgeKeys.add(key);
            return true;
          })
          .map((edge) => ({
            ...edge,
            animated: true,
            type: "smoothstep",
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            labelStyle: {
              fill: "#64748b",
              fontWeight: 600,
              fontSize: 11,
              background: "rgba(255,255,255,0.8)",
            },
            labelBgStyle: {
              fill: "rgba(255,255,255,0.85)",
              rx: 4,
              ry: 4,
            },
            labelBgPadding: [6, 3] as [number, number],
          }));

        setNodes(styledNodes);
        setEdges(styledEdges);
        setSummary(rawData.summary || "");
      } catch (err: unknown) {
        setError(
          (err as { message?: string }).message || "Failed to load architecture"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchArchitecture();
  }, [repoUrl, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) =>
      setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 h-[700px]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-sm text-slate-500">
          Analyzing repository structure...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800 h-[700px]">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-800 dark:to-slate-800/70">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              System Architecture
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              High-level component map with dependency flows
            </p>
          </div>
        </div>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="px-5 py-3 bg-blue-50/70 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40">
          <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
            💡 {summary}
          </p>
        </div>
      )}

      {/* Diagram */}
      <div className="relative h-[600px] w-full">
        <ArchLegend activeRoles={activeRoles} />
        <ReactFlow
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          attributionPosition="bottom-right"
          minZoom={0.3}
          maxZoom={2}
        >
          <Controls className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm !rounded-xl" />
          <MiniMap
            nodeColor={(node) => {
              const color = (node.data as ComponentNodeData)?.color;
              return color || "#3b82f6";
            }}
            maskColor="rgba(0,0,0,0.08)"
            className="!rounded-xl !border-slate-200 dark:!border-slate-700"
          />
          <Background color="#e2e8f0" gap={20} size={1} />
        </ReactFlow>
      </div>
    </div>
  );
}
