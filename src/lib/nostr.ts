import { SimplePool } from "nostr-tools/pool";
import * as nip10 from "nostr-tools/nip10";
import * as nip19 from "nostr-tools/nip19";
import type { Event, Filter } from "nostr-tools";
import { site } from "../site.config";

export type { Event };

export interface Profile {
  name?: string;
  display_name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
}

const QUERY_TIMEOUT_MS = 3000;

// E2E テストではテスト用の鍵と疑似リレーに向けられるよう、環境変数で上書きできるようにしておく
function env(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] || undefined : undefined;
}

export const npub: string = env("NOSTR_NPUB") ?? site.npub;

export const pubkey: string = (() => {
  const decoded = nip19.decode(npub);
  if (decoded.type !== "npub") throw new Error("npub は npub1... 形式で指定してください");
  return decoded.data;
})();

export function getRelays(): string[] {
  const override = env("NOSTR_RELAYS");
  return override ? override.split(",").map((r) => r.trim()).filter(Boolean) : site.relays;
}

// Workers ではリクエストをまたいで WebSocket を使い回せないため、問い合わせごとにプールを作って閉じる
async function query(filter: Filter): Promise<Event[]> {
  const pool = new SimplePool();
  try {
    const events = await pool.querySync(getRelays(), filter, { maxWait: QUERY_TIMEOUT_MS });
    const unique = new Map(events.map((e) => [e.id, e]));
    return [...unique.values()].sort((a, b) => b.created_at - a.created_at);
  } catch {
    return [];
  } finally {
    pool.destroy();
  }
}

export async function getProfile(): Promise<Profile | null> {
  const [latest] = await query({ kinds: [0], authors: [pubkey], limit: 1 });
  if (!latest) return null;
  try {
    return JSON.parse(latest.content) as Profile;
  } catch {
    return null;
  }
}

export const POSTS_PER_PAGE = 20;

// 自分の短文投稿 (kind 1) のうち、リプライを除いたものを新しい順に返す。
// nextUntil は次ページ取得用のカーソル (最後の 1 件より古いもの)。
export async function getPosts(until?: number): Promise<{ posts: Event[]; nextUntil: number | null }> {
  const events = await query({
    kinds: [1],
    authors: [pubkey],
    limit: POSTS_PER_PAGE,
    ...(until ? { until } : {}),
  });
  const page = events.slice(0, POSTS_PER_PAGE);
  const posts = page.filter((e) => {
    const { root, reply } = nip10.parse(e);
    return !root && !reply;
  });
  const oldest = page.at(-1);
  const nextUntil = page.length === POSTS_PER_PAGE && oldest ? oldest.created_at - 1 : null;
  return { posts, nextUntil };
}

export function gatewayUrl(code: string): string {
  return `https://njump.me/${code}`;
}

export function eventUrl(event: Event): string {
  return gatewayUrl(nip19.neventEncode({ id: event.id, author: event.pubkey }));
}
