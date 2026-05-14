"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import api, { API_BASE } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Record<string, unknown>[];
}

export default function ChatInterface({ repoUrl }: { repoUrl?: string }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am Context Keeper. Ask me anything about your connected repository's architecture or history.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userQuery = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userQuery }]);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      abortControllerRef.current = new AbortController();

      // Try streaming endpoint first
      let streamed = false;
      try {
        const response = await fetch(`${API_BASE}/ask/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: userQuery, repo_url: repoUrl || null }),
          signal: abortControllerRef.current.signal,
        });

        if (response.ok) {
          streamed = true;
          const reader = response.body?.getReader();
          if (!reader) throw new Error("No response body");

          const decoder = new TextDecoder();
          let accumulated = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: accumulated };
              return updated;
            });
          }
        }
      } catch (streamErr: unknown) {
        // 404 or network error — fall back to non-streaming
        if (streamErr instanceof Error && streamErr.message === "AbortError") return;
      }

      if (!streamed) {
        // Fallback to non-streaming /ask endpoint
        const res = await api.post("/ask", { query: userQuery, repo_url: repoUrl || null });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: res.data.answer,
            sources: res.data.context_sources,
          };
          return updated;
        });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant" && lastMsg.content === "") {
          updated[updated.length - 1] = { role: "assistant", content: "Sorry, I encountered an error: " + errorMsg };
        } else {
          updated.push({ role: "assistant", content: "Sorry, I encountered an error: " + errorMsg });
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-gray-50 dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Bot className="w-6 h-6 text-blue-500" />
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Context Keeper AI</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.map((message, index) => (
          <div key={index} className={cn("flex w-full", message.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("flex flex-col gap-2 max-w-[80%]", message.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "p-4 rounded-2xl",
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm border border-gray-100 dark:border-gray-700"
                )}
              >
                <div className="flex items-center gap-2 mb-2 opacity-80 text-sm">
                  {message.role === "user" ? (
                    <><span>You</span><User className="w-4 h-4" /></>
                  ) : (
                    <><Bot className="w-4 h-4" /><span>Context Keeper</span></>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content || (isLoading && index === messages.length - 1 ? (
                    <span className="flex items-center gap-2 text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                    </span>
                  ) : null)}
                </p>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the architecture, decisions, or finding code..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 dark:bg-gray-900 border-none rounded-full focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-200 transition-all placeholder-gray-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
