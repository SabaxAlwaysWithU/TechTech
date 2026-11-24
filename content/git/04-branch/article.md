---
title: ブランチ
description: 本線を守ったまま、別の線で試す
---

## 清書を汚さずに下書きする

ノートの清書ページに、いきなり新しいアイデアを書き込む人はいません。別の紙に下書きして、うまくいったら清書に写します。失敗しても清書は無傷です。

Git の**ブランチ**がこの「別の紙」です。履歴を枝分かれさせて、本線に影響を与えずに作業し、うまくいったら本線に合流させます。

<figure class="fig"><svg viewBox="0 0 480 132" role="img" aria-label="main ブランチの途中から feature ブランチが分かれて2回コミットし、最後に main へマージする"><defs><marker id="ah5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker></defs><line x1="30" y1="92" x2="470" y2="92" class="ln" /><circle cx="30" cy="92" r="9" class="node"/><circle cx="100" cy="92" r="9" class="node"/><circle cx="170" cy="92" r="9" class="node"/><circle cx="240" cy="92" r="9" class="node"/><path d="M240,92 C270,92 270,40 300,40 L380,40 C410,40 410,92 440,92" class="ln-hl" /><circle cx="310" cy="40" r="9" class="node-hl"/><circle cx="370" cy="40" r="9" class="node-hl"/><circle cx="440" cy="92" r="11" class="node"/><text x="340" y="20" class="t-s t-hl" text-anchor="middle">feature(写真を足す作業)</text><text x="30" y="122" class="t-s" text-anchor="start">main(本線)</text><text x="440" y="122" class="t-s" text-anchor="middle">マージ</text></svg><figcaption>ブランチを分けて作業し、できあがったら本線(main)に合流(マージ)する</figcaption></figure>

## main ブランチ

`git init` した直後から、あなたは `main` という名前のブランチにいます。今いるブランチは `git branch` で分かります(`*` が付いているもの)。

```sh
git branch
```

`main` は「いつでも動く、見せられる状態」を保つ本線です。実験や作りかけは別のブランチでやり、できあがってから `main` に取り込むのが基本の流れです。

## ブランチを作って移動する: git switch -c

```sh
git switch -c add-photo
```

`add-photo` というブランチを作り、そこに移動しました。`-c` は create の意味です。以後のコミットは `add-photo` に積まれ、`main` は動きません。

ブランチ名は「何をする枝か」が分かる名前にします。`add-photo`、`fix-typo`、`new-design` のように、小文字とハイフンでつなぐのが一般的です。

古い書き方の `git checkout -b 名前` も同じ意味で、ネットの記事でよく見かけます。

## ブランチで作業する

```sh
echo "<img src=\"me.jpg\" alt=\"私\">" >> index.html
git add index.html
git commit -m "トップに写真を追加"
```

ここでのコミットは `add-photo` だけに入っています。`git switch main` で本線に戻ると、`index.html` は写真を足す前の状態に戻ります。ファイルの中身がブランチごとに切り替わるのが、最初は不思議に感じるところです。

## 合流させる: git merge

作業が終わったら、本線に取り込みます。**取り込む側(main)に移動してから** `merge` します。

```sh
git switch main
git merge add-photo
```

`add-photo` のコミットが `main` に入りました。使い終わったブランチは消して構いません。

```sh
git branch -d add-photo
```

## なぜわざわざ分けるのか

1人で作っていても、ブランチには価値があります。

- 作りかけでも `main` はいつでも動く状態に保てる
- うまくいかなかったら、ブランチごと捨てればいい
- 2つのことを同時に進められる(片方を一時中断して、もう片方へ)

チームでは必須です。全員が `main` に直接コミットすると、誰かの作りかけで全体が壊れます。1人1ブランチで作業し、できたものだけを `main` に合流させます。

## 衝突

2つのブランチで同じファイルの同じ行を違うふうに変えると、merge のときに Git が「どちらを採るか決めてください」と止まります。これを**衝突**(コンフリクト)と言います。怖がられがちですが、Git がファイルに両方の内容を書き込んでくれるので、残すほうを選んで保存し、add → commit すれば解決します。この練習場では衝突は起きないようにしてあります。

## まとめ

- ブランチは履歴の枝分かれ。`main` を守ったまま別の線で作業する
- `git switch -c 名前` で作って移動、`git switch 名前` で移動
- 取り込む側に移動してから `git merge 名前`
- 1人でも「作りかけと完成を分ける」ために使う。チームでは必須
