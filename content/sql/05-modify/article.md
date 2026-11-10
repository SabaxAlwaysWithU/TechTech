---
title: データの変更
description: INSERT、UPDATE、DELETE
---

## 読むだけでなく、書く

ここまでは表を「読む」SQLばかりでした。ところが実際のネットショップでは、新しい商品が登録され、注文の状態が「準備中」から「発送済」に変わり、キャンセルされた注文は消されます。

表を変える命令は3つです。足す `INSERT`、書き換える `UPDATE`、消す `DELETE`。この3つを覚えると、データベースに対してできることが一通りそろいます。

練習場では何を変えても大丈夫です。「リセット」を押せば元に戻ります。

## 行を足す: INSERT

`products` 表に新しい商品を1行足します。

```sql
INSERT INTO products (id, name, category, price)
VALUES (16, 'マウスパッド', '周辺機器', 900);
```

`INSERT INTO 表名 (列名の並び) VALUES (値の並び)` の形です。列名と値は、同じ順番で、同じ数だけ書きます。文字は `'` で囲み、数値は囲みません。

`id` は主キーなので、すでにある値(1〜15)を指定するとエラーになります。

実行しても結果の表は出ません。代わりに「1行を変更しました」と表示されます。本当に足されたか確かめるには、`SELECT * FROM products WHERE id = 16;` で見てみましょう。

## 行を書き換える: UPDATE

注文17の状態を「準備中」から「発送済」に変えます。

```sql
UPDATE orders SET status = '発送済' WHERE id = 17;
```

`UPDATE 表名 SET 列 = 新しい値 WHERE 条件` の形です。`SET` に書いた列が、`WHERE` の条件に合う行だけ書き換わります。

ここで**いちばん大事な注意**があります。`WHERE` を書き忘れると、**全部の行**が書き換わります。

```sql
-- これは全注文が「発送済」になってしまう
UPDATE orders SET status = '発送済';
```

`UPDATE` を書くときは、まず同じ条件で `SELECT` して、何行が対象になるかを確かめる習慣をつけてください。

複数の列を一度に変えるときは、カンマで並べます。

```sql
UPDATE products SET price = 2200, category = '周辺機器' WHERE id = 4;
```

## 行を消す: DELETE

キャンセルされた注文5の明細を消します。

```sql
DELETE FROM order_items WHERE order_id = 5;
```

`DELETE FROM 表名 WHERE 条件` の形です。列は指定しません。行ごと消えるからです。

`UPDATE` と同じく、`WHERE` を忘れると全行が消えます。`DELETE` には取り消しがないので、特に気をつけてください。

## 3つの共通点

| 命令 | 形 | 注意 |
| --- | --- | --- |
| `INSERT` | `INSERT INTO 表 (列...) VALUES (値...)` | 主キーの重複はエラー |
| `UPDATE` | `UPDATE 表 SET 列 = 値 WHERE 条件` | WHERE を忘れると全行 |
| `DELETE` | `DELETE FROM 表 WHERE 条件` | WHERE を忘れると全行 |

どれも、実行したあとに `SELECT` で結果を確かめるのが基本です。練習場の課題も、実行後の表の中身で正解かどうかを判定します。

## まとめ

- `INSERT INTO 表 (列) VALUES (値)` で行を足す
- `UPDATE 表 SET 列 = 値 WHERE 条件` で書き換える
- `DELETE FROM 表 WHERE 条件` で消す
- `UPDATE` と `DELETE` は、先に同じ条件の `SELECT` で対象を確かめる
