---
title: JOIN
description: 複数の表をつなぐ
---

## 番号だけでは分からない

`orders`(注文)表を見てみましょう。

| id | customer_id | ordered_at | status |
| --- | --- | --- | --- |
| 1 | 1 | 2024-04-01 | 発送済 |
| 2 | 2 | 2024-04-03 | 発送済 |

`customer_id` が1、2と書いてありますが、これが誰なのかはこの表だけでは分かりません。名前は `customers`(顧客)表にあるからです。

| id | name | prefecture |
| --- | --- | --- |
| 1 | 佐藤 太郎 | 東京都 |
| 2 | 鈴木 花子 | 大阪府 |

「注文1は佐藤さん、注文2は鈴木さん」と知るには、2つの表を番号でつなぐ必要があります。これが **JOIN** です。

## JOIN の書き方

```sql
SELECT orders.id, customers.name, orders.ordered_at
FROM orders
JOIN customers ON orders.customer_id = customers.id;
```

3つの部分に分けて読みます。

1. `FROM orders JOIN customers`: `orders` と `customers` をつなぐ
2. `ON orders.customer_id = customers.id`: `orders` の `customer_id` と `customers` の `id` が同じ行同士をつなぐ
3. `SELECT orders.id, customers.name, ...`: つないだ結果から欲しい列を選ぶ

結果はこうなります。

| id | name | ordered_at |
| --- | --- | --- |
| 1 | 佐藤 太郎 | 2024-04-01 |
| 2 | 鈴木 花子 | 2024-04-03 |

2つの表が横に並んで、1つの大きな表になったと考えてください。`ON` の条件が合う行同士だけが並びます。

## 表名.列名

2つの表に同じ名前の列があると、どちらの `id` なのか分からなくなります。そのため JOIN では列名の前に `表名.` を付けます。`orders.id` は注文の番号、`customers.id` は顧客の番号です。

毎回表名を書くのは長いので、`AS` で短い別名を付けるのが普通です。

```sql
SELECT o.id, c.name, o.ordered_at
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id;
```

`AS` は省略して `FROM orders o` とも書けます。

## 3つ以上つなぐ

「どの注文で、どの商品が、何個売れたか」を知るには、`order_items`(注文明細)と `products`(商品)をつなぎます。JOIN は何回でも続けて書けます。

```sql
SELECT oi.order_id, p.name, oi.quantity
FROM order_items AS oi
JOIN products AS p ON oi.product_id = p.id
WHERE oi.order_id = 1;
```

さらに `orders` と `customers` までつなげば、「佐藤さんが、いつ、何を、何個買ったか」が1つの表になります。

```sql
SELECT c.name, o.ordered_at, p.name AS product, oi.quantity
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
JOIN order_items AS oi ON oi.order_id = o.id
JOIN products AS p ON oi.product_id = p.id
WHERE c.name = '佐藤 太郎';
```

## JOIN と集計を組み合わせる

つないだ結果は普通の表と同じなので、`WHERE` も `GROUP BY` も使えます。顧客ごとの注文件数はこう書けます。

```sql
SELECT c.name, COUNT(*) AS 注文数
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
GROUP BY c.id;
```

## 相手がいない行: LEFT JOIN

ここまでの `JOIN` は、`ON` の条件に合う相手がいる行だけを残します。一度も注文していない顧客は、結果から消えてしまいます。

「注文がない顧客も、注文の欄を空にして残したい」ときは `LEFT JOIN` を使います。左側(`FROM` に書いた表)の行はすべて残り、相手がいない部分は `NULL` になります。

```sql
SELECT c.name, o.id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id;
```

## まとめ

- `JOIN 表 ON 条件` で、番号が同じ行同士をつないで1つの表にする
- 列名は `表名.列名` で区別し、`AS` で短い別名を付ける
- JOIN は何回でも続けられ、WHERE や GROUP BY と組み合わせられる
- 相手がいない行も残すときは `LEFT JOIN`
