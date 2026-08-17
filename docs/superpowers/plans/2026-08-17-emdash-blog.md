# EmDash & Cloudflare Modern Chic Blog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a chic, minimal personal blog using EmDash CMS on Astro, deployable to Cloudflare Pages/Workers (D1 + R2) and runnable locally via SQLite, with all development tools version-locked via `mise`.

**Architecture:** A server-rendered Astro project configured with the `emdash` integration. Uses a dual-mode adapter setup in `astro.config.mjs` that selects `@astrojs/cloudflare` + `@emdash-cms/cloudflare` (D1/R2) in production and `@astrojs/node` + SQLite in local development. Schema and seed content are managed via `seed/seed.json`, and the UI is powered by a custom Modern Chic CSS design system.

**Tech Stack:** Astro, EmDash (`emdash`, `@emdash-cms/cloudflare`), React (for EmDash UI/Admin), `@astrojs/cloudflare`, `@astrojs/node`, `@astrojs/react`, TypeScript, Vanilla CSS, mise (Node.js & pnpm version management), Wrangler.

**Spec:** `docs/superpowers/specs/2026-08-17-emdash-blog-design.md`

## Global Constraints
- Development tools MUST be managed via `mise` (`mise.toml`, `mise.lock`).
- All pages must be server-rendered (`output: "server"`).
- Dual-mode environment detection via `process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1"`.
- Typography & tone: Modern Chic (monochrome palette, refined sans-serif, 1px delicate borders, generous whitespace).
- Strict adherence to EmDash rules: `image` fields are objects (`<Image image={...} />`), use `Astro.cache.set(cacheHint)` on all content queries.

---

### Task 1: Environment Setup with mise, package.json, and tsconfig.json

**Files:**
- Create: `mise.toml`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

**Interfaces:**
- Consumes: Node & pnpm from mise
- Produces: Installed dependencies (`node_modules`), `mise.lock`, base TypeScript configuration

- [ ] **Step 1: Create `mise.toml`**

```toml
[tools]
node = "22"
pnpm = "10"
```

- [ ] **Step 2: Run `mise install` and generate `mise.lock`**

Run: `mise install && mise lock`
Expected: Node and pnpm are installed and activated for the workspace; `mise.lock` is created.

- [ ] **Step 3: Create `.gitignore`**

```gitignore
node_modules/
dist/
.astro/
.emdash/
uploads/
*.db
*.db-journal
.wrangler/
.env
.env.*
!.env.example
```

- [ ] **Step 4: Create `package.json`**

```json
{
  "name": "blog",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "start": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "types": "emdash types"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^12.6.2",
    "@astrojs/node": "^9.1.3",
    "@astrojs/react": "^4.2.1",
    "@emdash-cms/cloudflare": "^0.33.0",
    "astro": "^5.4.2",
    "emdash": "^0.33.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.13.9",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "typescript": "^5.8.2",
    "wrangler": "^3.114.0"
  }
}
```

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*", "emdash-env.d.ts"],
  "exclude": ["dist"],
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strictNullChecks": true
  }
}
```

- [ ] **Step 6: Run `mise exec -- pnpm install` to install dependencies**

Run: `mise exec -- pnpm install`
Expected: Dependencies installed successfully, `pnpm-lock.yaml` created.

- [ ] **Step 7: Commit**

```bash
git add mise.toml mise.lock .gitignore package.json tsconfig.json pnpm-lock.yaml
git commit -m "chore: initialize project with mise, package.json, and tsconfig"
```

---

### Task 2: Core Configuration (Astro Dual-Mode, Cloudflare Wrangler, EmDash Live Loader)

**Files:**
- Create: `astro.config.mjs`
- Create: `wrangler.jsonc`
- Create: `src/live.config.ts`

**Interfaces:**
- Consumes: `package.json` dependencies
- Produces: Server configuration for Astro SSR supporting both local SQLite and Cloudflare D1/R2, live collection registration

- [ ] **Step 1: Create `astro.config.mjs`**

```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";
import cloudflare from "@astrojs/cloudflare";
import emdash, { local } from "emdash/astro";
import { sqlite } from "emdash/db";
import { d1, r2 } from "@emdash-cms/cloudflare";

const isCloudflare = process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1";

export default defineConfig({
  output: "server",
  adapter: isCloudflare ? cloudflare() : node({ mode: "standalone" }),
  image: {
    layout: "constrained",
    responsiveStyles: true,
  },
  integrations: [
    react(),
    emdash(
      isCloudflare
        ? {
            database: d1({ binding: "DB", session: "auto" }),
            storage: r2({ binding: "MEDIA" }),
          }
        : {
            database: sqlite({ url: "file:./data.db" }),
            storage: local({
              directory: "./uploads",
              baseUrl: "/_emdash/api/media/file",
            }),
          }
    ),
  ],
  devToolbar: { enabled: false },
});
```

- [ ] **Step 2: Create `wrangler.jsonc`**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "blog",
  "compatibility_date": "2026-02-24",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist"
  },
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "blog-db",
      "database_id": "blog-db"
    }
  ],
  "r2_buckets": [
    {
      "binding": "MEDIA",
      "bucket_name": "blog-media"
    }
  ]
}
```

- [ ] **Step 3: Create `src/live.config.ts`**

```typescript
import { defineLiveCollection } from "astro:content";
import { emdashLoader } from "emdash/runtime";

export const collections = {
  _emdash: defineLiveCollection({ loader: emdashLoader() }),
};
```

- [ ] **Step 4: Commit**

```bash
git add astro.config.mjs wrangler.jsonc src/live.config.ts
git commit -m "config: configure Astro dual-mode adapter, wrangler, and live collection"
```

---

### Task 3: Schema & Initial Seed Definition (`seed/seed.json`)

**Files:**
- Create: `seed/seed.json`

**Interfaces:**
- Consumes: EmDash seed format
- Produces: Initial database schema (`posts`), taxonomies (`category`, `tag`), menus, site settings, and sample articles

- [ ] **Step 1: Create `seed/seed.json`**

```json
{
  "$schema": "https://emdashcms.com/seed.schema.json",
  "version": "1",
  "meta": {
    "name": "Journal",
    "description": "A chic, modern personal blog built with EmDash and Cloudflare",
    "author": "Author"
  },
  "settings": {
    "title": "Journal",
    "tagline": "Reflections on software, design, and ideas."
  },
  "collections": [
    {
      "slug": "posts",
      "label": "Posts",
      "labelSingular": "Post",
      "supports": ["drafts", "revisions", "search", "seo"],
      "commentsEnabled": false,
      "fields": [
        { "slug": "title", "label": "Title", "type": "string", "required": true, "searchable": true },
        { "slug": "featured_image", "label": "Featured Image", "type": "image" },
        { "slug": "excerpt", "label": "Excerpt", "type": "text", "searchable": true },
        { "slug": "content", "label": "Content", "type": "portableText", "searchable": true }
      ]
    }
  ],
  "taxonomies": [
    {
      "name": "category",
      "label": "Categories",
      "labelSingular": "Category",
      "hierarchical": true,
      "collections": ["posts"],
      "terms": [
        { "slug": "tech", "label": "Technology" },
        { "slug": "design", "label": "Design" },
        { "slug": "thoughts", "label": "Thoughts" }
      ]
    },
    {
      "name": "tag",
      "label": "Tags",
      "labelSingular": "Tag",
      "hierarchical": false,
      "collections": ["posts"],
      "terms": [
        { "slug": "astro", "label": "Astro" },
        { "slug": "cloudflare", "label": "Cloudflare" },
        { "slug": "minimalism", "label": "Minimalism" },
        { "slug": "architecture", "label": "Architecture" }
      ]
    }
  ],
  "menus": [
    {
      "name": "primary",
      "label": "Primary Navigation",
      "items": [
        { "type": "custom", "label": "Home", "url": "/" },
        { "type": "custom", "label": "Tech", "url": "/categories/tech" },
        { "type": "custom", "label": "Design", "url": "/categories/design" },
        { "type": "custom", "label": "Thoughts", "url": "/categories/thoughts" }
      ]
    }
  ],
  "bylines": [
    {
      "id": "byline-author",
      "slug": "author",
      "displayName": "Rikiya Ota"
    }
  ],
  "content": {
    "posts": [
      {
        "id": "post-first-note",
        "slug": "crafting-a-modern-blog",
        "status": "published",
        "data": {
          "title": "Crafting a Modern, Chic Digital Space",
          "excerpt": "Exploring the balance between stripped-back minimalism and engaging editorial design in personal publishing.",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                { "_type": "span", "text": "When building a personal corner on the web, there is a common tension between overly complicated interfaces and stark, uninviting placeholders. Finding the " },
                { "_type": "span", "text": "sweet spot of restraint", "marks": ["strong"] },
                { "_type": "span", "text": " means prioritizing typography, whitespace, and fast reading rhythm." }
              ]
            },
            {
              "_type": "block",
              "style": "h2",
              "children": [{ "_type": "span", "text": "Why Simplicity Matters" }]
            },
            {
              "_type": "block",
              "style": "normal",
              "children": [
                { "_type": "span", "text": "A blog's primary function is reading. Every unnecessary visual element steals focus from the author's voice and the reader's attention. By relying on a disciplined monochrome palette and high typographic standards, we create an atmosphere of quiet confidence." }
              ]
            },
            {
              "_type": "block",
              "style": "blockquote",
              "children": [
                { "_type": "span", "text": "“Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away.”" }
              ]
            },
            {
              "_type": "block",
              "style": "h2",
              "children": [{ "_type": "span", "text": "Technical Edge with EmDash & Cloudflare" }]
            },
            {
              "_type": "block",
              "style": "normal",
              "children": [
                { "_type": "span", "text": "By powering this site with EmDash on Astro and deploying to Cloudflare Workers with D1 and R2, we get lightning-fast edge delivery alongside a modern editing experience." }
              ]
            }
          ]
        },
        "bylines": [
          { "byline": "byline-author" }
        ],
        "taxonomies": {
          "category": ["design"],
          "tag": ["minimalism", "astro"]
        }
      },
      {
        "id": "post-edge-architecture",
        "slug": "serverless-edge-with-d1",
        "status": "published",
        "data": {
          "title": "Architecting at the Edge: Astro & Cloudflare D1",
          "excerpt": "A deep dive into building fast, scalable dynamic sites with SQLite-based edge databases.",
          "content": [
            {
              "_type": "block",
              "style": "normal",
              "children": [
                { "_type": "span", "text": "Edge compute has revolutionized web architecture. Instead of routing requests back to a single origin server, compute and data now live closest to the end user." }
              ]
            },
            {
              "_type": "block",
              "style": "h2",
              "children": [{ "_type": "span", "text": "Dual-Mode Flexibility" }]
            },
            {
              "_type": "block",
              "style": "normal",
              "children": [
                { "_type": "span", "text": "During local development, running against a standard local SQLite file gives instantaneous feedback. When deployed to Cloudflare, the exact same queries map seamlessly to Cloudflare D1." }
              ]
            }
          ]
        },
        "bylines": [
          { "byline": "byline-author" }
        ],
        "taxonomies": {
          "category": ["tech"],
          "tag": ["cloudflare", "architecture"]
        }
      }
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add seed/seed.json
git commit -m "feat: define blog schema, taxonomies, and initial seed content"
```

---

### Task 4: Global CSS & Modern Chic Design System

**Files:**
- Create: `src/styles/global.css`

**Interfaces:**
- Produces: CSS design tokens, modern typography rules, responsive container widths, resets, link hover effects, PortableText content styles

- [ ] **Step 1: Create `src/styles/global.css`**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Sans+JP:wght@300;400;500;700&display=swap');

:root {
  /* Modern Chic Palette */
  --bg: #ffffff;
  --bg-subtle: #fafafa;
  --bg-hover: #f4f4f5;
  --bg-tag: #f3f4f6;

  --text-main: #111827;
  --text-muted: #4b5563;
  --text-dim: #9ca3af;

  --border: #e5e7eb;
  --border-dark: #18181b;
  --accent: #18181b;

  /* Typography */
  --font-sans: "Inter", "Noto Sans JP", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  /* Layout */
  --content-max-width: 720px;
  --container-max-width: 960px;
  --radius: 6px;
  --transition: 0.15s ease-in-out;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-sans);
  background-color: var(--bg);
  color: var(--text-main);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

a {
  color: inherit;
  text-decoration: none;
  transition: color var(--transition);
}

a:hover {
  color: var(--accent);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Containers */
.site-container {
  width: 100%;
  max-width: var(--container-max-width);
  margin-inline: auto;
  padding-inline: 1.5rem;
}

.content-container {
  width: 100%;
  max-width: var(--content-max-width);
  margin-inline: auto;
  padding-inline: 1.5rem;
}

/* PortableText / Rich Prose Styling */
.prose {
  font-size: 1.0625rem;
  line-height: 1.85;
  color: var(--text-main);
  letter-spacing: -0.01em;
}

.prose p {
  margin-bottom: 1.75rem;
}

.prose h1, .prose h2, .prose h3, .prose h4 {
  color: var(--text-main);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.prose h2 {
  font-size: 1.5rem;
  margin-top: 2.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border);
}

.prose h3 {
  font-size: 1.25rem;
  margin-top: 2.25rem;
  margin-bottom: 0.75rem;
}

.prose ul, .prose ol {
  margin-bottom: 1.75rem;
  padding-left: 1.5rem;
}

.prose li {
  margin-bottom: 0.5rem;
}

.prose blockquote {
  margin: 2rem 0;
  padding: 1rem 1.5rem;
  border-left: 3px solid var(--text-main);
  background-color: var(--bg-subtle);
  font-style: italic;
  color: var(--text-muted);
}

.prose code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background-color: var(--bg-subtle);
  padding: 0.2em 0.4em;
  border-radius: 4px;
  border: 1px solid var(--border);
}

.prose pre {
  margin: 1.75rem 0;
  padding: 1.25rem;
  background-color: #0f172a;
  color: #f8fafc;
  border-radius: var(--radius);
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 0.9rem;
  line-height: 1.5;
}

.prose pre code {
  background: none;
  padding: 0;
  border: none;
  color: inherit;
}

.prose hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 3rem 0;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "style: add global CSS tokens and modern chic typography system"
```

---

### Task 5: Layout & Reusable UI Components

**Files:**
- Create: `src/components/FormattedDate.astro`
- Create: `src/components/TagBadge.astro`
- Create: `src/components/PostCard.astro`
- Create: `src/components/Header.astro`
- Create: `src/components/Footer.astro`
- Create: `src/layouts/BaseLayout.astro`

**Interfaces:**
- Consumes: EmDash types, `global.css`, `emdash/ui`
- Produces: Responsive site shell, header, footer, post cards, date & tag formatters

- [ ] **Step 1: Create `src/components/FormattedDate.astro`**

```astro
---
interface Props {
  date: Date | string | number | null | undefined;
}

const { date } = Astro.props;
if (!date) return null;

const d = date instanceof Date ? date : new Date(date);
const formatted = d.toLocaleDateString("ja-JP", {
  year: "numeric",
  month: "short",
  day: "numeric",
});
---
<time datetime={d.toISOString()}>{formatted}</time>
```

- [ ] **Step 2: Create `src/components/TagBadge.astro`**

```astro
---
interface Props {
  slug: string;
  label?: string;
  type?: "category" | "tag";
}

const { slug, label, type = "tag" } = Astro.props;
const displayLabel = label || slug;
const href = type === "category" ? `/categories/${slug}` : `/tags/${slug}`;
---
<a href={href} class={`badge badge-${type}`}>
  {type === "tag" ? `#${displayLabel}` : displayLabel}
</a>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 500;
    padding: 0.2rem 0.6rem;
    border-radius: 9999px;
    background-color: var(--bg-tag);
    color: var(--text-muted);
    border: 1px solid var(--border);
    transition: all var(--transition);
    letter-spacing: 0.01em;
  }

  .badge:hover {
    background-color: var(--accent);
    color: var(--bg);
    border-color: var(--accent);
  }

  .badge-category {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
  }
</style>
```

- [ ] **Step 3: Create `src/components/PostCard.astro`**

```astro
---
import FormattedDate from "./FormattedDate.astro";
import TagBadge from "./TagBadge.astro";

interface Props {
  title: string;
  slug: string;
  excerpt?: string;
  publishedAt?: Date | string | null;
  category?: { slug: string; label: string } | null;
}

const { title, slug, excerpt, publishedAt, category } = Astro.props;
---
<article class="post-card">
  <div class="card-meta">
    {category && <TagBadge slug={category.slug} label={category.label} type="category" />}
    {publishedAt && (
      <span class="card-date">
        <FormattedDate date={publishedAt} />
      </span>
    )}
  </div>
  <h2 class="card-title">
    <a href={`/posts/${slug}`}>{title}</a>
  </h2>
  {excerpt && <p class="card-excerpt">{excerpt}</p>}
  <div class="card-footer">
    <a href={`/posts/${slug}`} class="read-more">Read article →</a>
  </div>
</article>

<style>
  .post-card {
    padding: 2rem 0;
    border-bottom: 1px solid var(--border);
    transition: transform var(--transition);
  }

  .post-card:last-child {
    border-bottom: none;
  }

  .card-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.8125rem;
  }

  .card-date {
    color: var(--text-dim);
  }

  .card-title {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.3;
    margin-bottom: 0.5rem;
  }

  .card-title a {
    color: var(--text-main);
  }

  .card-title a:hover {
    color: var(--text-muted);
  }

  .card-excerpt {
    color: var(--text-muted);
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1rem;
  }

  .card-footer {
    display: flex;
    align-items: center;
  }

  .read-more {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-main);
    letter-spacing: 0.01em;
  }

  .read-more:hover {
    text-decoration: underline;
  }
</style>
```

- [ ] **Step 4: Create `src/components/Header.astro`**

```astro
---
import { getSiteSettings, getMenu } from "emdash";

const siteSettings = await getSiteSettings().catch(() => null);
const siteTitle = siteSettings?.title || "Journal";
const siteTagline = siteSettings?.tagline || "Reflections on software, design, and ideas.";
const menu = await getMenu("primary").catch(() => null);
---
<header class="site-header">
  <div class="site-container header-inner">
    <div class="brand">
      <a href="/" class="site-logo">{siteTitle}</a>
      <span class="site-tagline">{siteTagline}</span>
    </div>
    <nav class="nav">
      <ul class="nav-list">
        {menu?.items?.map((item) => (
          <li class="nav-item">
            <a href={item.url} class="nav-link">{item.label}</a>
          </li>
        )) || (
          <>
            <li class="nav-item"><a href="/" class="nav-link">Home</a></li>
            <li class="nav-item"><a href="/categories/tech" class="nav-link">Tech</a></li>
            <li class="nav-item"><a href="/categories/design" class="nav-link">Design</a></li>
            <li class="nav-item"><a href="/categories/thoughts" class="nav-link">Thoughts</a></li>
          </>
        )}
      </ul>
    </nav>
  </div>
</header>

<style>
  .site-header {
    border-bottom: 1px solid var(--border);
    padding: 1.5rem 0;
    background-color: var(--bg);
    position: sticky;
    top: 0;
    z-index: 50;
    backdrop-filter: blur(8px);
    background-color: rgba(255, 255, 255, 0.9);
  }

  .header-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1.5rem;
  }

  .brand {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .site-logo {
    font-size: 1.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-main);
  }

  .site-tagline {
    font-size: 0.75rem;
    color: var(--text-dim);
    letter-spacing: -0.01em;
  }

  .nav-list {
    display: flex;
    list-style: none;
    gap: 1.25rem;
  }

  .nav-link {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
    transition: color var(--transition);
  }

  .nav-link:hover {
    color: var(--text-main);
  }

  @media (max-width: 640px) {
    .site-tagline {
      display: none;
    }
    .nav-list {
      gap: 0.85rem;
    }
  }
</style>
```

- [ ] **Step 5: Create `src/components/Footer.astro`**

```astro
---
const currentYear = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="site-container footer-inner">
    <p class="copyright">© {currentYear} Journal. All rights reserved.</p>
    <div class="footer-links">
      <a href="/_emdash/admin" class="admin-link">Admin</a>
      <a href="#top" class="back-to-top">Back to top ↑</a>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    border-top: 1px solid var(--border);
    margin-top: auto;
    padding: 2.5rem 0;
    background-color: var(--bg-subtle);
  }

  .footer-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.8125rem;
    color: var(--text-dim);
  }

  .footer-links {
    display: flex;
    gap: 1.5rem;
  }

  .admin-link, .back-to-top {
    color: var(--text-muted);
    transition: color var(--transition);
  }

  .admin-link:hover, .back-to-top:hover {
    color: var(--text-main);
  }
</style>
```

- [ ] **Step 6: Create `src/layouts/BaseLayout.astro`**

```astro
---
import Header from "../components/Header.astro";
import Footer from "../components/Footer.astro";
import { EmDashHead, EmDashBodyStart, EmDashBodyEnd } from "emdash/ui";
import "../styles/global.css";

interface Props {
  title?: string;
  description?: string;
  image?: string;
}

const {
  title = "Journal",
  description = "A chic, modern personal blog built with EmDash and Cloudflare",
  image,
} = Astro.props;

const pageTitle = title === "Journal" ? title : `${title} | Journal`;
---
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{pageTitle}</title>
    <meta name="description" content={description} />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    {image && <meta property="og:image" content={image} />}
    <EmDashHead />
  </head>
  <body id="top">
    <EmDashBodyStart />
    <Header />
    <main class="main-content">
      <slot />
    </main>
    <Footer />
    <EmDashBodyEnd />
  </body>
</html>

<style>
  .main-content {
    flex: 1;
    padding: 2.5rem 0 4rem;
  }
</style>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/layouts/BaseLayout.astro
git commit -m "feat: implement BaseLayout, Header, Footer, and article presentation components"
```

---

### Task 6: Pages Implementation (Home, Post Detail, Category Archive, Tag Archive, 404)

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/posts/[...slug].astro`
- Create: `src/pages/categories/[slug].astro`
- Create: `src/pages/tags/[slug].astro`
- Create: `src/pages/404.astro`

**Interfaces:**
- Consumes: `getEmDashCollection`, `getEmDashEntry`, `getTaxonomyTerms`, `getEntriesByTerm`, `PortableText`, `Image` from `emdash` and `emdash/ui`
- Produces: Fully interactive server-rendered public pages

- [ ] **Step 1: Create `src/pages/index.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import PostCard from "../components/PostCard.astro";
import TagBadge from "../components/TagBadge.astro";
import { getEmDashCollection, getTaxonomyTerms, getEntryTerms } from "emdash";

const { entries: posts, cacheHint } = await getEmDashCollection("posts", {
  limit: 20,
  orderBy: { createdAt: "desc" },
});

Astro.cache?.set?.(cacheHint);

const categories = await getTaxonomyTerms("category").catch(() => []);

// Attach terms for each post
const postsWithCategory = await Promise.all(
  posts.map(async (post) => {
    const terms = await getEntryTerms("posts", post.data.id).catch(() => []);
    const categoryTerm = terms.find((t) => t.taxonomy === "category");
    return {
      post,
      category: categoryTerm ? { slug: categoryTerm.slug, label: categoryTerm.label } : null,
    };
  })
);
---
<BaseLayout title="Home" description="Reflections on software, design, and ideas.">
  <div class="site-container">
    <header class="home-hero">
      <h1 class="hero-title">Thoughts, writings & craft.</h1>
      <p class="hero-desc">
        A curated log of thoughts on software engineering, clean design systems, and modern edge infrastructure.
      </p>

      {categories.length > 0 && (
        <div class="filter-pills">
          <span class="filter-label">Filter by topic:</span>
          {categories.map((cat) => (
            <TagBadge slug={cat.slug} label={cat.label} type="category" />
          ))}
        </div>
      )}
    </header>

    <section class="posts-feed">
      {postsWithCategory.length === 0 ? (
        <div class="empty-state">
          <p>No articles published yet.</p>
        </div>
      ) : (
        postsWithCategory.map(({ post, category }) => (
          <PostCard
            title={post.data.title}
            slug={post.slug || post.id}
            excerpt={post.data.excerpt}
            publishedAt={post.publishedAt || post.createdAt}
            category={category}
          />
        ))
      )}
    </section>
  </div>
</BaseLayout>

<style>
  .home-hero {
    padding-bottom: 2.5rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .hero-title {
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.2;
    margin-bottom: 0.75rem;
    color: var(--text-main);
  }

  .hero-desc {
    font-size: 1.0625rem;
    color: var(--text-muted);
    max-width: 600px;
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .filter-pills {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: 0.8125rem;
    color: var(--text-dim);
    margin-right: 0.25rem;
  }

  .posts-feed {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--text-dim);
  }
</style>
```

- [ ] **Step 2: Create `src/pages/posts/[...slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import FormattedDate from "../../components/FormattedDate.astro";
import TagBadge from "../../components/TagBadge.astro";
import { getEmDashEntry, getEntryTerms } from "emdash";
import { PortableText, Image } from "emdash/ui";

const { slug } = Astro.params;
if (!slug) {
  return Astro.redirect("/404");
}

const { entry: post, cacheHint } = await getEmDashEntry("posts", slug);
if (!post) {
  return Astro.redirect("/404");
}

Astro.cache?.set?.(cacheHint);

const terms = await getEntryTerms("posts", post.data.id).catch(() => []);
const categoryTerm = terms.find((t) => t.taxonomy === "category");
const tags = terms.filter((t) => t.taxonomy === "tag");
---
<BaseLayout
  title={post.data.title}
  description={post.data.excerpt || post.data.title}
>
  <article class="post-detail">
    <div class="content-container">
      <nav class="back-nav">
        <a href="/">← Back to all posts</a>
      </nav>

      <header class="detail-header">
        <div class="detail-meta">
          {categoryTerm && <TagBadge slug={categoryTerm.slug} label={categoryTerm.label} type="category" />}
          <span class="detail-date">
            <FormattedDate date={post.publishedAt || post.createdAt} />
          </span>
        </div>
        <h1 class="detail-title">{post.data.title}</h1>
        {post.data.excerpt && <p class="detail-excerpt">{post.data.excerpt}</p>}
      </header>

      {post.data.featured_image && (
        <div class="detail-featured-image">
          <Image image={post.data.featured_image} />
        </div>
      )}

      <div class="prose">
        {post.data.content ? (
          <PortableText value={post.data.content} />
        ) : (
          <p>No content in this post.</p>
        )}
      </div>

      {tags.length > 0 && (
        <footer class="detail-footer">
          <div class="tags-list">
            <span class="tags-label">Tags:</span>
            {tags.map((tag) => (
              <TagBadge slug={tag.slug} label={tag.label} type="tag" />
            ))}
          </div>
        </footer>
      )}
    </div>
  </article>
</BaseLayout>

<style>
  .back-nav {
    margin-bottom: 2rem;
  }

  .back-nav a {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .back-nav a:hover {
    color: var(--text-main);
  }

  .detail-header {
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .detail-meta {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
    font-size: 0.875rem;
  }

  .detail-date {
    color: var(--text-dim);
  }

  .detail-title {
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.25;
    color: var(--text-main);
    margin-bottom: 1rem;
  }

  .detail-excerpt {
    font-size: 1.125rem;
    line-height: 1.6;
    color: var(--text-muted);
  }

  .detail-featured-image {
    margin-bottom: 2.5rem;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid var(--border);
  }

  .detail-footer {
    margin-top: 3.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .tags-list {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tags-label {
    font-size: 0.8125rem;
    color: var(--text-dim);
    margin-right: 0.25rem;
  }

  @media (max-width: 640px) {
    .detail-title {
      font-size: 1.85rem;
    }
  }
</style>
```

- [ ] **Step 3: Create `src/pages/categories/[slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostCard from "../../components/PostCard.astro";
import { getTerm, getEntriesByTerm, getEntryTerms } from "emdash";

const { slug } = Astro.params;
if (!slug) {
  return Astro.redirect("/404");
}

const term = await getTerm("category", slug).catch(() => null);
if (!term) {
  return Astro.redirect("/404");
}

const { entries: posts, cacheHint } = await getEntriesByTerm("category", slug, {
  collection: "posts",
  limit: 20,
  orderBy: { createdAt: "desc" },
});

Astro.cache?.set?.(cacheHint);

const postsWithCategory = await Promise.all(
  posts.map(async (post) => {
    const terms = await getEntryTerms("posts", post.data.id).catch(() => []);
    const categoryTerm = terms.find((t) => t.taxonomy === "category");
    return {
      post,
      category: categoryTerm ? { slug: categoryTerm.slug, label: categoryTerm.label } : null,
    };
  })
);
---
<BaseLayout title={`Category: ${term.label}`}>
  <div class="site-container">
    <header class="archive-header">
      <nav class="back-nav">
        <a href="/">← Back to all posts</a>
      </nav>
      <span class="archive-type">Category</span>
      <h1 class="archive-title">{term.label}</h1>
      <p class="archive-desc">Articles filed under {term.label}</p>
    </header>

    <section class="posts-feed">
      {postsWithCategory.length === 0 ? (
        <div class="empty-state">
          <p>No posts in this category yet.</p>
        </div>
      ) : (
        postsWithCategory.map(({ post, category }) => (
          <PostCard
            title={post.data.title}
            slug={post.slug || post.id}
            excerpt={post.data.excerpt}
            publishedAt={post.publishedAt || post.createdAt}
            category={category}
          />
        ))
      )}
    </section>
  </div>
</BaseLayout>

<style>
  .archive-header {
    padding-bottom: 2rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .back-nav {
    margin-bottom: 1.25rem;
  }

  .back-nav a {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .archive-type {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .archive-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-main);
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .archive-desc {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .posts-feed {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--text-dim);
  }
</style>
```

- [ ] **Step 4: Create `src/pages/tags/[slug].astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import PostCard from "../../components/PostCard.astro";
import { getTerm, getEntriesByTerm, getEntryTerms } from "emdash";

const { slug } = Astro.params;
if (!slug) {
  return Astro.redirect("/404");
}

const term = await getTerm("tag", slug).catch(() => null);
if (!term) {
  return Astro.redirect("/404");
}

const { entries: posts, cacheHint } = await getEntriesByTerm("tag", slug, {
  collection: "posts",
  limit: 20,
  orderBy: { createdAt: "desc" },
});

Astro.cache?.set?.(cacheHint);

const postsWithCategory = await Promise.all(
  posts.map(async (post) => {
    const terms = await getEntryTerms("posts", post.data.id).catch(() => []);
    const categoryTerm = terms.find((t) => t.taxonomy === "category");
    return {
      post,
      category: categoryTerm ? { slug: categoryTerm.slug, label: categoryTerm.label } : null,
    };
  })
);
---
<BaseLayout title={`Tag: #${term.label}`}>
  <div class="site-container">
    <header class="archive-header">
      <nav class="back-nav">
        <a href="/">← Back to all posts</a>
      </nav>
      <span class="archive-type">Tag</span>
      <h1 class="archive-title">#{term.label}</h1>
      <p class="archive-desc">Articles tagged with #{term.label}</p>
    </header>

    <section class="posts-feed">
      {postsWithCategory.length === 0 ? (
        <div class="empty-state">
          <p>No posts tagged with this term yet.</p>
        </div>
      ) : (
        postsWithCategory.map(({ post, category }) => (
          <PostCard
            title={post.data.title}
            slug={post.slug || post.id}
            excerpt={post.data.excerpt}
            publishedAt={post.publishedAt || post.createdAt}
            category={category}
          />
        ))
      )}
    </section>
  </div>
</BaseLayout>

<style>
  .archive-header {
    padding-bottom: 2rem;
    margin-bottom: 1.5rem;
    border-bottom: 1px solid var(--border);
  }

  .back-nav {
    margin-bottom: 1.25rem;
  }

  .back-nav a {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .archive-type {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-dim);
  }

  .archive-title {
    font-size: 2rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-main);
    margin-top: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .archive-desc {
    color: var(--text-muted);
    font-size: 0.95rem;
  }

  .posts-feed {
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    padding: 3rem 0;
    text-align: center;
    color: var(--text-dim);
  }
</style>
```

- [ ] **Step 5: Create `src/pages/404.astro`**

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
---
<BaseLayout title="Page Not Found">
  <div class="site-container error-container">
    <span class="error-code">404</span>
    <h1 class="error-title">Page not found</h1>
    <p class="error-desc">The page you were looking for doesn't exist or may have been moved.</p>
    <a href="/" class="home-btn">Return to homepage →</a>
  </div>
</BaseLayout>

<style>
  .error-container {
    padding: 6rem 0;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .error-code {
    font-size: 1rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--text-dim);
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .error-title {
    font-size: 2.5rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--text-main);
    margin-bottom: 1rem;
  }

  .error-desc {
    font-size: 1.0625rem;
    color: var(--text-muted);
    max-width: 440px;
    margin-bottom: 2rem;
    line-height: 1.6;
  }

  .home-btn {
    display: inline-flex;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--bg);
    background-color: var(--text-main);
    padding: 0.75rem 1.5rem;
    border-radius: var(--radius);
    transition: opacity var(--transition);
  }

  .home-btn:hover {
    opacity: 0.85;
  }
</style>
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/
git commit -m "feat: implement home, post detail, category, tag, and 404 pages"
```

---

### Task 7: Verification, Dev Testing & Cloudflare Production Build Check

**Files:**
- Test all pages via local dev server and Cloudflare production build check

- [ ] **Step 1: Run local dev server and check startup**

Run: `mise exec -- pnpm dev` (wait for server to start, perform HTTP GET on `http://localhost:4321/`)
Expected: Returns HTTP 200 with HTML title and seed articles rendered.

- [ ] **Step 2: Verify article detail and taxonomy routes**

Run: HTTP GET on `http://localhost:4321/posts/crafting-a-modern-blog` and `http://localhost:4321/categories/design`
Expected: Returns HTTP 200 with formatted PortableText and category lists.

- [ ] **Step 3: Verify EmDash Admin route**

Run: HTTP GET on `http://localhost:4321/_emdash/admin`
Expected: Returns HTTP 200 or 302 redirecting to setup/login wizard.

- [ ] **Step 4: Verify Cloudflare build**

Run: `mise exec -- env CLOUDFLARE=true pnpm build`
Expected: Build succeeds with exit code 0 and outputs Cloudflare worker/assets bundle to `dist/`.

- [ ] **Step 5: Commit final adjustments (if any)**

```bash
git add -A
git commit -m "chore: verify local and Cloudflare builds"
```
