# EmDash と Cloudflare を用いたモダン・シックな個人ブログ設計仕様書

## 1. 概要
本仕様は、**EmDash CMS** と **Astro** を採用し、**Cloudflare Pages / Workers**（D1 および R2）へのデプロイに対応しつつ、ローカル開発環境（SQLite およびローカルストレージ）でも軽快に動作する個人ブログサイトの設計を定めます。

デザインの基本コンセプトは「モダン・シック（洗練されたサンセリフ中心、無駄を削ぎ落としたモノトーン基調、繊細なボーダーと余白）」とし、シンプルでありながら安っぽくならず、読者が記事に没入できる上質なリーダビリティと佇まいを実現します。

---

## 2. 開発ツールおよびランタイム管理 (mise)
ローカル開発環境および CI/CD 環境で同一のツールバージョンを保証するため、開発ランタイムを `mise` で管理します。

### 2.1 管理対象
- `node` (Node.js LTS, v22 / v24 系)
- `pnpm` (パッケージマネージャ)

### 2.2 生成・管理ファイル
- `mise.toml`: ツール定義設定ファイル
- `mise.lock`: 厳密なバージョン固定用ロックファイル

---

## 3. システムアーキテクチャ

### 3.1 技術スタック
- **フロントエンド / SSR フレームワーク**: Astro（サーバーレンダリング `output: "server"`）
- **CMS**: EmDash (`emdash`, `@emdash-cms/cloudflare`, `emdash/astro`, `emdash/ui`)
- **スタイリング**: Vanilla CSS による専用デザインシステム (`src/styles/global.css`)
- **UI コンポーネント**: Astro コンポーネントおよび React（EmDash 管理画面・UI が内部で使用）
- **本番インフラ**: Cloudflare Pages / Workers (`@astrojs/cloudflare`, D1 データベース `DB`, R2 メディアストレージ `MEDIA`)
- **ローカル開発**: Node / SQLite (`@astrojs/node`, SQLite `file:./data.db`, ローカルメディア保存 `./uploads`)

### 3.2 デュアルモード（環境切り替え）設定
`astro.config.mjs` にて環境変数（`CLOUDFLARE=true` または `CF_PAGES=1`）を検知し、動作モードを自動切り替え：
- **Cloudflare モード**: `@astrojs/cloudflare` アダプタ、`d1({ binding: "DB", session: "auto" })`、`r2({ binding: "MEDIA" })`
- **ローカル Node モード**: `@astrojs/node` アダプタ、`sqlite({ url: "file:./data.db" })`、`local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" })`

### 3.3 Cloudflare 設定 (`wrangler.jsonc`)
- `compatibility_date`: `2026-02-24`
- `compatibility_flags`: `["nodejs_compat"]`
- `assets`: `{ "directory": "./dist" }`
- `d1_databases`: `binding: "DB"`, `database_name: "blog-db"`
- `r2_buckets`: `binding: "MEDIA"`, `bucket_name: "blog-media"`

---

## 4. データスキーマと初期シードデータ (`seed/seed.json`)

### 4.1 コレクション定義
- `posts` (ブログ記事):
  - フィールド:
    - `title` (`string`, 必須, 検索対象)
    - `slug` (`string`, 必須, URLスラッグ)
    - `excerpt` (`text`, 記事抜粋, 検索対象)
    - `featured_image` (`image`, アイキャッチ画像オブジェクト)
    - `content` (`portableText`, リッチテキスト本文, 検索対象)
  - サポート機能: `["drafts", "revisions", "search", "seo"]` (下書き、履歴、検索、SEOメタ)

### 4.2 タクソノミー（分類体系）
- `category` (カテゴリ・階層構造):
  - 初期ターム例: `Tech` (技術), `Design` (デザイン), `Thoughts` (考察・随筆)
- `tag` (タグ・フラット構造):
  - 初期ターム例: `Astro`, `TypeScript`, `Cloudflare`, `Minimalism`

### 4.3 サイト設定および初期コンテンツ
- サイトタイトル: `Journal`
- タグライン: `Reflections on software, design, and ideas.`
- ナビゲーションメニュー: ホーム (`/`), カテゴリ一覧
- サンプル記事:
  - リッチなタイポグラフィ（見出し、引用、箇条書き、コードブロック、太字・斜体）を含む日本語・英語のサンプル記事を 2〜3 件登録。

---

## 5. UI / UX およびデザインシステム

### 5.1 カラーパレットとデザイントークン
- メイン背景 (`--bg`): `#ffffff` (ピュアホワイト)
- サブ背景 / カード (`--bg-subtle`): `#fafafa` (ごく淡いニュートラルグレー)
- ホバー時背景 (`--bg-hover`): `#f4f4f5`
- 主テキスト (`--text-main`): `#111827` (コントラストの高いディープチャコール)
- 副テキスト (`--text-muted`): `#4b5563` (落ち着いたグレー)
- キャプション / 日付 (`--text-dim`): `#9ca3af`
- ボーダー / 区切り線 (`--border`): `#e5e7eb` (1px の繊細な極細線)
- バッジ / 強調アクセント (`--accent`): `#18181b`

### 5.2 タイポグラフィとリーダビリティ
- 欧文フォント: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- 和文フォント: `Hiragino Sans`, `Noto Sans JP`, `sans-serif`
- 等幅フォント (コード): `JetBrains Mono`, `ui-monospace`, `monospace`
- リズムと余白:
  - 本文行高: `line-height: 1.8`
  - タイトル行高: `line-height: 1.25`
  - 見出しレタースペーシング: `letter-spacing: -0.02em`
  - 本文最大幅: `720px` (長文でも視線移動がスムーズな黄金比的幅)
  - 一覧コンテナ最大幅: `960px`

### 5.3 ページ構成とコンポーネント
1. **共通レイアウト (`BaseLayout.astro`)**:
   - `<EmDashHead />`, `<EmDashBodyStart />`, `<EmDashBodyEnd />` を組み込み、SEOタグ、共通ヘッダー、フッターを内包。
2. **コンポーネント**:
   - `Header.astro`: サイトロゴおよびナビゲーションリンク
   - `Footer.astro`: コピーライトおよび補助リンク
   - `PostCard.astro`: 日付、カテゴリバッジ、タイトル、抜粋、繊細なホバー効果を持つカード
   - `FormattedDate.astro`: 日付フォーマット表示（例: `2026年8月17日`）
   - `TagBadge.astro`: タグおよびカテゴリのピル型バッジ
3. **ページルーティング**:
   - `src/pages/index.astro`: トップページ（サイト紹介文、カテゴリ絞り込みリンク、最新記事フィード）
   - `src/pages/posts/[...slug].astro`: 記事詳細（タイトル、日付、カテゴリ、アイキャッチ `<Image />`、本文 `<PortableText />`、前後の記事ナビ）
   - `src/pages/categories/[slug].astro`: 特定カテゴリの記事一覧
   - `src/pages/tags/[slug].astro`: 特定タグの記事一覧
   - `src/pages/404.astro`: シックな 404 エラーページ

---

## 6. ディレクトリ構成

```text
.
├── .mise.toml                # mise によるツールバージョン定義
├── mise.lock                 # mise バージョン固定ロックファイル
├── astro.config.mjs          # Astro + EmDash 設定 (Node / Cloudflare 両対応)
├── wrangler.jsonc            # Cloudflare Pages / Workers (D1, R2) 設定
├── package.json              # 依存関係定義
├── tsconfig.json             # TypeScript 設定
├── seed/
│   └── seed.json             # スキーマ定義・初期カテゴリ・サンプル記事
├── src/
│   ├── live.config.ts        # EmDash の Live Collection 設定 (必須ボイラープレート)
│   ├── layouts/
│   │   └── BaseLayout.astro  # 共通ベースレイアウト
│   ├── pages/
│   │   ├── index.astro       # トップページ (記事一覧)
│   │   ├── posts/
│   │   │   └── [...slug].astro # 記事詳細
│   │   ├── categories/
│   │   │   └── [slug].astro  # カテゴリ別記事一覧
│   │   ├── tags/
│   │   │   └── [slug].astro  # タグ別記事一覧
│   │   └── 404.astro         # 404 エラーページ
│   ├── components/
│   │   ├── Header.astro      # ヘッダー
│   │   ├── Footer.astro      # フッター
│   │   ├── PostCard.astro    # 記事カード
│   │   ├── FormattedDate.astro # 日付表示
│   │   └── TagBadge.astro    # タグ/カテゴリバッジ
│   └── styles/
│       └── global.css        # モダン・シックなCSSデザインシステム
```

---

## 7. 検証と品質基準
1. `mise install` で Node.js および pnpm のバージョンが固定・適用されること。
2. `pnpm install` で依存関係が正常に解決・インストールされること。
3. `pnpm dev` でローカルサーバー（`http://localhost:4321`）が正常起動し、SQLite によるシードデータ初期化が完了すること。
4. 各画面（`/`, `/posts/sample-post`, `/categories/tech`, `/tags/astro`, `/404`）が美しいデザインとレスポンシブ表示で描画されること。
5. EmDash 管理画面（`http://localhost:4321/_emdash/admin`）にアクセス可能であること。
6. `CLOUDFLARE=true pnpm build` を実行し、Cloudflare 向けバンドルがエラーなくビルドされること。
