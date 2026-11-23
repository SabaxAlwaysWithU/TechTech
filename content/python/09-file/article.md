---
title: ファイルとモジュール
description: ファイルを読み書きし、用意された道具を import で使う
---

## プログラムの外にデータを置く

変数の中身は、プログラムが終わると消えます。結果を残したいときや、人が用意したデータ(表計算ソフトから書き出した CSV など)を読みたいときは、**ファイル**を使います。Python が仕事の自動化でよく使われるのは、ファイルを手軽に読み書きできるからです。

## 練習用のファイル

この練習場には、次の2つのファイルが用意してあります。練習場の左の「練習用のファイル」で中身を見られます。

`memo.txt`:

```text
牛乳を買う
本を返す
部屋を掃除する
```

`scores.csv`(カンマで区切った表。1行目は列の名前):

```text
name,score
山田,80
佐藤,65
鈴木,90
高橋,55
```

## 読む

```python
with open("memo.txt", encoding="utf-8") as f:
    text = f.read()
print(text)
```

- `open("ファイル名")` でファイルを開く。`encoding="utf-8"` は日本語を正しく読むための指定(パソコンによっては、ないと文字化けする)
- `with ... as f:` の字下げの中で、`f` を使って読み書きする。字下げを抜けると、ファイルは自動で閉じられる
- `f.read()` は、全体を1つの文字列として読む

1行ずつ処理したいときは、`for` で回します。

```python
with open("memo.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

読んだ1行の終わりには、改行(`\n`)が付いています。`strip()` で取り除いてから使うのが定番です。

## CSV を読む

CSV は1行ずつ読み、`split(",")` で分けます。

```python
total = 0
with open("scores.csv", encoding="utf-8") as f:
    next(f)
    for line in f:
        name, score = line.strip().split(",")
        total += int(score)
print(total)
```

- `next(f)` で1行目(列の名前)を読み飛ばす
- `name, score = ...` のように、分けた2つを2つの変数に一度に受け取れる
- 点数は文字列なので `int()` で数にしてから足す

Python には CSV を読むための `csv` モジュールもあり、引用符で囲んだ値なども正しく扱えます。まずは `split` で仕組みを知っておけば十分です。

## 書く

```python
with open("todo.txt", "w", encoding="utf-8") as f:
    f.write("洗濯する\n")
    f.write("買い物に行く\n")
```

2つ目の引数は**モード**です。

| モード | 意味 |
| --- | --- |
| `"r"`(省略時) | 読む |
| `"w"` | 書く。ファイルがあれば**中身を消して**最初から書く |
| `"a"` | 最後に書き足す(append) |

`write` は改行を自動で付けないので、行ごとに `\n` を書きます。`"w"` は前の中身を消すので、記録を足していきたいときは `"a"` を使います。

ないファイルを `"r"` で開くと `FileNotFoundError` になります。

## モジュール: 用意された道具箱

Python には、よく使う道具が**モジュール**としてたくさん入っています(**標準ライブラリ**)。`import` で読み込んで使います。

```python
import math
print(math.ceil(3.2))
print(math.floor(3.8))
print(math.sqrt(16))
```

`math.ceil` は切り上げ、`math.floor` は切り捨て、`math.sqrt` は平方根です。`モジュール名.道具の名前` で使います。

```python
from datetime import date
print(date(2025, 4, 1).isoformat())
print(date(2025, 12, 25) - date(2025, 4, 1))
```

`from モジュール import 名前` と書くと、`datetime.date` ではなく `date` だけで使えます。日付どうしの引き算で、何日あるかもわかります。

よく使う標準ライブラリには、ほかに `random`(乱数)、`json`(JSON の読み書き)、`csv`、`os`(ファイルやフォルダの操作)などがあります。さらに、世界中の人が作った追加のライブラリ(表計算の pandas、グラフの matplotlib など)を `pip` で入れて使えるのが、Python の大きな強みです。この練習場では標準ライブラリだけが使えます。

## まとめ

- `with open(名前, モード, encoding="utf-8") as f:` で開く。字下げを抜けると閉じる
- 読むのは `f.read()` か `for line in f:`。行末の改行は `strip()` で取る
- `"w"` は上書き、`"a"` は書き足し。`write` は改行を自分で書く
- `import モジュール` や `from モジュール import 名前` で、標準ライブラリの道具を使う
