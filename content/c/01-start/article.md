---
title: C を動かす
description: C はどんな言語か。最小のプログラム、printf、エラーの読み方
---

## コンピュータの土台の言語

C は1972年に、OS の UNIX を書くために作られた言語です。50年以上たった今でも、たくさんのものの土台で使われています。

- Linux や Windows の中心部分(OS のカーネル)
- 家電、車、ゲーム機などに入っている小さなコンピュータ(組み込み機器)
- Python や JavaScript を動かしているプログラム自身(Python 本体は C で書かれている)

C が選ばれるのは、**速く、小さく、コンピュータのメモリを直接扱える**からです。そのぶん、Python や JavaScript ならやってくれることの多くを、自分で書く必要があります。C を学ぶと、ほかの言語が裏で何をしてくれているのかが見えるようになります。

## 最小のプログラム

```c
#include <stdio.h>

int main() {
    printf("Hello, C!\n");
    return 0;
}
```

1行ずつ見ていきます。

- `#include <stdio.h>` は「画面に出す道具(標準入出力)を使います」という宣言です。`printf` を使うときに必要です
- `int main() { ... }` が**プログラムの入口**です。C のプログラムは、必ず `main` という関数から始まります
- `printf("...")` で文字を画面に出します。`\n` は**改行**の印です。書かないと、次の出力が同じ行に続きます
- `return 0;` は「正常に終わりました」という合図です。0 以外を返すと、失敗の合図になります
- 文の終わりには必ず `;`(セミコロン)を付けます。まとまりは `{ }` で囲みます

## 本物の C は「コンパイル」してから動かす

Python は、書いたコードをそのまま読みながら動かします。C は違います。

<figure class="fig"><svg viewBox="0 0 480 104" role="img" aria-label="hello.c をコンパイラで機械語の hello に翻訳し、それを実行する流れ"><defs><marker id="ah1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ah"/></marker></defs><rect x="8" y="34" width="120" height="56" rx="8" class="bx"/><text x="68.0" y="59.0" class="t" text-anchor="middle">hello.c</text><text x="68.0" y="78.0" class="t-s" text-anchor="middle">人が読む文章</text><rect x="180" y="34" width="120" height="56" rx="8" class="bx-hl"/><text x="240.0" y="59.0" class="t" text-anchor="middle">hello</text><text x="240.0" y="78.0" class="t-s" text-anchor="middle">機械語</text><rect x="352" y="34" width="120" height="56" rx="8" class="bx"/><text x="412.0" y="59.0" class="t" text-anchor="middle">実行</text><text x="412.0" y="78.0" class="t-s" text-anchor="middle">画面に出る</text><line x1="132" y1="62" x2="176" y2="62" class="ln" marker-end="url(#ah1)"/><text x="154.0" y="26" class="t-s t-hl" text-anchor="middle">gcc で翻訳</text><line x1="304" y1="62" x2="348" y2="62" class="ln" marker-end="url(#ah1)"/><text x="326.0" y="26" class="t-s t-hl" text-anchor="middle">./hello</text></svg><figcaption>C は、先に機械語へ翻訳(コンパイル)してから実行する</figcaption></figure>

ふだんの開発では、ターミナルでこう打ちます(Linux 分野の疑似ターミナルとは別の、本物の環境での話です)。

```sh
gcc hello.c -o hello
./hello
```

`gcc` がコンパイラで、`hello.c` を機械語に翻訳して `hello` というファイルを作ります。翻訳を最初に1回だけ済ませるので、実行はとても速くなります。

この練習場では、ブラウザの中で C を動かすために、**picoc** という小さな C のインタプリタ(読みながら動かすもの)を使っています。書き方は本物の C と同じですが、`const` など一部の書き方は使えません。使えないものは、そのレッスンで紹介します。

## printf で数を出す

`printf` の f は format(書式)の f です。文字の中に `%d` を書くと、うしろに並べた数がそこに入ります。

```c
#include <stdio.h>

int main() {
    printf("%d + %d = %d\n", 3, 4, 3 + 4);
    printf("1日は %d 秒です\n", 24 * 60 * 60);
    return 0;
}
```

`%d` が3つあれば、うしろにも値を3つ、順番に並べます。`%d` は整数(decimal、10進数)を出す印です。ほかの印は次のレッスンで見ます。

## コメント

```c
#include <stdio.h>

int main() {
    // ここから行の終わりまではコメント(プログラムとしては無視される)
    /* こちらは、何行にも
       またがって書けるコメント */
    printf("コメントは表示されません\n");
    return 0;
}
```

## エラーを読む

C は文法にとても厳しい言語です。`;` を1つ忘れただけで、プログラム全体が動きません。

```c
#include <stdio.h>

int main() {
    printf("1行目\n")
    printf("2行目\n");
    return 0;
}
```

この練習場では、エラーが出ると「何行目の何文字目か」と、日本語の補足が表示されます。ここでは「5行目」と出ますが、本当に `;` が足りないのは4行目の終わりです。C のコンパイラは「`;` がないまま次の行に進んでしまって、はじめておかしいと気づく」ので、**示された行の1つ前の行**もよく見る習慣をつけましょう。

もう1つ、日本語を打ったあとに多いのが、全角の記号です。`;` や `(` が全角(`；` `（`)になっていると、C は読めません。

## まとめ

- C は OS や機器の土台の言語。速く小さく、メモリを直接扱える
- プログラムは `int main() { ... }` から始まる。文の終わりに `;`、まとまりは `{ }`
- `printf` で表示する。`\n` で改行、`%d` に整数が入る
- 本物の C はコンパイルしてから動かす。この練習場は picoc というインタプリタで動いている
- エラーは、示された行と、その1つ前の行を見る。全角の記号に注意
