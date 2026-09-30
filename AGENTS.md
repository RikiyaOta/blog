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

### 2.1 Nostr 駆動の SSR 構成
- **フレームワーク**: Astro (SSR モード: `output: "server"`)
- **コンテンツ**: すべて Nostr から取得する。サイト側に CMS・DB・ストレージは持たない。
  - About (`/`): 自分のプロフィール (kind 0)
  - Posts (`/posts`): 自分の短文投稿 (kind 1) のうちリプライ以外
  - NIP-05 (`/.well-known/nostr.json`)
  - npub・取得先リレー・リンクは [`src/site.config.ts`](src/site.config.ts) に集約する。
- **ローカル開発環境**: アダプター `@astrojs/node`、キャッシュ `memoryCache()`
- **本番環境 (Cloudflare Workers)**: アダプター `@astrojs/cloudflare`、キャッシュ `cacheCloudflare()`。バインディングは不要（セッション無効・画像は passthrough）。
- **環境検出**: `process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1"`

### 2.2 デザイン哲学（文字だけの簡素なページ）
- **トーン**: 白黒のテキスト中心。区切りは点線の罫線程度に留める。
- **タイポグラフィ**: Web フォントは読み込まず、OS のフォント（sans-serif / monospace）を使う。
- **スタイリング**: Vanilla CSS (`src/styles/global.css`) のみ。クライアント JavaScript は使わない。TailwindCSS 等はユーザーが明示的に要求しない限り導入しない。
- **ダークモード**: `prefers-color-scheme` で対応する。
- **用語**: 短文投稿の一覧は「Posts」と呼ぶ（「Notes」という語は使わない）。
- **禁止パターン**: 装飾的なグラデーション、カード UI、アイコンの多用など。

---

## 3. 実装上の重要な落とし穴と教訓（Pitfalls & Best Practices）

### ① Nostr リレーへの接続（Workers の制約）
- Cloudflare Workers ではリクエストをまたいで WebSocket を使い回せない。`SimplePool` は問い合わせごとに生成し、必ず `destroy()` すること（[`src/lib/nostr.ts`](src/lib/nostr.ts)）。
- リレーからの取得に失敗した（結果が空の）ときは `Astro.cache.set()` を呼ばない。失敗結果を長時間配信しないため。

### ② E2E テストは疑似リレーで行う
- 本物のリレーには接続しない。[`tests/mock-relay.mjs`](tests/mock-relay.mjs) がテスト用の鍵（[`tests/fixtures.mjs`](tests/fixtures.mjs)）で署名したイベントを返す。
- 接続先は環境変数 `NOSTR_RELAYS`（カンマ区切り）と `NOSTR_NPUB` で上書きできる。Playwright の `webServer` 設定でこれらを渡している。

### ③ pnpm 11 設定ファイルの配置
- pnpm 11 では、`package.json` 内の `pnpm` フィールド（`onlyBuiltDependencies`, `patchedDependencies` 等）は非推奨/無視される。
- これらはすべて [`pnpm-workspace.yaml`](pnpm-workspace.yaml) に記述すること。

### ④ Cloudflare Terraform Provider のリソース名
- Cloudflare Terraform Provider v4 (`~> 4.52.0`) では、Worker へのカスタムドメイン割り当てリソース名は `cloudflare_workers_custom_domain` ではなく **`cloudflare_workers_domain`** である。
- リソース名はすべて `blog-` プレフィックスで統一すること（`blog-tfstate` 等）。
- 旧 EmDash 用の D1 / R2 / KV は `removed { lifecycle { destroy = false } }` で管理対象から外しただけで、実体は残っている。`removed` ブロックは本番で一度 `terraform apply` されるまで消さないこと（apply 前に消すと、リソースが削除される差分になる）。

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

# 6. ルート疎通テスト（dev サーバー起動中に実行）
mise exec -- node verify-routes.mjs

# 7. E2E テスト（疑似 Nostr リレーを使用）
mise exec -- pnpm test
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
├── src/
│   ├── components/          # NoteContent (Nostr 投稿本文のレンダリング)
│   ├── layouts/             # BaseLayout.astro (タブ・サイト名・フッター)
│   ├── lib/nostr.ts         # リレーからのプロフィール・投稿取得
│   ├── pages/               # / (About), /posts, /.well-known/nostr.json, /404
│   ├── styles/              # global.css
│   └── site.config.ts       # サイト名・npub・リンク・リレー設定
├── tests/                   # Playwright E2E テスト & 疑似 Nostr リレー
├── terraform/               # Cloudflare インフラ定義 (カスタムドメイン, R2 Backend)
├── astro.config.mjs         # Astro 設定 (Node/Cloudflare デュアルモード, ルートキャッシュ)
├── playwright.config.ts     # Playwright E2E テスト設定
├── wrangler.jsonc           # Cloudflare Workers 設定
├── pnpm-workspace.yaml      # pnpm 11 設定 (minimumReleaseAge, onlyBuiltDependencies)
├── mise.toml                # ツール定義 (Node 26, pnpm 11, Terraform 1, pinact 4)
├── mise.lock                # 全プラットフォーム向けツールバージョン固定
├── package.json
└── README.md
```
