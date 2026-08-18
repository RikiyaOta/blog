# Terraform & GitHub Actions CI/CD (with Pinact) 実装計画書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cloudflare 上のインフラ（D1: `blog-db`, R2: `blog-media`, KV: `blog-session`）を Terraform（R2 S3 バックエンド: `blog-tfstate`）でコード管理し、`pinact` によるハッシュ完全ピン留めを行った GitHub Actions CI/CD パイプライン（PR 時の plan & ビルドテスト、main マージ時の apply & Wrangler デプロイ）を構築する。

**Architecture:**
- `mise.toml` に `terraform = "1"` と `pinact = "4"` を追加し、`mise install && mise lock` でバージョン固定。
- `terraform/` に `main.tf`, `variables.tf`, `outputs.tf` を作成（Cloudflare Provider, R2 S3 backend `blog-tfstate`, `blog-db` D1, `blog-media` R2, `blog-session` KV）。
- `wrangler.jsonc` のリソース参照名（`database_name`, `bucket_name`）を更新。
- `.github/workflows/` に `ci.yml`（PR 検証）および `deploy.yml`（本番デプロイ）を作成。
- `pinact run` を実行して全アクションをコミットハッシュ形式にピン留め。
- `.github/dependabot.yml` を作成して Actions の自動更新を設定。

**Tech Stack:**
- **IaC:** Terraform 1.15+, Cloudflare Provider 4.52+ (R2 S3 backend)
- **CI/CD & Security:** GitHub Actions, `pinact` (by suzuki-shunsuke), Dependabot
- **デプロイ対象:** Cloudflare Workers, D1 (`blog-db`), R2 (`blog-media`), KV (`blog-session`)
- **ツール管理:** mise (`mise.toml`, `mise.lock`)

**Spec:** `docs/superpowers/specs/2026-08-18-terraform-github-actions-design.md`

---

## Global Constraints

- ツールはすべて `mise`（`mise.toml`, `mise.lock`）で管理し、`minimum_release_age = "7d"` を順守すること。
- リソース名はすべて `blog-` プレフィックスで統一すること（D1: `blog-db`, R2: `blog-media`, KV: `blog-session`, tfstate: `blog-tfstate`）。
- GitHub Actions のすべてのアクションは `pinact` を通じて Git コミットハッシュ（+ `# vX.Y.Z` コメント）で固定すること。
- CI ワークフローで `pinact run --verify` を実行し、ピン留め漏れがないことを検証すること。
- Terraform コードは `terraform fmt -check` を通過すること。
- すべてのドキュメント・コミット・仕様記述は日本語で管理すること。

---

### Task 1: mise ツール設定への terraform および pinact の追加

**Files:**
- Modify: `mise.toml`
- Modify: `mise.lock`

**Interfaces:**
- Consumes: 既存の `mise.toml` (Node 26, pnpm 11)
- Produces: `terraform = "1"`, `pinact = "4"` が追加・固定された `mise.toml` と `mise.lock`

- [ ] **Step 1: `mise.toml` に `terraform` と `pinact` を追加**

```toml
[settings]
minimum_release_age = "7d"

[tools]
node = "26"
pnpm = "11"
terraform = "1"
pinact = "4"
```

- [ ] **Step 2: `mise install` および `mise lock` を実行**

Run: `mise install && mise lock`
Expected: terraform 1.x および pinact 4.x がインストールされ、`mise.lock` にロック情報が追記される。

- [ ] **Step 3: ツールのバージョンと動作を確認**

Run: `mise exec -- terraform version && mise exec -- pinact --version`
Expected: terraform v1.x および pinact v4.x が出力され、正常終了する。

- [ ] **Step 4: コミット**

```bash
git add mise.toml mise.lock
git commit -m "chore: add terraform and pinact to mise configuration"
```

---

### Task 2: Cloudflare Terraform インフラコードの実装と wrangler.jsonc の整合

**Files:**
- Create: `terraform/main.tf`
- Create: `terraform/variables.tf`
- Create: `terraform/outputs.tf`
- Create: `terraform/.gitignore`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: Cloudflare Provider 仕様、R2 S3 互換バックエンド仕様
- Produces: D1 (`blog-db`), R2 (`blog-media`), KV (`blog-session`) の HCL 定義および `wrangler.jsonc` の設定同期

- [ ] **Step 1: `terraform/.gitignore` を作成**

```gitignore
# Local .terraform directories
**/.terraform/*

# .tfstate files
*.tfstate
*.tfstate.*

# Crash log files
crash.log
crash.*.log

# Exclude all .tfvars files
*.tfvars
*.tfvars.json

# Override files
override.tf
override.tf.json
*_override.tf
*_override.tf.json

# CLI configuration
.terraformrc
terraform.rc
```

- [ ] **Step 2: `terraform/variables.tf` を作成**

```hcl
variable "cloudflare_account_id" {
  type        = string
  description = "The Cloudflare Account ID to provision resources in."
}

variable "project_name" {
  type        = string
  description = "Project name prefix for resources."
  default     = "blog"
}
```

- [ ] **Step 3: `terraform/main.tf` を作成**

```hcl
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52.0"
    }
  }

  backend "s3" {
    bucket                      = "blog-tfstate"
    key                         = "terraform.tfstate"
    region                      = "auto"
    endpoint                    = "https://<CLOUDFLARE_ACCOUNT_ID>.r2.cloudflarestorage.com"
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
    skip_metadata_api_check     = true
  }
}

provider "cloudflare" {
  # CLOUDFLARE_API_TOKEN 環境変数から自動読み込み
}

# D1 Database for EmDash Posts and Content
resource "cloudflare_d1_database" "blog" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-db"
}

# R2 Bucket for EmDash Uploaded Media and Images
resource "cloudflare_r2_bucket" "media" {
  account_id = var.cloudflare_account_id
  name       = "${var.project_name}-media"
  location   = "APAC"
}

# KV Namespace for Admin Auth and Sessions
resource "cloudflare_workers_kv_namespace" "session" {
  account_id = var.cloudflare_account_id
  title      = "${var.project_name}-session"
}
```

- [ ] **Step 4: `terraform/outputs.tf` を作成**

```hcl
output "d1_database_id" {
  value       = cloudflare_d1_database.blog.id
  description = "The ID of the D1 database for EmDash blog content."
}

output "r2_bucket_name" {
  value       = cloudflare_r2_bucket.media.name
  description = "The name of the R2 bucket for EmDash uploaded media."
}

output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.session.id
  description = "The ID of the Workers KV namespace for admin sessions."
}
```

- [ ] **Step 5: `wrangler.jsonc` のリソース名を更新**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "blog",
  "main": "./dist/_worker.js/index.js",
  "compatibility_date": "2024-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "blog-db",
      "database_id": "placeholder-replace-after-terraform-apply"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "blog-media"
    }
  ],
  "kv_namespaces": [
    {
      "binding": "SESSION",
      "id": "placeholder-replace-after-terraform-apply"
    }
  ]
}
```

- [ ] **Step 6: Terraform フォーマットチェック**

Run: `cd terraform && mise exec -- terraform fmt -check`
Expected: Exit code 0

- [ ] **Step 7: コミット**

```bash
git add terraform/ wrangler.jsonc
git commit -m "feat(infra): add terraform config and update wrangler.jsonc resource names"
```

---

### Task 3: Dependabot 設定および GitHub Actions ワークフローの作成と Pinact 適用

**Files:**
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: Task 1 の pinact, Task 2 の terraform
- Produces: コミットハッシュで固定された CI & CD ワークフロー

- [ ] **Step 1: `.github/dependabot.yml` を作成**

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    labels:
      - "dependencies"
      - "github-actions"
```

- [ ] **Step 2: `.github/workflows/ci.yml` を作成**

```yaml
name: CI & Preview Verification

on:
  pull_request:
    branches:
      - main

jobs:
  verify:
    name: Lint, Build & Terraform Plan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Toolchain with mise
        uses: jdx/mise-action@v2

      - name: Verify GitHub Actions Pinned Hashes
        run: pinact run --verify

      - name: Install Node Dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck TypeScript
        run: pnpm exec tsc --noEmit

      - name: Test Cloudflare SSR Production Build
        run: pnpm build
        env:
          CLOUDFLARE: "true"

      - name: Terraform Format Check
        working-directory: terraform
        run: terraform fmt -check

      - name: Terraform Init & Plan
        working-directory: terraform
        run: |
          terraform init -backend-config="endpoint=https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
          terraform plan -var="cloudflare_account_id=${CLOUDFLARE_ACCOUNT_ID}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

- [ ] **Step 3: `.github/workflows/deploy.yml` を作成**

```yaml
name: Production Deployment

on:
  push:
    branches:
      - main

concurrency:
  group: production-deploy
  cancel-in-progress: false

jobs:
  deploy:
    name: Terraform Apply & Deploy to Cloudflare
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Toolchain with mise
        uses: jdx/mise-action@v2

      - name: Install Node Dependencies
        run: pnpm install --frozen-lockfile

      - name: Terraform Init & Apply
        working-directory: terraform
        run: |
          terraform init -backend-config="endpoint=https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
          terraform apply -auto-approve -var="cloudflare_account_id=${CLOUDFLARE_ACCOUNT_ID}"
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

      - name: Build Cloudflare SSR Production Bundle
        run: pnpm build
        env:
          CLOUDFLARE: "true"

      - name: Deploy to Cloudflare Workers via Wrangler
        run: pnpm exec wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

- [ ] **Step 4: `pinact run` を実行して全ワークフローのアクションをコミットハッシュにピン留め**

Run: `mise exec -- pinact run`
Expected: `actions/checkout@v4` および `jdx/mise-action@v2` が `@<full-commit-sha> # <tag>` に書き換えられる。

- [ ] **Step 5: `pinact run --verify` でピン留め検証**

Run: `mise exec -- pinact run --verify`
Expected: Exit code 0 (すべてのアクションがピン留め済み)

- [ ] **Step 6: コミット**

```bash
git add .github/
git commit -m "feat(ci): add github actions workflows with pinact and dependabot"
```

---

### Task 4: デプロイ・CI 運用ドキュメントの作成と全体の統合検証

**Files:**
- Create: `docs/deployment-guide.md`

**Interfaces:**
- Consumes: Task 1〜3 の成果物
- Produces: ユーザー向けのセットアップ・運用手順書および全ツールの統合検証

- [ ] **Step 1: `docs/deployment-guide.md` を作成**

Cloudflare R2 `blog-tfstate` バケット作成、API トークン発行、GitHub Secrets 登録、初回デプロイ手順をわかりやすくまとめる。

- [ ] **Step 2: 全ローカル検証を実行**

Run:
1. `mise exec -- pinact run --verify`
2. `cd terraform && mise exec -- terraform fmt -check && cd ..`
3. `mise exec -- pnpm build`
4. `mise exec -- env CLOUDFLARE=true pnpm build`
Expected: すべての検証がエラーなく通過する。

- [ ] **Step 3: コミット**

```bash
git add docs/deployment-guide.md
git commit -m "docs: add cloudflare deployment and github actions setup guide"
```
