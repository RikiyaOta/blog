# Modern Chic Blog with EmDash on Cloudflare

Astro と [EmDash CMS](https://emdash.dev/) を用いた、落ち着いたシックなデザインのパーソナルブログサイトです。

ローカル開発環境ではサクサク動作する SQLite / ローカルストレージを使用し、本番環境では Cloudflare（Workers, D1, R2, KV）上でサーバーレス SSR 動作するハイブリッド構成を採用しています。

---

## 主な特徴

- **デザイン & タイポグラフィ**: 余計な装飾を削ぎ落としたモノトーン基調、繊細なボーダーとゆとりのある余白設計（Modern Chic）。
- **CMS 統合**: EmDash CMS によるマークダウン / リッチテキスト（PortableText）の執筆、カテゴリ・タグ分類、管理画面（`/_emdash/admin`）。
- **ハイブリッド SSR 構成**:
  - **ローカル**: Node.js + SQLite (`data.db`) + ローカルメディア保存 (`./uploads`)
  - **本番**: Cloudflare Workers + D1 (`blog-db`) + R2 (`blog-media`) + KV (`blog-session`)
- **Infrastructure as Code**: Terraform による Cloudflare インフラのコード管理（R2 tfstate リモートバックエンド）。
- **CI/CD & サプライチェーン保護**: GitHub Actions による自動テスト・デプロイ、`pinact` による全アクションのコミットハッシュ完全固定、Dependabot による継続的更新。
- **バージョン固定**: `mise` による Node.js, pnpm, Terraform, pinact の一元管理。

---

## 開発環境のセットアップ

本プロジェクトの開発ツールは [`mise`](https://mise.jdx.dev/) でバージョン管理されています。

```bash
# ツールのインストール
mise install

# 依存パッケージのインストール
mise exec -- pnpm install

# （初回のみ）初期シードデータの投入
mise exec -- pnpm db:seed
```

---

## 開発コマンド一覧

```bash
# 開発サーバーの起動 (http://localhost:4321)
mise exec -- pnpm dev

# 管理画面: http://localhost:4321/_emdash/admin (開発時は Dev bypass で即時ログイン可)

# 型チェック
mise exec -- pnpm exec tsc --noEmit

# ローカル向けプロダクションビルド
mise exec -- pnpm build

# Cloudflare (本番 SSR) 向けビルド検証
mise exec -- env CLOUDFLARE=true pnpm build

# ルート疎通テスト
mise exec -- node verify-routes.mjs

# GitHub Actions のハッシュピン留め検証
mise exec -- pinact run --verify

# Terraform コードのフォーマット検証
cd terraform && mise exec -- terraform fmt -check && cd ..
```

---

## デプロイ & インフラ運用

本番インフラの構築およびデプロイ手順の詳細については、[`docs/deployment-guide.md`](docs/deployment-guide.md) をご参照ください。

- **Pull Request 作成時**: 自動的に `pinact` 検証、型チェック、SSR ビルドテスト、`terraform plan` が実行されます。
- **`main` ブランチマージ時**: 自動的に `terraform apply`（インフラ適用）、SSR ビルド、`wrangler deploy`（Cloudflare Workers 本番反映）が実行されます。
