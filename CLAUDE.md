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

9分野・65レッスン(SQL 7、HTML/CSS 7、JavaScript 9、OS 6、Linux 6、ネットワーク 9、Git 6、Webアプリの道具 6、Python 9)と、各分野の最後に総合演習(計9つ、課題41個)。

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

## 次にやること

- [ ] 分野ごとの画像の残り4枚(network、git、webdev、python)。ユーザーが Gemini でピクトグラムを作る(#555555 の単色、白背景、文字・ロゴなし)
  - Python 分野(python)の画像もまだ。Python のロゴ(2匹のヘビ)は使わない
  - 済み: sql(データベース)、js(`{ }`)、os(CPU チップ)、linux(ターミナル画面)、html(ブラウザの窓とレイアウトの箱)。2026-11-23
  - 変換は `scripts/convert-icon.ps1`(白背景 → 透明、#555555、512×512、余白をそろえる)。出力先は `public/images/fields/<分野>.png`
  - 画像を置くだけで、トップの分野一覧(番号の代わり)と分野ページ(見出しの上)に出る。色は CSS の mask で塗るのでダーク表示でも浮かない(`src/lib/icons.ts`、`.field-icon`)
  - GitHub のロゴ・Octocat・ディストリビューションのロゴは使わない

## いずれやるかもしれないこと

- Webアプリの道具に「サーバーの裏側」「コードを書かない選択肢」
- Python の続き: 内包表記、辞書やリストの並べ替え(sorted の key、lambda)、標準ライブラリ(collections、json)。JavaScript の続き: localStorage、フォームの送信、画面の課題に自分の HTML を使う(今は SAMPLE_PAGE だけ)
