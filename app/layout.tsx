import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI英会話 | AI English Conversation",
  description: "AIと英会話の練習ができるアプリです",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white">
        {children}
      </body>
    </html>
  );
}
