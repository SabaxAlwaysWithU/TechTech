---
title: 待つ処理(async と await)
description: すぐには終わらない処理を待つ。setTimeout、Promise、async / await
---

## フードコートの呼び出しベル

フードコートでラーメンを注文すると、ラーメンの代わりに**呼び出しベル**を渡されます。カウンターの前で立って待つ必要はありません。席で水を飲んだりスマホを見たりして、ベルが鳴ったら取りに行きます。

プログラムにも「すぐには終わらない処理」があります。インターネットの向こうからデータを取ってくる、ファイルを読む、時間を置いてから何かする、などです。JavaScript はこういう処理を頼んだら、終わるのを立って待たずに**次の行へ進みます**。結果は、できあがったときに受け取ります。

## setTimeout: あとで実行する

いちばん簡単な「あとで」は `setTimeout` です。指定したミリ秒(1000 で1秒)が過ぎてから、関数を実行します。

```js
console.log("注文しました");
setTimeout(() => {
  console.log("ラーメンができました");
}, 1000);
console.log("席で待ちます");
```

出力は「注文しました → 席で待ちます → ラーメンができました」の順です。2行目で「1秒後にこれをやって」と頼んだだけなので、JavaScript は待たずに「席で待ちます」へ進みます。上から順に書いても、上から順に終わるとは限らない。これが非同期(ひどうき)の処理です。

## Promise: あとで結果が届く引換券

呼び出しベルにあたるのが **Promise**(プロミス、約束)です。「今はまだないけれど、あとで結果を渡します」という引換券です。

練習用に、0.5秒後に料理を渡す関数 `cook` を用意しました。中身は読み飛ばして構いません。`fetch` のような道具が Promise を返してくれるので、自分で Promise を作る場面はあまりありません。

```js
function cook(dish) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(dish + "ができました"), 500);
  });
}

console.log(cook("カレー"));
```

表示は `[Promise]` です(本物のブラウザでは `Promise {<pending>}` のように出ます)。料理ではなく、引換券そのものを表示してしまいました。

## await: 結果が届くまで待つ

引換券を料理に換えるのが `await` です。「結果が届くまで、ここで待つ」という意味です。

```js
function cook(dish) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(dish + "ができました"), 500);
  });
}

const message = await cook("カレー");
console.log(message);
```

今度は「カレーができました」と表示されます。

## async 関数

`await` は、`async` を付けた関数の中で使います。

```js
function cook(dish) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(dish + "ができました"), 500);
  });
}

async function lunch() {
  const a = await cook("カレー");
  console.log(a);
  const b = await cook("サラダ");
  console.log(b);
  return "ごちそうさま";
}

const result = await lunch();
console.log(result);
```

`async` 関数の戻り値も Promise になります。だから受け取る側でも `await` します。`await` を付け忘れると、また `[Promise]` が表示されます。

この練習場では、いちばん外側(関数の外)にも `await` を書けます。ふつうの `<script>` ではいちばん外側に書けないので、実際のページでは `async` 関数の中に書くか、`<script type="module">` を使います。

## 失敗を受け止める: try / catch

注文した料理が売り切れのこともあります。Promise は「成功」のほかに「失敗」で終わることがあり、そのとき `await` はエラーを投げます。受け止めるのが `try / catch` です。

```js
function order(dish) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (dish === "うなぎ") reject(new Error("売り切れです"));
      else resolve(dish + "ができました");
    }, 500);
  });
}

try {
  const m = await order("うなぎ");
  console.log(m);
} catch (error) {
  console.log("失敗: " + error.message);
}
```

`try { }` の中でエラーが起きると、残りを飛ばして `catch { }` に移ります。`error.message` に理由が入っています。`try / catch` がないと、そこでプログラムが止まります。

## まとめ

- すぐ終わらない処理を頼むと、JavaScript は待たずに次の行へ進む
- `setTimeout(関数, ミリ秒)` は、時間が過ぎてから関数を実行する
- Promise は「あとで結果を渡す」引換券。`await` で結果が届くまで待つ
- `await` は `async` を付けた関数の中で使う。`async` 関数の戻り値も Promise
- 失敗するかもしれない `await` は `try / catch` で囲む
