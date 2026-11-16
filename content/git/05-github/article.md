---
title: GitHub と push
description: 手元の履歴をインターネットに置く
---

## 手元だけでは心もとない

ここまでのコミットは、全部あなたのパソコンの中にあります。パソコンが壊れたら履歴ごと消えますし、友だちに見せることも、別のパソコンで続きをすることもできません。

そこで、履歴の写しをインターネット上にも置きます。置き場所が**リモートリポジトリ**で、その代表的なサービスが **GitHub** です。

## GitHub でリポジトリを作る

GitHub の画面で「New repository」を押し、名前(たとえば `my-app`)を付けて作ると、空のリモートリポジトリができます。URL はこんな形です。

```
https://github.com/あなたのユーザー名/my-app.git
```

このURLが、手元のリポジトリから見た「送り先の住所」です。

## 送り先を登録する: git remote add

手元のリポジトリに、送り先の住所を登録します。

```sh
git remote add origin https://github.com/saba/my-app.git
```

`origin` は、この送り先に付ける呼び名です。別の名前でも構いませんが、慣習で最初のリモートは `origin` と呼びます。以後、URLを打つ代わりに `origin` と書けます。

登録できたかは `git remote -v` で見られます。

## 送る: git push

```sh
git push -u origin main
```

「ローカルの `main` を、`origin` の `main` に送る」という意味です。初回は `-u` を付けると、「このブランチの送り先は origin の main」と覚えてくれるので、2回目からは `git push` だけで済みます。

```sh
git push
```

push するのは**コミット済みのもの**だけです。編集しただけ、`add` しただけのものは送られません。「push したのに反映されない」の原因の大半はこれです。

## 日常の流れ

GitHub を使い始めると、1日の作業はこうなります。

```
編集 → git add → git commit → git push
```

コミットは小さく何度でも、push は区切りごとに。push しておけば、パソコンが壊れても GitHub に履歴が残ります。

## 受け取る: git pull

別のパソコンから push した変更や、チームメイトの変更を手元に取り込むのが `git pull` です。

```sh
git pull
```

1人で1台のパソコンだけで使っているうちは、ほとんど出番がありません。2台目のパソコンや、チームで使い始めると毎朝の習慣になります。

## 最初から持ってくる: git clone

GitHub にあるリポジトリを、まるごと手元にコピーするのが `git clone` です。

```sh
git clone https://github.com/saba/my-app.git
```

他人の公開コードを読みたいとき、別のパソコンで自分のプロジェクトを続けたいときに使います。clone したリポジトリは、最初から `origin` が設定されています。

## 公開する: GitHub Pages

GitHub には、リポジトリの中の HTML をそのままWebサイトとして公開する **GitHub Pages** という機能があります。このサイト TechTech もそれで公開されています。「push すると数分後にサイトが更新される」という流れは、Webアプリの道具分野の CI/CD そのものです。

## まとめ

- リモートリポジトリは履歴の写しを置く場所。代表が GitHub
- `git remote add origin URL` で送り先を登録。呼び名は `origin`
- 初回は `git push -u origin main`、2回目からは `git push`
- push されるのはコミット済みのものだけ。編集 → add → commit → push
- `pull` で受け取る、`clone` でまるごと持ってくる
