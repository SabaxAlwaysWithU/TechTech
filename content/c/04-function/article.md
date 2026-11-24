---
title: 関数
description: 戻り値の型、void、引数はコピーで渡る、プロトタイプ宣言、再帰
---

## 関数の形

```c
#include <stdio.h>

int add(int a, int b) {
    return a + b;
}

int main() {
    int x = add(3, 4);
    printf("%d\n", x);
    printf("%d\n", add(10, 20));
    return 0;
}
```

```
int        add  (int a, int b)  { return a + b; }
↑返す値の型  名前   受け取る値と、その型
```

C の関数は、**返す値の型**と、**受け取る値(引数)の型**を、すべて書きます。`main` も関数で、`int` を返す(0 なら正常終了)という決まりになっています。

## 何も返さない関数: void

表示するだけで、値を返さない関数は、返す型を `void`(空っぽ)にします。

```c
#include <stdio.h>

void line(int n) {
    for (int i = 0; i < n; i++) {
        printf("-");
    }
    printf("\n");
}

int main() {
    line(5);
    printf("見出し\n");
    line(10);
    return 0;
}
```

引数もないときは `void hello(void)` のように書きます。

## 引数は「コピー」で渡る

C の関数に渡した値は、**コピー**です。関数の中で引数を書き換えても、呼んだ側の変数は変わりません。

```c
#include <stdio.h>

void add_one(int x) {
    x = x + 1;
    printf("関数の中: %d\n", x);
}

int main() {
    int n = 5;
    add_one(n);
    printf("main の n: %d\n", n);
    return 0;
}
```

`add_one` の `x` は、`n` の値 5 を写しただけの、別の箱です。書き換えた結果を使いたいなら、`return` で返して、呼んだ側で受け取ります。

```c
#include <stdio.h>

int add_one(int x) {
    return x + 1;
}

int main() {
    int n = 5;
    n = add_one(n);
    printf("%d\n", n);
    return 0;
}
```

「どうしても呼んだ側の変数を、関数の中から直接書き換えたい」ときに使うのが、レッスン「ポインタ」で学ぶポインタです。

## 使う前に知らせる: プロトタイプ宣言

本物の C のコンパイラは、ファイルを上から順に読みます。`main` の中で、まだ出てきていない関数を呼ぶと、エラー(古いコンパイラでは警告)になります。

関数の本体を `main` よりうしろに書きたいときは、先に「こういう関数があります」とだけ書いておきます。これを**プロトタイプ宣言**といいます。

```c
#include <stdio.h>

int twice(int x);

int main() {
    printf("%d\n", twice(21));
    return 0;
}

int twice(int x) {
    return x * 2;
}
```

1行目の `int twice(int x);` が宣言です。本体の `{ }` の代わりに `;` で終わります。`#include <stdio.h>` で読み込んでいるのも、実は `printf` などのプロトタイプ宣言の集まりです。

この練習場の picoc は、宣言がなくても動いてしまいます。でも、本物の C で困らないように、「`main` より前に本体を書く」か「プロトタイプ宣言を書く」のどちらかにしてください。

## 変数の見える範囲

関数の中で宣言した変数は、その関数の中だけのものです(**ローカル変数**)。関数の外で宣言した変数は、どの関数からも使えます(**グローバル変数**)。

```c
#include <stdio.h>

int total = 0;

void add(int x) {
    int doubled = x * 2;
    total += doubled;
}

int main() {
    add(3);
    add(4);
    printf("%d\n", total);
    return 0;
}
```

グローバル変数は便利ですが、どこからでも書き換えられるので、増えるほど「どこで変わったのか」がわかりにくくなります。必要な値は、引数と戻り値で受け渡すのが基本です。

## 自分を呼ぶ関数: 再帰

関数は、自分自身を呼ぶこともできます(**再帰**)。たとえば階乗(5! = 5 × 4 × 3 × 2 × 1)は、「n! = n × (n-1)!」と自分を使って書けます。

```c
#include <stdio.h>

int fact(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * fact(n - 1);
}

int main() {
    printf("%d\n", fact(5));
    return 0;
}
```

必ず「これ以上は呼ばない」終わりの条件(ここでは `n <= 1`)を書きます。終わりがないと、呼び出しが積み重なってメモリが足りなくなり、止まってしまいます。

## まとめ

- 関数は「返す型 名前(引数の型 引数, …) { … }」。値を返さないなら `void`
- 引数はコピーで渡る。関数の中で書き換えても、呼んだ側は変わらない。結果は `return` で返す
- `main` より後ろに書く関数は、プロトタイプ宣言(`int twice(int x);`)を先に書く
- 関数の中の変数はその中だけ。グローバル変数はなるべく使わない
- 再帰は自分を呼ぶ関数。終わりの条件を必ず書く
