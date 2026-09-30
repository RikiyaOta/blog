# RikiyaOta

文字だけの簡素な個人ページです。自己紹介と投稿は [Nostr](https://nostr.com/) から取得して表示します。

- **About** (`/`): Nostr のプロフィール (kind 0) の自己紹介文とリンク
- **Posts** (`/posts`): 自分の Nostr 投稿 (kind 1) のうち、リプライを除いたもの
- **NIP-05** (`/.well-known/nostr.json`): このサイトのドメインを Nostr の認証済み ID として使うためのエンドポイント

サイト側に管理画面やデータベースはありません。Nostr クライアントから投稿すれば、そのままサイトに反映されます（ページは 5 分間キャッシュされます）。

---

## 主な特徴

- **コンテンツ**: Nostr リレーから SSR 時に取得（[`nostr-tools`](https://github.com/nbd-wtf/nostr-tools) で署名検証）。取得先リレーと npub は [`src/site.config.ts`](src/site.config.ts) で設定。
- **デザイン**: Web フォント・JavaScript なしのプレーンな HTML と最小限の CSS。ダークモード対応。
- **構成**: ローカルは Node.js、本番は Cloudflare Workers で Astro を SSR 実行（バインディング不要）。
- **Infrastructure as Code**: Terraform による Cloudflare 設定管理（R2 tfstate リモートバックエンド）。
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
```

---

## 開発コマンド一覧

```bash
# 開発サーバーの起動 (http://localhost:4321)
mise exec -- pnpm dev

# 型チェック
mise exec -- pnpm exec tsc --noEmit

# ローカル向けプロダクションビルド
mise exec -- pnpm build

# Cloudflare (本番 SSR) 向けビルド検証
mise exec -- env CLOUDFLARE=true pnpm build

# ルート疎通テスト
mise exec -- node verify-routes.mjs

# E2E テスト（疑似 Nostr リレーを起動して検証）
mise exec -- pnpm test

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
