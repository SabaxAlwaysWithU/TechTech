# TechTech

「記事を読む → クイズに答える → 練習場で打つ」の3段階で学ぶ静的サイト。仕様は `PC基礎学習サイト 仕様書.md` を参照。

## 開発

```
npm install
npm run dev                   # http://localhost:4321(先に Pyodide を public/pyodide/ にコピーする)
npm run build                 # dist/ に静的HTMLを出力(同上)
npm run preview               # dist/ を確認
node scripts/check-tasks.mjs  # 全課題の模範解答を実行して確かめる(SQL、JavaScript、Python)、ほかは形を確かめる
node scripts/browser-check.mjs # ビルド後に、全課題をブラウザで解いて確かめる、全ページのスマホ幅も見る
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
public/pyodide/              Python 本体(Pyodide)。ビルドのたびに scripts/copy-pyodide.mjs が node_modules からコピーする。git には入れない
```

### レッスンを足す

`content/<分野>/<番号>-<名前>/` に `article.md`、`quiz.json`、`tasks.json` を置くだけ。番号順に並ぶ。

総合演習(`<番号>-final`)の前にレッスンを差し込むときは、総合演習のフォルダ名の番号を上げ、`field.json` の `renamed` に `"古いフォルダ名": "新しいフォルダ名"` を足す。利用者の進捗(localStorage のキーはフォルダ名)が新しい名前に引き継がれる([progress.ts](src/lib/progress.ts))。`check-tasks.mjs` が行き先の有無を確かめる。

### 分野を足す

`content/<分野>/` に `field.json` とレッスンのフォルダを置く。`field.json` の `practice` で練習場の種類を選ぶ:

- `"sql"`: [Practice.astro](src/components/Practice.astro)。`schema.sql` が必要
- `"html"`: [HtmlPractice.astro](src/components/HtmlPractice.astro)。入力欄の横にプレビュー
- `"js"`: [JsPractice.astro](src/components/JsPractice.astro)。sandbox 付き iframe でコードを実行し、出力を表示
- `"python"`: [PyPractice.astro](src/components/PyPractice.astro)。ブラウザの中の本物の Python(Pyodide)でコードを実行し、出力を表示
- `"shell"`: [ShellPractice.astro](src/components/ShellPractice.astro)。疑似ターミナル。仮想のファイル・プロセス・ユーザー・Gitリポジトリは [shell.ts](src/lib/shell.ts)。OS分野と Git分野で共用
- `"stack"`: [StackPractice.astro](src/components/StackPractice.astro)。要件に合わせて層ごとに道具を選ぶ。選択肢は `content/<分野>/catalog.json`
- `"net"`: [NetPractice.astro](src/components/NetPractice.astro)。ネットワーク図の部品をクリックで壊す/直し、`ping` `curl` `nslookup` `traceroute` `ip addr` で確かめる。シミュレータは [netsim.ts](src/lib/netsim.ts)。課題は `netChecks`(`parts`、`healthy`、`usedCommand`、`lastCommandIncludes`、`lastOutputIncludes`)、`faults`(開始時に壊す部品)、`hideStatus`(図に状態を出さない診断型)

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
- `answer` は「模範解答を見る」用。模範解答が実際に正解になるかは `browser-check.mjs` が確かめる

JavaScript(利用者のコードを隔離された iframe で実行し、[jsrunner.ts](src/lib/jsrunner.ts) で判定):

- `expectOutput`: `console.log` の出力がこの通り(1行ずつ、前後の空白は無視)なら正解
- `calls`: コード実行後に `call` を評価し、`expect` と一致すれば正解(`[{ "call": "add(2, 3)", "expect": 5 }]`)。両方書いたら両方満たす必要がある
- 3秒で打ち切る(無限ループ対策)。`check-tasks.mjs` が `answer` を Node の vm で実行して検証する
- 実際に動かす部分は [jsrun-core.js](src/lib/jsrun-core.js) の1か所で、ブラウザ(iframe に文字列で埋め込む)と `check-tasks.mjs` の両方が使う。コードは async 関数として動かすので、いちばん外側でも `await` が使える。`calls` の結果が Promise なら待ってから比べる
- `setTimeout` と `fetch` がすべて終わるまで待ってから判定する(`setTimeout` の待ちは最大2秒)
- `fetch` は本物のネットワークにつながず、練習用のにせ API が 0.2秒後に答える。`https://shop.example` の `GET /api/products`(SQL 分野と同じ12商品に `stock` を足したもの)、`GET /api/products/番号`(ない番号は 404)、`POST /api/orders`(`{ productId, quantity }`、成功は 201 で `total` を返す。数量や在庫の誤りは 400)、`GET /api/broken`(500)。ほかのホストは `TypeError: Failed to fetch`
- iframe は `display:none` にしない(ブラウザがタイマーを1秒単位に間引き、待ちがのびるため)。1px・透明で置く
- 画面の課題(`"dom": true`): 見本のページ([jsrunner.ts](src/lib/jsrunner.ts) の `SAMPLE_PAGE`。`#title` `#message` `#btn` `#count` `#name` `#add` `#list`)を入れた iframe を「画面」の欄に見えるように置いて実行する。コードと待ちが終わったら `actions`(`{ "click": "#add" }`、`{ "fill": "#name", "value": "牛乳" }`)を順に行い、`checks`(HTML の課題と同じ書き方)でページを調べる。ボタンの処理が fetch などで遅れても間に合うよう、1.5秒までは調べ直す。フリーモードにも同じ画面がある。記事の例もこの画面の要素を使う
- ページを調べる判定と操作は [dom-core.js](src/lib/dom-core.js) の1か所で、HTML の練習場(`htmljudge.ts`)と共通。iframe には文字列で埋め込む
- 画面の課題は Node では動かせないので、`check-tasks.mjs` は形だけ確かめ、正解になるかは `browser-check.mjs` が確かめる
- 実行が終わったあとに出た `console.log` やエラー(画面のボタンを自分で押したときなど)も、出力に足していく
- 画面の課題に `page`(HTML)を書くと、見本のページの代わりにそれを使う(11 フォームの注文フォーム)。記事の「練習場で試す」から開いたときも、レッスンの課題に `page` があればそれを画面に出す
- フォーム: iframe は `allow-forms` 付き(ないと submit イベントが起きない)。`preventDefault` を忘れた送信は、練習場が止めてエラーとして知らせる(本物ならページが読み込み直される)
- `localStorage` は練習用の保存場所([jsrun-core.js](src/lib/jsrun-core.js) の `fakeStorage`。iframe が別オリジンのため本物は使えない)。中身は練習場の「ブラウザに保存されているデータ」の欄に出る。課題では実行のたびに `storage`(最初の中身)から始め、`expectStorage`(キー → 値、`null` は「ない」)で判定する。フリーモードと記事の例では、実行をまたいで残る
- 記事の「練習場で試す」(`?code=` があって `?task=` がない)から開いたときは、課題を選ばない「記事の例を試す」状態になり、判定しない

Python(Web Worker の中の Pyodide で実行し、[pyrunner.ts](src/lib/pyrunner.ts) で判定):

- `expectOutput` と `calls` は JavaScript と同じ書き方。`print` の出力と、コード実行後に評価した式の値を比べる。値は JSON にして比べるので、タプルはリスト、`None` は `null`。辞書のキーの順番は問わない。整数と小数は区別しない(`80.0` と `80` は同じ)
- 実際に動かす部分は [pyrun-core.js](src/lib/pyrun-core.js) の1か所で、ブラウザ([pyworker.ts](src/lib/pyworker.ts))と `check-tasks.mjs`(Node 版の Pyodide)の両方が使う。毎回まっさらな名前空間で実行し、エラーは「何行目か」と最後の1行だけを返す(`translatePyError` が日本語の補足を付ける)
- 5秒で打ち切る。Web Worker ごと止めて、次の実行の前に作り直す(1秒ほど)
- ファイル: 実行のたびに作業フォルダ(`/home/pyodide/work`)を作り直し、練習用のファイル([pyrun-core.js](src/lib/pyrun-core.js) の `SAMPLE_FILES`: `memo.txt`、`scores.csv`)と課題の `files`(名前 → 中身)を置いてから実行する。`open("memo.txt")` のように名前だけで開ける。実行後のファイルは左の「練習用のファイル」に出る(新しくできた・変わったものに印)。書いたファイルの判定は `calls` で `open("passed.txt", encoding="utf-8").read()` などを評価する。課題に `files` があると(`{}` でも)、ファイルの欄を最初から開く
- `input()` は使えない(呼ぶとエラーで知らせる)。標準ライブラリは使えるが、numpy などの追加パッケージは読み込まない
- Pyodide の版は package.json で固定(`pyodide`)。上げるときは `npm install --save-exact pyodide@版` のあと、check-tasks と browser-check を通す
- 初回は約12MB を読み込む(2回目からはブラウザのキャッシュ)。読み込みが終わるまで「実行」は押せない

OS / シェル(コマンドを打つたびに仮想マシンの状態を `shellChecks` で調べる。すべて満たせば正解):

- `cwd`、`exists`、`notExists`、`isDir`、`content: {path, includes|equals}`、`executable`、`notExecutable`、`processGone`、`processExists`、`lastOutputIncludes`、`lastCommandIncludes`
- `git: {...}`: `initialized`、`commits`(以上)、`lastMessageIncludes`、`branch`、`branchExists`、`staged`、`notStaged`、`tracked`、`notTracked`、`clean`、`remote`、`pushed`、`upstream`、`merged`
- `starter`: 課題を開いたときに黙って実行するコマンド(改行区切り)。`cd project` や `git init` 済みの状態を作る
- 使えるコマンドは `shell.ts` の `commands`(`help` で一覧)。仮想ファイルの初期状態は `initialFs()`、プロセスは `initialProcesses()`
- `answer` は改行区切りで複数行可。`browser-check.mjs` が1行ずつ打って検証する

構成(Webアプリの道具。`catalog.json` の層ごとに選択肢を選び、`picks` に含まれていれば正解):

- `picks`: 層id → 正解とする選択肢idの配列(どれか1つ選べばよい)
- `why`: 層id → 考え方(正解でも不正解でも表示)
- `rejects`: 層id → 選択肢id → その選択肢が合わない理由(省略時は汎用メッセージ)
- `check-tasks.mjs` が id の存在と全層の正解の有無を検証する

### ブラウザでの確認([browser-check.mjs](scripts/browser-check.mjs))

`npm run build` のあと `node scripts/browser-check.mjs`。`dist/` を自前のサーバーで配り、ヘッドレスの Chrome / Edge を DevTools プロトコルで操作して、次を確かめる。PR と main への push のたびに GitHub Actions でも動き、失敗すると公開しない。

- 全課題の `answer` を練習場に入れて実行し、「正解」になる(SQL / HTML / JavaScript / Python / シェル / ネットワーク / 構成のすべて。構成は `picks` の先頭を選ぶ)
- HTML、JavaScript、Python の課題は、`starter` のままでは正解にならない
- `dist/` の全ページをスマホ幅(375px)で開き、横にはみ出さない

環境変数: `BASE`(ビルドと同じ base)、`CHROME`(ブラウザの場所)、`ONLY`(名前に含む課題・ページだけ。例: `ONLY=js/08`)、`WORKERS`(同時に開くタブ数、既定 4)。

ネットワークの `answer` には、コマンドの行のほかに括弧書きの手順を1行に1つ書ける。読み取れない括弧書きは失敗になる。

- `(図でケーブルを壊す)`、`(… なので DNS を直す)`: 部品の一覧から、名前が文中に出てくる部品を押す(「DNSサーバー」は「DNS」、「ケーブル / Wi-Fi」は「ケーブル」でも当たる)
- `(設定画面: 手動 ip=192.168.1.10 mask=255.255.255.0 gateway=192.168.1.1 dns=8.8.8.8)`: 設定画面に入れて適用する

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
5. HTMLとCSS分野 — 練習場(プレビュー、要素の判定)と6レッスン完了。のちに 07 フォーム(label、input の type、radio、select、textarea、required、action / method)を追加して7レッスン(2026-11-23)
6. JavaScript分野 — 練習場(隔離実行、出力・戻り値の判定)と6レッスン完了。のちに 07 待つ処理(setTimeout、Promise、async / await、try / catch)と 08 fetch と API(JSON、にせ API、ステータス、POST)を追加して8レッスン(2026-11-23)
7. OSの仕組み分野 — 練習場(疑似ターミナル)と6レッスン完了
8. Webアプリの道具分野 — 練習場(構成を組む)と6レッスン完了
9. レッスン内のステップバー(記事→クイズ→練習の進み具合、次にやること、レッスン完了)とトップの達成率バー
10. GitとGitHub分野 — 疑似ターミナルに git(init/status/add/commit/log/diff/restore/branch/switch/merge/remote/push)を追加、6レッスン完了
12. Linux分野 — 疑似ターミナルにパイプ(`|`)、grep/head/tail/wc/sort、apt、systemctl/journalctl/ss、df/du(ファイルの大きさが実際に増減)、ssh-keygen/ssh-copy-id/ssh を追加。6レッスン(Linuxとは、パイプ、apt、サービス、ログとトラブル、SSH)。課題の `starter` に `__scenario 名前`(nginx-stopped / port-conflict / disk-full / ssh-badperm)を書くと開始状態を作れる。判定は `shellChecks` の `linux`(active / inactive / enabled / installed / diskBelow / sshRegistered)と `mode`
11. ネットワーク分野 — 部品を壊してエラーを見る練習場と9レッスン(全体像、IPとルーター、DNS、TCPとポート、HTTP、故障診断、Webサーバーの裏側(nginx・リバースプロキシ・502)、HTTPSと証明書、設定を間違える(IP・マスク・ゲートウェイ・DNS の設定画面))。課題の `netConfig` で開始時の PC 設定を、`netChecks` の `config` で設定の状態を判定できる
13. 総合演習 — 8分野すべての最後に1レッスンずつ(`<番号>-final`)。依頼の設定を説明する短い記事、振り返りクイズ、習ったことを組み合わせる課題(SQL 5、HTML/CSS 5、JavaScript 5、OS 5、Linux 4、ネットワーク 4、Git 4、Webアプリの道具 4)。課題の `starter` で `__scenario` を2つ重ねたり(Linux)、`faults` と `netConfig` を組み合わせたり(ネットワーク)している(2026-11-23)
14. Python分野 — 練習場(Pyodide を Web Worker で実行、出力・戻り値の判定、エラーの行と日本語の補足、Tab と Enter の字下げの手助け)と7レッスン(Python を動かす、文字列、条件分岐、リストと繰り返し、辞書、関数、エラーと例外)+ 総合演習「成績表を作る」(課題5)。課題は計32(2026-11-23)
15. JavaScript 09 画面を書き換える(DOM)— JavaScript の練習場に「画面」の欄を足し、querySelector、textContent、createElement / append、addEventListener、入力欄の value、fetch したデータを並べる、innerHTML と XSS。課題5。総合演習は 10-final に移した(2026-11-24)
16. Python 08 クラス、09 ファイルとモジュール — Python の練習場でファイルを読み書きできるようにした(練習用のファイル、課題の files)。総合演習は 10-final に移した(2026-11-24)
17. Python 10 内包表記(リスト・辞書の内包表記、enumerate、zip)、11 並べ替え(sorted の key、lambda、タプルで2つの条件、max / min の key)、12 標準ライブラリ(json、Counter、defaultdict)。課題15。総合演習は 13-final に移し、`field.json` の `renamed` で前の 08-final / 10-final の進捗を引き継ぐ(2026-11-24)
18. JavaScript 10 データを保存する(localStorage、文字列だけ、JSON で配列を保存)、11 フォームを受け取る(submit と preventDefault、value、FormData、入力の確認、fetch で送る、二重送信)。練習場に localStorage の欄、課題ごとの画面(page)、フォームの送信を追加。総合演習は 12-final に移した(前の 09-final / 10-final の進捗を引き継ぐ)(2026-11-24)

## 未決事項

- (なし)サイト名は TechTech に決定(2026-11-15)
