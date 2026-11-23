---
title: クラス
description: データと、それを扱う処理をひとまとめにする
---

## たい焼きの型

たい焼き屋さんは、鉄の**型**に生地を流し込んで、同じ形のたい焼きをいくつも焼きます。型は1つでも、焼き上がったたい焼きは1つずつ別物で、中身はあんこだったりクリームだったりします。

Python の**クラス**は、この「型」です。クラスから作った1つひとつを**インスタンス**(実物)と呼びます。

## 辞書で困ること

これまで、商品は辞書で表してきました。

```python
item = {"name": "マウス", "price": 2500}
tax_price = item["price"] * 110 // 100
print(tax_price)
```

これでも動きますが、`"prise"` とキーを打ち間違えてもすぐには気づけず、「税込みの計算」は辞書とは別のところに書くことになります。クラスを使うと、**データ(名前や値段)と、それを扱う処理(税込みの計算)をひとまとめ**にできます。

## クラスを作る

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

    def with_tax(self):
        return self.price * 110 // 100

mouse = Product("マウス", 2500)
print(mouse.name)
print(mouse.with_tax())
```

順に見ていきます。

- `class Product:` でクラスを作る。名前は大文字で始めるのが習慣
- `def __init__(self, name, price):` は、インスタンスを作るときに1回だけ動く準備の関数。`__init__` の前後はアンダースコア2つずつ
- `self.name = name` で、インスタンスに `name` という値を持たせる。インスタンスが持つ値を**属性**と呼ぶ
- `def with_tax(self):` のように、クラスの中に書いた関数を**メソッド**と呼ぶ
- `Product("マウス", 2500)` でインスタンスを作る。`__init__` の `name` と `price` に値が入る
- `mouse.name` で属性を、`mouse.with_tax()` でメソッドを使う

## self は「そのインスタンス自身」

メソッドの最初の引数 `self` には、そのメソッドを呼んだインスタンスが自動で入ります。`mouse.with_tax()` と呼ぶと、`self` は `mouse` です。だから `self.price` で、そのインスタンスの値段を読めます。

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

    def with_tax(self):
        return self.price * 110 // 100

mouse = Product("マウス", 2500)
monitor = Product("モニター", 32000)
print(mouse.with_tax())
print(monitor.with_tax())
```

同じ `with_tax` でも、呼んだインスタンスによって結果が変わります。型は1つで、たい焼きは別々です。

メソッドを定義するときは `self` を書き、呼ぶときは書きません。`self` を書き忘れると、`takes 0 positional arguments but 1 was given`(引数を0個受け取るのに1個渡された)というエラーになります。Python が自動で渡した `self` の行き場がないからです。

## 状態を変えるメソッド

属性は、メソッドの中から書き換えられます。

```python
class Counter:
    def __init__(self):
        self.count = 0

    def up(self):
        self.count += 1

c = Counter()
c.up()
c.up()
print(c.count)
```

`c.up()` を呼ぶたびに `c.count` が1ずつ増えます。インスタンスは自分の状態を覚えていて、メソッドがそれを変えます。

## インスタンスを組み合わせる

インスタンスは、リストに入れたり、別のクラスの属性にしたりできます。

```python
class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price

class Cart:
    def __init__(self):
        self.items = []

    def add(self, product):
        self.items.append(product)

    def total(self):
        return sum(p.price for p in self.items)

cart = Cart()
cart.add(Product("マウス", 2500))
cart.add(Product("キーボード", 6800))
print(cart.total())
```

`sum(p.price for p in self.items)` は、「`items` の1つひとつの `price`」を足す短い書き方です。`for` で `total += p.price` と足しても同じです。

## いつクラスを使うか

小さなプログラムなら、辞書と関数で十分です。次のようなときにクラスを考えます。

- 同じ形のデータ(商品、会員、注文)がたくさんあり、それぞれに同じ処理をしたい
- データと処理がいつもセットで使われる
- Django などのフレームワークを使う(データベースの表をクラスで書く)

## まとめ

- `class 名前:` でクラス(型)を作り、`名前(...)` でインスタンス(実物)を作る
- `__init__(self, ...)` で準備し、`self.属性 = 値` で値を持たせる
- メソッドの最初の引数は `self`。呼ぶときは書かない
- インスタンスは自分の状態を覚え、メソッドで変えられる
