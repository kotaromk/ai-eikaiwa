"use client";

import { useState, useRef, useEffect, useCallback, Suspense } from "react";
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
  daily: { label: "日常会話", sub: "Daily Life", emoji: "☀️" },
  business: { label: "ビジネス英語", sub: "Business", emoji: "💼" },
};

function parseReply(text: string): ParsedReply {
  const separator = "---FEEDBACK---";
  const idx = text.indexOf(separator);
  if (idx === -1) return { response: text.trim(), feedback: null };
  return {
    response: text.slice(0, idx).trim(),
    feedback: text.slice(idx + separator.length).trim(),
  };
}

function FeedbackBlock({ feedback }: { feedback: string }) {
  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-sm">
      {feedback.split("\n").filter(Boolean).map((line, i) => (
        <p key={i} className="text-slate-300 leading-relaxed">{line}</p>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-xs font-bold">
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

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
  }
}

// 通話モード画面（トランシーバー方式）
type CallPhase = "your-turn" | "recording" | "thinking" | "ai-turn";

function CallScreen({
  phase,
  transcript,
  error,
  onStartRecording,
  onStopRecording,
  onSkipAI,
  onEnd,
  scenarioEmoji,
}: {
  phase: CallPhase;
  transcript: string;
  error: string | null;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSkipAI: () => void;
  onEnd: () => void;
  scenarioEmoji: string;
}) {
  const phaseInfo = {
    "your-turn": { label: "あなたの番", color: "text-blue-300", dot: "bg-blue-400" },
    "recording": { label: "録音中...", color: "text-green-300", dot: "bg-green-400" },
    "thinking":  { label: "AIが考えています...", color: "text-yellow-300", dot: "bg-yellow-400" },
    "ai-turn":   { label: "AIが話しています", color: "text-violet-300", dot: "bg-violet-400" },
  }[phase];

  return (
    <div className="fixed inset-0 bg-slate-950/97 backdrop-blur-md z-50 flex flex-col items-center justify-between py-12 px-6">
      {/* 上部：ステータス */}
      <div className="text-center space-y-1">
        <p className="text-slate-400 text-sm">AI英会話 通話中</p>
        <div className="flex items-center gap-2 justify-center">
          <span className={`w-2 h-2 rounded-full animate-pulse ${phaseInfo.dot}`} />
          <p className={`text-base font-semibold ${phaseInfo.color}`}>{phaseInfo.label}</p>
        </div>
      </div>

      {/* 中央：アバターとトランスクリプト */}
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        {/* AIアバター */}
        <div className="relative">
          <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-4xl shadow-2xl ${
            phase === "ai-turn" ? "animate-pulse" : ""
          }`}>
            {scenarioEmoji}
          </div>
          {phase === "ai-turn" && (
            <div className="absolute inset-0 rounded-full border-4 border-violet-400/40 animate-ping" />
          )}
        </div>

        {/* 音声波形（録音中） */}
        {phase === "recording" && (
          <div className="flex gap-1 items-center h-10">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 60}ms`, height: `${16 + Math.abs(Math.sin(i)) * 20}px` }}
              />
            ))}
          </div>
        )}

        {/* トランスクリプト表示 */}
        {transcript && (
          <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center">
            <p className="text-white/80 text-sm italic">"{transcript}"</p>
          </div>
        )}
      </div>

      {/* 下部：操作ボタン */}
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* メインボタン（話す／送信） */}
        {phase === "your-turn" && (
          <button
            onPointerDown={onStartRecording}
            className="w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all shadow-xl shadow-blue-500/30 flex flex-col items-center justify-center gap-1"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
            <span className="text-white text-xs font-medium">押して話す</span>
          </button>
        )}

        {phase === "recording" && (
          <button
            onPointerDown={onStopRecording}
            className="w-24 h-24 rounded-full bg-green-500 hover:bg-green-400 active:scale-95 transition-all animate-pulse shadow-xl shadow-green-500/30 flex flex-col items-center justify-center gap-1"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <span className="text-white text-xs font-medium">送信</span>
          </button>
        )}

        {phase === "thinking" && (
          <div className="w-24 h-24 rounded-full bg-slate-700 flex flex-col items-center justify-center gap-2">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
            <span className="text-slate-400 text-xs">処理中</span>
          </div>
        )}

        {phase === "ai-turn" && (
          <button
            onPointerDown={onSkipAI}
            className="w-24 h-24 rounded-full bg-violet-600 hover:bg-violet-500 active:scale-95 transition-all shadow-xl shadow-violet-500/30 flex flex-col items-center justify-center gap-1"
          >
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
            </svg>
            <span className="text-white text-xs font-medium">スキップ</span>
          </button>
        )}

        <p className="text-slate-500 text-xs text-center">
          {phase === "your-turn" && "ボタンを押して英語で話してください"}
          {phase === "recording" && "話し終わったらボタンを押して送信"}
          {phase === "thinking" && "AIが返答を生成しています..."}
          {phase === "ai-turn" && "AIが話しています（スキップして次へ進む）"}
        </p>

        {/* エラー表示 */}
        {error && (
          <div className="w-full bg-red-500/20 border border-red-500/40 rounded-xl px-4 py-2 text-center">
            <p className="text-red-300 text-xs">{error}</p>
          </div>
        )}

        {/* 終了ボタン */}
        <button
          onClick={onEnd}
          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center shadow-lg shadow-red-500/30"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
          </svg>
        </button>
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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);

  // 通話モード
  const [callMode, setCallMode] = useState(false);
  const [callPhase, setCallPhase] = useState<CallPhase>("your-turn");
  const [transcript, setTranscript] = useState("");
  const callPhaseRef = useRef<CallPhase>("your-turn");
  const setCallPhaseSafe = useCallback((p: CallPhase) => {
    callPhaseRef.current = p;
    setCallPhase(p);
  }, []);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const messagesRef = useRef<Message[]>([]);
  const callModeRef = useRef(false);
  const transcriptRef = useRef("");

  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSpeechSupported(supported);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 英語音声を取得
  const getEnglishVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang === "en-US" && !v.name.includes("Google")) ??
      voices.find((v) => v.lang === "en-US") ??
      voices.find((v) => v.lang.startsWith("en"))
    );
  }, []);

  // 音声読み上げ
  const speakText = useCallback((text: string, onFinish?: () => void) => {
    if (!window.speechSynthesis) { onFinish?.(); return; }
    window.speechSynthesis.cancel();

    const doSpeak = () => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "en-US";
      utter.rate = 0.9;
      const voice = getEnglishVoice();
      if (voice) utter.voice = voice;
      utter.onstart = () => setIsSpeaking(true);
      utter.onend = () => { setIsSpeaking(false); setSpeakingIndex(null); onFinish?.(); };
      utter.onerror = () => { setIsSpeaking(false); setSpeakingIndex(null); onFinish?.(); };
      window.speechSynthesis.speak(utter);
    };

    if (window.speechSynthesis.getVoices().length === 0) {
      window.speechSynthesis.addEventListener("voiceschanged", doSpeak, { once: true });
    } else {
      doSpeak();
    }
  }, [getEnglishVoice]);

  // メッセージ読み上げトグル
  const toggleSpeak = useCallback((text: string, index: number) => {
    if (speakingIndex === index && isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setSpeakingIndex(null);
      return;
    }
    setSpeakingIndex(index);
    speakText(text);
  }, [isSpeaking, speakingIndex, speakText]);

  // API送信
  const sendMessage = useCallback(async (text: string, currentMessages: Message[], isCallMode = false) => {
    const newUserMsg: Message = { role: "user", content: text.trim() };
    const updated = [...currentMessages, newUserMsg];
    setMessages(updated);
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated, scenario, callMode: isCallMode }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to get response");
      const aiMsg: Message = { role: "assistant", content: data.reply };
      setMessages([...updated, aiMsg]);
      return aiMsg;
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === "AbortError" ? "タイムアウト（15秒）。接続を確認してください。" : err.message)
        : "エラーが発生しました。";
      setError(msg);
      return null;
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [scenario]);

  // ---- 通話モード ----

  // 録音開始ボタン（continuous:true で1セッション維持）
  const handleStartRecording = useCallback(() => {
    if (!callModeRef.current) return;

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new API();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;

    // e.results は累積なので全件結合するだけ
    rec.onresult = (e: any) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript;
      }
      transcriptRef.current = text.trim();
      setTranscript(text.trim());
    };

    rec.onstart = () => {
      setCallPhaseSafe("recording");
    };

    rec.onerror = (e: any) => {
      const msgs: Record<string, string> = {
        "not-allowed":       "マイクの使用が許可されていません。ブラウザのアドレスバーのマイクアイコンから許可してください。",
        "service-not-allowed": "音声認識サービスが許可されていません。HTTPSまたはlocalhostが必要です。",
        "network":           "音声認識にネットワークエラーが発生しました。インターネット接続を確認してください。",
        "no-speech":         "音声が検出されませんでした。",
        "audio-capture":     "マイクが見つかりません。マイクが接続されているか確認してください。",
      };
      const msg = msgs[e.error] ?? `音声認識エラー: ${e.error}`;
      setError(msg);
      if (e.error !== "no-speech") setCallPhaseSafe("your-turn");
    };

    rec.onend = () => {
      // continuous:true なのに終了した場合（タイムアウト等）→ 再起動
      if (callModeRef.current && callPhaseRef.current === "recording") {
        try { rec.start(); } catch (_) {}
      }
    };

    recognitionRef.current = rec;
    transcriptRef.current = "";
    setTranscript("");
    setError(null);
    try {
      rec.start();
    } catch (e: any) {
      setError(`マイクを起動できませんでした: ${e?.message ?? e}`);
    }
  }, [setCallPhaseSafe]);

  // 送信ボタン
  const handleStopRecording = useCallback(async () => {
    setCallPhaseSafe("thinking");
    try { recognitionRef.current?.stop(); } catch (_) {}

    // 最後のonresultが届くまで少し待つ
    await new Promise(r => setTimeout(r, 400));

    const text = transcriptRef.current.trim();
    if (!text || !callModeRef.current) {
      setCallPhaseSafe("your-turn");
      return;
    }

    const aiMsg = await sendMessage(text, messagesRef.current, true);
    if (!callModeRef.current) return;
    if (!aiMsg) { setCallPhaseSafe("your-turn"); return; }

    const { response } = parseReply(aiMsg.content);
    setCallPhaseSafe("ai-turn");
    speakText(response, () => {
      if (callModeRef.current) setCallPhaseSafe("your-turn");
    });
  }, [setCallPhaseSafe, sendMessage, speakText]);

  // AIスキップ
  const handleSkipAI = useCallback(() => {
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    if (callModeRef.current) setCallPhaseSafe("your-turn");
  }, [setCallPhaseSafe]);

  // 通話開始
  const startCall = useCallback(() => {
    if (!speechSupported) return;
    callModeRef.current = true;
    setCallMode(true);
    setCallPhaseSafe("your-turn");
    setTranscript("");
  }, [speechSupported, setCallPhaseSafe]);

  // 通話終了
  const endCall = useCallback(() => {
    callModeRef.current = false;
    try { recognitionRef.current?.stop(); } catch (_) {}
    window.speechSynthesis?.cancel();
    setCallMode(false);
    setCallPhaseSafe("your-turn");
    setTranscript("");
    setIsSpeaking(false);
  }, [setCallPhaseSafe]);

  // ---- テキストモード ----
  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendMessage(text, messages);
  };

  const toggleManualListening = useCallback(() => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new API();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (e: any) => {
      setInput(Array.from(e.results as any[]).map((r: any) => r[0].transcript).join(""));
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, speechSupported]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const isEmerald = scenario === "business";
  const badgeClass = isEmerald
    ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
    : "bg-blue-500/20 border-blue-400/30 text-blue-300";
  const sendBtnClass = isEmerald
    ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-900"
    : "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900";
  const starterBtnClass = isEmerald
    ? "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
    : "border-blue-400/30 text-blue-300 hover:bg-blue-500/10";

  return (
    <>
      {callMode && (
        <CallScreen
          phase={callPhase}
          transcript={transcript}
          error={error}
          onStartRecording={handleStartRecording}
          onStopRecording={handleStopRecording}
          onSkipAI={handleSkipAI}
          onEnd={endCall}
          scenarioEmoji={info.emoji}
        />
      )}

      <div className="flex flex-col h-screen max-w-2xl mx-auto">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-slate-900/60 backdrop-blur-md sticky top-0 z-10">
          <button onClick={() => router.push("/")} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl">{info.emoji}</span>
            <div>
              <div className="font-semibold text-sm">{info.label}</div>
              <div className={`text-xs ${isEmerald ? "text-emerald-400" : "text-blue-400"}`}>{info.sub}</div>
            </div>
          </div>
          <span className={`text-xs border rounded-full px-2.5 py-0.5 ${badgeClass}`}>AI Active</span>
          {speechSupported && (
            <button onClick={startCall} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              通話
            </button>
          )}
          {messages.length > 0 && (
            <button onClick={() => { setMessages([]); setError(null); }} className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg hover:bg-white/5">
              Reset
            </button>
          )}
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
          {messages.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <div className="text-5xl mb-3">{info.emoji}</div>
              <p className="text-white font-medium">
                {scenario === "daily" ? "Hello! Let's practice everyday English!" : "Hello! Let's practice business English!"}
              </p>
              <p className="text-slate-400 text-sm">英語でメッセージを送ってみましょう</p>
              {speechSupported && (
                <button onClick={startCall} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-lg shadow-green-500/20 transition-colors">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
                  </svg>
                  通話モードで始める
                </button>
              )}
            </div>
          )}

          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 text-center">テキストで始める場合</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STARTERS[scenario].map((s) => (
                  <button key={s} onClick={() => send(s)} disabled={loading}
                    className={`text-left text-sm px-3.5 py-2.5 rounded-xl border bg-transparent transition-colors ${starterBtnClass}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => {
            if (msg.role === "user") {
              return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-600 rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }
            const { response, feedback } = parseReply(msg.content);
            const isThisSpeaking = speakingIndex === i && isSpeaking;
            return (
              <div key={i} className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5">AI</div>
                <div className="max-w-[85%] bg-white/8 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
                  <div className="flex items-start justify-between gap-2">
                    <p className="flex-1">{response}</p>
                    <button onClick={() => toggleSpeak(response, i)}
                      className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors mt-0.5 ${isThisSpeaking ? "bg-blue-500 text-white" : "bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white"}`}>
                      {isThisSpeaking ? (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
                      )}
                    </button>
                  </div>
                  {feedback && <FeedbackBlock feedback={feedback} />}
                </div>
              </div>
            );
          })}

          {loading && <TypingIndicator />}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              {error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-white/10 bg-slate-900/60 backdrop-blur-md px-4 py-3">
          <div className="flex gap-2 items-end">
            {speechSupported && (
              <button onClick={toggleManualListening}
                className={`flex-shrink-0 w-10 h-10 rounded-xl transition-all flex items-center justify-center ${isListening ? "bg-red-500 hover:bg-red-400 animate-pulse" : "bg-white/10 hover:bg-white/20"}`}>
                {isListening ? (
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
                  </svg>
                )}
              </button>
            )}
            <textarea ref={textareaRef} value={input} onChange={handleTextareaChange} onKeyDown={handleKeyDown}
              placeholder={isListening ? "🎤 聞いています..." : "Type in English..."}
              rows={1}
              className="flex-1 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors placeholder:text-slate-600 min-h-[42px]"
              disabled={loading} />
            <button onClick={() => send(input)} disabled={!input.trim() || loading}
              className={`flex-shrink-0 w-10 h-10 rounded-xl transition-colors flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${sendBtnClass}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m-7 7l7-7 7 7"/>
              </svg>
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1.5 text-center">
            🎤 マイクで音声入力 · 📞 通話ボタンで会話モード · Enter で送信
          </p>
        </div>
      </div>
    </>
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
