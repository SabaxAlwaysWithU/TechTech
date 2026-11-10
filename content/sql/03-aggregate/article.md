---
title: 集計
description: COUNT、SUM、AVG、GROUP BY
---

## 「何件?」「合計は?」に答える

レジの締め作業を思い浮かべてください。1日の売上を知りたいとき、レシートを1枚ずつ見せられても困ります。欲しいのは「今日は何件売れて、合計いくらか」という1行です。

これまでの `SELECT` は、行をそのまま取り出していました。**集計**は、たくさんの行をまとめて、件数や合計のような1つの値にします。

## 集計関数

集計に使う関数は、まず次の5つを覚えれば十分です。

| 関数 | 意味 |
| --- | --- |
| `COUNT(*)` | 行の数 |
| `SUM(列)` | 合計 |
| `AVG(列)` | 平均 |
| `MAX(列)` | 最大 |
| `MIN(列)` | 最小 |

商品が何件あるかを数えてみます。

```sql
SELECT COUNT(*) FROM products;
```

結果は1行1列、「15」だけです。全部の行が1つにまとまりました。

価格の平均と最高額を一度に出すこともできます。

```sql
SELECT AVG(price), MAX(price) FROM products;
```

`WHERE` で行を絞ってから集計することもできます。「周辺機器の件数」ならこうです。

```sql
SELECT COUNT(*) FROM products WHERE category = '周辺機器';
```

## 列に名前を付ける: AS

集計の結果の列名は `COUNT(*)` のようにそのまま出てきて読みにくいので、`AS` で名前を付けます。

```sql
SELECT COUNT(*) AS 件数, AVG(price) AS 平均価格 FROM products;
```

`AS` は集計に限らず、どの列にも使えます。

## グループごとに集計する: GROUP BY

「分類ごとの件数」が知りたいとします。分類は4種類あるので、`WHERE` で4回数えるのは面倒です。こういうときは `GROUP BY` を使います。

```sql
SELECT category, COUNT(*) AS 件数
FROM products
GROUP BY category;
```

`GROUP BY category` と書くと、`category` の値が同じ行がひとまとめになり、まとまりごとに `COUNT(*)` が計算されます。結果は分類の数だけ、つまり4行になります。

| category | 件数 |
| --- | --- |
| ケーブル | 3 |
| パソコン | 3 |
| 周辺機器 | 6 |
| 記憶装置 | 3 |

ここで1つルールがあります。`GROUP BY` を使うとき、`SELECT` に書けるのは「グループ分けに使った列」と「集計関数」だけです。`SELECT name, COUNT(*) ... GROUP BY category` のように、グループと関係ない列を書くと、どの行の `name` を出せばいいのか決まらないからです。

## 集計した結果で絞る: HAVING

「件数が3件より多い分類だけ」のように、集計した結果で絞りたいときは `WHERE` ではなく `HAVING` を使います。

```sql
SELECT category, COUNT(*) AS 件数
FROM products
GROUP BY category
HAVING COUNT(*) > 3;
```

`WHERE` はグループにまとめる**前**の行を絞り、`HAVING` はまとめた**後**の結果を絞ります。書く順番は `WHERE` → `GROUP BY` → `HAVING` → `ORDER BY` です。

## まとめ

- `COUNT`、`SUM`、`AVG`、`MAX`、`MIN` で多くの行を1つの値にまとめる
- `AS` で結果の列に名前を付ける
- `GROUP BY 列` で、列の値ごとに集計する
- 集計後の結果で絞るときは `HAVING`
