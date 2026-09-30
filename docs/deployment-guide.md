---
# Cloudflare デプロイ & GitHub Actions 運用ガイド

本ドキュメントでは、Terraform による Cloudflare インフラ管理および GitHub Actions（`pinact` によるサプライチェーン保護）を用いた自動デプロイパイプラインの初期セットアップと日常の運用方法について解説します。

---

## 1. 全体アーキテクチャ概要

```mermaid
flowchart TD
    subgraph GitHub
        PR[Pull Request to main] --> CI[CI: Pinact Check, TypeCheck, Build Test & Terraform Plan]
        Merge[Merge to main] --> CD[CD: Terraform Apply & Wrangler Deploy]
        Dependabot[Dependabot] -->|Weekly Auto PRs| PR
    end

    subgraph "Cloudflare (Terraform 管理)"
        R2State[(R2: blog-tfstate)]
        Domain[Workers Custom Domain]
    end

    subgraph "Cloudflare Workers (Astro SSR)"
        Worker[Astro SSR Worker: blog]
    end

    Relays[(Nostr リレー)]

    CI -.->|Plan (Read State)| R2State
    CD -->|Apply (Lock State)| R2State
    CD -->|Create/Update| Domain
    CD -->|Deploy Worker Bundle| Worker
    Worker -->|WebSocket で投稿・プロフィールを取得| Relays
```

サイトのコンテンツ（プロフィールと投稿）はすべて Nostr リレーから取得するため、データベースやストレージのバインディングはありません。取得結果は Astro のルートキャッシュ（Cloudflare の Worker キャッシュ）で 5 分間キャッシュされます。

---

## 2. 初期セットアップ手順（事前準備）

本番運用を開始する前に、Cloudflare ダッシュボードで以下の初期リソースと認証情報を準備します。

### 2.1 Cloudflare アカウント ID の確認
1. [Cloudflare ダッシュボード](https://dash.cloudflare.com/)にログインします。
2. 画面右側のサイドバーまたは URL から **Account ID**（32文字の英数字）を確認し、メモします。

### 2.2 Terraform リモートステート用 R2 バケットの作成
Terraform の実行状態（`terraform.tfstate`）を安全にリモート共有するため、R2 バケットを手動で 1 つ作成します。

1. Cloudflare ダッシュボードの左メニューから **R2 Storage** を選択します。
2. **Create bucket** をクリックします。
3. バケット名に **`blog-tfstate`** を入力し、作成します（ロケーションは任意、APAC または Automatic 推奨）。

### 2.3 R2 用 S3 互換 API 認証情報の発行
Terraform の S3 バックエンドが R2 にアクセスするために必要なアクセスキーを発行します。

1. **R2 Storage** の画面右上にある **Manage R2 API Tokens** をクリックします。
2. **Create API token** をクリックします。
3. 以下の設定を行い、トークンを作成します:
   - **Token name**: `terraform-r2-tfstate-token`
   - **Permissions**: **Admin Read & Write**（または特定バケット `blog-tfstate` に対する Read & Write）
   - **TTL**: 必要に応じて設定（運用中は無期限推奨）
4. 作成後に表示される以下の値をメモします（**※作成直後のみ表示されます**）:
   - **Access Key ID** (`AWS_ACCESS_KEY_ID` として使用)
   - **Secret Access Key** (`AWS_SECRET_ACCESS_KEY` として使用)

### 2.4 Cloudflare API トークンの発行
Terraform によるリソース作成および Wrangler による Workers デプロイに必要な API トークンを発行します。

1. 右上のユーザーアイコン > **My Profile** > **API Tokens** を開きます。
2. **Create Token** をクリックします。
3. **Create Custom Token** の **Get started** をクリックします（またはテンプレート **Edit Cloudflare Workers** をベースに作成も可能）。
4. 以下の権限を設定します:
   - **Token name**: `github-actions-blog-deploy`
   - **Permissions**:
     - `Account` - **`Workers Scripts`** - `Edit` （※Worker コード本体のデプロイ権限）
     - `Account` - **`Workers KV Storage`** / **`Workers R2 Storage`** / **`D1`** - `Edit` （※旧 EmDash 構成用。現在の構成では不要）
     - `Account` - **`Account Settings`** - `Read`
     - `User` - **`User Details`** - `Read`
   - **Account Resources**:
     - `Include` - `All accounts` (または対象のアカウントを選択)
5. **Continue to summary** > **Create Token** をクリックし、生成された **API Token**（`CLOUDFLARE_API_TOKEN` として使用）をメモします。

---

## 3. GitHub Secrets の登録

GitHub リポジトリの **Settings > Secrets and variables > Actions** にて、**New repository secret** から以下の 4 つの環境変数を登録します。

| Secret 名 | 設定する値 | 用途 |
| :--- | :--- | :--- |
| `CLOUDFLARE_API_TOKEN` | 2.4 で発行した Cloudflare API トークン | Terraform Provider & Wrangler デプロイ |
| `CLOUDFLARE_ACCOUNT_ID` | 2.1 で確認した Cloudflare Account ID | リソース作成先アカウントの特定 |
| `AWS_ACCESS_KEY_ID` | 2.3 で取得した R2 S3 互換 Access Key ID | Terraform tfstate リモートバックエンド認証 |
| `AWS_SECRET_ACCESS_KEY` | 2.3 で取得した R2 S3 互換 Secret Access Key | Terraform tfstate リモートバックエンド認証 |

---

## 4. 初回デプロイの流れ

### 4.1 初回 Terraform インフラの適用
GitHub Actions への初回 push 前にローカルから適用するか、または `main` ブランチに push して GitHub Actions に実行させます。

#### ローカルから初回実行する場合:
```bash
cd terraform

# R2 バックエンドを初期化
mise exec -- terraform init -backend-config="endpoint=https://<YOUR_ACCOUNT_ID>.r2.cloudflarestorage.com"

# インフラ（Worker のカスタムドメイン）を作成
mise exec -- terraform apply -var="cloudflare_account_id=<YOUR_ACCOUNT_ID>"
```

### 4.2 旧 EmDash 用リソース（D1 / R2 / KV）について
以前の EmDash CMS 構成で作成した `blog-db`（D1）、`blog-media`（R2）、`blog-session`（KV）は、Terraform の `removed` ブロックによって **実体を残したまま** 管理対象から外しています。必要なデータを退避したら、Cloudflare ダッシュボードから手動で削除してください。

---

## 5. CI/CD ワークフローの仕組み

### 5.1 Pull Request 作成時 ([`ci.yml`](../.github/workflows/ci.yml))
PR 作成時およびコミット追加時に高速な基本検証が自動実行されます:
1. **Pinact 検証**: `pinact run --verify` で全アクションがコミットハッシュ固定されているか検査。
2. **TypeScript 型チェック**: `pnpm exec astro sync` 後に `pnpm exec tsc --noEmit`。
3. **ローカル & Cloudflare SSR ビルドテスト**: `pnpm build` および `env CLOUDFLARE=true pnpm build`。
4. **Terraform Format & Plan**: `terraform fmt -check` および `terraform plan` を実行し、インフラ変更差分を検証。

### 5.2 定時 E2E テスト ([`e2e.yml`](../.github/workflows/e2e.yml))
毎朝 9:00 JST（UTC 00:00）の cron 定期実行および手動（`workflow_dispatch`）で Playwright E2E テストが実行されます:
1. **Playwright E2E テスト**: `pnpm test` により、テスト用の疑似 Nostr リレー（[`tests/mock-relay.mjs`](../tests/mock-relay.mjs)）を起動し、About / Posts ページの表示、ページ送り、NIP-05 エンドポイントを検証。本物のリレーには接続しません。

### 5.3 `main` マージ時 ([`deploy.yml`](../.github/workflows/deploy.yml))
PR が `main` にマージされると本番デプロイが走ります:
1. **Terraform Apply**: `terraform apply -auto-approve` により、インフラが最新状態に同期。
2. **Astro SSR 本番ビルド**: `env CLOUDFLARE=true pnpm build`。
3. **Wrangler 本番デプロイ**: `pnpm exec wrangler deploy` により、Cloudflare Workers へ即時反映。

---

## 6. サプライチェーンセキュリティ運用

### 6.1 アクションのピン留め (`pinact`)
新しい GitHub Actions をワークフローファイルに追加した際は、以下のコマンドを実行するだけで自動的にコミットハッシュ形式へ変換されます。

```bash
mise exec -- pinact run
```

### 6.2 Dependabot による自動更新
[`.github/dependabot.yml`](../.github/dependabot.yml) により、週次で GitHub Actions のバージョン更新 PR が作成されます。コミットハッシュとコメント（`# vX.Y.Z`）は自動で最新に維持されます。

---

## 7. ローカル検証コマンド一覧

開発ツールはすべて `mise` 経由で実行します。

```bash
# アクションのハッシュ固定チェック
mise exec -- pinact run --verify

# Terraform コードのフォーマットチェック
cd terraform && mise exec -- terraform fmt -check && cd ..

# ローカル開発サーバー起動
mise exec -- pnpm dev

# Cloudflare 本番 SSR ビルドテスト
mise exec -- env CLOUDFLARE=true pnpm build
```
