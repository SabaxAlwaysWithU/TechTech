---
title: フォームを受け取る
description: submit イベントで入力を受け取り、確かめて、fetch で送る
---

## ページを移動せずに受け取る

HTML のレッスン「フォーム」では、`form` の `action` に送り先を書いて、送信ボタンでサーバーに送りました。この方法だと、送信するたびにページ全体が次のページに切り替わります。

いまの多くのサイトは、送信ボタンを押しても**ページはそのまま**で、「名前を入れてください」とその場で教えてくれたり、「注文を受け付けました」と表示が変わったりします。これは、JavaScript がフォームの送信を受け取って、自分で処理しているからです。

このレッスンの練習場の「画面」には、注文フォームが入っています。

| 要素 | id | name |
| --- | --- | --- |
| フォーム全体 | `#order` | |
| お名前 | `#name` | `name` |
| 商品(選択肢。値は商品番号) | `#product` | `productId` |
| 数量 | `#quantity` | `quantity` |
| 注文するボタン | `#submit` | |
| エラーを出す場所 | `#error` | |
| 結果を出す場所 | `#result` | |

## submit イベントと preventDefault

フォームが送信されるときには、`form` に **submit** というイベントが起きます。

```js
const form = document.querySelector("#order");
const result = document.querySelector("#result");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  result.textContent = "注文を受け付けました";
});
```

ボタンの `click` ではなく、フォームの `submit` を待つのがポイントです。入力欄で Enter キーを押したときも送信されるので、`submit` で受け取れば、どちらの送り方でも同じ処理が動きます。

`e.preventDefault()` は、「ブラウザがいつもやる動き」を止める命令です。フォームのいつもの動きは「送信して、ページを読み込み直す」なので、これを止めないと、表示を書き換えた直後にページが読み込み直されて、全部消えてしまいます。

この練習場では、`preventDefault` を忘れるとエラーで知らせます。最初の1行に書く、と覚えておきましょう。

## 入力された値を読む

入力欄や選択肢の値は、`.value` で読めます。

```js
const form = document.querySelector("#order");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.querySelector("#name").value;
  const quantity = document.querySelector("#quantity").value;
  console.log(name, quantity, typeof quantity);
});
```

お名前を入れて「注文する」を押すと、出力欄に表示されます。注意したいのは、`type="number"` の入力欄でも、`.value` は**文字列**だということです。`typeof` が `string` と表示されます。計算したり API に数として送ったりするときは、`Number(...)` で数にします。

## FormData でまとめて読む

欄がたくさんあると、1つずつ `querySelector` するのは大変です。`FormData` を使うと、フォームの中身を、`name` の付いた欄からまとめて取り出せます。

```js
const form = document.querySelector("#order");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  console.log(data);
});
```

`{"name":"…","productId":"4","quantity":"1"}` のように、`name` をキーにしたオブジェクトになります。HTML の `name` は、このときのキーになります。値はやはり全部文字列です。

## 送る前に確かめる

名前が空のまま送られても困ります。送る前に中身を確かめ、問題があれば知らせて止めます。

```js
const form = document.querySelector("#order");
const error = document.querySelector("#error");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.querySelector("#name").value.trim();
  if (name === "") {
    error.textContent = "お名前を入れてください";
    return;
  }
  error.textContent = "";
  console.log(name + "さんの注文を送ります");
});
```

- `.trim()` で前後の空白を取り除く(空白だけの名前を防ぐ)
- 問題があれば `return` で、その先の処理をしない
- 問題がなければ、前のエラーの文を消しておく

HTML の `required` でもブラウザが確かめてくれますが、JavaScript なら「お名前を入れてください」のように、自分の言葉で、好きな場所に出せます。

ただし、ブラウザでの確認は、使う人を助けるためのものです。開発者ツールを使えば、ブラウザの確認は飛ばせてしまいます。**サーバー側でも必ず確かめる**、が Web の決まりです。練習用の API も、数量がおかしいと 400 を返します。

## fetch で送る

確かめたら、レッスン「fetch と API」の POST で送ります。

```js
const form = document.querySelector("#order");
const result = document.querySelector("#result");
const error = document.querySelector("#error");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  const response = await fetch("https://shop.example/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: Number(data.productId), quantity: Number(data.quantity) }),
  });
  const body = await response.json();
  if (response.ok) {
    error.textContent = "";
    result.textContent = `注文番号 ${body.orderId}(合計 ${body.total}円)`;
  } else {
    result.textContent = "";
    error.textContent = body.error;
  }
});
```

- 中で `await` を使うので、処理の関数に `async` を付ける
- 練習用の API は `productId` と `quantity` を**数**で受け取る。`Number(...)` を忘れると「商品が見つかりません」になる
- `response.ok` で成功か失敗かを分け、失敗なら API が返した理由(`error`)を表示する

数量を 999 にして送ると、在庫が足りないという理由が表示されます。

## 二重送信を防ぐ

通信には少し時間がかかります。そのあいだに何度もボタンを押されると、同じ注文が何回も送られてしまいます。送信中はボタンを押せなくするのが定番です。

```js
const form = document.querySelector("#order");
const button = document.querySelector("#submit");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  button.disabled = true;
  button.textContent = "送信中…";
  try {
    await fetch("https://shop.example/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: 4, quantity: 1 }),
    });
  } finally {
    button.disabled = false;
    button.textContent = "注文する";
  }
});
```

`finally` の中は、成功しても失敗しても必ず動きます。通信がエラーになっても、ボタンが押せないまま残ることはありません。

## まとめ

- フォームの送信は `form` の `submit` イベントで受け取る。最初に `e.preventDefault()`
- 値は `.value` か `Object.fromEntries(new FormData(form))` で読む。どちらも文字列なので、数は `Number()`
- 送る前に確かめ、問題があれば知らせて `return`。サーバー側でも必ず確かめる
- `fetch` の POST で送り、`response.ok` で結果を分けて表示する
- 送信中はボタンを `disabled` にして、二重送信を防ぐ
