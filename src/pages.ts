import * as nip19 from "nostr-tools/nip19";
import * as nip27 from "nostr-tools/nip27";
import { html, raw, safeUrl, type Html } from "./html.ts";
import type { Event, PostsPage, Profile } from "./nostr.ts";
import { config } from "./config.ts";

const STYLE = `
:root {
  --bg: #ffffff;
  --text: #1a1a1a;
  --muted: #8a8a8a;
  --rule: #cfcfcf;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #161616; --text: #e4e4e4; --muted: #8f8f8f; --rule: #474747; }
}
* { box-sizing: border-box; }
html {
  background: var(--bg);
  color: var(--text);
  font: 17px/1.8 -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", "Noto Sans JP", sans-serif;
  -webkit-text-size-adjust: 100%;
}
body { max-width: 40rem; margin: 0 auto; padding: 1rem 1rem 4rem; }
a { color: inherit; text-underline-offset: 0.2em; }
img, video { max-width: 100%; height: auto; }
h2 { font-size: 1.4rem; font-weight: 500; margin: 0 0 0.75rem; }
nav { display: flex; gap: 2rem; padding-bottom: 0.5rem; border-bottom: 1px dotted var(--rule); }
nav a { text-decoration: none; padding-bottom: 0.25rem; }
nav a[aria-current="page"] { border-bottom: 1px dotted currentColor; }
header, section, article { border-bottom: 1px dotted var(--rule); padding: 1.5rem 0; }
header { display: flex; align-items: center; gap: 1rem; }
header img { width: 56px; height: 56px; object-fit: cover; }
header a { font-size: 2rem; font-weight: 700; letter-spacing: -0.02em; text-decoration: none; }
dl { margin: 0; }
dt { margin-top: 0.75rem; }
dd { margin: 0; overflow-wrap: anywhere; }
.muted { color: var(--muted); }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.85em; }
.text { white-space: pre-wrap; overflow-wrap: anywhere; margin: 0; }
.text img { display: block; margin: 0.5rem 0; max-height: 480px; width: auto; }
.text img.emoji { display: inline; height: 1.4em; margin: 0; vertical-align: middle; }
.date { display: block; text-align: right; color: var(--muted); font-size: 0.9rem; text-decoration: underline dotted; margin-top: 0.5rem; }
.pager { text-align: right; }
footer { padding-top: 1.5rem; color: var(--muted); font-size: 0.9rem; }
`;

const TABS = [
  { href: "/", label: "About" },
  { href: "/posts", label: "Posts" },
];

export function layout(options: { path: string; title?: string; profile: Profile | null; body: Html }): Html {
  const { path, title, profile, body } = options;
  const picture = safeUrl(profile?.picture);
  return html`<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title ? `${title} - ${config.name}` : config.name}</title>
${picture && html`<link rel="icon" href="${picture}">`}
<style>${raw(STYLE)}</style>
</head>
<body>
<nav>${TABS.map((tab) => html`<a href="${tab.href}"${path === tab.href ? html` aria-current="page"` : ""}>${tab.label}</a>`)}</nav>
<header>
${picture && html`<img src="${picture}" alt="" width="56" height="56">`}
<a href="/">${config.name}</a>
</header>
<main>
${body}
</main>
<footer>© ${new Date().getFullYear()} ${config.name}</footer>
</body>
</html>
`;
}

export function aboutPage(profile: Profile | null, npub: string): Html {
  return html`<section>
<h2>About</h2>
${profile?.about ? html`<p class="text">${profile.about}</p>` : html`<p class="muted">プロフィールを取得できませんでした。</p>`}
</section>
<section>
<h2>Links</h2>
<dl>
<dt>Nostr</dt>
<dd><a href="${gatewayUrl(npub)}" class="mono" rel="me">${npub}</a></dd>
${config.links.map((link) => html`<dt>${link.label}</dt>
<dd><a href="${link.url}" rel="me">${link.url}</a></dd>`)}
</dl>
</section>`;
}

const dateFormat = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Tokyo",
});

export function postsPage(page: PostsPage | null, isFirstPage: boolean): Html {
  if (!page) {
    return html`<p class="muted">投稿を取得できませんでした。時間をおいて再度お試しください。</p>`;
  }
  if (page.posts.length === 0 && page.nextUntil === null) {
    return html`<p class="muted">${isFirstPage ? "まだ投稿がありません。" : "これより古い投稿はありません。"}</p>`;
  }
  return html`${page.posts.map((post) => {
    const date = new Date(post.created_at * 1000);
    return html`<article>
<p class="text">${noteContent(post)}</p>
<a class="date" href="${gatewayUrl(nip19.neventEncode({ id: post.id, author: post.pubkey }))}"><time datetime="${date.toISOString()}">${dateFormat.format(date)}</time></a>
</article>`;
  })}
${page.nextUntil !== null && html`<p class="pager"><a href="/posts?until=${page.nextUntil}">Older →</a></p>`}`;
}

export function notFoundPage(): Html {
  return html`<section>
<h2>404 Not Found</h2>
<p class="muted">ページが見つかりませんでした。</p>
</section>`;
}

function gatewayUrl(code: string): string {
  return `https://njump.me/${code}`;
}

type Pointer = Extract<nip27.Block, { type: "reference" }>["pointer"];

function encodePointer(pointer: Pointer): string {
  if ("identifier" in pointer) return nip19.naddrEncode(pointer);
  if ("id" in pointer) return nip19.neventEncode(pointer);
  return nip19.npubEncode(pointer.pubkey);
}

function shorten(code: string): string {
  return code.length > 24 ? `${code.slice(0, 16)}…${code.slice(-6)}` : code;
}

// 投稿本文を HTML にする。URL はリンク、画像・動画は埋め込み、nostr: 参照は njump.me へのリンクにする
function noteContent(event: Event): Html[] {
  return [...nip27.parse(event)].map((block) => {
    switch (block.type) {
      case "text":
        return html`${block.text}`;
      case "hashtag":
        return html`#${block.value}`;
      case "reference": {
        const code = encodePointer(block.pointer);
        return html`<a href="${gatewayUrl(code)}">nostr:${shorten(code)}</a>`;
      }
    }
    const url = safeUrl(block.url);
    if (!url) return html`${block.url}`;
    switch (block.type) {
      case "image":
        return html`<a href="${url}" rel="nofollow noopener"><img src="${url}" alt="" loading="lazy"></a>`;
      case "video":
        return html`<video src="${url}" controls preload="metadata"></video>`;
      case "audio":
        return html`<audio src="${url}" controls preload="metadata"></audio>`;
      case "emoji":
        return html`<img class="emoji" src="${url}" alt=":${block.shortcode}:" title=":${block.shortcode}:">`;
      default:
        return html`<a href="${url}" rel="nofollow noopener">${url}</a>`;
    }
  });
}
