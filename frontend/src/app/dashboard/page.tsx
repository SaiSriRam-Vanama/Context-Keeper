"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard, MessageSquare, Clock, Users,
  Database, LogOut, ChevronLeft, BookOpen, FolderTree, Activity
} from "lucide-react";

import ChatInterface from "@/components/ChatInterface";
import ArchitectureDiagram from "@/components/ArchitectureDiagram";
import TimelineVisualizer from "@/components/TimelineVisualizer";
import CodeNavigator from "@/components/CodeNavigator";
import SmartOnboarding from "@/components/SmartOnboarding";
import ContributorMap from "@/components/ContributorMap";
import IngestionProgress from "@/components/IngestionProgress";
import ErrorBoundary from "@/components/ErrorBoundary";

function DashboardContent() {
  const searchParams = useSearchParams();
  const repoUrl = searchParams.get("repo") || "";
  const repoName = repoUrl ? repoUrl.split("github.com/")[1] || repoUrl : "No repository selected";

  const [activeTab, setActiveTab] = useState<"chat" | "architecture" | "timeline" | "contributors" | "navigator" | "onboarding">("chat");

  const tabs = [
    { id: "chat", icon: MessageSquare, label: "AI Explainer" },
    { id: "architecture", icon: Database, label: "Architecture Map" },
    { id: "timeline", icon: Clock, label: "Decision Timeline" },
    { id: "navigator", icon: FolderTree, label: "Code Navigator" },
    { id: "contributors", icon: Users, label: "Contributors Map" },
    { id: "onboarding", icon: BookOpen, label: "Smart Onboarding" },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <aside className="w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/50">
          <Link
            href="/ingest"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors mb-4"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-600 dark:text-blue-500" />
            <h2 className="text-lg text-slate-900 dark:text-white truncate">Context Dashboard</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg truncate border border-slate-200 dark:border-slate-600/50" title={repoUrl}>
            {repoName}
          </p>
        </div>

        <div className="px-4 pt-4">
          {repoUrl && <IngestionProgress repoUrl={repoUrl} />}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${
                  isActive
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50"
                    : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? "text-blue-600 dark:text-blue-400" : "opacity-70"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 mt-auto bg-slate-50 dark:bg-slate-800/50">
          <Link href="/ingest" className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 font-medium">
            <Activity className="w-4 h-4" /> New Repository
          </Link>
          <Link href="/" className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium mt-1">
            <LogOut className="w-4 h-4" /> Home
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-slate-900">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
              {tabs.find((t) => t.id === activeTab)?.label || activeTab}
            </h1>
            <p className="text-slate-500 mt-1">
              Data insights for <span className="font-semibold">{repoName}</span>
            </p>
          </div>
        </header>

        <div className="w-full max-w-5xl mx-auto min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          <ErrorBoundary>
            {activeTab === "chat" && <ChatInterface repoUrl={repoUrl} />}
            {activeTab === "architecture" && <ArchitectureDiagram repoUrl={repoUrl} />}
            {activeTab === "timeline" && <TimelineVisualizer repoUrl={repoUrl} />}
            {activeTab === "navigator" && <CodeNavigator repoUrl={repoUrl} />}
            {activeTab === "onboarding" && <SmartOnboarding repoUrl={repoUrl} />}
            {activeTab === "contributors" && <ContributorMap repoUrl={repoUrl} />}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
