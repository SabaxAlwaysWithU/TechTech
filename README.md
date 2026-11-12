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
- `"js"`: [JsPractice.astro](src/components/JsPractice.astro)。sandbox 付き iframe でコードを実行し、出力を表示
- `"shell"`: [ShellPractice.astro](src/components/ShellPractice.astro)。疑似ターミナル。仮想のファイル・プロセス・ユーザーは [shell.ts](src/lib/shell.ts)
- `"stack"`: [StackPractice.astro](src/components/StackPractice.astro)。要件に合わせて層ごとに道具を選ぶ。選択肢は `content/<分野>/catalog.json`

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

JavaScript(利用者のコードを隔離された iframe で実行し、[jsrunner.ts](src/lib/jsrunner.ts) で判定):

- `expectOutput`: `console.log` の出力がこの通り(1行ずつ、前後の空白は無視)なら正解
- `calls`: コード実行後に `call` を評価し、`expect` と一致すれば正解(`[{ "call": "add(2, 3)", "expect": 5 }]`)。両方書いたら両方満たす必要がある
- 3秒で打ち切る(無限ループ対策)。`check-tasks.mjs` が `answer` を Node の vm で実行して検証する

OS / シェル(コマンドを打つたびに仮想マシンの状態を `shellChecks` で調べる。すべて満たせば正解):

- `cwd`、`exists`、`notExists`、`isDir`、`content: {path, includes|equals}`、`executable`、`notExecutable`、`processGone`、`processExists`、`lastOutputIncludes`、`lastCommandIncludes`
- 使えるコマンドは `shell.ts` の `commands`(`help` で一覧)。仮想ファイルの初期状態は `initialFs()`、プロセスは `initialProcesses()`
- `answer` は改行区切りで複数行可。ブラウザのテストで1行ずつ打って検証する

構成(Webアプリの道具。`catalog.json` の層ごとに選択肢を選び、`picks` に含まれていれば正解):

- `picks`: 層id → 正解とする選択肢idの配列(どれか1つ選べばよい)
- `why`: 層id → 考え方(正解でも不正解でも表示)
- `rejects`: 層id → 選択肢id → その選択肢が合わない理由(省略時は汎用メッセージ)
- `check-tasks.mjs` が id の存在と全層の正解の有無を検証する

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
6. JavaScript分野 — 練習場(隔離実行、出力・戻り値の判定)と6レッスン完了
7. OSの仕組み分野 — 練習場(疑似ターミナル)と6レッスン完了
8. Webアプリの道具分野 — 練習場(構成を組む)と6レッスン完了

## 未決事項

- サイトの名前(現在は「PC基礎学習」)
