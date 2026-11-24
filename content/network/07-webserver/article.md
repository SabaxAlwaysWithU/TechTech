---
title: Webサーバーの裏側
description: nginx、アプリ、データベース。リバースプロキシと 502
---

## 1台のサーバーの中に3人いる

ここまで「Webサーバー」は1つの箱として扱ってきました。でも、ログインや保存のある Webアプリでは、その箱の中で3つのプログラムが役割を分けて動いています。レストランにたとえると、こうです。

| プログラム | レストランでいうと | 例 | 待っている番号 |
| --- | --- | --- | --- |
| **Webサーバー** | ホール係(受付) | nginx | 80、443(外に開いている) |
| **アプリ** | 厨房 | Express、Django | 3000 など(内側だけ) |
| **データベース** | 食材庫 | PostgreSQL、MySQL | 5432 など(内側だけ) |

客(ブラウザ)と話すのはホール係だけです。厨房と食材庫は外から見えません。

<figure class="fig"><svg viewBox="0 0 480 206" role="img" aria-label="ブラウザからの問い合わせを nginx が受け、ファイルは自分で返し、/api/ 宛てはアプリに取り次ぎ、アプリがデータベースを使う"><defs><marker id="ah9" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker></defs><rect x="4" y="74" width="92" height="44" rx="8" class="bx"/><text x="50.0" y="101.0" class="t" text-anchor="middle">ブラウザ</text><rect x="130" y="74" width="92" height="44" rx="8" class="bx-hl"/><text x="176.0" y="101.0" class="t" text-anchor="middle">nginx</text><line x1="96" y1="96" x2="126" y2="96" class="ln" marker-end="url(#ah9)"/><rect x="270" y="14" width="206" height="52" rx="8" class="bx"/><text x="373.0" y="37.0" class="t" text-anchor="middle">ファイルを返す</text><text x="373.0" y="56.0" class="t-s" text-anchor="middle">HTML・画像・CSS</text><rect x="270" y="128" width="92" height="44" rx="8" class="bx"/><text x="316.0" y="155.0" class="t" text-anchor="middle">アプリ</text><rect x="394" y="128" width="82" height="44" rx="8" class="bx"/><text x="435.0" y="155.0" class="t" text-anchor="middle">DB</text><path d="M222,90 C246,90 246,40 266,40" class="ln" marker-end="url(#ah9)"/><path d="M222,102 C246,102 246,150 266,150" class="ln" marker-end="url(#ah9)"/><line x1="362" y1="150" x2="390" y2="150" class="ln" marker-end="url(#ah9)"/><text x="254" y="196" class="t-s t-hl" text-anchor="middle">/api/ 宛てはアプリへ取り次ぐ</text></svg><figcaption>nginx が入口。ファイルは自分で返し、/api/ はアプリに取り次ぐ(リバースプロキシ)</figcaption></figure>

## nginx の2つの仕事

**1. ファイルをそのまま返す**
`/index.html` や画像のように、中身が決まっているファイルは、nginx が自分でディスクから読んで返します。アプリもデータベースも使いません。とても速く、たくさんの客をさばけます。

**2. 後ろに回す(リバースプロキシ)**
`/api/products` のように、計算やデータベースが必要な頼みごとは、nginx が後ろのアプリに回します。アプリが返事を作り、nginx がそれをブラウザに届けます。客の代わりに厨房とやりとりする代理人なので、**リバースプロキシ**と呼びます。

設定ファイルでは、この振り分けを数行で書きます。

```nginx
server {
  listen 443 ssl;
  server_name example.com;

  location /api/ {
    proxy_pass http://localhost:3000;   # アプリへ回す
  }
  location / {
    root /var/www/site;                  # ファイルを自分で返す
  }
}
```

アプリとデータベースは `localhost`(同じコンピュータの中)だけで待っていて、外のポートは開けません。外から直接データベースに `DELETE` を打てないようにするためです。

## API: データだけを返す窓口

`/api/products` を頼むと、HTML ではなく **JSON** というデータの形で返ってきます。

```sh
curl http://example.com/api/products
```

```
{"products":[{"id":1,"name":"ノートパソコン","price":128000}, ...]}
```

この窓口が **API** です。ブラウザの JavaScript がこれを「叩いて」受け取り、画面の一覧を組み立てます。裏では、アプリが SQL でデータベースに問い合わせています(SQL分野でやった `SELECT` そのものです)。

## 壊れ方で、どこが悪いか分かる

3人のうち誰が倒れたかで、返ってくる番号が変わります。

| 倒れたもの | `/`(静的ページ) | `/api/products` |
| --- | --- | --- |
| なし | 200 | 200(JSON) |
| アプリ | **200**(nginx だけで返せる) | **502 Bad Gateway** |
| データベース | 200 | **500**(アプリが失敗を報告) |
| nginx(ポート) | Connection refused | Connection refused |

- **502 Bad Gateway** は「nginx は元気だが、回した先(アプリ)から返事がない」。ホール係が「厨房に誰もいません」と言っている状態です。返事のヘッダーには `Server: nginx` と出ます
- **500** は「アプリは動いたが、中で失敗した」。この練習場では、アプリが `connect ECONNREFUSED 127.0.0.1:5432` という理由を返します。「5432番(データベース)につなげなかった」という意味です

「トップページは見られるのに、ログインや一覧だけが失敗する」なら、nginx は無事で、後ろのどちらかが倒れています。

## まとめ

- Webアプリのサーバーの中には、nginx(受付)、アプリ(処理)、データベース(保存)がいる
- nginx は静的ファイルを自分で返し、それ以外をアプリに回す(リバースプロキシ)
- 外に開いているのは nginx の 80 / 443 だけ。アプリとデータベースは内側だけ
- アプリが倒れると 502、データベースが倒れると 500。静的ページは無事
