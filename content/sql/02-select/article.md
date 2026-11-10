---
title: SELECTの基本
description: 取り出す、WHEREで絞る、ORDER BYで並べる
---

## 表から「取り出す」ということ

図書館で本を探すところを思い浮かべてください。「料理の本を、新しい順に見せて」と頼めば、司書さんは棚から該当する本だけを選んで、並べて持ってきてくれます。

SQLの `SELECT` は、この「頼み方」です。表の中から、欲しい列と行だけを取り出して、好きな順に並べて見せてもらう命令です。

この記事では、ネットショップの `products`(商品)表を使います。列は `id`、`name`(商品名)、`category`(分類)、`price`(価格)の4つです。

## 列を選ぶ: SELECT と FROM

いちばん短い形はこれです。

```sql
SELECT name, price FROM products;
```

`SELECT` のあとに欲しい列の名前を、`FROM` のあとに表の名前を書きます。「`products` 表から `name` と `price` を見せて」という意味です。列はカンマで区切って、いくつでも並べられます。

すべての列が欲しいときは、列名の代わりに `*`(アスタリスク)を書きます。

```sql
SELECT * FROM products;
```

文の終わりにはセミコロン `;` を付けます。付け忘れても動くことが多いですが、「ここで文が終わり」という印なので、付ける習慣にしましょう。

## 行を絞る: WHERE

列は選べましたが、このままでは全商品が出てきます。「周辺機器だけ」のように行を絞るには `WHERE` を使います。

```sql
SELECT name, price FROM products WHERE category = '周辺機器';
```

`WHERE` のあとに条件を書きます。条件に合う行だけが結果に残ります。文字は `'`(シングルクォート)で囲みます。数値は囲みません。

比べ方はいろいろあります。

| 書き方 | 意味 |
| --- | --- |
| `price = 2500` | 等しい |
| `price <> 2500` | 等しくない |
| `price > 10000` | より大きい |
| `price <= 5000` | 以下 |
| `name LIKE '%ケーブル%'` | 「ケーブル」を含む |

条件は `AND` や `OR` でつなげます。「周辺機器で、かつ5,000円以下」ならこうです。

```sql
SELECT name, price FROM products
WHERE category = '周辺機器' AND price <= 5000;
```

## 並べる: ORDER BY

取り出した行の順番は、何も指定しなければ決まっていません。「安い順に」のように並べたいときは `ORDER BY` を使います。

```sql
SELECT name, price FROM products ORDER BY price;
```

これで `price` の小さい順(昇順)に並びます。高い順(降順)にしたいときは、列名のあとに `DESC` を付けます。

```sql
SELECT name, price FROM products ORDER BY price DESC;
```

## 3つを組み合わせる

`WHERE` と `ORDER BY` は同時に使えます。書く順番は決まっていて、`SELECT` → `FROM` → `WHERE` → `ORDER BY` です。

```sql
SELECT name, price FROM products
WHERE category = '周辺機器'
ORDER BY price DESC;
```

「`products` 表から、分類が周辺機器の行だけを、価格の高い順に、名前と価格を見せて」。文章にすると長いですが、SQLにすると3行です。

最後に、件数を絞る `LIMIT` も覚えておくと便利です。`ORDER BY price DESC LIMIT 3` で「高い順に上から3件」になります。

## まとめ

- `SELECT 列 FROM 表` で列を選ぶ。全列なら `*`
- `WHERE 条件` で行を絞る。文字は `'` で囲む
- `ORDER BY 列` で並べる。降順は `DESC`
- 書く順番は SELECT、FROM、WHERE、ORDER BY
