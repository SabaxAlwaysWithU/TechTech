---
title: 並べる
description: flex で横に並べ、位置をそろえる
---

## 縦にしか積めない

これまで書いてきた要素は、すべて上から下へ縦に積まれました。`p` を2つ書けば、2段になります。

でも実際のページでは、メニューを横一列に並べたり、商品カードを3つ横に並べたりします。これをするのが **flex** です。

## 横に並べる: display: flex

並べたい要素を1つの親で包み、親に `display: flex` を付けます。

```html
<style>
  .row {
    display: flex;
  }
  .item {
    border: 2px solid #1f7a5c;
    padding: 16px;
  }
</style>
<div class="row">
  <div class="item">1</div>
  <div class="item">2</div>
  <div class="item">3</div>
</div>
```

これだけで、3つの箱が横一列に並びます。大事なのは、`display: flex` を付けるのは**並べたい要素そのものではなく、それを包む親**だということです。

## 間を空ける: gap

並んだ箱はくっついています。間を空けるには、親に `gap` を付けます。

```css
.row {
  display: flex;
  gap: 16px;
}
```

`margin` で空けることもできますが、`gap` なら「箱と箱の間」だけに空きができて、両端には付きません。

## 横の位置: justify-content

箱が横幅いっぱいでないとき、どこに寄せるかを `justify-content` で決めます。

| 値 | 意味 |
| --- | --- |
| `flex-start` | 左寄せ(何も指定しないときはこれ) |
| `center` | 中央 |
| `flex-end` | 右寄せ |
| `space-between` | 両端に寄せて、間を均等に空ける |

```css
.row {
  display: flex;
  justify-content: center;
}
```

メニューを右端に寄せたいなら `flex-end`、ロゴとメニューを左右に分けたいなら `space-between` です。

## 縦の位置: align-items

箱の高さが違うとき、上下のどこをそろえるかを `align-items` で決めます。

| 値 | 意味 |
| --- | --- |
| `stretch` | 高さをそろえて引き伸ばす(何も指定しないときはこれ) |
| `center` | 上下中央 |
| `flex-start` | 上そろえ |

```css
.row {
  display: flex;
  align-items: center;
}
```

`justify-content: center` と `align-items: center` を両方付けると、中身が親の真ん中に来ます。「上下左右の中央寄せ」はCSSで昔から難しい問題でしたが、flex ならこの2行で済みます。

## 縦に並べたまま使う: flex-direction

flex は横並び専用ではありません。`flex-direction: column` を付けると縦並びになり、`gap` や `align-items` がそのまま使えます。

```css
.stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
```

## 典型的なヘッダー

ここまでの知識で、よくあるヘッダーが作れます。左にサイト名、右にメニュー、上下は中央そろえ。

```html
<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #ccc;
  }
  nav {
    display: flex;
    gap: 16px;
  }
</style>
<header>
  <strong>さばのレシピ帳</strong>
  <nav>
    <a href="#">レシピ</a>
    <a href="#">について</a>
  </nav>
</header>
```

## まとめ

- 横に並べるには、親に `display: flex`
- 間は `gap`、横の寄せは `justify-content`、縦のそろえは `align-items`
- `justify-content: center` と `align-items: center` で中央寄せ
- `flex-direction: column` で縦並びにもできる
