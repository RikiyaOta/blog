# Modern Chic Blog with EmDash & Cloudflare Specification

## 1. Overview
Build a chic, minimal, modern personal blog site powered by **EmDash CMS** and **Astro**, deployable to **Cloudflare Pages / Workers** (with D1 and R2), while supporting seamless local development with SQLite and local storage.

The design embodies a "Modern Chic" aesthetic: refined sans-serif typography, clean monochrome tones with subtle contrast, delicate 1px borders, generous whitespace, and an immersive reading experience.

---

## 2. Technical Architecture

### 2.1 Stack
- **Framework**: Astro (Server-rendered SSR, `output: "server"`)
- **CMS**: EmDash (`emdash`, `@emdash-cms/cloudflare`, `emdash/astro`, `emdash/ui`)
- **UI / Styling**: Vanilla CSS design system (`src/styles/global.css`), Astro components, React (required by EmDash admin & UI components)
- **Deployment Target**: Cloudflare (via `@astrojs/cloudflare`, D1 Database `DB`, R2 Media `MEDIA`)
- **Local Dev Target**: Node / SQLite (`@astrojs/node`, SQLite `file:./data.db`, local media directory `./uploads`)

### 2.2 Dual-Mode Adapter Configuration
In `astro.config.mjs`:
- Check `process.env.CLOUDFLARE === "true" || process.env.CF_PAGES === "1"`:
  - If Cloudflare: use `@astrojs/cloudflare` adapter with `d1({ binding: "DB", session: "auto" })` and `r2({ binding: "MEDIA" })`.
  - If Local/Node: use `@astrojs/node` adapter with `sqlite({ url: "file:./data.db" })` and `local({ directory: "./uploads", baseUrl: "/_emdash/api/media/file" })`.

### 2.3 Cloudflare Configuration
`wrangler.jsonc` specifies:
- Compatibility date and flags (`["nodejs_compat"]`)
- Assets directory (`./dist`)
- D1 Database binding (`binding: "DB"`, `database_name: "blog-db"`)
- R2 Bucket binding (`binding: "MEDIA"`, `bucket_name: "blog-media"`)

---

## 3. Data Schema & Seed Content

### 3.1 Collections
- `posts` collection:
  - Fields:
    - `title` (`string`, required, searchable)
    - `slug` (`string`, required)
    - `excerpt` (`text`, searchable)
    - `featured_image` (`image`)
    - `content` (`portableText`, searchable)
  - Supports: `["drafts", "revisions", "search", "seo"]`
  - Comments: enabled (`commentsEnabled: true` or simple display)

### 3.2 Taxonomies
- `category` (hierarchical: true, applied to `posts`)
  - Initial terms: `Tech`, `Design`, `Thoughts`
- `tag` (hierarchical: false, applied to `posts`)
  - Initial terms: `Astro`, `TypeScript`, `Cloudflare`, `Minimalism`

### 3.3 Menus & Settings
- Primary menu: `Home` (`/`), `Posts` (`/`), `Categories` (`/categories/tech`)
- Site Settings:
  - `title`: "Journal / Notes" (configurable)
  - `tagline`: "Reflections on software, design, and ideas."

### 3.4 Seed Content (`seed/seed.json`)
Includes 2-3 beautifully written initial articles demonstrating:
- Headings, lists, blockquotes, inline formatting, code snippets
- Featured image references
- Category and tag attachments

---

## 4. UI / UX & Design System

### 4.1 Color Palette & Tokens
- Surface Background: `#ffffff`
- Sub-surface / Muted Cards: `#fafafa`
- Hover / Active Background: `#f4f4f5`
- Primary Text: `#111827` (deep crisp charcoal)
- Secondary Text: `#4b5563` (subtle neutral gray)
- Muted / Caption Text: `#9ca3af`
- Borders / Dividers: `#e5e7eb` (1px delicate hairline)
- Dark Accent / Badges: `#18181b`

### 4.2 Typography
- Headings & UI: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `sans-serif`
- Japanese: `Hiragino Sans`, `Noto Sans JP`, `sans-serif`
- Code / Monospace: `JetBrains Mono`, `ui-monospace`, `monospace`
- Reading rhythm:
  - Line height: `1.8` for body text, `1.25` for titles
  - Letter spacing: `-0.02em` for headlines, `-0.01em` for body
  - Max container width for reading: `720px` (standard article reading optimal width)
  - Max container width for lists: `960px`

### 4.3 Key Pages & Components
1. **Layouts**:
   - `BaseLayout.astro`: Shell with `<EmDashHead />`, `<EmDashBodyStart />`, `<EmDashBodyEnd />`, Header, Footer, and SEO meta tags.
2. **Components**:
   - `Header.astro`: Minimalist brand title + navigation links.
   - `Footer.astro`: Subtle copyright, back to top, taxonomy links.
   - `PostCard.astro`: Article card with publication date, category badge, post title, excerpt.
   - `FormattedDate.astro`: Clean ISO date formatting (e.g. "Aug 17, 2026").
   - `TagBadge.astro`: Clean badge styling for tags and categories.
3. **Pages**:
   - `index.astro`: Homepage showing intro note, category filter pills, and chronological post feed.
   - `posts/[...slug].astro`: Article detail view with title, date, byline, category, featured image (`<Image />`), rich content (`<PortableText />`), and back navigation.
   - `categories/[slug].astro`: Category archive page showing all posts under the specified category.
   - `tags/[slug].astro`: Tag archive page showing all posts with the specified tag.
   - `404.astro`: Chic "Page not found" error page with a return home link.

---

## 5. Directory Structure

```text
.
├── astro.config.mjs
├── wrangler.jsonc
├── package.json
├── tsconfig.json
├── seed/
│   └── seed.json
├── src/
│   ├── live.config.ts
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── posts/
│   │   │   └── [...slug].astro
│   │   ├── categories/
│   │   │   └── [slug].astro
│   │   ├── tags/
│   │   │   └── [slug].astro
│   │   └── 404.astro
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── PostCard.astro
│   │   ├── FormattedDate.astro
│   │   └── TagBadge.astro
│   └── styles/
│       └── global.css
```

---

## 6. Verification & Quality Gates
- `pnpm install` succeeds without dependency conflicts.
- `pnpm dev` boots up the dev server on `http://localhost:4321`.
- Seed data applies cleanly on initial database initialization.
- Pages render without errors: `/`, `/posts/hello-world`, `/categories/tech`, `/tags/astro`, `/404`.
- EmDash Admin is accessible at `http://localhost:4321/_emdash/admin`.
- Cloudflare production build check: `CLOUDFLARE=true pnpm build` passes with zero errors.
