# TechTech の作業メモ

Claude Code がこのリポジトリで作業するときに最初に読むメモ。どの PC でも `git pull` すれば同じ内容になる。
サイトの構成・課題の書き方・開発の経緯は README.md にある。ここには「進め方」と「今どこまでやったか」だけを書く。

## 進め方

- git の操作(branch / commit / push / PR の作成とマージ)はユーザーが自分でやる。Claude は手順を示すだけで、頼まれない限り commit や push をしない
- 変更は ブランチ → push → GitHub で PR → 差分を確認 → マージ → `git pull` の流れで入れる。PR では Actions がビルドと課題チェックだけを行い、main に入ると公開される
- 説明は初心者向けに、たとえ話を交えて短く
- デザインは白・黒・灰色と深緑 #1f7a5c の1色。グラデーション、絵文字アイコン、影付きカード3枚並び、大きなヒーロー、全部フェードインは使わない
- 課題を足したら `node scripts/check-tasks.mjs` を通す。画面の確認は手元のビルドか、公開版(https://sabaxalwayswithu.github.io/TechTech/)で

## 今の状態

8分野・52レッスン(SQL 7、HTML/CSS 6、JavaScript 6、OS 6、Linux 6、ネットワーク 9、Git 6、Webアプリの道具 6)。

- 2026-11-22 PR #1(ネットワーク図の位置ずれ修正、PR でのビルドチェック)をマージ済み
- 2026-11-23 `deploy.yml` の Node.js を 22 から 26(LTS、2029年4月までサポート)に上げた

## 次にやること

- [ ] 分野ごとの画像を組み込む。ユーザーが Gemini でピクトグラムを作る(#555555 の単色、白背景、512×512、文字・ロゴなし)。置き場所は `public/images/fields/{sql,html,js,os,linux,network,git,webdev}.png`。トップの分野一覧と分野ページに出し、ダーク表示で白背景が浮かないようにする
  - Linux をペンギンにした場合は、分野ページに「ペンギンのモチーフ: Tux(Larry Ewing, The GIMP)」と書く
  - GitHub のロゴ・Octocat・ディストリビューションのロゴは使わない
- [ ] 公開版のネットワーク図を、PC 幅とスマホ幅で見て確認する

## いずれやるかもしれないこと

- 各分野の「総合演習」
- Webアプリの道具に「サーバーの裏側」「コードを書かない選択肢」、JavaScript に fetch / API、Python 分野
