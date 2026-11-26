---
title: add と commit
description: 荷物をカバンに詰めて、セーブする
---

## セーブは2段階

Git のセーブ(コミット)は、1回の操作ではなく2段階です。

1. `git add`: 次のセーブに**入れるファイルを選ぶ**
2. `git commit`: 選んだものを**メモ付きで記録する**

旅行の荷造りで言えば、`add` は「持っていくものをカバンに詰める」、`commit` は「カバンを閉じて封をする」です。詰める場所を**ステージ**(またはインデックス)と呼びます。

<figure class="fig"><svg viewBox="0 0 480 104" role="img" aria-label="作業フォルダから git add でステージへ、git commit でリポジトリの履歴へ"><defs><marker id="ah4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker></defs><rect x="8" y="34" width="120" height="56" rx="8" class="bx"/><text x="68.0" y="59.0" class="t" text-anchor="middle">作業フォルダ</text><text x="68.0" y="78.0" class="t-s" text-anchor="middle">編集中</text><rect x="180" y="34" width="120" height="56" rx="8" class="bx"/><text x="240.0" y="59.0" class="t" text-anchor="middle">ステージ</text><text x="240.0" y="78.0" class="t-s" text-anchor="middle">次に記録する</text><rect x="352" y="34" width="120" height="56" rx="8" class="bx-hl"/><text x="412.0" y="59.0" class="t" text-anchor="middle">リポジトリ</text><text x="412.0" y="78.0" class="t-s" text-anchor="middle">記録済みの履歴</text><line x1="132" y1="62" x2="176" y2="62" class="ln" marker-end="url(#ah4)"/><text x="154.0" y="26" class="t-s t-hl" text-anchor="middle">git add</text><line x1="304" y1="62" x2="348" y2="62" class="ln" marker-end="url(#ah4)"/><text x="326.0" y="26" class="t-s t-hl" text-anchor="middle">git commit</text></svg><figcaption>変更は「作業フォルダ → ステージ → リポジトリ」の順に進む</figcaption></figure>

なぜ2段階なのか。「今日は3つのファイルを直したが、記録として残したいのはそのうち2つのまとまりだけ」ということがよくあるからです。`add` で選べるおかげで、1つのコミットを意味のある単位にできます。

## git add

```sh
git add README.md
```

`README.md` がステージに入りました。`git status` で見ると、「Changes to be committed(コミットされる変更)」に移っています。

フォルダの中を全部まとめて入れるには、ファイル名の代わりに `.`(今いる場所)を書きます。

```sh
git add .
```

最初のコミットや、変更したものを全部入れたいときはこれが楽です。ただし、入れたくないファイル(後述の `node_modules` など)も入ってしまうので、`git status` で何が入ったかを見る習慣をつけてください。

## git commit

```sh
git commit -m "最初のページを作る"
```

`-m` のあとに、このコミットで何をしたかを書きます。これが**コミットメッセージ**です。`-m` を付け忘れると、メッセージを書くためのエディタが開いて戸惑うので、最初のうちは必ず付けてください。

メッセージは「何をしたか」が一目で分かる短い文にします。

| よい | よくない |
| --- | --- |
| `自己紹介の文を直す` | `修正` |
| `トップに写真を追加` | `いろいろ変更` |
| `リンク切れを直す` | `aaa` |

1週間後の自分が履歴を見て、中身を開かずに分かるかどうかが目安です。

## 変更を重ねる

一度コミットしたファイルを編集すると、`git status` では「Changes not staged for commit(まだステージしていない変更)」と出ます。Git は変更に気づいていますが、まだステージには入っていません。もう一度 `add` して `commit` します。

```sh
echo "写真を追加する" >> memo.txt
git status
git add memo.txt
git commit -m "メモに次の予定を書く"
```

この「編集 → add → commit」の繰り返しが、Git を使う日常のほぼすべてです。

## 履歴を見る: git log

```sh
git log
```

新しい順にコミットが並びます。1行ずつ見たいときは `--oneline` を付けます。

```sh
git log --oneline
```

左の英数字(`a1b2c3d` のような)はコミットの番号(ID)です。あとで特定のコミットを指すときに使います。

## 3つの状態を見分ける

`git status` の表示は、ファイルがどの段階にあるかを教えてくれます。

| 表示 | 状態 | 次にすること |
| --- | --- | --- |
| Untracked files | 一度も add していない | `git add` |
| Changes not staged for commit | 記録済みだが、その後変更した | `git add` |
| Changes to be committed | ステージ済み | `git commit` |
| nothing to commit, working tree clean | 全部記録済み | なし |

迷ったら `git status`。Git で困ったときの最初の一手は、いつもこれです。

## まとめ

- `git add ファイル` で次のコミットに入れる(ステージ)。`git add .` で全部
- `git commit -m "メッセージ"` で記録する
- メッセージは「何をしたか」が一目で分かる短い文
- `git log --oneline` で履歴を1行ずつ見る。迷ったら `git status`
