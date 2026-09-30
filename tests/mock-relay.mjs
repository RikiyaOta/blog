// E2E テスト用の疑似 Nostr リレー。
// テスト用の鍵で署名したプロフィールと投稿を返すだけの最小実装 (REQ / CLOSE のみ対応)。
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { finalizeEvent } from "nostr-tools/pure";
import { TEST_SECRET_KEY, MOCK_RELAY_PORT } from "./fixtures.mjs";

const BASE_TIME = Math.floor(new Date("2026-09-01T00:00:00Z").getTime() / 1000);

function sign(template) {
  return finalizeEvent({ tags: [], ...template }, TEST_SECRET_KEY);
}

const events = [
  sign({
    kind: 0,
    created_at: BASE_TIME,
    content: JSON.stringify({ name: "test", about: "テスト用のプロフィールです。\n二行目。" }),
  }),
];

// 22 件の通常投稿 (1 ページ 20 件なので 2 ページ目ができる)
for (let i = 0; i < 22; i++) {
  events.push(sign({ kind: 1, created_at: BASE_TIME + i * 60, content: `テスト投稿 ${i}` }));
}
const newest = events.at(-1);

events.push(
  sign({ kind: 1, created_at: BASE_TIME + 30 * 60, content: "リンク付き https://example.com/ です" }),
  sign({
    kind: 1,
    created_at: BASE_TIME + 31 * 60,
    content: "これはリプライなので表示されない",
    tags: [["e", newest.id, "", "root"]],
  }),
);

function matches(event, filter) {
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false;
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false;
  if (filter.until && event.created_at > filter.until) return false;
  return true;
}

function query(filter) {
  const hits = events.filter((e) => matches(e, filter)).sort((a, b) => b.created_at - a.created_at);
  return filter.limit ? hits.slice(0, filter.limit) : hits;
}

// --- 最小限の WebSocket (RFC 6455) 実装 ---

function sendText(socket, text) {
  const payload = Buffer.from(text);
  let header;
  if (payload.length < 126) {
    header = Buffer.from([0x81, payload.length]);
  } else if (payload.length < 65536) {
    header = Buffer.alloc(4);
    header.writeUInt8(0x81, 0);
    header.writeUInt8(126, 1);
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.alloc(10);
    header.writeUInt8(0x81, 0);
    header.writeUInt8(127, 1);
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  socket.write(Buffer.concat([header, payload]));
}

function handleMessage(socket, text) {
  const [type, subId, ...filters] = JSON.parse(text);
  if (type !== "REQ") return;
  for (const filter of filters) {
    for (const event of query(filter)) {
      sendText(socket, JSON.stringify(["EVENT", subId, event]));
    }
  }
  sendText(socket, JSON.stringify(["EOSE", subId]));
}

const server = createServer((_req, res) => {
  res.writeHead(426).end("WebSocket only");
});

server.on("upgrade", (req, socket) => {
  const accept = createHash("sha1")
    .update(req.headers["sec-websocket-key"] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
    .digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  let buffer = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    while (buffer.length >= 2) {
      const opcode = buffer[0] & 0x0f;
      let length = buffer[1] & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (buffer.length < 4) return;
        length = buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (buffer.length < 10) return;
        length = Number(buffer.readBigUInt64BE(2));
        offset = 10;
      }
      const masked = (buffer[1] & 0x80) !== 0;
      const frameEnd = offset + (masked ? 4 : 0) + length;
      if (buffer.length < frameEnd) return;

      const payload = buffer.subarray(offset + (masked ? 4 : 0), frameEnd);
      if (masked) {
        const mask = buffer.subarray(offset, offset + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      }
      buffer = buffer.subarray(frameEnd);

      if (opcode === 0x1) handleMessage(socket, payload.toString());
      else if (opcode === 0x8) socket.end(Buffer.from([0x88, 0]));
      else if (opcode === 0x9) socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
    }
  });
  socket.on("error", () => {});
});

server.listen(MOCK_RELAY_PORT, "127.0.0.1", () => {
  console.log(`mock relay listening on ws://127.0.0.1:${MOCK_RELAY_PORT}`);
});
