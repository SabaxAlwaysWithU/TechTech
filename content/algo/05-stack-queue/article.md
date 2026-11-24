---
title: スタックとキュー
description: 最後に入れたものから出すスタック、最初に入れたものから出すキュー
---

## ためておく順番

データを一時的にためておき、あとで1つずつ取り出す場面はたくさんあります。そのとき「**どの順番で取り出すか**」によって、2つの基本の形があります。

| | 取り出す順 | たとえ |
| --- | --- | --- |
| **スタック** | 最後に入れたものから(後入れ先出し) | 積み重ねた皿。上から取る |
| **キュー** | 最初に入れたものから(先入れ先出し) | レジの行列。先に並んだ人から |

こうした「データの入れ方・持ち方」の決まりを**データ構造**といいます。アルゴリズムと並んで、プログラムの速さと書きやすさを決める大事な部品です。

## スタック: リストの append と pop

Python では、リストの `append`(後ろに足す)と `pop()`(後ろから取り出す)で、そのままスタックになります。

```python
stack = []
stack.append("ページA")
stack.append("ページB")
stack.append("ページC")
print(stack.pop())
print(stack.pop())
print(stack)
```

ブラウザの「戻る」ボタンは、開いたページをスタックに積んでおき、上から取り出す仕組みです。テキストエディタの「元に戻す」も同じです。C の分野で見た「関数を呼ぶたびに積み重なるメモリ」も、スタックと呼ばれていました。

## 括弧の対応を調べる

スタックの代表的な使い道が、**括弧がちゃんと閉じているか**を調べることです。

```python
def balanced(text):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in text:
        if ch in "([{":
            stack.append(ch)
        elif ch in ")]}":
            if not stack or stack.pop() != pairs[ch]:
                return False
    return len(stack) == 0

print(balanced("print(a[0])"))
print(balanced("(]"))
print(balanced("((x)"))
```

開き括弧が来たら積み、閉じ括弧が来たら、いちばん上の開き括弧と組になっているかを確かめます。最後にスタックが空なら、全部閉じています。プログラムの文法のエラー(「`)` が足りません」)も、こうして見つけています。

## キュー: deque を使う

キューもリストの `pop(0)`(先頭から取り出す)で作れますが、先頭を取り出すたびに残りを全部前へずらすので、遅くなります(O(n))。Python では `collections` の **deque**(デック)を使います。

```python
from collections import deque

queue = deque()
queue.append("1番の客")
queue.append("2番の客")
queue.append("3番の客")
print(queue.popleft())
print(queue.popleft())
print(list(queue))
```

`append` で後ろに並び、`popleft` で先頭から取り出します。どちらも O(1) です。印刷の順番待ち、サーバーに届いた注文の処理待ちなど、「来た順に処理する」ものはキューで持ちます。

## まとめ

- データ構造は、データの入れ方・持ち方の決まり
- スタックは後入れ先出し。Python ではリストの `append` と `pop()`。戻るボタン、括弧の対応
- キューは先入れ先出し。`deque` の `append` と `popleft`。順番待ちの処理
- リストの `pop(0)` は遅いので、キューには deque を使う
