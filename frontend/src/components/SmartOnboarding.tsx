"use client";

import { useState, useEffect } from "react";
import { BookOpen, CheckCircle2, ArrowRight } from "lucide-react";
import api, { withRetry } from "@/lib/api";

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  file: string;
}

export default function SmartOnboarding({ repoUrl }: { repoUrl: string }) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!repoUrl) return;
    withRetry(() => api.get(`/onboarding?repo_url=${encodeURIComponent(repoUrl)}`))
      .then(res => { setSteps(res.data.steps || []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [repoUrl]);

  const toggleStep = (id: number) => {
    const next = new Set(completedSteps);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCompletedSteps(next);
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Generating guided curriculum...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const progress = steps.length > 0 ? Math.round((completedSteps.size / steps.length) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 max-w-3xl mx-auto h-[750px] overflow-y-auto">
      <div className="text-center mb-8">
        <BookOpen className="w-12 h-12 text-blue-600 dark:text-blue-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Smart Onboarding</h2>
        <p className="text-slate-500 mt-2">An AI-generated step-by-step curriculum to help you understand this specific codebase quickly.</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between text-sm mb-2 text-slate-600 dark:text-slate-400 font-medium">
          <span>Overall Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5">
          <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          return (
            <div key={step.id} className={`p-6 rounded-xl border transition-all ${
              isCompleted ? "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 opacity-70" : "bg-white border-blue-100 dark:bg-slate-800 dark:border-blue-900 shadow-sm"
            }`}>
              <div className="flex items-start gap-4">
                <button onClick={() => toggleStep(step.id)}
                  className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                    isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 dark:border-slate-600 text-transparent hover:border-emerald-500"
                  }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <h3 className={`text-lg font-semibold ${isCompleted ? "text-slate-500 dark:text-slate-400 line-through" : "text-slate-900 dark:text-white"}`}>
                    Step {index + 1}: {step.title}
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">{step.description}</p>
                  <div className="mt-4 inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800/50">
                    <span className="font-mono">{step.file}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {progress === 100 && (
        <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-center animate-in fade-in zoom-in duration-500">
          <h3 className="text-emerald-800 dark:text-emerald-400 font-bold text-lg">Great job!</h3>
          <p className="text-emerald-600 dark:text-emerald-500 mt-1">{`You've completed the onboarding curriculum. You're ready to start contributing!`}</p>
        </div>
      )}
    </div>
  );
}
