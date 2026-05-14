"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import api, { withRetry } from "@/lib/api";

interface TimelineEvent {
  date: string;
  commits: number;
  issues: number;
  prs: number;
}

export default function TimelineVisualizer({ repoUrl }: { repoUrl: string }) {
  const [data, setData] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoUrl) return;
    const fetchTimeline = async () => {
      try {
        const response = await withRetry(() =>
          api.get(`/timeline?repo_url=${encodeURIComponent(repoUrl)}`)
        );
        setData(response.data.timeline_events || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load timeline");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [repoUrl]);

  if (loading) {
    return <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 min-h-[400px]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>;
  }

  if (error) {
    return <div className="flex items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800 min-h-[400px]">
      <p className="text-red-600 dark:text-red-400">{error}</p>
    </div>;
  }

  if (data.length === 0) {
    return <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 min-h-[400px]">
      <p className="text-gray-500">No timeline data available for this repository.</p>
    </div>;
  }

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 w-full min-h-[400px]">
      <h3 className="text-lg font-semibold mb-6 text-gray-800 dark:text-gray-100">Project Activity Timeline</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
          <Legend />
          <Line type="monotone" dataKey="commits" name="Commits" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="issues" name="Issues" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          <Line type="monotone" dataKey="prs" name="Pull Requests" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
