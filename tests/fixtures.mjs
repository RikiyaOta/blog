// E2E テスト専用の鍵。本番のアカウントとは無関係。
import { getPublicKey } from "nostr-tools/pure";
import { npubEncode } from "nostr-tools/nip19";

export const TEST_SECRET_KEY = new Uint8Array(32).fill(1);
export const TEST_NPUB = npubEncode(getPublicKey(TEST_SECRET_KEY));
export const MOCK_RELAY_PORT = 7777;
export const MOCK_RELAY_URL = `ws://127.0.0.1:${MOCK_RELAY_PORT}`;
