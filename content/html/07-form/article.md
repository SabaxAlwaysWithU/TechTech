---
title: フォーム
description: 入力欄、ラベル、選択肢、送信ボタン
---

## Webの申込書

お店の会員登録やお問い合わせで、名前やメールアドレスを書いて「送信」を押したことがあると思います。あれが**フォーム**です。

紙の申込書と同じで、「お名前」のような欄の名前、書き込む欄、丸を付ける選択肢、そして提出口があります。HTML では、それぞれにタグが用意されています。

## form、input、button

```html
<form>
  <input type="text" name="nickname">
  <button type="submit">送信</button>
</form>
```

- `form` は申込書の用紙です。中の欄をひとまとめにして、まとめて送ります
- `input` は1行の入力欄です。閉じタグはありません
- `button type="submit"` は提出ボタンです

`name` は、送るときにその値に付ける名前です。サーバーには `nickname=さば` のように「名前=値」の形で届きます。前の分野で fetch に渡した JSON のキーと同じ役割です。

## label: 欄の名前

欄だけでは、何を書けばいいか分かりません。欄の名前は `label` で付けます。

```html
<label for="email">メールアドレス</label>
<input type="email" id="email" name="email">
```

`label` の `for` と、`input` の `id` を同じ値にすると、2つが結び付きます。すると、

- ラベルの文字を押しても、欄にカーソルが入る(小さい欄やチェックボックスで押しやすくなる)
- 画面を読み上げるソフトが、欄に入ったときに「メールアドレス」と読み上げる

という違いが出ます。見た目は同じでも、結び付けておくのが正しい書き方です。

`input` を `label` で包む書き方もあります。この場合は `for` と `id` がいりません。

```html
<label>
  <input type="checkbox" name="news">
  お知らせメールを受け取る
</label>
```

## type で欄の種類を変える

`input` は `type` で中身が変わります。

| type | 欄の種類 |
| --- | --- |
| `text` | 1行の文字(何も書かないときはこれ) |
| `email` | メールアドレス。スマホでは @ のあるキーボードが出る |
| `password` | パスワード。入力が ● で隠れる |
| `number` | 数。上下の矢印で増減できる |
| `date` | 日付。カレンダーから選べる |
| `checkbox` | チェックを付ける・外す |
| `radio` | いくつかの中から1つ選ぶ |

合った `type` を選ぶだけで、ブラウザが入力しやすい形にしてくれます。

## 選ばせる欄: radio と select

**radio**(ラジオボタン)は、同じ `name` のものが1つのグループになり、その中から1つだけ選べます。`value` は、選ばれたときに送る値です。最初から選んでおくものには `checked` を付けます。

```html
<p>お問い合わせの種類</p>
<label><input type="radio" name="kind" value="question" checked> 質問</label>
<label><input type="radio" name="kind" value="order"> 注文について</label>
<label><input type="radio" name="kind" value="other"> その他</label>
```

選択肢が多いときは、たたんでおける **select** を使います。

```html
<label for="pref">都道府県</label>
<select id="pref" name="pref">
  <option value="tokyo">東京都</option>
  <option value="osaka">大阪府</option>
  <option value="fukuoka">福岡県</option>
</select>
```

## 何行も書ける欄: textarea

長い文章は `textarea` です。`input` と違って閉じタグがあります。

```html
<label for="message">お問い合わせ内容</label>
<textarea id="message" name="message" rows="4"></textarea>
```

## 入力のルール: required と placeholder

`required` を付けた欄は、空のまま送ろうとするとブラウザが止めて「入力してください」と知らせます。`type="email"` なら、@ のない文字も止めてくれます。

```html
<input type="email" id="email" name="email" required placeholder="例: saba@example.com">
```

`placeholder` は、空の欄に薄く表示する記入例です。入力を始めると消えるので、**ラベルの代わりにはしません**。書いている途中で「何の欄だったか」が分からなくなるからです。

## 送るとどうなるか

送り先と送り方は、`form` の `action`(送り先の URL)と `method`(`get` か `post`)で決めます。

```html
<form action="/api/contact" method="post">
  ...
</form>
```

送信ボタンを押すと、ブラウザが欄の「`name`=値」を集めて、`action` の URL に送ります。受け取って保存するのはサーバー(バックエンド)の仕事です。JavaScript の `fetch` で送る方法もあります。

この練習場のプレビューでは、送信は止めてあります。ボタンを押しても何も起きません。

## まとめ

- `form` が用紙、`input` が欄、`button type="submit"` が提出ボタン。送る値には `name` を付ける
- 欄の名前は `label`。`for` と `id` をそろえて結び付ける
- `type` で欄の種類が変わる(`email`、`password`、`number`、`checkbox`、`radio` など)
- 1つ選ぶなら同じ `name` の `radio`、選択肢が多ければ `select`、長い文は `textarea`
- `required` で入力を必須にする。`placeholder` はラベルの代わりにしない
- 送り先は `action`、送り方は `method`
