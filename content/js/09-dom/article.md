---
title: 画面を書き換える
description: DOM を操作して、文字を変え、要素を足し、ボタンに反応する
---

## JavaScript の本来の仕事

ここまでは結果を `console.log` で出力欄に表示してきました。でも、Web ページで JavaScript がいちばんしているのは、**画面を書き換えること**です。「いいね」を押すと数が増える、検索するとすぐに結果が並ぶ、といった動きはすべて JavaScript が画面を書き換えています。

## DOM: ページの部品の木

ブラウザは HTML を読むと、タグの1つひとつを「部品」にして、入れ子の木の形で覚えます。これを **DOM**(ドム、Document Object Model)と呼びます。JavaScript は `document` を入り口にして、この部品を探したり、中身を変えたりできます。

HTML が「家の設計図」なら、DOM は建ったあとの「実物の家」です。JavaScript は実物の家に入って、壁紙を替えたり家具を足したりします。設計図(HTML ファイル)そのものは変わりません。

## 練習場の画面

この分野の練習場には「画面」の欄があり、次の HTML が入っています。この記事の例も、この画面を書き換えます。

```html
<h1 id="title">見出し</h1>
<p id="message">ここに文が入ります</p>
<p><button id="btn">押してね</button> <span id="count">0</span></p>
<p><input id="name" placeholder="名前"> <button id="add">追加</button></p>
<ul id="list"></ul>
```

## 要素を見つけて、中身を変える

```js
const title = document.querySelector("#title");
title.textContent = "こんにちは";
title.style.color = "green";
```

- `document.querySelector("セレクタ")` で、ページから要素を1つ見つける。セレクタは CSS と同じ書き方で、`#title` は id が title の要素
- `要素.textContent = "文字"` で、中の文字を入れ替える
- `要素.style.color = "green"` で、見た目を変える(CSS の `background-color` は `backgroundColor` のように書く)

見つからないと `null` が返り、そのあと `.textContent` を使うところでエラーになります。`#` の付け忘れや、id のつづりに気をつけてください。

条件に合う要素を全部ほしいときは `document.querySelectorAll("li")` を使い、`for...of` で回します。

## 要素を作って足す

```js
const list = document.querySelector("#list");
const fruits = ["りんご", "バナナ"];
for (const f of fruits) {
  const li = document.createElement("li");
  li.textContent = f;
  list.append(li);
}
```

1. `document.createElement("li")` で、新しい `<li>` を作る(まだ画面には出ない)
2. `textContent` で中身を入れる
3. `親.append(子)` で、親の最後に足す。ここで画面に出る

配列の中身を画面に並べるときは、いつもこの3つの手順です。

## ボタンに反応する: イベント

「押されたら」「入力されたら」のような出来事を**イベント**と呼びます。`addEventListener` で、出来事が起きたときに動かす関数を登録します。

```js
const btn = document.querySelector("#btn");
const count = document.querySelector("#count");
let n = 0;
btn.addEventListener("click", () => {
  n++;
  count.textContent = n;
});
```

`"click"` が押されたとき、2つ目の関数がそのとき動く処理です。登録しただけでは何も起きず、ボタンを押すたびに関数が動きます。練習場では、実行したあとに画面のボタンを自分で押して確かめられます。

## 入力欄の値を読む

```js
const input = document.querySelector("#name");
const add = document.querySelector("#add");
add.addEventListener("click", () => {
  console.log(input.value);
  input.value = "";
});
```

入力欄に打った文字は `input.value` で読めます。`""` を入れると空になります。

## 取ってきたデータを並べる

前のレッスンの `fetch` と組み合わせると、サーバーのデータを画面に並べられます。ネットショップの商品一覧も、この形で作られています。

```js
const res = await fetch("https://shop.example/api/products");
const products = await res.json();
const list = document.querySelector("#list");
for (const p of products) {
  const li = document.createElement("li");
  li.textContent = `${p.name} ${p.price}円`;
  list.append(li);
}
```

## innerHTML に気をつける

`要素.innerHTML = "<b>太字</b>"` と書くと、文字列を HTML として読んで中身にできます。便利ですが、人が入力した文字を `innerHTML` に入れると、その中に仕込まれた `<script>` などが動いてしまうおそれがあります(**XSS** と呼ばれる攻撃)。入力やサーバーから来た文字を表示するときは、`textContent` を使ってください。

## まとめ

- ブラウザは HTML から DOM(部品の木)を作る。JavaScript は `document` から触る
- `querySelector` で見つけ、`textContent` や `style` で変える
- `createElement` で作り、`append` で足す
- `addEventListener("click", 関数)` で、押されたときの処理を登録する
- 人が入力した文字の表示には `innerHTML` ではなく `textContent`
