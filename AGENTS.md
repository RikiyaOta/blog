# AGENTS.md — AI エージェント開発・運用ガイドライン

このドキュメントは、本リポジトリで作業を行うすべての AI コーディングエージェント（Antigravity, Claude, Copilot 等）が遵守すべき設計思想、アーキテクチャ規約、ツール制約、および過去の教訓をまとめたものです。

---

## 1. 最重要グローバル制約（Must-Follow Rules）

1. **言語・仕様記述**:
   - 仕様書、実装計画、ドキュメント、コミットメッセージ、チャット応答はすべて **日本語** で記述すること。
2. **ツール管理 (`mise`)**:
   - 開発ツール（Node.js, pnpm, Terraform, pinact 等）はすべて [`mise.toml`](mise.toml) / [`mise.lock`](mise.lock) で管理すること。
   - コマンド実行時は常に `mise exec -- <command>` を介すること。
3. **サプライチェーンセキュリティ（7日間ルール & Hash Pinning）**:
   - `mise.toml` の `minimum_release_age = "7d"`、および `pnpm-workspace.yaml` / `.npmrc` の `minimumReleaseAge: 10080`（7日間）を厳格に順守すること（リリース後7日未満の新着パッケージ・ツールはインストールしない）。
   - GitHub Actions ワークフロー内のすべてのアクションは **40文字の Git コミットハッシュ（+バージョンコメント `# vX.Y.Z`）** で完全固定すること（`mise exec -- pinact run` を使用）。
4. **プライバシー・ドキュメント制約**:
   - ユーザーの要望により、`README.md` 等の対外的なドキュメントにはカスタムドメイン名を明記・過剰アピールしないこと。

---

## 2. アーキテクチャ & 技術スタック

### 2.1 ハイブリッド SSR 構成
- **フレームワーク**: Astro (SSR モード: `output: "server"`)
- **CMS**: [EmDash CMS](https://emdash.dev/) (`emdash`, `@emdash-cms/cloudflare`)
- **ローカル開発環境**:
  - アダプター: `@astrojs/node`
  - データベース: SQLite (`file:./data.db`)
  - メディアストレージ: ローカルファイルシステム (`./uploads`, `baseUrl: "/_emdash/api/media/file"`)
- **本番環境 (Cloudflare)**:
  - アダプター: `@astrojs/cloudflare`
  - データベース: Cloudflare D1 (`blog-db`, バインディング名: `DB`)
  - メディアストレージ: Cloudflare R2 (`blog-media`, バインディング名: `MEDIA`)
  - セッションストレージ: Cloudflare KV (`blog-session`, バインディング名: `SESSION`)
- **環境検出**: `process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1"`

### 2.2 デザイン哲学（Modern Chic）
- **トーン**: 落ち着いたシックなモノトーン基調（黒・白・ニュートラルグレー）。
- **タイポグラフィ**: 洗練されたサンセリフ/ゴシック中心（Plus Jakarta Sans, Inter, Noto Sans JP）。
- **スタイリング**: Vanilla CSS (`src/styles/global.css`)。TailwindCSS 等はユーザーが明示的に要求しない限り導入しない。
- **禁止パターン**: 派手なネオングラデーション文字、紫/ダークテーマの乱用、過度な Bento Grid など。

---

## 3. 実装上の重要な落とし穴と教訓（Pitfalls & Best Practices）

### ① EmDash ページコンテキスト（BaseLayout Contract）
- `src/layouts/BaseLayout.astro` の `<EmDashHead />`, `<EmDashBodyStart />`, `<EmDashBodyEnd />` は、`emdash/page` の `createPublicPageContext({ Astro, kind: "custom", ... })` で生成した `pageContext` オブジェクトを `page={pageContext}` として渡すこと。
- これを怠ると、ランタイムで WeakMap 関連の例外が発生する。

### ② EmDash クエリのカラム名（SQL snake_case）
- `getEmDashCollection("posts", { orderBy: { created_at: "desc" } })` 等のソートキーは、SQL ビルダーに直接渡されるため、camelCase (`createdAt`) ではなく **snake_case (`created_at`, `published_at`, `title`)** を指定すること。

### ③ pnpm 11 設定ファイルの配置
- pnpm 11 では、`package.json` 内の `pnpm` フィールド（`onlyBuiltDependencies`, `patchedDependencies` 等）は非推奨/無視される。
- これらはすべて [`pnpm-workspace.yaml`](pnpm-workspace.yaml) に記述すること。

### ④ Cloudflare Terraform Provider のリソース名
- Cloudflare Terraform Provider v4 (`~> 4.52.0`) では、Worker へのカスタムドメイン割り当てリソース名は `cloudflare_workers_custom_domain` ではなく **`cloudflare_workers_domain`** である。
- リソース名はすべて `blog-` プレフィックスで統一すること（`blog-db`, `blog-media`, `blog-session`, `blog-tfstate`）。

### ⑤ GitHub Actions ランナーの Node.js 24 移行
- GitHub Actions ランナーは Node.js 24 で動作するため、`actions/checkout@v7` や `jdx/mise-action@v4` 等の Node 24 対応アクションを使用し、`pinact` でピン留めすること。

---

## 4. 開発・検証ワークフロー

コードを変更した際は、必ず以下の検証をローカルで実行してから作業を完了すること:

```bash
# 1. GitHub Actions のピン留め検証
mise exec -- pinact run --verify

# 2. Terraform のフォーマット検証
cd terraform && mise exec -- terraform fmt -check && cd ..

# 3. TypeScript 型チェック
mise exec -- pnpm exec tsc --noEmit

# 4. ローカル向けプロダクションビルド
mise exec -- pnpm build

# 5. Cloudflare SSR 向けプロダクションビルド
mise exec -- env CLOUDFLARE=true pnpm build

# 6. ルート疎通テスト
mise exec -- node verify-routes.mjs
```

---

## 5. リポジトリ構成マップ

```
.
├── .github/
│   ├── dependabot.yml       # GitHub Actions ピン留めハッシュの週次自動更新
│   └── workflows/
│       ├── ci.yml           # PR 検証 (Pinact, TypeScript, Dual Builds, Terraform Plan)
│       ├── deploy.yml       # 本番デプロイ (Terraform Apply, Build, Wrangler Deploy)
│       └── e2e.yml          # 定時 E2E 検証 (毎朝9時 JST / workflow_dispatch)
├── docs/
│   ├── deployment-guide.md  # 本番環境セットアップ & 運用手順書
│   └── superpowers/         # 設計仕様書 (specs/) & 実装計画書 (plans/)
├── scripts/
│   └── apply-seed.mjs       # 初期シードデータ投入スクリプト (マイグレーション含む)
├── seed/
│   └── seed.json            # 初期シードデータ (JSON v1)
├── src/
│   ├── components/          # PostCard, Header, Footer, TagBadge, FormattedDate
│   ├── layouts/             # BaseLayout.astro
│   ├── pages/               # /, /posts/[...slug], /categories/[slug], /tags/[slug], /404
│   ├── styles/              # global.css (デザインシステム & Prose)
│   └── live.config.ts       # Astro 7 ライブコレクション定義 (_emdash)
├── tests/                   # Playwright E2E テストスイート (blog-public, blog-admin)
├── terraform/               # Cloudflare インフラ定義 (D1, R2, KV, R2 Backend)
├── astro.config.mjs         # Astro 設定 (Node/Cloudflare デュアルモード)
├── playwright.config.ts     # Playwright E2E テスト設定
├── wrangler.jsonc           # Cloudflare Workers バインディング設定
├── pnpm-workspace.yaml      # pnpm 11 設定 (minimumReleaseAge, onlyBuiltDependencies)
├── mise.toml                # ツール定義 (Node 26, pnpm 11, Terraform 1, pinact 4)
├── mise.lock                # 全プラットフォーム向けツールバージョン固定
├── package.json
└── README.md
```
