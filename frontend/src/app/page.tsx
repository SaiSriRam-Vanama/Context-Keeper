import Link from "next/link";
import { Bot, GitBranch, Terminal, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex flex-col items-center">
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
            Context Keeper
          </h1>
        </div>
        <nav>
          <Link 
            href="/ingest" 
            className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-20 flex flex-col items-center justify-center text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-medium text-sm mb-8 border border-blue-200 dark:border-blue-800/50">
          Supercharge your codebase understanding
        </div>
        
        <h2 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8 leading-tight max-w-4xl">
          Instantly understand any <span className="text-blue-600 dark:text-blue-500">GitHub Repository</span>
        </h2>
        
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-3xl leading-relaxed">
          The ultimate AI-powered context engine. Paste a repo link and get architectural diagrams, historical timelines, and conversational insights backed by the code itself.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/ingest"
            className="px-8 py-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
          >
            Connect a Repository
          </Link>
          <a
            href="#features"
            className="px-8 py-4 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold text-lg transition-all shadow-md border border-slate-200 dark:border-slate-700"
          >
            See how it works
          </a>
        </div>

        <div id="features" className="grid container mx-auto grid-cols-1 md:grid-cols-3 gap-8 mt-32 w-full text-left">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-xl flex items-center justify-center mb-6">
              <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">RAG-Powered AI Chat</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Ask deep technical questions about architectural decisions, legacy code, or file dependencies and get accurate answers cited directly from source files.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center mb-6">
              <GitBranch className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Architecture Visualizer</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Stop reverse-engineering project structures. Automatically generate beautiful, interactive dependency maps of the entire codebase.
            </p>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center mb-6">
              <Terminal className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">Decision Timelines</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Visualize velocity and historical changes over time. Track PRs, issues, and commit frequency in an easy-to-read interactive chart.
            </p>
          </div>
        </div>
      </main>
      
      <footer className="w-full p-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center text-slate-500 text-sm">
        <p>© 2026 Context Keeper AI. Built for the modern developer workspace.</p>
      </footer>
    </div>
  );
}
