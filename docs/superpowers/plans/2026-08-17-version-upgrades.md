# 依存関係およびツールバージョンの最新化（7日ルール適用） 計画書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `mise` および `pnpm` の minimum release age（7日間）制約を適用した上で、ツール（Node.js, pnpm）および npm 依存パッケージを安全に最新バージョンへと更新し、ローカル開発環境および Cloudflare SSR ビルドの動作を検証・保証する。

**Architecture:** 
- `mise.toml` に `minimum_release_age = "7d"` を設定し、`mise.lock` を更新。
- `pnpm-workspace.yaml` および `.npmrc` に `minimumReleaseAge: 10080` (7日 = 10080分) を設定。
- `package.json` の依存関係（Astro, @astrojs/*, React, TypeScript, Wrangler, Kysely等）を pnpm で最新化。
- パッチファイル (`patches/@astrojs__cloudflare@12.6.13.patch` 等) の適用状態を更新後のバージョンに合わせて整合性を確認。
- `pnpm build`（Node.jsローカル）および `CLOUDFLARE=true pnpm build`（Cloudflare SSR）、`verify-routes.mjs` によるルート検証をパスさせる。

**Tech Stack:**
- **ツール管理:** mise (`mise.toml`, `mise.lock`)
- **パッケージマネージャー:** pnpm 10+ (`pnpm-workspace.yaml`, `pnpm-lock.yaml`)
- **フレームワーク & CMS:** Astro 5+, EmDash CMS 0.33.0, React 19, TypeScript
- **デプロイ・インフラ:** Cloudflare Workers, D1, R2, Wrangler

---

## Global Constraints

- `mise` の `minimum_release_age` は `"7d"` を設定すること。
- `pnpm` の `minimumReleaseAge` は `10080` (7日間) を設定すること。
- 依存関係の更新後も、ローカル開発環境（SQLite）と本番環境（Cloudflare D1 + R2）のハイブリッド構成が正常にビルド・動作すること。
- すべての公開ルート（`/`, `/posts/[slug]`, `/categories/[slug]`, `/tags/[slug]`, `/404`, `/_emdash/admin`）のレスポンスが 200/404/302 で正常に応答すること。
- すべてのドキュメント・コミット・仕様記述は日本語で管理すること。

---

### Task 1: mise および pnpm の 7 日間リリースエイジ（minimum_release_age）設定

**Files:**
- Modify: `mise.toml`
- Create: `pnpm-workspace.yaml`
- Modify: `.npmrc`

**Interfaces:**
- Consumes: 既存の `mise.toml`, `package.json`
- Produces: `minimum_release_age = "7d"` が設定された `mise.toml`, `pnpm-workspace.yaml`, `.npmrc`

- [ ] **Step 1: `mise.toml` に `minimum_release_age = "7d"` を追加**

```toml
[settings]
minimum_release_age = "7d"

[tools]
node = "22"
pnpm = "10"
```

- [ ] **Step 2: `pnpm-workspace.yaml` を作成して `minimumReleaseAge` を設定**

```yaml
minimumReleaseAge: 10080
```

- [ ] **Step 3: `.npmrc` にも `minimum-release-age` を追記**

```ini
minimum-release-age=10080
```

- [ ] **Step 4: `mise install` および `mise lock` を実行してツールバージョンを更新・ロック**

Run: `mise install && mise lock`
Expected: 7日以上経過した最新の Node 22 および pnpm 10 が解決され、`mise.lock` が更新される。

- [ ] **Step 5: コミット**

```bash
git add mise.toml mise.lock pnpm-workspace.yaml .npmrc
git commit -m "chore: configure 7d minimum release age for mise and pnpm"
```

---

### Task 2: 依存パッケージの最新化とロックファイルの再生成

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `patches/`（必要に応じて）

**Interfaces:**
- Consumes: Task 1 の `minimumReleaseAge` 設定
- Produces: 7日ルールに準拠した最新の依存関係が記述された `package.json` および `pnpm-lock.yaml`

- [ ] **Step 1: 依存パッケージを 7 日ルール下でアップデート**

Run: `mise exec -- pnpm update --latest`
Expected: 7日以上前の最新安定版パッケージに更新される。

- [ ] **Step 2: `package.json` のバージョンレンジおよび patchedDependencies の整合性を確認**

`package.json` の更新後、`patches/` 配下のパッチが正常に適用されているか確認（`mise exec -- pnpm install`）。

- [ ] **Step 3: コミット**

```bash
git add package.json pnpm-lock.yaml patches/
git commit -m "chore: upgrade dependencies to latest adhering to 7d release age"
```

---

### Task 3: ビルドおよび全ルート統合検証（ローカル & Cloudflare）

**Files:**
- Modify: `astro.config.mjs` (必要に応じた調整)
- Test: `verify-routes.mjs`

**Interfaces:**
- Consumes: Task 2 の最新依存関係
- Produces: ローカル・Cloudflare双方でのビルド成功と全ルート検証パス

- [ ] **Step 1: ローカル向けプロダクションビルドの検証**

Run: `mise exec -- pnpm build`
Expected: Exit code `0`

- [ ] **Step 2: Cloudflare 向けプロダクションビルドの検証**

Run: `mise exec -- env CLOUDFLARE=true pnpm build`
Expected: Exit code `0`

- [ ] **Step 3: 開発サーバーでのルート統合検証**

Run: `mise exec -- pnpm dev` (バックグラウンド起動)
Run: `mise exec -- node verify-routes.mjs`
Expected: 全 8 ルート（トップ、記事詳細 2 本、カテゴリ 2 本、タグ、404、管理画面）が正常ステータスで応答。

- [ ] **Step 4: コミット**

```bash
git add astro.config.mjs
git commit -m "test: verify builds and routes after dependency upgrades"
```
