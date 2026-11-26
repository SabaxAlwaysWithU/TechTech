---
title: 速い並べ替え
description: 分けて、並べて、まとめる。マージソートと O(n log n)
---

## 分けて考える

100枚の答案を点数順に並べるのは大変ですが、2人で50枚ずつ並べて、最後に2つの束を合わせるなら楽になります。その50枚も、さらに2人で25枚ずつに分ければ…と、**小さく分けて解いてから、まとめる**考え方を**分割統治**といいます。

これを並べ替えに使ったのが**マージソート**です。

## まずは「まとめる」部分

マージソートの心臓は、**並んだ2つのリストを、並んだ1つのリストにまとめる**(マージする)部分です。

```python
def merge(left, right):
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result

print(merge([1, 4, 9], [2, 3, 10, 12]))
```

2つの束の先頭どうしを比べて、小さいほうを取る、をくり返します。どちらかの束がなくなったら、残りをそのまま後ろにつなげます(`extend`)。それぞれの束がもう並んでいるので、先頭だけを比べれば済み、手間は全体の個数に比例します。

## 分けて、並べて、まとめる

あとは、リストを半分に分け、それぞれを**同じ関数で**並べてから、まとめます(Python の分野の「関数」や C の分野で見た、再帰です)。

```python
def merge(left, right):
    result = []
    i = 0
    j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    return result + left[i:] + right[j:]

def merge_sort(items):
    if len(items) <= 1:
        return list(items)
    mid = len(items) // 2
    left = merge_sort(items[:mid])
    right = merge_sort(items[mid:])
    return merge(left, right)

print(merge_sort([38, 27, 43, 3, 9, 82, 10]))
```

1個以下なら、もう並んでいるので、そのまま返します。これが再帰の終わりの条件です。

## なぜ速いのか: O(n log n)

8個のデータなら、8 → 4と4 → 2が4つ → 1が8つ、と**3段**で分け終わります。半分ずつに分けるので、段の数は log n です。そして、どの段でも、まとめる手間は合わせて n 個分です。

だから全体の手間は **n × log n**、計算量は **O(n log n)** になります。

| データの数 | O(n²) のソート | O(n log n) のソート |
| --- | --- | --- |
| 1,000 | 約50万 | 約1万 |
| 100万 | 約5,000億 | 約2,000万 |

100万件で、手間が2万分の1以下になります。Python の `sorted` も、マージソートと挿入ソートを組み合わせた **Timsort** という方法で、O(n log n) で並べています。ふだんは自分で書かずに `sorted` を使い、「速い並べ替えは O(n log n)」と知っておけば十分です。

## まとめ

- 分割統治: 小さく分けて解き、まとめる
- マージは、並んだ2つの束の先頭を比べて、小さいほうから取る。手間は個数に比例
- マージソートは、半分に分けて再帰で並べ、マージする。O(n log n)
- Python の sorted も O(n log n)。ふだんは sorted を使えばよい
