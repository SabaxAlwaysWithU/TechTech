---
title: 辞書
description: 名前で値を引く。表のデータを Python で持つ
---

## 番号ではなく、名前で引く

リストは「0番、1番、2番」と番号で取り出しました。でも、商品の情報を `["マウス", 2500, 40]` と持つと、`[1]` が値段なのか在庫なのか、見ただけではわかりません。

国語辞典で「単語」を引くと「意味」が出てくるように、**名前(キー)で値を引ける**のが**辞書**(dict)です。

## 辞書を作る、取り出す

```python
product = {"name": "マウス", "price": 2500, "stock": 40}
print(product["name"])
print(product["price"])
```

`{ }` の中に `キー: 値` をカンマで並べます。取り出すときは `辞書[キー]` です。キーにはふつう文字列を使います。JavaScript のオブジェクトに近いものですが、Python では `product.name` ではなく `product["name"]` と書きます。

変えるときも、足すときも同じ書き方です。

```python
product = {"name": "マウス", "price": 2500}
product["price"] = 2000
product["color"] = "黒"
print(product)
```

あるキーなら値が入れ替わり、ないキーなら新しく足されます。

## ないキーを引いたとき

```python
product = {"name": "マウス", "price": 2500}
print(product["stock"])
```

ないキーを `[ ]` で引くと、`KeyError: 'stock'` というエラーになります。ないかもしれないときは、2つの方法があります。

```python
product = {"name": "マウス", "price": 2500}
print(product.get("stock"))
print(product.get("stock", 0))
print("stock" in product)
```

- `辞書.get(キー)` は、ないときにエラーにせず `None`(何もない、を表す値)を返す
- `辞書.get(キー, 代わりの値)` は、ないときに代わりの値を返す
- `キー in 辞書` で、あるかどうかを調べる

## 辞書を for で回す

```python
scores = {"国語": 80, "数学": 92, "英語": 78}
for subject, score in scores.items():
    print(f"{subject}: {score}点")
print(sum(scores.values()))
```

`辞書.items()` を `for` で回すと、キーと値を1組ずつ取り出せます。`for subject, score in ...` のように、変数を2つ並べて受け取ります。

`辞書.keys()` はキーだけ、`辞書.values()` は値だけです。`sum(scores.values())` で点数の合計が出ます。

## 辞書のリスト = 表

SQL のレッスンで見た表は、Python では「辞書のリスト」で表すのが定番です。1行が1つの辞書、列の名前がキーになります。

```python
products = [
    {"name": "マウス", "category": "周辺機器", "price": 2500},
    {"name": "ノートパソコン", "category": "パソコン", "price": 128000},
    {"name": "キーボード", "category": "周辺機器", "price": 6800},
]
for p in products:
    if p["price"] < 10000:
        print(p["name"])
```

`for` で1行ずつ取り出し、`p["price"]` で列の値を見ます。SQL の `SELECT name FROM products WHERE price < 10000` と同じことをしています。

## 辞書で数える

「カテゴリごとに何個あるか」を数えるときも辞書を使います。

```python
categories = ["周辺機器", "パソコン", "周辺機器", "周辺機器"]
counts = {}
for c in categories:
    counts[c] = counts.get(c, 0) + 1
print(counts)
```

`counts.get(c, 0)` は「今の数(まだなければ 0)」です。それに 1 を足して入れ直すので、初めて出てきたカテゴリは 1、2回目は 2 になっていきます。SQL の `GROUP BY` と `COUNT` にあたる処理です。

## まとめ

- `{キー: 値}` で辞書を作り、`辞書[キー]` で取り出す・変える・足す
- ないキーを `[ ]` で引くと `KeyError`。`.get(キー, 代わり)` や `in` で避ける
- `for キー, 値 in 辞書.items():` で全部回す
- 表は「辞書のリスト」で持つ。数えるときは `counts[c] = counts.get(c, 0) + 1`
