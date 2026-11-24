---
title: XSS
description: 書き込まれた文字が、ページの中でプログラムとして動いてしまう攻撃
---

## 掲示板に、命令を書き込まれる

ひとこと掲示板を作ったとします。書き込まれた文を、`innerHTML` で画面に足していきます。

```js
const board = document.querySelector("#list");
function post(text) {
  const li = document.createElement("li");
  li.innerHTML = text;
  board.append(li);
}
post("こんにちは");
post("<b>太字</b>にしてみた");
```

2つ目の書き込みは、`<b>` がタグとして読まれて、太字で表示されます。便利そうに見えますが、これは「**書き込んだ人が、ページの HTML を自由に書ける**」ということです。

もし、誰かがこんな文を書き込んだらどうなるでしょう。

```text
<img src="x" onerror="(ここに JavaScript)">
```

`x` という画像は読み込めないので、`onerror`(読み込みに失敗したとき)に書いた JavaScript が動きます。しかもそれは、**掲示板を見たすべての人のブラウザで**、そのサイトのページとして動きます。

## 何ができてしまうのか

このように、ほかの人のブラウザで、攻撃者の JavaScript を動かす攻撃を **XSS**(クロスサイトスクリプティング)といいます。そのサイトの JavaScript として動くので、次のようなことができてしまいます。

- ページの中身を書き換えて、にせのログイン欄を出し、パスワードを盗む
- ログインしている人として、勝手に書き込んだり、設定を変えたりする
- localStorage に入っている情報を読む(JavaScript の分野の「データを保存する」)

SQL インジェクションは「入力が SQL として動く」攻撃でしたが、XSS は「入力が HTML や JavaScript として動く」攻撃です。原因は同じで、**入力を、命令の中にそのまま貼り付けた**ことです。

## 守り方: 文字として入れる

いちばん確実な守りは、利用者の入力を、**HTML としてではなく、文字として**ページに入れることです。JavaScript では `textContent` を使います。

```js
const board = document.querySelector("#list");
function post(text) {
  const li = document.createElement("li");
  li.textContent = text;
  board.append(li);
}
post("<b>太字</b>にしてみた");
post('<img src="x" onerror="alert(1)">');
```

`textContent` に入れた `<` や `>` は、ただの記号として表示されます。タグにはならず、何も動きません。

- 利用者が書いたもの、外から来たものは `textContent`(または、次のレッスンのエスケープ)
- `innerHTML` は、自分で書いた決まった HTML にだけ使う

React や Vue、Astro などのフレームワークは、`{text}` のように値を画面に出すとき、自動で文字として入れてくれます。わざわざ HTML として入れる書き方(React の `dangerouslySetInnerHTML` など)は、名前のとおり危ないので、使うときは十分に気をつけます。

## リンクにも気をつける

利用者が書いた URL をリンクにするときも危険があります。`javascript:` で始まる URL は、押すと JavaScript が動きます。リンクにする前に、`https://` か `http://` で始まるかを確かめます(許可リスト)。

## まとめ

- XSS は、書き込まれた文字が、ほかの人のブラウザで JavaScript として動いてしまう攻撃
- 原因は、入力を innerHTML などで HTML の中に貼り付けること
- 利用者の入力は textContent で、文字として入れる
- URL は https:// か http:// で始まるものだけをリンクにする
