---
title: 条件と繰り返し
description: if、for、while、switch。0 は偽、= と == の罠
---

## if: 条件で分ける

```c
#include <stdio.h>

int main() {
    int score = 72;
    if (score >= 80) {
        printf("よくできました\n");
    } else if (score >= 60) {
        printf("合格です\n");
    } else {
        printf("もう少し\n");
    }
    return 0;
}
```

条件は `( )` で囲み、実行するまとまりは `{ }` で囲みます。上から順に調べ、最初に当てはまったところだけが動きます。JavaScript とほとんど同じ書き方です。

| 書き方 | 意味 |
| --- | --- |
| `a == b` / `a != b` | 等しい / 等しくない |
| `a < b` / `a <= b` | より小さい / 以下 |
| `a && b` | a かつ b |
| `a \|\| b` | a または b |
| `!a` | a ではない |

## C には true / false がない(もともとは)

C の条件は、**0 なら偽、0 以外なら真**です。比べた結果も数で、正しければ 1、まちがっていれば 0 になります。

```c
#include <stdio.h>

int main() {
    printf("%d\n", 5 > 3);
    printf("%d\n", 5 < 3);
    int n = 4;
    if (n % 2) {
        printf("奇数\n");
    } else {
        printf("偶数\n");
    }
    return 0;
}
```

`n % 2` は奇数なら 1(真)、偶数なら 0(偽)なので、そのまま条件に使えます。あとから `stdbool.h` で `bool`、`true`、`false` も使えるようになりましたが、中身は 1 と 0 です。

## = と == の罠

C でいちばん有名なまちがいです。

```c
#include <stdio.h>

int main() {
    int x = 3;
    if (x = 5) {
        printf("x は 5 です(本当に?)\n");
    }
    printf("x の中身: %d\n", x);
    return 0;
}
```

`x = 5` は比べているのではなく、**x に 5 を代入**しています。代入した結果の 5 は 0 ではないので、いつも真になり、しかも x が書き換わってしまいます。比べるときは `==` です。本物のコンパイラ(gcc など)は、こういう書き方に「警告」を出してくれます。

## for: 回数を決めてくり返す

```c
#include <stdio.h>

int main() {
    int sum = 0;
    for (int i = 1; i <= 10; i++) {
        sum = sum + i;
    }
    printf("1 から 10 の合計は %d\n", sum);
    return 0;
}
```

`for (はじめ; 続ける条件; 1回ごとにすること)` の形です。`i++` は `i = i + 1` の短い書き方です。同じように `sum += i` は `sum = sum + i` と同じです。

## while: 条件が続くあいだくり返す

```c
#include <stdio.h>

int main() {
    int money = 1000;
    int days = 0;
    while (money > 0) {
        money -= 300;
        days++;
    }
    printf("%d 日でお金がなくなります\n", days);
    return 0;
}
```

回数が先にわからないときは `while` が向いています。条件がずっと真のままだと、終わらなくなります(無限ループ)。この練習場では3秒で止めて知らせます。

## break と continue

```c
#include <stdio.h>

int main() {
    for (int i = 1; i <= 10; i++) {
        if (i % 3 == 0) {
            continue;
        }
        if (i > 7) {
            break;
        }
        printf("%d\n", i);
    }
    return 0;
}
```

- `continue` は、この回の残りを飛ばして、次の回へ進む
- `break` は、くり返しそのものを抜ける

## switch: 値ごとに分ける

1つの値が「1 なら」「2 なら」…と分かれるときは、`switch` も使えます。

```c
#include <stdio.h>

int main() {
    int day = 3;
    switch (day) {
        case 0:
            printf("日曜日\n");
            break;
        case 6:
            printf("土曜日\n");
            break;
        default:
            printf("平日\n");
            break;
    }
    return 0;
}
```

`case` の最後には `break` を書きます。書き忘れると、次の `case` の中まで続けて実行してしまいます(フォールスルー)。

## まとめ

- `if` / `else if` / `else` で分ける。条件は 0 なら偽、0 以外なら真
- 比べるのは `==`。`=` は代入で、条件に書くといつも真になりがち
- 回数が決まっているなら `for`、条件で続けるなら `while`
- `continue` で次の回へ、`break` でくり返しを抜ける
- `switch` の `case` には `break` を忘れずに
