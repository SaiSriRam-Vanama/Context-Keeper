"use client";

import { useState, useEffect } from "react";
import { Users, GitCommit, Code2, ChevronDown, ChevronUp, Star } from "lucide-react";
import api, { withRetry } from "@/lib/api";

interface Contributor {
  id: string;
  name: string;
  commits: number;
  expertise: string[];
}

const EXPERTISE_COLORS: Record<string, string> = {
  frontend: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  backend: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "config/devops": "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  default: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function getExpertiseClass(tag: string) {
  return EXPERTISE_COLORS[tag] ?? EXPERTISE_COLORS.default;
}

function ContributorCard({ contributor, rank, maxCommits }: { contributor: Contributor; rank: number; maxCommits: number }) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = Math.max(4, Math.round((contributor.commits / maxCommits) * 100));
  const medalColors = ["text-amber-400", "text-slate-400", "text-orange-500"];
  const medal = rank <= 3 ? medalColors[rank - 1] : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-all">
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center gap-4 p-4 text-left">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
          {contributor.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {medal && <Star className={`w-4 h-4 ${medal} fill-current flex-shrink-0`} />}
            <span className="font-semibold text-slate-900 dark:text-white truncate">{contributor.name}</span>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700" style={{ width: `${barWidth}%` }} />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 flex items-center gap-1">
              <GitCommit className="w-3 h-3" /> {contributor.commits}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 mb-2 font-medium uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" /> Expertise Areas
          </p>
          <div className="flex flex-wrap gap-2">
            {contributor.expertise.length > 0 ? (
              contributor.expertise.map((tag) => (
                <span key={tag} className={`text-xs px-2.5 py-1 rounded-full font-medium ${getExpertiseClass(tag)}`}>{tag}</span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No specific tags identified</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ContributorMap({ repoUrl }: { repoUrl: string }) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState<"commits" | "name">("commits");

  useEffect(() => {
    if (!repoUrl) return;
    withRetry(() => api.get(`/contributors?repo_url=${encodeURIComponent(repoUrl)}`))
      .then((res) => { setContributors(res.data.contributors || []); setLoading(false); })
      .catch((err) => { setError(err.message); setLoading(false); });
  }, [repoUrl]);

  if (loading) {
    return <div className="flex items-center justify-center h-[600px] text-slate-500">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p>Parsing commit history...</p>
      </div>
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-[600px] text-red-500 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-200 dark:border-red-800">
      <p>{error}</p>
    </div>;
  }

  const maxCommits = Math.max(...contributors.map((c) => c.commits), 1);
  const sorted = [...contributors].sort((a, b) => sortBy === "commits" ? b.commits - a.commits : a.name.localeCompare(b.name));
  const totalCommits = contributors.reduce((sum, c) => sum + c.commits, 0);
  const allTags = Array.from(new Set(contributors.flatMap((c) => c.expertise)));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm h-[750px] flex flex-col">
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800/70">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Contributor Knowledge Map</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{contributors.length} contributors · {totalCommits.toLocaleString()} commits</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500 dark:text-slate-400">Sort:</span>
            <button onClick={() => setSortBy("commits")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${sortBy === "commits" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-blue-400"}`}>By Commits</button>
            <button onClick={() => setSortBy("name")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${sortBy === "name" ? "bg-blue-600 text-white" : "bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-blue-400"}`}>By Name</button>
          </div>
        </div>
        {allTags.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Expertise tags:</span>
            {allTags.map((tag) => (
              <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${getExpertiseClass(tag)}`}>{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No contributor data found for this repository.</p>
          </div>
        ) : (
          sorted.map((c, idx) => <ContributorCard key={c.id} contributor={c} rank={idx + 1} maxCommits={maxCommits} />)
        )}
      </div>
    </div>
  );
}
