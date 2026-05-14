"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, Clock, Database } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

interface IngestionStatus {
  status: string;
  message: string;
  progress: number;
}

export default function IngestionProgress({ repoUrl }: { repoUrl: string }) {
  const [status, setStatus] = useState<IngestionStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repoUrl) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await api.get("/ingestion-status", { params: { repo_url: repoUrl } });
        if (cancelled) return;
        setStatus(res.data);
        setError("");
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Status check failed");
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [repoUrl]);

  if (!status) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Clock className="w-4 h-4" />
        Checking ingestion status...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-sm text-red-500">
        <XCircle className="w-4 h-4" />
        {error}
      </div>
    );
  }

  const isComplete = status.status === "complete";
  const isError = status.status === "error";
  const isUnknown = status.status === "unknown";

  if (isUnknown) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-500">
        <Database className="w-4 h-4" />
        No ingestion data yet. Trigger ingestion from the Ingest page.
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : isError ? (
            <XCircle className="w-5 h-5 text-red-500" />
          ) : (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          )}
          <span
            className={cn(
              "font-semibold text-sm",
              isComplete && "text-emerald-700 dark:text-emerald-400",
              isError && "text-red-700 dark:text-red-400",
              !isComplete && !isError && "text-blue-700 dark:text-blue-400"
            )}
          >
            {status.status.toUpperCase()}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {status.progress >= 0 ? `${status.progress}%` : "—"}
        </span>
      </div>

      {status.progress >= 0 && !isComplete && !isError && (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${status.progress}%` }}
          />
        </div>
      )}

      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{status.message}</p>
    </div>
  );
}
