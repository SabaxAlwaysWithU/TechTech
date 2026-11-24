---
title: 配列と文字列
description: 同じ型を並べる配列。文字列は「\0 で終わる char の配列」
---

## 配列: 同じ型の箱を並べる

```c
#include <stdio.h>

int main() {
    int scores[5] = {80, 65, 92, 78, 55};
    printf("最初: %d\n", scores[0]);
    printf("最後: %d\n", scores[4]);
    scores[1] = 70;
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += scores[i];
    }
    printf("合計: %d\n", sum);
    return 0;
}
```

`int scores[5]` は「`int` の箱を5つ、メモリの上にすき間なく並べる」宣言です。番号(添字)は 0 から始まり、最後は 4 です。

Python のリストと違い、C の配列は**作ったときに大きさが決まり、あとから増やせません**。また、配列そのものは自分の長さを知りません。要素の数は、`sizeof` で計算するか、別の変数で持っておきます。

```c
#include <stdio.h>

int main() {
    int a[] = {3, 1, 4, 1, 5, 9};
    int n = sizeof(a) / sizeof(a[0]);
    printf("要素は %d 個\n", n);
    return 0;
}
```

`sizeof(a)` は配列全体のバイト数(24)、`sizeof(a[0])` は1つ分(4)なので、割ると個数になります。

## 範囲の外は、誰も止めてくれない

```c
#include <stdio.h>

int main() {
    int a[3] = {1, 2, 3};
    int b = 100;
    a[5] = 999;
    printf("ここまで来ました\n");
    return 0;
}
```

`a[5]` は配列の外です。Python なら `IndexError` で止まりますが、C は**何も確かめずに、そのあたりのメモリに書き込みます**。ほかの変数がこわれたり、まったく関係ないところでおかしくなったり、プログラムが落ちたりします。

この「範囲外への書き込み」(**バッファオーバーフロー**)は、何十年ものあいだ、乗っ取りなどのセキュリティ事故の大きな原因になってきました。配列を使うときは、番号が 0〜(個数-1)に収まっているかを、自分で確かめる必要があります。

## 関数に配列を渡す

配列を関数に渡すときは、**個数も一緒に渡します**(配列は自分の長さを知らないため)。

```c
#include <stdio.h>

int sum(int a[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += a[i];
    }
    return total;
}

int main() {
    int prices[4] = {2500, 6800, 1800, 800};
    printf("%d\n", sum(prices, 4));
    return 0;
}
```

ふつうの引数はコピーで渡りますが、配列は例外で、**元の配列そのもの**が渡ります(しくみは次のレッスン「ポインタ」で)。関数の中で `a[0] = 0;` とすると、呼んだ側の配列も変わります。

## 文字列は char の配列

C には「文字列」という専用の型がありません。文字列は **`char` の配列**で、最後に **`'\0'`(番号 0 の文字)** が付いています。`'\0'` が「ここで終わり」の印です。

```c
#include <stdio.h>

int main() {
    char name[] = "Hello";
    printf("%s\n", name);
    printf("%c %c\n", name[0], name[4]);
    printf("最後の印: %d\n", name[5]);
    int n = 0;
    while (name[n] != '\0') {
        n++;
    }
    printf("%d 文字\n", n);
    return 0;
}
```

```
name: | H | e | l | l | o | \0 |
        0   1   2   3   4    5
```

`"Hello"` は5文字ですが、`'\0'` の分も入れて6つの箱を使います。文字列は `%s` で表示します。

## string.h の道具

文字列を扱う道具は `string.h` にあります。

```c
#include <stdio.h>
#include <string.h>

int main() {
    char s[20] = "apple";
    printf("%d\n", (int)strlen(s));
    strcat(s, " pie");
    printf("%s\n", s);
    char t[20];
    strcpy(t, s);
    printf("%s\n", t);
    printf("%d\n", strcmp("apple", "apple") == 0);
    return 0;
}
```

| 道具 | すること |
| --- | --- |
| `strlen(s)` | 長さ(`'\0'` の手前までのバイト数) |
| `strcpy(dst, src)` | src を dst にコピーする |
| `strcat(dst, src)` | dst のうしろに src をつなげる |
| `strcmp(a, b)` | 同じなら 0、a が辞書順で前なら負、うしろなら正 |

ここにも落とし穴があります。

- 文字列どうしを `==` で比べても、中身は比べられません(何を比べているかは次のレッスンで)。中身は `strcmp(a, b) == 0` で比べる
- `=` で文字列を代入することもできません。`strcpy` を使う
- `strcpy` や `strcat` は、コピー先の大きさを確かめません。`char s[20]` に20バイト以上を入れると、範囲外に書き込んでしまいます

## 日本語の文字列

```c
#include <stdio.h>
#include <string.h>

int main() {
    char s[] = "ねこ";
    printf("%d\n", (int)strlen(s));
    return 0;
}
```

2文字なのに 6 と出ます。日本語は1文字が3バイト(UTF-8 の場合)なので、`strlen` は「バイト数」を数えています。C の文字列は、文字ではなく**バイトの並び**だということがよくわかります。

## まとめ

- 配列は同じ型の箱を並べたもの。番号は 0 から。大きさはあとから変えられない
- 個数は `sizeof(a) / sizeof(a[0])` か、別の変数で持つ。関数には個数も一緒に渡す
- 範囲外に書き込んでも C は止めない(バッファオーバーフロー)。番号は自分で確かめる
- 文字列は `'\0'` で終わる `char` の配列。表示は `%s`
- 長さは `strlen`、コピーは `strcpy`、比べるのは `strcmp`。`==` や `=` は使えない
