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

    subgraph "Cloudflare Infrastructure (Terraform 管理)"
        R2State[(R2: blog-tfstate)]
        D1[(D1: blog-db)]
        R2Media[(R2: blog-media)]
        KV[(KV: blog-session)]
    end

    subgraph "Cloudflare Workers (Astro SSR)"
        Worker[Astro SSR Worker: blog]
    end

    CI -.->|Plan (Read State)| R2State
    CD -->|Apply (Lock State)| R2State
    CD -->|Create/Update| D1
    CD -->|Create/Update| R2Media
    CD -->|Create/Update| KV
    CD -->|Deploy Worker Bundle| Worker
    Worker -->|DB binding| D1
    Worker -->|MEDIA binding| R2Media
    Worker -->|SESSION binding| KV
```

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
     - `Account` - **`Workers KV Storage`** - `Edit`
     - `Account` - **`Workers R2 Storage`** - `Edit`
     - `Account` - **`D1`** (または `Workers D1 Storage`) - `Edit`
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

# インフラ（D1, R2, KV）を作成
mise exec -- terraform apply -var="cloudflare_account_id=<YOUR_ACCOUNT_ID>"
```

作成完了後、出力された `d1_database_id` と `kv_namespace_id` を確認し、[`wrangler.jsonc`](../wrangler.jsonc) のプレースホルダー部分を実際の ID に更新します。

```jsonc
// wrangler.jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "blog-db",
      "database_id": "xxxx-xxxx-xxxx-xxxx" // 実際の D1 ID
    }
  ],
  "kv_namespaces": [
    {
      "binding": "SESSION",
      "id": "xxxx-xxxx-xxxx-xxxx" // 実際の KV ID
    }
  ]
}
```

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
1. **初期シード投入**: `pnpm db:seed` で SQLite データベースのマイグレーションとシードデータを初期化。
2. **Playwright E2E テスト**: `pnpm test` により、公開ページの閲覧・ナビゲーション、管理画面ログイン、CMS による記事作成・公開・閲覧の一連のライフサイクルを自動検証。

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
