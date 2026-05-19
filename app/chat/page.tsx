"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type Role = "user" | "assistant";

interface Message {
  role: Role;
  content: string;
}

interface ParsedReply {
  response: string;
  feedback: string | null;
}

const STARTERS = {
  daily: [
    "Hi! What do you like to do on weekends?",
    "I'm planning a trip. Any travel tips?",
    "Can you recommend a good movie?",
    "What's your favorite food?",
  ],
  business: [
    "I'd like to schedule a meeting to discuss the project.",
    "Could you give me an update on the report?",
    "I'm preparing a presentation for next week.",
    "Let's review the agenda for today's call.",
  ],
};

const SCENARIO_LABELS = {
  daily: { label: "日常会話", sub: "Daily Life", color: "blue", emoji: "☀️" },
  business: { label: "ビジネス英語", sub: "Business", color: "emerald", emoji: "💼" },
};

function parseReply(text: string): ParsedReply {
  const separator = "---FEEDBACK---";
  const idx = text.indexOf(separator);
  if (idx === -1) {
    return { response: text.trim(), feedback: null };
  }
  return {
    response: text.slice(0, idx).trim(),
    feedback: text.slice(idx + separator.length).trim(),
  };
}

function FeedbackBlock({ feedback }: { feedback: string }) {
  const lines = feedback.split("\n").filter(Boolean);
  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-sm">
      {lines.map((line, i) => (
        <p key={i} className="text-slate-300 leading-relaxed">
          {line}
        </p>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-xs">
        AI
      </div>
      <div className="bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const scenario = (searchParams.get("scenario") ?? "daily") as "daily" | "business";
  const info = SCENARIO_LABELS[scenario] ?? SCENARIO_LABELS.daily;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const showStarters = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);

    const newUserMsg: Message = { role: "user", content: text.trim() };
    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          scenario,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to get response");
      }

      setMessages([...updatedMessages, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const accentColor = scenario === "business" ? "emerald" : "blue";
  const badgeClass =
    scenario === "business"
      ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
      : "bg-blue-500/20 border-blue-400/30 text-blue-300";
  const sendBtnClass =
    scenario === "business"
      ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900"
      : "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900";
  const starterBtnClass =
    scenario === "business"
      ? "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
      : "border-blue-400/30 text-blue-300 hover:bg-blue-500/10";

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
        <button
          onClick={() => router.push("/")}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xl">{info.emoji}</span>
          <div className="min-w-0">
            <div className="font-semibold text-sm leading-tight">{info.label}</div>
            <div className={`text-xs ${accentColor === "emerald" ? "text-emerald-400" : "text-blue-400"}`}>
              {info.sub}
            </div>
          </div>
        </div>
        <span className={`text-xs border rounded-full px-2.5 py-0.5 ${badgeClass}`}>
          AI Active
        </span>
        {messages.length > 0 && (
          <button
            onClick={() => { setMessages([]); setError(null); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
          >
            Reset
          </button>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="text-5xl mb-3">{info.emoji}</div>
            <p className="text-white font-medium">
              {scenario === "daily"
                ? "Hello! Let's practice everyday English!"
                : "Hello! Let's practice business English!"}
            </p>
            <p className="text-slate-400 text-sm">
              英語でメッセージを送ってみましょう
            </p>
          </div>
        )}

        {/* Starter buttons */}
        {showStarters && (
          <div className="space-y-2">
            <p className="text-xs text-slate-500 text-center">会話のスタート候補</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTERS[scenario].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={loading}
                  className={`text-left text-sm px-3.5 py-2.5 rounded-xl border bg-transparent transition-colors ${starterBtnClass}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => {
          const isUser = msg.role === "user";
          if (isUser) {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[80%] bg-blue-600 rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
            );
          }

          const { response, feedback } = parseReply(msg.content);
          return (
            <div key={i} className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">
                AI
              </div>
              <div className="max-w-[85%] bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
                <p>{response}</p>
                {feedback && <FeedbackBlock feedback={feedback} />}
              </div>
            </div>
          );
        })}

        {loading && <TypingIndicator />}

        {error && (
          <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 bg-slate-900/60 backdrop-blur-md px-4 py-3">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type in English... (Shift+Enter for new line)"
            rows={1}
            className="flex-1 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-slate-600 min-h-[42px]"
            disabled={loading}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className={`flex-shrink-0 w-10 h-10 rounded-xl transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${sendBtnClass}`}
            aria-label="Send"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1.5 text-center">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
