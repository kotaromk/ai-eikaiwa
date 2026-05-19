# AI英会話アプリ

Claude AIを使った英会話練習Webアプリです。日常会話とビジネス英語の2つのシナリオで練習でき、毎回フィードバックが付きます。

## 機能

- **シナリオ選択**: 日常会話 / ビジネス英語
- **会話履歴**: コンテキストを維持した継続会話
- **フィードバック**: 良かった表現・より自然な言い方・関連フレーズ（日本語訳付き）
- **スターターボタン**: 最初の1往復のみ表示される会話例
- **モバイル対応**: レスポンシブデザイン

## セットアップ

### 1. リポジトリをクローン

```bash
git clone <your-repo-url>
cd ai-eikaiwa
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local.example` をコピーして `.env.local` を作成し、APIキーを設定します。

```bash
cp .env.local.example .env.local
```

`.env.local` を編集:

```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

APIキーは [Anthropic Console](https://console.anthropic.com/) から取得できます。

### 4. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

## Vercelへのデプロイ

### 方法1: Vercel CLIを使う

```bash
npm install -g vercel
vercel
```

### 方法2: GitHubと連携してデプロイ

1. GitHubにリポジトリを作成してpushする（`.env.local` は `.gitignore` に含まれているので自動的に除外されます）
2. [vercel.com](https://vercel.com) にアクセスしてログイン
3. "New Project" → GitHubリポジトリを選択 → "Import"
4. **Environment Variables** を設定:
   - `ANTHROPIC_API_KEY` = あなたのAPIキー
5. "Deploy" をクリック

デプロイ完了後、自動生成されたURLでアプリにアクセスできます。

### 環境変数の設定（Vercelダッシュボード）

デプロイ後に環境変数を追加・変更する場合:

1. Vercelダッシュボード → プロジェクト選択
2. Settings → Environment Variables
3. `ANTHROPIC_API_KEY` を追加
4. Redeploy

## 技術スタック

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS v4
- **AI**: Anthropic Claude claude-sonnet-4-20250514
- **Deploy**: Vercel

## ディレクトリ構成

```
ai-eikaiwa/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx            # シナリオ選択画面
│   ├── globals.css         # グローバルCSS
│   ├── chat/
│   │   └── page.tsx        # チャット画面
│   └── api/
│       └── chat/
│           └── route.ts    # Anthropic API呼び出し
├── .env.local.example      # 環境変数テンプレート
├── .gitignore
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

## セキュリティ

- APIキーはサーバーサイド（API Route）でのみ使用されます
- フロントエンドにAPIキーは一切露出しません
- `.env.local` は `.gitignore` で除外済みです
