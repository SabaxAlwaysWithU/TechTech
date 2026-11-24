---
title: 構造体
description: いくつかの値をひとまとめにする struct。. と ->、構造体の配列
---

## 値をひとまとめにする

商品には、名前、値段、在庫…と、いくつもの情報があります。バラバラの変数で持つと、どの値段がどの商品のものか、わかりにくくなります。

```text
char name1[20]; int price1; int stock1;
char name2[20]; int price2; int stock2;
```

**構造体**(struct)を使うと、関係する値を1つの型にまとめられます。Python の辞書や、JavaScript のオブジェクトに近いものですが、入る項目と型は、先に決めておきます。

```c
#include <stdio.h>
#include <string.h>

struct Product {
    char name[20];
    int price;
    int stock;
};

int main() {
    struct Product p;
    strcpy(p.name, "マウス");
    p.price = 2500;
    p.stock = 40;
    printf("%s: %d 円(在庫 %d)\n", p.name, p.price, p.stock);
    return 0;
}
```

- `struct Product { ... };` で、新しい型の形(設計図)を決める。最後の `;` を忘れずに
- `struct Product p;` で、その型の変数を作る
- 中の値(**メンバー**)は `p.price` のように `.` でつなげて読み書きする

## typedef で短い名前を付ける

毎回 `struct Product` と書くのは長いので、`typedef` で型に名前を付けるのが定番です。

```c
#include <stdio.h>

typedef struct {
    int x;
    int y;
} Point;

int main() {
    Point a;
    a.x = 3;
    a.y = 4;
    Point b;
    b = a;
    b.x = 10;
    printf("a = (%d, %d)、b = (%d, %d)\n", a.x, a.y, b.x, b.y);
    return 0;
}
```

構造体は `=` でまるごとコピーできます。`b = a` のあとに `b.x` を変えても、`a` は変わりません(配列は `=` でコピーできないのと違うところです)。

本物の C では `Point a = {3, 4};` のように、`{ }` でまとめて初期化できます。この練習場の picoc ではこの書き方が使えないので、1つずつ代入してください。

## 構造体の配列

構造体を配列にすると、表のようなデータを持てます。SQL の分野で見た「表」の1行が、構造体1つにあたります。

```c
#include <stdio.h>
#include <string.h>

typedef struct {
    char name[20];
    int price;
} Product;

int main() {
    Product items[3];
    strcpy(items[0].name, "マウス");
    items[0].price = 2500;
    strcpy(items[1].name, "キーボード");
    items[1].price = 6800;
    strcpy(items[2].name, "USBメモリ");
    items[2].price = 1800;
    int total = 0;
    for (int i = 0; i < 3; i++) {
        printf("%s %d\n", items[i].name, items[i].price);
        total += items[i].price;
    }
    printf("合計 %d 円\n", total);
    return 0;
}
```

## 構造体へのポインタと ->

構造体も、関数にそのまま渡すと**コピー**が渡ります。関数の中から書き換えたいとき(や、大きな構造体をコピーせずに渡したいとき)は、ポインタを渡します。

```c
#include <stdio.h>

typedef struct {
    char name[20];
    int price;
} Product;

void discount(Product *p, int percent) {
    p->price = p->price * (100 - percent) / 100;
}

int main() {
    Product p;
    p.price = 2000;
    discount(&p, 10);
    printf("%d\n", p.price);
    return 0;
}
```

ポインタの先の構造体のメンバーは、`(*p).price` と書けますが、長いので **`p->price`** という書き方が用意されています。

- 構造体そのもの(`Product p`)なら `p.price`
- 構造体へのポインタ(`Product *p`)なら `p->price`

逆に書くと、「. を使っているけど、それはポインタです」というエラーになります。

## メモリの上では

構造体は、メンバーをメモリの上に順に並べたものです。`sizeof` で大きさがわかります。

```c
#include <stdio.h>

typedef struct {
    char name[20];
    int price;
} Product;

int main() {
    printf("%d バイト\n", (int)sizeof(Product));
    return 0;
}
```

`char` 20個(20バイト)と `int` 1つ(4バイト)で、24バイトです。ファイルやネットワークでやりとりするデータの形を、構造体でそのまま表すこともよくあります。

## まとめ

- 構造体は、関係する値を1つの型にまとめる。`struct 名前 { ... };` で形を決める
- `typedef struct { ... } 名前;` で短い型名を付けるのが定番
- メンバーは `変数.メンバー` で読み書きする。構造体は `=` でまるごとコピーできる
- 構造体を関数の中から書き換えるなら、ポインタを渡して `p->メンバー`
- この練習場では、`{ }` でのまとめた初期化は使えないので、1つずつ代入する
