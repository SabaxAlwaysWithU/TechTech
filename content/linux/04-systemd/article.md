---
title: サービスと systemctl
description: 裏で動き続けるプログラムを、起動・停止・確認する
---

## 裏で動き続けるプログラム

Webサーバーは、誰かがページを頼んでくるのを24時間待ち続けています。SSH のサーバーも、データベースも、定期的に仕事をする cron も同じです。画面を持たず、裏で動き続けるこうしたプログラムを**サービス**(または**デーモン**)と呼びます。

サービスを起動したり止めたり、パソコンの起動時に自動で動かしたりする係が **systemd** で、その操作コマンドが **systemctl** です。今の主なディストリビューションは、ほぼすべて systemd を使っています。OS分野で「PID 1 の init が最初に動く」と説明しましたが、今の Linux ではその init が systemd です。

## 状態を見る: systemctl status

```sh
systemctl status ssh
```

```
● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (...; enabled; preset: enabled)
     Active: active (running) since ...
   Main PID: 210 (sshd)
```

見るところは3つです。

| 行 | 意味 |
| --- | --- |
| 先頭の記号 | `●` 動いている、`○` 止まっている、`×` 失敗した |
| `Active:` | `active (running)` 動いている、`inactive (dead)` 止まっている、`failed` 起動に失敗した |
| `enabled` / `disabled` | パソコンの起動時に自動で動くか |

下には、そのサービスの最近のログが数行出ます。何かおかしいときの最初の手がかりです。

## 動かす、止める

```sh
sudo systemctl start nginx      # 起動
sudo systemctl stop nginx       # 停止
sudo systemctl restart nginx    # 止めてから起動し直す
sudo systemctl reload nginx     # 止めずに設定だけ読み直す
```

サービスはシステム全体に関わるので、操作には `sudo` が必要です。忘れると `Interactive authentication required`(本人確認が必要です)と断られます。

設定ファイルを書き換えたら、反映させるために `restart` か `reload` をします。nginx なら、その前に `sudo nginx -t` で**設定の書き間違いがないか確かめてから**読み直すのが鉄則です。間違った設定で restart すると、起動できずにサイトが止まります。

## 起動時に自動で動かす

```sh
sudo systemctl enable nginx     # 起動時に自動で動く
sudo systemctl disable nginx    # 自動では動かない
```

`start` は「今すぐ動かす」、`enable` は「次からパソコンを起動したときに動かす」で、別物です。サーバーを再起動したらサイトが止まっていた、という事故の多くは `enable` 忘れです。

## 本当に待っているか: ss

サービスが動いていても、本当にポートで待っているかは別に確かめます。

```sh
ss -tlnp
```

```
LISTEN  0  511  0.0.0.0:22   0.0.0.0:*  users:(("sshd",...))
LISTEN  0  511  0.0.0.0:80   0.0.0.0:*  users:(("nginx",...))
```

「22番で sshd が、80番で nginx が待っている」と読みます。ネットワーク分野で `Connection refused` の原因を「そのポートで誰も待っていない」と説明しましたが、サーバーの中でそれを確かめるのがこのコマンドです(`-t` TCP、`-l` 待ち受け中、`-n` 番号で表示、`-p` プログラム名)。

## 自分に頼んでみる

```sh
curl http://localhost/
```

`localhost` は「このコンピュータ自身」という名前です。サーバーの中から自分の Webサーバーに頼んで、ちゃんと返事が来るかを確かめます。外から見られないときに、「サーバー自体は動いているか」を切り分ける定番の手です。

## まとめ

- 裏で動き続けるプログラムがサービス。systemd が管理し、systemctl で操作する
- `status` で状態とログ、`start` / `stop` / `restart` で操作(sudo が必要)
- `start` は今すぐ、`enable` は次の起動から。enable 忘れに注意
- `ss -tlnp` で待ち受けポートを、`curl http://localhost/` で自分への返事を確かめる
