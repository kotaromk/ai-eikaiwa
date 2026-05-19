"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleSelect = (scenario: "daily" | "business") => {
    router.push(`/chat?scenario=${scenario}`);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center space-y-10">
        {/* Header */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 rounded-full px-4 py-1.5 text-blue-300 text-sm font-medium">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            AI Powered
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            AI英会話
            <span className="block text-2xl sm:text-3xl font-normal text-slate-400 mt-1">
              English Conversation Practice
            </span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-md mx-auto">
            AIと自由に英会話を練習しましょう。<br />
            シナリオを選んでスタートしてください。
          </p>
        </div>

        {/* Scenario Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            onClick={() => handleSelect("daily")}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-400/50 rounded-2xl p-7 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10"
          >
            <div className="text-4xl mb-4">☀️</div>
            <h2 className="text-xl font-bold mb-1">日常会話</h2>
            <p className="text-blue-300 font-medium text-sm mb-3">Daily Life</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              買い物・旅行・趣味など、日常のシーンで使える自然な英語を練習しましょう。
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-blue-400 text-sm font-medium">
              Start
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => handleSelect("business")}
            className="group relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-400/50 rounded-2xl p-7 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/10"
          >
            <div className="text-4xl mb-4">💼</div>
            <h2 className="text-xl font-bold mb-1">ビジネス英語</h2>
            <p className="text-emerald-300 font-medium text-sm mb-3">Business English</p>
            <p className="text-slate-400 text-sm leading-relaxed">
              会議・メール・プレゼンなど、職場で使えるプロフェッショナルな英語を練習しましょう。
            </p>
            <div className="mt-5 flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
              Start
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        <p className="text-slate-600 text-xs">
          Powered by Claude claude-sonnet-4-20250514 · Built with Next.js &amp; Tailwind CSS
        </p>
      </div>
    </main>
  );
}
