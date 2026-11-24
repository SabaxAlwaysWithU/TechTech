---
title: 標準ライブラリ
description: json で API のデータを読み書きし、collections で数える・分ける
---

## 最初から付いてくる道具箱

レッスン「ファイルとモジュール」で、`import math` や `from datetime import date` を使いました。Python には、こうした道具が最初から数百個入っています。これを**標準ライブラリ**といいます。

工具箱にドライバーやペンチが最初から入っているように、「よくある作業」はたいてい標準ライブラリに道具があります。自分で一から書く前に、まず「道具がないか」を探すのが Python らしい進め方です。

このレッスンでは、特によく使う2つを見ます。

| モジュール | できること |
| --- | --- |
| `json` | JSON の文字列と、Python の辞書・リストを行き来する |
| `collections` | 数える(`Counter`)、グループに分ける(`defaultdict`) |

## json: API のデータを読む

Web の API は、データを **JSON** という文字列で返します(JavaScript のレッスン「fetch と API」で見た形です)。Python では `json.loads` で、JSON の文字列を辞書やリストに変えます。

```python
import json

text = '[{"name": "マウス", "price": 2500}, {"name": "モニター", "price": 32000}]'
products = json.loads(text)
print(products[1]["name"])
print(sum(p["price"] for p in products))
```

`loads` は load string(文字列から読む)の略です。読み込んだあとは、ふつうのリストと辞書なので、これまでのレッスンの書き方がそのまま使えます。

`sum(p["price"] for p in products)` は、内包表記の `[ ]` を省いた形です。`sum` や `max` のカッコの中では、こう書けます。

## json: JSON の文字列を作る

逆に、辞書やリストを JSON の文字列にするのが `json.dumps` です。API に送るデータや、ファイルに保存するデータを作るときに使います。

```python
import json

order = {"product": "マウス", "quantity": 2, "gift": False}
print(json.dumps(order, ensure_ascii=False))
print(json.dumps(order, ensure_ascii=False, indent=2))
```

- `ensure_ascii=False` を付けないと、日本語が `マウス` のような記号に変わる
- `indent=2` を付けると、人が読みやすいように改行と字下げが入る
- Python の `False` / `True` / `None` は、JSON では `false` / `true` / `null` になる

## json: ファイルで読み書きする

ファイルから読むときは `json.load`、ファイルに書くときは `json.dump` です(s が付かない)。

```python
import json

data = {"name": "マウス", "stock": 40}
with open("stock.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

with open("stock.json", encoding="utf-8") as f:
    loaded = json.load(f)
print(loaded["stock"])
```

設定ファイルや、プログラムを止めても残しておきたいデータを、JSON のファイルにしておくのはよくあるやり方です。

## Counter: 数える

レッスン「辞書」では、`counts[c] = counts.get(c, 0) + 1` で数えました。`collections` の `Counter` を使うと、1行で済みます。

```python
from collections import Counter

categories = ["周辺機器", "パソコン", "周辺機器", "記憶装置", "周辺機器"]
counts = Counter(categories)
print(counts["周辺機器"])
print(counts.most_common(2))
```

- `Counter(リスト)` で、「もの → 出てきた回数」の辞書のようなものができる
- `.most_common(n)` で、多い順に上位 n 個の `(もの, 回数)` の組をリストで返す
- 出てこなかったものを引いても `KeyError` にならず、0 を返す

文章の単語を数えるなら `Counter(text.split())` です。

## defaultdict: グループに分ける

「クラスごとに生徒の名前を集める」ような、グループ分けもよくある作業です。ふつうの辞書だと、「まだキーがなければ空のリストを作る」処理が必要になります。

```python
from collections import defaultdict

students = [("山田", "B"), ("佐藤", "A"), ("鈴木", "A")]
groups = defaultdict(list)
for name, cls in students:
    groups[cls].append(name)
print(dict(groups))
```

`defaultdict(list)` は、「ないキーを引いたら、自動で空のリスト `[]` を作る辞書」です。だから、いきなり `groups[cls].append(name)` と書けます。`defaultdict(int)` にすると、ないキーは 0 から始まります。

`print` するときは `dict(...)` で包むと、ふつうの辞書と同じ形で表示されます。

## ほかにもある道具

| モジュール | 例 | できること |
| --- | --- | --- |
| `statistics` | `mean(点数のリスト)` | 平均、中央値などの統計 |
| `random` | `random.choice(リスト)` | ランダムに選ぶ、並びを混ぜる |
| `datetime` | `date.today()` | 日付と時刻 |
| `csv` | `csv.reader(f)` | CSV ファイルを読み書きする |
| `re` | `re.findall(パターン, 文字列)` | 正規表現で文字を探す |
| `pathlib` | `Path("memo.txt").read_text()` | ファイルやフォルダの場所を扱う |

全部を覚える必要はありません。「こういう作業をしたい」と思ったら、「Python 標準ライブラリ ○○」で調べると、たいてい見つかります。公式の説明書(Python ドキュメント)は日本語でも読めます。

## まとめ

- 標準ライブラリは、Python に最初から入っている道具。自分で書く前に探す
- `json.loads` / `json.dumps` は文字列と、`json.load` / `json.dump` はファイルと行き来する。日本語は `ensure_ascii=False`
- `Counter(リスト)` で数え、`.most_common(n)` で上位を取り出す
- `defaultdict(list)` で、キーがなくてもいきなり `append` できる
