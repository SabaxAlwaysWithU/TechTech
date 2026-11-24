---
title: 並べ替え
description: sorted の key と lambda で、「何で比べるか」を決めて並べる
---

## 何の順に並べる?

商品の一覧を「安い順」「名前の順」「売れた順」に並べ替える場面は、とても多いです。数のリストなら `sorted` だけで並びます。

```python
prices = [6800, 2500, 32000, 1800]
print(sorted(prices))
print(sorted(prices, reverse=True))
```

`sorted` は小さい順に並べた**新しいリスト**を返します。`reverse=True` を付けると大きい順です。文字列なら、あいうえお順(正確には文字の番号の順)になります。

でも、商品が辞書だったらどうでしょう。

```python
products = [{"name": "モニター", "price": 32000}, {"name": "マウス", "price": 2500}]
print(sorted(products))
```

`TypeError: '<' not supported between instances of 'dict' and 'dict'` というエラーになります。辞書どうしは、どちらが小さいか決められないからです。「値段で比べて」と教える必要があります。

## key: 比べる値を決める

`key=` に関数を渡すと、`sorted` はそれぞれの要素をその関数に通した結果で比べます。

```python
words = ["バナナ", "も", "りんご", "いちご大福"]
print(sorted(words, key=len))
```

`len` を通すと文字数になるので、短い順に並びます。並ぶのは元の単語のままで、`len` の結果は比べるためだけに使われます。

自分で作った関数も渡せます。

```python
def get_price(product):
    return product["price"]

products = [
    {"name": "モニター", "price": 32000},
    {"name": "マウス", "price": 2500},
    {"name": "キーボード", "price": 6800},
]
for p in sorted(products, key=get_price):
    print(p["name"], p["price"])
```

関数を**呼ぶのではなく渡す**ので、`get_price()` ではなく `get_price` とカッコなしで書きます。

## lambda: その場で作る小さな関数

`get_price` のように「1行で値を返すだけ」の関数を、毎回 `def` で作るのは面倒です。そこで **lambda**(ラムダ)を使います。

```python
products = [
    {"name": "モニター", "price": 32000},
    {"name": "マウス", "price": 2500},
    {"name": "キーボード", "price": 6800},
]
cheap_first = sorted(products, key=lambda p: p["price"])
print([p["name"] for p in cheap_first])
```

`lambda p: p["price"]` は、「p を受け取って `p["price"]` を返す関数」です。`def get_price(p): return p["price"]` を1行にまとめたものと同じです。

```
lambda 引数: 返す値
```

`return` は書きません。名前を付けず、`key=` に渡すためだけにその場で作ります。

## 2つ以上の条件で並べる

「クラスの順に並べて、同じクラスの中は点数の高い順」のように、比べる値が2つあるときは、key で**タプル**(カッコで囲んだ組)を返します。

```python
students = [
    {"name": "山田", "class": "B", "score": 80},
    {"name": "佐藤", "class": "A", "score": 65},
    {"name": "鈴木", "class": "A", "score": 90},
]
for s in sorted(students, key=lambda s: (s["class"], -s["score"])):
    print(s["class"], s["name"], s["score"])
```

タプルは、まず1つ目で比べ、同じなら2つ目で比べます。点数に `-` を付けると、大きいほど小さい値になるので「点数の高い順」になります。

## max と min にも key

いちばん高い商品を探すだけなら、並べ替えなくても `max` に `key` を渡せます。

```python
products = [
    {"name": "モニター", "price": 32000},
    {"name": "マウス", "price": 2500},
]
top = max(products, key=lambda p: p["price"])
print(top["name"])
```

`max` も `min` も、key で比べて「その要素そのもの」を返します。

## 辞書を値の順に並べる

`{"マウス": 40, "モニター": 10}` のような辞書を「数の多い順」に並べるときは、`items()` で組にしてから並べます。

```python
sales = {"マウス": 40, "モニター": 10, "キーボード": 25}
for name, count in sorted(sales.items(), key=lambda kv: kv[1], reverse=True):
    print(name, count)
```

`items()` の1つ1つは `("マウス", 40)` という組なので、`kv[1]` が数です。

## sorted と .sort() の違い

```python
prices = [6800, 2500, 32000]
new_list = sorted(prices)
print(prices, new_list)
prices.sort()
print(prices)
```

- `sorted(リスト)` は新しいリストを返し、元のリストは変えない
- `リスト.sort()` は元のリストを並べ替え、何も返さない(`None`)

`x = prices.sort()` と書くと `x` は `None` になる、というまちがいがよくあります。迷ったら `sorted` を使えば安全です。

## まとめ

- `sorted(リスト, key=関数, reverse=True)` で、比べる値と向きを決めて並べる
- `lambda 引数: 返す値` で、key に渡す小さな関数をその場で作る
- 条件が2つならタプル `(1つ目, 2つ目)`。大きい順にしたい数には `-` を付ける
- `max` / `min` も key が使える。辞書は `items()` にしてから並べる
- `sorted` は新しいリスト、`.sort()` は元を変えて `None` を返す
