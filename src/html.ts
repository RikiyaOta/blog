// 埋め込んだ値を自動でエスケープする最小限の HTML テンプレート。
// 投稿本文などの外部データは必ずこれを通して出力する。

export class Html {
  readonly value: string;
  constructor(value: string) {
    this.value = value;
  }
  toString(): string {
    return this.value;
  }
}

type Value = Html | string | number | null | undefined | false | Value[];

export function escape(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(value: Value): string {
  if (value instanceof Html) return value.value;
  if (Array.isArray(value)) return value.map(render).join("");
  if (value === null || value === undefined || value === false) return "";
  return escape(String(value));
}

export function html(strings: TemplateStringsArray, ...values: Value[]): Html {
  let out = strings[0];
  values.forEach((value, i) => {
    out += render(value) + strings[i + 1];
  });
  return new Html(out);
}

// 信頼できる固定文字列 (CSS など) をエスケープせずに埋め込む。外部データには使わないこと
export function raw(text: string): Html {
  return new Html(text);
}

// http(s) 以外の URL (javascript: など) は捨てる
export function safeUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}
