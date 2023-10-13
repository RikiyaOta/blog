# Blog

RikiyaOta の個人ブログです。

URL: https://blog.rikiyaota.kyoto/

※ 旧ブログが稼働している可能性があります。そのうち DNS を切り替えて移行する予定です。

# 大まかな構成・使用技術

[Astro](https://astro.build/)で生成した静的コンテンツを Cloudflare Pages で配信する構成です。ブログのコンテンツ自体は[microCMS](https://microcms.io/)上で管理しています。

一部のページにはアクセス制限を設けており、そのロジックは Cloudflare Worers (Cloudflare Pages Function)で実装しています。


以下、使用したなんやかんや:


- [Astro](https://astro.build/)
- [microCMS](https://microcms.io/)
- [Cloudflare Pages](https://pages.cloudflare.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [daisyUI](https://daisyui.com/)


なんだか「いかにも」って感じの技術スタックですね。やれやれ 🫤