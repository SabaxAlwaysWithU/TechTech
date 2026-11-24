---
title: データを保存する(localStorage)
description: ページを閉じても消えないデータを、ブラウザに保存する
---

## 変数は、ページを閉じると消える

JavaScript の変数は、ページを開いているあいだだけのものです。ページを読み込み直したり、閉じたりすると、全部消えます。

でも、TODO リストやゲームのハイスコア、ダークモードの設定などは、次に開いたときにも残っていてほしいですよね。サーバーに保存する方法もありますが、ログインやデータベースが必要になります。

もっと手軽な方法が、**localStorage**(ローカルストレージ)です。ブラウザの中に、そのサイト専用の小さな保存場所があり、ページを閉じてもデータが残ります。

実は、この TechTech も localStorage を使っています。レッスンの「読んだ」「クイズの点数」「クリアした課題」は、あなたのブラウザの localStorage に保存されています。だから、ログインしなくても進み具合が残るのです。

## 保存する、読む

```js
localStorage.setItem("name", "さば");
const name = localStorage.getItem("name");
console.log(name);
```

- `localStorage.setItem(キー, 値)` で保存する
- `localStorage.getItem(キー)` で読む

辞書のように、キー(名前)を付けて値をしまっておく仕組みです。このコードを一度実行したあと、`setItem` の行を消してもう一度実行しても、`さば` と表示されます。

練習場では、本物の localStorage の代わりに練習用の保存場所を使っていて、中身が「ブラウザに保存されているデータ」の欄に表示されます。フリーモードでは、本物と同じく実行をまたいで残ります。

## ないときは null

まだ保存していないキーを読むと、`null`(何もない)が返ります。

```js
const score = localStorage.getItem("highScore");
console.log(score);
console.log(score ?? "まだ記録がありません");
```

`??` は「左が `null` か `undefined` なら右を使う」という書き方です。初めて開いた人のための、最初の値を決めるのによく使います。

消すときは `localStorage.removeItem(キー)`、全部消すときは `localStorage.clear()` です。

## 保存できるのは文字列だけ

localStorage には**文字列しか保存できません**。数を保存すると、文字列になって戻ってきます。

```js
localStorage.setItem("visits", 3);
const visits = localStorage.getItem("visits");
console.log(visits + 1);
console.log(Number(visits) + 1);
```

`"3" + 1` は文字列の連結で `"31"` になってしまいます。数として使うときは、`Number(...)` で数に戻します。

## 配列やオブジェクトは JSON にする

配列やオブジェクトを `setItem` にそのまま渡すと、`"[object Object]"` のような意味のない文字列になってしまいます。そこで、レッスン「fetch と API」で見た **JSON** を使います。

```js
const todos = ["牛乳を買う", "本を返す"];
localStorage.setItem("todos", JSON.stringify(todos));

const saved = JSON.parse(localStorage.getItem("todos") ?? "[]");
saved.push("部屋を掃除する");
console.log(saved);
```

- 保存するとき: `JSON.stringify(配列)` で文字列にする
- 読むとき: `JSON.parse(文字列)` で配列に戻す
- まだないときのために `?? "[]"` で空の配列を用意しておく

この「読む → 変える → 保存し直す」の3つが、localStorage を使うときの基本の流れです。

## 画面と組み合わせる

入力欄に打った名前を保存して、次に開いたときにあいさつするページです。

```js
const message = document.querySelector("#message");
const input = document.querySelector("#name");
const saved = localStorage.getItem("name");
if (saved) {
  message.textContent = `おかえりなさい、${saved}さん`;
}
document.querySelector("#add").addEventListener("click", () => {
  localStorage.setItem("name", input.value);
  message.textContent = `こんにちは、${input.value}さん`;
});
```

一度名前を入れて「追加」を押してから、もう一度「実行」すると、「おかえりなさい」に変わります。本物のサイトなら、ページを読み込み直したときにこうなります。

## 中身を見る、気をつけること

本物のブラウザでは、開発者ツール(F12)の「Application(アプリケーション)」→「Local Storage」で、そのサイトが保存した中身を見たり消したりできます。TechTech を開いて見ると、`progress:v1` というキーに進み具合が入っているのがわかります。

localStorage は手軽ですが、向いていないこともあります。

- **パスワードや秘密の情報は保存しない**。そのページの JavaScript なら誰のコードでも読めるので、悪いスクリプトが紛れ込むと盗まれる
- **そのブラウザだけのもの**。別のパソコンやスマホ、別のブラウザからは見えない
- **消えることがある**。利用者が履歴を消したり、プライベートウィンドウを閉じたりすると消える
- **大きなデータには向かない**。1つのサイトで 5MB ほどまで

ほかの人と共有したいデータや、なくなると困るデータは、サーバーのデータベースに保存します。

## まとめ

- `localStorage.setItem(キー, 値)` で保存、`getItem(キー)` で読む。ページを閉じても残る
- ないキーは `null`。`?? 最初の値` で備える
- 保存できるのは文字列だけ。数は `Number()`、配列やオブジェクトは `JSON.stringify` / `JSON.parse`
- 秘密の情報は保存しない。そのブラウザだけのもので、消えることもある
