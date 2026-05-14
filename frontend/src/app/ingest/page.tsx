"use client";

import { useState, useCallback } from "react";
import { Github, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import ToastContainer from "@/components/ToastContainer";
import { useToast } from "@/lib/use-toast";
import IngestionProgress from "@/components/IngestionProgress";

export default function IngestPage() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ingestedUrl, setIngestedUrl] = useState("");
  const [error, setError] = useState("");
  const { toasts, addToast, removeToast } = useToast();
  const router = useRouter();

  const handleIngest = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    if (!url.includes("github.com")) {
      setError("Please enter a valid GitHub repository URL.");
      return;
    }

    setIsLoading(true);
    setError("");
    setIngestedUrl(url);

    try {
      await api.post("/ingest-repo", { repo_url: url });
      addToast("success", "Ingestion started!", "Processing in the background. You can track progress below.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate ingestion.");
      addToast("error", "Ingestion failed", err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  }, [url, addToast]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-start justify-center p-6 pt-20">
      <div className="max-w-lg w-full space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
          <div className="p-8">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
              <Github className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Connect Repository</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              Paste a public GitHub link to fetch the codebase and generate context.
            </p>

            <form onSubmit={handleIngest} className="space-y-6">
              <div>
                <label htmlFor="repoUrl" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  GitHub Repository URL
                </label>
                <input
                  id="repoUrl"
                  type="url"
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setError(""); }}
                  placeholder="https://github.com/user/repo"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="w-full flex items-center justify-center py-3.5 px-4 font-semibold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/30"
              >
                {isLoading ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting Ingestion...</>
                ) : (
                  <><Github className="w-5 h-5 mr-2" /> Build Context Base <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </button>
            </form>
          </div>
        </div>

        {ingestedUrl && <IngestionProgress repoUrl={ingestedUrl} />}

        {ingestedUrl && (
          <div className="text-center">
            <button
              onClick={() => router.push(`/dashboard?repo=${encodeURIComponent(ingestedUrl)}`)}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-lg"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4 inline ml-1" />
            </button>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
