"use client";

import { useState, useEffect } from "react";
import { Folder, FileText, ChevronRight, ChevronDown, Code2 } from "lucide-react";
import api from "@/lib/api";

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
}

export default function CodeNavigator({ repoUrl }: { repoUrl: string }) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoUrl) return;
    api.get(`/tree?repo_url=${encodeURIComponent(repoUrl)}`)
      .then(res => { setTree(res.data.tree || []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [repoUrl]);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) newExpanded.delete(path);
    else newExpanded.add(path);
    setExpandedFolders(newExpanded);
  };

  const selectFile = (path: string) => {
    setSelectedFile(path);
    setFileContent("Loading...");
    api.get(`/file?repo_url=${encodeURIComponent(repoUrl)}&file_path=${encodeURIComponent(path)}`)
      .then(res => setFileContent(res.data.content))
      .catch(err => setFileContent("Error loading file: " + (err.message || "Unknown error")));
  };

  const renderTree = (nodes: TreeNode[]) => {
    return (
      <ul className="pl-4 border-l border-slate-200 dark:border-slate-700 space-y-1">
        {nodes.map((node) => {
          const isExpanded = expandedFolders.has(node.path);
          if (node.type === "directory") {
            return (
              <li key={node.path} className="pt-1">
                <button onClick={() => toggleFolder(node.path)} className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-blue-600 w-full text-left">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">{node.name}</span>
                </button>
                {isExpanded && node.children && renderTree(node.children)}
              </li>
            );
          }
          return (
            <li key={node.path} className="pt-1 flex items-center gap-2">
              <button onClick={() => selectFile(node.path)}
                className={`flex items-center gap-2 text-sm w-full text-left px-2 py-1 rounded transition-colors ${
                  selectedFile === node.path
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <FileText className="w-4 h-4 text-slate-400" />
                <span className="truncate">{node.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    );
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading codebase...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="flex h-full bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ minHeight: "600px" }}>
      <div className="w-1/3 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Code2 className="w-4 h-4" /> Code Explorer
        </h3>
        <div className="-ml-4">{renderTree(tree)}</div>
      </div>
      <div className="w-2/3 flex flex-col bg-[#1e1e1e]">
        {selectedFile ? (
          <>
            <div className="px-4 py-2 bg-[#2d2d2d] border-b border-[#404040] text-sm text-slate-300 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              {selectedFile}
            </div>
            <pre className="p-4 overflow-auto text-sm font-mono text-slate-300 flex-1"><code>{fileContent}</code></pre>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 flex-col gap-4">
            <Code2 className="w-16 h-16 opacity-20" />
            <p>Select a file to view its contents</p>
          </div>
        )}
      </div>
    </div>
  );
}
