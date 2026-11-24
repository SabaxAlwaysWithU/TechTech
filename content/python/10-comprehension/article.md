---
title: 内包表記
description: リストや辞書を1行で作る。for と if をまとめて書く Python らしい書き方
---

## 4行が1行になる

税込みの値段のリストを作るとき、これまでの書き方ではこうなります。

```python
prices = [2500, 6800, 32000]
with_tax = []
for p in prices:
    with_tax.append(round(p * 1.1))
print(with_tax)
```

「空のリストを用意して、for で回して、append で足す」。この形はとてもよく出てくるので、Python には1行で書く方法があります。

```python
prices = [2500, 6800, 32000]
with_tax = [round(p * 1.1) for p in prices]
print(with_tax)
```

これを**リスト内包表記**といいます。どちらも結果は `[2750, 7480, 35200]` です。

## 読み方

```
[ round(p * 1.1)   for p in prices ]
   ↑ 作る値         ↑ いつもの for
```

右側はいつもの `for p in prices` です。左側に「1つずつ何を作るか」を書きます。全体を `[ ]` で囲むと、作った値を集めたリストになります。

「prices の p それぞれについて、round(p * 1.1) を集めたリスト」と、右から読むと意味が取りやすいです。

## if で選ぶ

うしろに `if` を付けると、条件に合うものだけを集めます。

```python
prices = [2500, 128000, 6800, 98000, 1800]
cheap = [p for p in prices if p < 10000]
print(cheap)
```

`[2500, 6800, 1800]` になります。作る値が `p` そのままなら「選ぶだけ」、`p * 2` のように書けば「選んでから変える」です。

辞書のリスト(表)から、条件に合う行の名前だけを取り出すこともできます。

```python
products = [
    {"name": "マウス", "price": 2500},
    {"name": "ノートパソコン", "price": 128000},
    {"name": "キーボード", "price": 6800},
]
names = [p["name"] for p in products if p["price"] < 10000]
print(names)
```

SQL の `SELECT name FROM products WHERE price < 10000` と同じ形です。`for` の部分が `FROM`、`if` が `WHERE`、左の値が `SELECT` にあたります。

## 辞書内包表記

`{ }` で囲み、`キー: 値` の形で書くと、辞書ができます。

```python
products = [
    {"name": "マウス", "price": 2500},
    {"name": "キーボード", "price": 6800},
]
table = {p["name"]: p["price"] for p in products}
print(table)
print(table["マウス"])
```

`{'マウス': 2500, 'キーボード': 6800}` と表示されます(Python は文字列を ' で囲んで表示します)。名前から値段を引ける「早見表」を作るときによく使います。

## 番号を付ける enumerate、2つを並べる zip

内包表記と一緒によく使う道具を2つ紹介します。

```python
names = ["マウス", "キーボード", "モニター"]
for i, name in enumerate(names, 1):
    print(f"{i}. {name}")
```

`enumerate(リスト, 1)` は、「番号と中身」の組を1から順に出します。番号を数える変数を自分で用意しなくて済みます。

```python
names = ["山田", "佐藤", "鈴木"]
points = [80, 65, 90]
scores = dict(zip(names, points))
print(scores)
```

`zip(A, B)` は、2つのリストを前から1つずつ組にします。`dict(...)` で包むと、組がそのまま `キー: 値` になって `{'山田': 80, '佐藤': 65, '鈴木': 90}` ができます。

## 長くなったら for に戻す

内包表記は短く書けますが、詰め込みすぎると読めなくなります。

- `if` が2つ以上ある、`for` が2つ重なる、途中で `print` したい
- 1行に収まらない

こういうときは、ふつうの `for` で書いたほうが読みやすく、まちがいも見つけやすいです。「短く書けること」より「あとで読めること」を大事にしてください。

## まとめ

- `[作る値 for 変数 in リスト]` で、新しいリストを1行で作る
- `[作る値 for 変数 in リスト if 条件]` で、条件に合うものだけ集める
- `{キー: 値 for 変数 in リスト}` で辞書を作る
- `enumerate(リスト, 1)` で番号付き、`dict(zip(A, B))` で2つのリストから辞書
- 読みにくくなったら、ふつうの `for` で書く
