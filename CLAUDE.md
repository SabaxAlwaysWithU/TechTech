# TechTech の作業メモ

Claude Code がこのリポジトリで作業するときに最初に読むメモ。どの PC でも `git pull` すれば同じ内容になる。
サイトの構成・課題の書き方・開発の経緯は README.md にある。ここには「進め方」と「今どこまでやったか」だけを書く。

## 進め方

- git の操作(branch / commit / push / PR の作成)は Claude がやる(2026-11-23 から。それまではユーザーが手で打って覚えていた)。マージは main に入ると公開されるので、ユーザーが差分を見てから行う
- PR は `gh pr create` で作り、リンクをユーザーに渡す。メインの PC には gh(ログイン済み)と Node.js が入っている。PATH で見つからないときは `C:\Program Files\GitHub CLI\gh.exe`、`C:\Program Files\nodejs\` を直接使う。gh がない PC では、push 後に `https://github.com/SabaxAlwaysWithU/TechTech/pull/new/<ブランチ>` を渡す
- 変更は ブランチ → push → GitHub で PR → 差分を確認 → マージ → `git pull` の流れで入れる。PR では Actions がビルドと課題チェックだけを行い、main に入ると公開される
- 説明は初心者向けに、たとえ話を交えて短く
- デザインは白・黒・灰色と深緑 #1f7a5c の1色。グラデーション、絵文字アイコン、影付きカード3枚並び、大きなヒーロー、全部フェードインは使わない
- 課題を足したら `node scripts/check-tasks.mjs` を通す。画面の確認は手元のビルドか、公開版(https://sabaxalwayswithu.github.io/TechTech/)で
- Claude がブラウザで確かめるときは、`npx astro preview` を立て、ヘッドレス Edge(`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`)を DevTools プロトコル(`--remote-debugging-port`)で操作する。練習場に模範解答を入れて「実行」を押し、判定を読む。スマホ幅(375px)で横にはみ出していないかも見る。`--dump-dom` と `--virtual-time-budget` は時計を早送りして iframe の返事より先に打ち切りが来るので使わない

## 今の状態

8分野・55レッスン(SQL 7、HTML/CSS 7、JavaScript 8、OS 6、Linux 6、ネットワーク 9、Git 6、Webアプリの道具 6)。

- 2026-11-22 PR #1(ネットワーク図の位置ずれ修正、PR でのビルドチェック)をマージ済み
- 2026-11-23 `deploy.yml` の Node.js を 22 から 26(LTS、2029年4月までサポート)に上げた
- 2026-11-23 JavaScript に 07 待つ処理(async / await)と 08 fetch と API を追加。練習場で await と、練習用のにせ API(`https://shop.example`)への fetch が使える(仕組みは README の「課題の判定」)
- 2026-11-23 HTML/CSS に 07 フォームを追加(label、input の type、radio、select、textarea、required、action / method)
- 2026-11-23 ネットワーク図を 320〜1280px で確認して直した。図の枠の幅(コンテナクエリ)で、狭いときは箱を小さく・名前を短く(ネット、サーバー)する。PC 幅では線のラベル「ケーブル / Wi-Fi」を2行にして箱の間に収めた

## 次にやること

- [ ] 分野ごとの画像の残り4枚(html、network、git、webdev)。ユーザーが Gemini でピクトグラムを作る(#555555 の単色、白背景、文字・ロゴなし)
  - 済み: sql(データベース)、js(`{ }`)、os(CPU チップ)、linux(ターミナル画面)。2026-11-23
  - 変換は `scripts/convert-icon.ps1`(白背景 → 透明、#555555、512×512、余白をそろえる)。出力先は `public/images/fields/<分野>.png`
  - 画像を置くだけで、トップの分野一覧(番号の代わり)と分野ページ(見出しの上)に出る。色は CSS の mask で塗るのでダーク表示でも浮かない(`src/lib/icons.ts`、`.field-icon`)
  - GitHub のロゴ・Octocat・ディストリビューションのロゴは使わない

## いずれやるかもしれないこと

- 各分野の「総合演習」
- Webアプリの道具に「サーバーの裏側」「コードを書かない選択肢」、Python 分野
- JavaScript の続き: 取ってきたデータを HTML に表示する(DOM 操作)。今の JS 練習場には画面がないので、HTML 練習場との組み合わせが必要
