---
title: ログとトラブル対応
description: journalctl で原因を読み、ss と df で状況を確かめて直す
---

## サーバーは黙って止まる

サーバーで何かが起きても、画面にエラーのダイアログは出ません。そもそも画面がありません。代わりに、すべての出来事は**ログ**に書かれています。トラブル対応は、ほぼ「ログを読むこと」から始まります。

## journalctl: サービスのログ

systemd が管理するサービスのログは、`journalctl` で読みます。

```sh
journalctl -u nginx
```

`-u` のあとにサービス名を書くと、そのサービスのログだけが出ます。起動に失敗したときには、systemctl 自身が「`journalctl -xeu nginx.service` を見てください」と教えてくれます。

ファイルとして書かれるログもあります。

| 場所 | 中身 |
| --- | --- |
| `/var/log/syslog` | システム全体のログ(Ubuntu) |
| `/var/log/nginx/access.log` | nginx へのアクセスの記録 |
| `/var/log/nginx/error.log` | nginx のエラー |
| `/var/log/auth.log` | ログインや sudo の記録 |

レッスン2の `tail` と `grep` がそのまま使えます。

## 事例1: nginx が起動しない(ポートの取り合い)

`sudo systemctl start nginx` がこう言って失敗したとします。

```
Job for nginx.service failed because the control process exited with error code.
```

ログを見ます。

```sh
journalctl -u nginx
```

```
nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)
```

「80番のポートは、もう使われている」。1つのポートで待てるプログラムは1つだけです。では誰が使っているのか。

```sh
ss -tlnp
```

```
LISTEN ... 0.0.0.0:80 ... users:(("apache2",...))
```

犯人は、以前入れた別の Webサーバー **Apache** でした。Apache を止めて(今後も自動で動かないよう disable して)、nginx を起動し直せば解決です。

```sh
sudo systemctl stop apache2
sudo systemctl disable apache2
sudo systemctl start nginx
```

「ログで何が起きたかを読む → 別の道具で状況を確かめる → 直す → 確かめる」。これがトラブル対応の型です。

## 事例2: ディスクがいっぱい

ファイルに書き込もうとして、こう言われたとします。

```
bash: echo: write error: No space left on device
```

「ディスクに空きがない」。まず全体を見ます。

```sh
df -h
```

`Use%` が `100%` なら満杯です。次に、何が場所を取っているかを探します。`du` はフォルダの大きさを測るコマンドです。

```sh
du -h -d 1 /var/log | sort -h
```

`-d 1` で1段下のフォルダごとに大きさを出し、`sort -h` で小さい順に並べます(いちばん下が最大)。ログが巨大になっているのは、サーバーでいちばんよくある原因です。消してよいことを確かめてから、消します。

```sh
sudo rm /var/log/app/debug.log
df -h
```

本番では、消す前に「本当に消してよいか」を必ず確かめてください。アプリのデータやデータベースのファイルを消すと取り返しがつきません。ログが勝手に膨らまないように、古いログを自動で圧縮・削除する **logrotate** という仕組みもあります。

## 調べる順番

| 症状 | まず打つもの |
| --- | --- |
| サービスが起動しない | `systemctl status 名前`、`journalctl -u 名前` |
| 外からつながらない | `ss -tlnp`(待っているか)、`curl http://localhost/`(自分には返すか) |
| 書き込めない、遅い | `df -h`(ディスク)、`free`(メモリ) |
| 何かが CPU を使い切っている | `ps`、(本物なら `top`) |

## まとめ

- サーバーのトラブルはログを読むことから。`journalctl -u 名前`、`/var/log` の下のファイル
- `Address already in use` は、ポートを別のプログラムが使っている。`ss -tlnp` で犯人を探す
- `No space left on device` は、`df -h` で確かめ、`du` で大きいものを探す
- ログで読む → 道具で確かめる → 直す → もう一度確かめる
