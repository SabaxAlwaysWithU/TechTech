---
title: fetch と API
description: インターネットの向こうからデータを取ってくる。JSON、fetch、ステータス、POST
---

## API: プログラム用の注文口

Webページは、人が読むための HTML を返します。一方、**API**(エーピーアイ)は、プログラムが使うためにデータだけを返す窓口です。

お店でたとえると、Webページは店内の売り場、API は業者用の注文口です。天気予報アプリも地図アプリも、裏で API にデータを頼んでいます。

頼み方は、ネットワーク分野で見た HTTP そのものです。「GET でこの URL をください」と頼み、「200 OK」とデータが返ってきます。

## JSON: データを文字で送る形

API が返すデータは、たいてい **JSON**(ジェイソン)という形の文字列です。前のレッスンのオブジェクトや配列とほとんど同じ見た目です。

```js
const product = { name: "マウス", price: 2500 };
const text = JSON.stringify(product);
console.log(text);

const back = JSON.parse(text);
console.log(back.price);
```

`JSON.stringify` はオブジェクトを JSON の文字列に、`JSON.parse` は文字列をオブジェクトに戻します。ネットワークには文字しか流せないので、送るときは文字に、受け取ったらオブジェクトに戻して使います。

## 練習用の API

この練習場には、SQL 分野と同じネットショップの、にせの API があります。`.example` は説明用に予約された名前で、本物のサイトはありません。練習場の中だけで、にせのお店が返事をします。

URL はすべて `https://shop.example` から始まります。続きの部分(パス)と使い方は次のとおりです。

| 方法 | パス | 内容 |
| --- | --- | --- |
| GET | `/api/products` | 商品の一覧(12件) |
| GET | `/api/products/番号` | 1つの商品。ない番号なら 404 |
| POST | `/api/orders` | 注文する。送るデータは `{ productId, quantity }` |
| GET | `/api/broken` | わざと 500 を返す |

たとえばマウス(番号4)なら `https://shop.example/api/products/4` です。商品は `{ id, name, category, price, stock }` の形です。

## fetch で取ってくる

データを取ってくる関数が `fetch` です。時間のかかる処理なので、前のレッスンの `await` を使います。

```js
const response = await fetch("https://shop.example/api/products");
const products = await response.json();
console.log(products.length);
console.log(products[0].name);
```

`await` が2回あります。宅配便でいうと、1回目は「荷物が届くまで待つ」、2回目は「箱を開けて中身を取り出すまで待つ」です。`response` は届いた箱(返事全体)で、ステータスなどの情報が付いています。中身の JSON は `response.json()` で取り出します。

## 失敗には2種類ある

1つ目は、**返事は来たが「ない」「だめ」と言われた**場合です。404 や 500 が返ってきても、`fetch` はエラーになりません。`response.ok`(200番台なら `true`)や `response.status` で確かめます。

```js
const response = await fetch("https://shop.example/api/products/99");
console.log(response.status);
if (!response.ok) {
  const data = await response.json();
  console.log("失敗: " + data.error);
}
```

2つ目は、**返事が来ない**場合です。URL を打ち間違えた、インターネットにつながっていない、などです。こちらは `fetch` がエラーを投げるので、`try / catch` で受け止めます。

```js
try {
  await fetch("https://shop.exmple/api/products");
} catch (error) {
  console.log("通信できませんでした: " + error.message);
}
```

`response.ok` を確かめずにデータを使うと、「商品がないのに商品名を表示しようとする」ようなおかしな動きになります。必ず確かめる習慣をつけましょう。

## データを送る: POST

注文のようにデータを送るときは、2つ目の引数で方法(`method`)と中身(`body`)を指定します。

```js
const response = await fetch("https://shop.example/api/orders", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ productId: 4, quantity: 2 }),
});
const order = await response.json();
console.log(response.status);
console.log(order.total);
```

`body` は文字しか送れないので `JSON.stringify` で文字にします。`headers` の `Content-Type` は「中身は JSON です」という荷札です。成功すると 201(作成した)と、合計金額などの注文内容が返ってきます。

## 本物の API を使うとき

- 相手のサイトが許可していないと、ブラウザが返事の読み取りを止めます(**CORS** という仕組み)。どこからでも使える API と、そうでない API があります
- 多くの API は、使う人を見分けるための **API キー**を求めます。ページの JavaScript に書いたキーは誰でも見られるので、秘密のキーはサーバー側で使います

## まとめ

- API はプログラム用の窓口。HTTP で頼み、JSON で返事が来る
- `JSON.stringify` で文字に、`JSON.parse` でオブジェクトに戻す
- `await fetch(URL)` で返事を待ち、`await response.json()` で中身を取り出す
- 404 や 500 でも `fetch` はエラーにならない。`response.ok` で確かめる。返事が来ないときは `try / catch`
- 送るときは `method: "POST"` と `body: JSON.stringify(...)`
