# PC基礎学習サイト

「記事を読む → クイズに答える → 練習場で打つ」の3段階で学ぶ静的サイト。仕様は `PC基礎学習サイト 仕様書.md` を参照。

## 開発

```
npm install
npm run dev                   # http://localhost:4321
npm run build                 # dist/ に静的HTMLを出力
npm run preview               # dist/ を確認
node scripts/check-tasks.mjs  # 全課題の模範解答を実行して確かめる
```

## 構成

```
content/
  sql/
    field.json          分野の名前・説明・並び順
    schema.sql          分野共通の練習用データ(ネットショップ)
    01-database/
      article.md        記事(frontmatter に title, description)
      quiz.json         4択クイズ。options の先頭が正解(表示時にシャッフル)
      tasks.json        課題。answer(模範解答)、hints(2つ)、ordered / mutation
    02-select/ ...
src/
  pages/
    index.astro                      トップ(分野と達成率)
    [field]/index.astro              分野ページ(レッスン一覧と進捗)
    [field]/practice.astro           フリーモードの練習場
    [field]/[lesson]/index.astro     記事
    [field]/[lesson]/quiz.astro      クイズ
    [field]/[lesson]/practice.astro  課題付き練習場
    settings.astro                   表示切替、進捗リセット
  components/Practice.astro  練習場の画面と動作
  lib/sqldb.ts               sql.js の初期化、実行、エラーの日本語補足
  lib/judge.ts               正誤判定(実行結果の比較)
  lib/progress.ts            進捗の記録(localStorage)
  lib/content.ts             コンテンツの読み込み
public/sql-wasm-browser.wasm sql.js 本体(node_modules/sql.js/dist/ からコピー)
```

### レッスンを足す

`content/<分野>/<番号>-<名前>/` に `article.md`、`quiz.json`、`tasks.json` を置くだけ。番号順に並ぶ。

### 分野を足す

`content/<分野>/` に `field.json` とレッスンのフォルダを置く。`field.json` の `practice` で練習場の種類を選ぶ:

- `"sql"`: [Practice.astro](src/components/Practice.astro)。`schema.sql` が必要
- `"html"`: [HtmlPractice.astro](src/components/HtmlPractice.astro)。入力欄の横にプレビュー

別の種類(コマンド操作など)を足すときは、コンポーネントを1つ作って `[field]/practice.astro` と `[field]/[lesson]/practice.astro` の分岐に加える。

### 課題の判定

SQL(`tasks.json` の `answer` を同じ初期状態で実行して比べる):

- `ordered: true` のときだけ行の順番を比べる
- `mutation: true` のときは実行後の全表の中身を比べる(INSERT / UPDATE / DELETE / CREATE TABLE 用)
- 列名は比べない。列数、行数、各セルの値が一致すれば正解

HTML(プレビューにできたページを `checks` で調べる。すべて満たせば正解):

- `selector`: 調べる要素。`count` を指定しなければ1つ以上あればよい
- `text` / `textIncludes`: 文字の一致、`attr`: 属性の値、`css`: `getComputedStyle` の値(色は `rgb(255, 0, 0)` 形式)
- `message`: 満たさないときに出す1行
- `answer` は「模範解答を見る」用。模範解答が実際に正解になるかはブラウザのテストで確かめる

## 公開(GitHub Pages)

1. GitHub にリポジトリを作り、このフォルダを push する(ブランチ名は `main`)
2. リポジトリの Settings → Pages → Source を「GitHub Actions」にする
3. 以後 `main` に push するたびに `.github/workflows/deploy.yml` がビルドして公開する

`site` と `base` はワークフローが自動で設定する(リポジトリ名が `<user>.github.io` なら `/`、それ以外は `/<リポジトリ名>`)。

## 開発の段階

1. 練習場だけ作る — 完了
2. 正誤判定を付ける — 完了
3. 記事とクイズを付ける — 完了
4. レッスンを増やして公開する — SQL 7レッスン完了、GitHub に push 済み
5. HTMLとCSS分野 — 練習場(プレビュー、要素の判定)と6レッスン完了

## 未決事項

- サイトの名前(現在は「PC基礎学習」)
