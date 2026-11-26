# TechTech の作業メモ

Claude Code がこのリポジトリで作業するときに最初に読むメモ。どの PC でも `git pull` すれば同じ内容になる。
サイトの構成・課題の書き方・開発の経緯は README.md にある。ここには「進め方」と「今どこまでやったか」だけを書く。

## 進め方

- git の操作(branch / commit / push / PR の作成)は Claude がやる(2026-11-23 から。それまではユーザーが手で打って覚えていた)。マージは main に入ると公開されるので、ユーザーが差分を見てから行う
- PR は `gh pr create` で作り、リンクをユーザーに渡す。メインの PC には gh(ログイン済み)と Node.js が入っている。PATH で見つからないときは `C:\Program Files\GitHub CLI\gh.exe`、`C:\Program Files\nodejs\` を直接使う。gh がない PC では、push 後に `https://github.com/SabaxAlwaysWithU/TechTech/pull/new/<ブランチ>` を渡す
- 変更は ブランチ → push → GitHub で PR → 差分を確認 → マージ → `git pull` の流れで入れる。PR では Actions がビルド・課題チェック・ブラウザでの確認だけを行い、main に入ると公開される
- 説明は初心者向けに、たとえ話を交えて短く
- デザインは白・黒・灰色と深緑 #1f7a5c の1色。グラデーション、絵文字アイコン、影付きカード3枚並び、大きなヒーロー、全部フェードインは使わない
- 課題やページを足したら、`node scripts/check-tasks.mjs` と、`npm run build` のあとの `node scripts/browser-check.mjs`(全課題をブラウザで解く、全ページのスマホ幅)を通す。どちらも PR で Actions が自動で走らせる
- ヘッドレス Edge は Git Bash から起動すると、すぐ終了してしまう。browser-check などは PowerShell から動かす
- 見た目をスクリーンショットで確かめたいときは、`browser-check.mjs` と同じやり方(ヘッドレス Edge を DevTools プロトコルで操作)で撮る。`--dump-dom` と `--virtual-time-budget` は時計を早送りして iframe の返事より先に打ち切りが来るので使わない

## 今の状態

14分野・105レッスン(SQL 8、HTML/CSS 7、JavaScript 11、OS 6、Linux 6、ネットワーク 9、Git 6、Webアプリの道具 8、Python 12、C 8、コンピュータの中の数 6、アルゴリズム 6、正規表現 6、Webのセキュリティ 6)と、各分野の最後に総合演習(計14)。

- 2026-11-22 PR #1(ネットワーク図の位置ずれ修正、PR でのビルドチェック)をマージ済み
- 2026-11-23 `deploy.yml` の Node.js を 22 から 26(LTS、2029年4月までサポート)に上げた
- 2026-11-23 JavaScript に 07 待つ処理(async / await)と 08 fetch と API を追加。練習場で await と、練習用のにせ API(`https://shop.example`)への fetch が使える(仕組みは README の「課題の判定」)
- 2026-11-23 HTML/CSS に 07 フォームを追加(label、input の type、radio、select、textarea、required、action / method)
- 2026-11-23 ネットワーク図を 320〜1280px で確認して直した。図の枠の幅(コンテナクエリ)で、狭いときは箱を小さく・名前を短く(ネット、サーバー)する。PC 幅では線のラベル「ケーブル / Wi-Fi」を2行にして箱の間に収めた
- 2026-11-23 `scripts/browser-check.mjs` を追加し、Actions に組み込んだ。全課題の模範解答をブラウザで解いて正解になるか、starter のままで正解にならないか、全ページがスマホ幅ではみ出さないかを確かめる(約20秒)
- 2026-11-23 8分野に総合演習を追加(各分野の最後のレッスン、`content/<分野>/<番号>-final/`)。短い状況説明の記事(依頼の設定、使う知識の表、進め方のコツ)+ 振り返りクイズ4問 + 習ったことを組み合わせる課題4〜5個。新しい練習場の仕組みは使っていない
- 2026-11-23 Python 分野を追加(7レッスン + 総合演習「成績表を作る」、課題32)。練習場はブラウザの中の本物の Python(Pyodide 314.0.7 = Python 3.14)を Web Worker で動かす。Pyodide は npm から入れ、`npm run dev` / `npm run build` の前に `scripts/copy-pyodide.mjs` が `public/pyodide/` へコピーする(約12MB、git には入れない)。無限ループは5秒で Worker ごと止める
- 2026-11-24 公開に使う GitHub Actions を最新版に上げた(checkout v7、setup-node v7、upload-pages-artifact v5、deploy-pages v5)。Node.js 20 の終了への対応
- 2026-11-24 JavaScript に 09 画面を書き換える(DOM)を追加。練習場に「画面」の欄(見本のページ SAMPLE_PAGE)ができ、課題は `"dom": true` と `actions`(click / fill)と `checks`(HTML と同じ)で書く。総合演習は 10-final に移した(js/09-final の進捗は消える)
- 2026-11-24 Python に 08 クラス、09 ファイルとモジュールを追加。練習場で open が使える(練習用のファイル memo.txt / scores.csv と、課題の `files`)。総合演習は 10-final に移した
- 2026-11-24 総合演習の番号を動かしても進捗が消えないようにした(`field.json` の `renamed` に古いフォルダ名 → 新しい名前。`progress.ts` が読み込み時に引き継ぐ)。レッスンを総合演習の前に足すときは、これを使う
- 2026-11-24 Python に 10 内包表記、11 並べ替え(sorted の key、lambda)、12 標準ライブラリ(json、collections)を追加。総合演習は 13-final(前の 08-final / 10-final の進捗も引き継ぐ)
- 2026-11-24 JavaScript に 10 データを保存する(localStorage)、11 フォームを受け取るを追加。練習場の localStorage は練習用の保存場所で、課題は `storage` / `expectStorage` で書く。画面の課題は `page` で自分の HTML を使える。記事の「練習場で試す」から開くと、判定しない「記事の例を試す」状態になる。総合演習は 12-final
- 2026-11-24 Webアプリの道具に 07 コードを書かない選択肢、08 サーバーの裏側を追加。レッスンのフォルダに catalog.json を置くと、そのレッスンだけ選択肢を差し替えられる。総合演習は 09-final
- 2026-11-25 長い記事7本を2,000字前後に縮め、文字の図10か所を SVG の図にした(記事の Markdown に直接書く `<figure class="fig">`。色は global.css の `.fig` のクラスでテーマの変数を使う)。仕様書(OneDrive の PC基礎学習サイト 仕様書.md)を今のサイトに合わせて書き直した
- 2026-11-25 「Webのセキュリティ」分野を追加(6レッスン + 総合演習、課題27)。練習場は JavaScript のもの。XSS は掲示板の画面(課題の page)で体験する
- 2026-11-25 「正規表現」分野を追加(6レッスン + 総合演習、課題31)。新しい練習場 `regex`(打つたびに一致したところに色)。仕組みは README の「課題の判定」の正規表現
- 2026-11-25 「アルゴリズム」分野を追加(6レッスン + 総合演習、課題29)。練習場は Python のものをそのまま使う(field.json の practice: python)
- 2026-11-25 「コンピュータの中の数」分野を追加(6レッスン + 総合演習、課題32)。新しい練習場 `bits`(ビットのボタン)。仕組みは README の「課題の判定」のビット
- 2026-11-25 C 分野を追加(8レッスン + 総合演習「図書室の貸し出し係」、課題42)。練習場は picoc-js(小さな C のインタプリタ、約0.8MB)を Web Worker で動かす。本物の clang(約27MB)と比べて軽さで選んだ(ユーザーの判断)。`const`、`long long`、構造体の `{ }` 初期化などは使えないので、記事でそう書き、課題でも使わない。関数の課題は `tests`(利用者の main を確かめ用の main に差し替える)で判定する。仕組みは README の「課題の判定」の C
- 2026-11-24 SQL に 08 SQL インジェクションを追加。課題の `app` でログイン・検索の画面を出し、入力から組み立てた SQL を見せる(`safe` でプレースホルダ)。課題だけの表は `setup`。総合演習は 09-final

## 次にやること

- [ ] 2026-11-24〜25 にサブPCで足した練習場(Python 10〜12、JS 10・11 の保存データ欄とフォーム、Webアプリの道具 07・08、SQL 08 のログイン画面、C 分野の練習場)を、メインPCの手元のビルドで目で見て確かめる。サブPCはビルドできず、Actions の browser-check(判定とスマホ幅のはみ出し)でしか見ていない
- [ ] 分野ごとの画像の残り9枚(network、git、webdev、python、c、numbers、algo、regex、security)。ユーザーが Gemini でピクトグラムを作る(#555555 の単色、白背景、文字・ロゴなし)
  - Python 分野(python)の画像もまだ。Python のロゴ(2匹のヘビ)は使わない
  - C 分野(c)は、C の公式ロゴのようなものは使わない(例: 半導体チップの上の小さな歯車、など題材を考える)
  - 済み: sql(データベース)、js(`{ }`)、os(CPU チップ)、linux(ターミナル画面)、html(ブラウザの窓とレイアウトの箱)。2026-11-23
  - 変換は `scripts/convert-icon.ps1`(白背景 → 透明、#555555、512×512、余白をそろえる)。出力先は `public/images/fields/<分野>.png`
  - 画像を置くだけで、トップの分野一覧(番号の代わり)と分野ページ(見出しの上)に出る。色は CSS の mask で塗るのでダーク表示でも浮かない(`src/lib/icons.ts`、`.field-icon`)
  - GitHub のロゴ・Octocat・ディストリビューションのロゴは使わない

## いずれやるかもしれないこと

- 分野が14まで増えたので、トップページの分野の並べ方(入門 → 言語 → 応用 のようなまとまり)を考える
- パスワードのハッシュ化(SQL インジェクションの続き)、XSS の体験(JavaScript の innerHTML の続き)、CSRF など Web のセキュリティをまとめた分野

