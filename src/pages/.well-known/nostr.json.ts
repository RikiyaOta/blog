import type { APIRoute } from "astro";
import { pubkey, getRelays } from "../../lib/nostr";

// NIP-05: 名前を "_" にすると、識別子がドメインそのもの (_@example.com → example.com) として表示される
export const GET: APIRoute = () => {
  const body = {
    names: { _: pubkey },
    relays: { [pubkey]: getRelays() },
  };

  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      // NIP-05 はブラウザ上のクライアントから取得されるため CORS 許可が必須
      "Access-Control-Allow-Origin": "*",
    },
  });
};
