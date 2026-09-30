// サイト全体の設定。自己紹介文・アバターは Nostr のプロフィール (kind 0) から取得する。

export const site = {
  name: "RikiyaOta",
  npub: "npub1vg07ayjj6xmvya8vdzss4gw0zdge6a95gk038h4xpfw066x9vxqsp22ygn",
  links: [{ label: "GitHub", url: "https://github.com/RikiyaOta" }],
  // 投稿・プロフィールを取得するリレー。NIP-05 のレスポンスにも含める。
  relays: [
    "wss://yabu.me",
    "wss://relay-jp.nostr.wirednet.jp",
    "wss://nos.lol",
    "wss://relay.damus.io",
  ],
};
