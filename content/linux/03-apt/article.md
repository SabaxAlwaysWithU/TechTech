---
title: パッケージ管理
description: apt でソフトを入れる、消す、最新にする
---

## アプリストアのコマンド版

スマートフォンでアプリを入れるとき、Webサイトを探してファイルをダウンロードしたりはしません。アプリストアで名前を探して「入手」を押すだけです。ストアが、本物であることの確認、必要な部品の用意、更新の通知まで面倒を見てくれます。

Linux にも同じ仕組みがあり、**パッケージ管理**と呼びます。ソフトは**パッケージ**という単位で配られ、ディストリビューションが用意した**リポジトリ**(公式の倉庫)から取り寄せます。Ubuntu や Debian では、その道具が **apt** です。

## 入れる: apt install

```sh
sudo apt install tree
```

`tree` というパッケージを入れます。`tree` はフォルダの中身を木の形で見せてくれる小さなコマンドです。入れる前は「コマンドが見つかりません、`sudo apt install tree` で入れられます」と、入れ方まで教えてくれます。

`sudo` が必要なのは、ソフトを入れると `/usr/bin` のような**システム全体の場所**にファイルが置かれるからです。OS分野で学んだとおり、そこは管理者しか書き換えられません。`sudo` なしで打つと、こう断られます。

```
E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)
E: Unable to acquire the dpkg frontend lock ..., are you root?
```

「are you root?(管理者ですか?)」と聞かれたら、`sudo` を忘れています。

## 何が起きているか

`apt install` は、裏でこれだけのことをしています。

1. リポジトリから、パッケージのファイルをダウンロードする
2. 本物かどうか(改ざんされていないか)を署名で確かめる
3. そのソフトが必要とする**他のパッケージ**(依存関係)も一緒に入れる
4. ファイルを決まった場所に置く(コマンドは `/usr/bin` や `/usr/sbin`、設定は `/etc`)
5. サービスなら、起動まで済ませる

自分で Webサイトからダウンロードして入れるより、安全で、手間がなく、あとで消すのも簡単です。

## よく使う apt コマンド

| コマンド | やること |
| --- | --- |
| `sudo apt update` | 「どんなパッケージがあるか」の一覧を最新にする |
| `sudo apt upgrade` | 入っているパッケージを全部新しくする |
| `sudo apt install 名前` | 入れる |
| `sudo apt remove 名前` | 消す |
| `apt list --installed` | 入っているものの一覧(sudo 不要) |

`update` と `upgrade` は名前が似ていて紛らわしいですが、`update` は**カタログの更新**、`upgrade` は**中身の更新**です。新しいサーバーを借りたら、まず `sudo apt update` と `sudo apt upgrade` を打つのが習慣です。セキュリティの修正が届くからです。

## Webサーバーを入れてみる

次のレッスンで使う nginx も、1行で入ります。

```sh
sudo apt install nginx
which nginx
```

`/usr/sbin/nginx` に置かれたことが分かります。Ubuntu では、サービスとして動くソフトは入れた直後に起動まで済みます。

## ディストリビューションごとの違い

パッケージ管理の道具は、ディストリビューションによって違います。

| ディストリビューション | 道具 | 例 |
| --- | --- | --- |
| Ubuntu、Debian | `apt` | `sudo apt install nginx` |
| Red Hat、AlmaLinux、Fedora | `dnf`(古くは `yum`) | `sudo dnf install nginx` |
| Alpine | `apk` | `sudo apk add nginx` |
| Mac(参考) | `brew`(Homebrew) | `brew install nginx` |

道具の名前は違っても、「名前を言えば倉庫から持ってきて入れてくれる」という考え方は同じです。

## まとめ

- ソフトはパッケージという単位で、リポジトリから取り寄せる。Ubuntu の道具は apt
- `sudo apt install 名前` で入れる。sudo がないと「are you root?」
- `update` はカタログ、`upgrade` は中身の更新。新しいサーバーではまず両方
- 自分でダウンロードするより、安全で手間がなく、消すのも簡単
