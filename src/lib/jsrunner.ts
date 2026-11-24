// JavaScript練習場の実行と判定。
// 利用者のコードは sandbox 付きの iframe(別オリジン)の中で動かし、結果だけを postMessage で受け取る。
// 実際に動かす部分は jsrun-core.js(check-tasks.mjs と共通)。await、setTimeout、練習用の fetch が使える。
// 画面の課題(task.dom)では、iframe に見本のページ(SAMPLE_PAGE)を入れて見えるように置き、
// コードがページを書き換えたあと、actions(ボタンを押すなど)をしてから checks でページを調べる(dom-core.js)。
// 課題に page があれば、見本のページの代わりにそれを使う。
// localStorage は練習用の保存場所で、中身はページ側(JsPractice)が持ち、実行のたびに渡して、結果で受け取る。
import type { DomAction, HtmlCheck, JsCall } from './content';
import { runUserCode } from './jsrun-core.js';
import { judgeDom, doDomAction } from './dom-core.js';

export interface RunOutcome {
  ok: boolean;
  logs: string[]; // console.log の出力(1行ずつ)
  error?: string; // 実行時または文法のエラー
  hint?: string; // エラーの日本語補足
  results?: ({ v: unknown } | { e: string })[]; // tests.calls の結果
  dom?: { correct: boolean; message: string }; // checks でページを調べた結果
  timeout?: boolean;
  storage?: Record<string, string>; // 実行後の localStorage の中身
}

/** 画面の課題と、フリーモードの「画面」に入る見本のページ。記事の例もこの要素を使う */
export const SAMPLE_PAGE = `<h1 id="title">見出し</h1>
<p id="message">ここに文が入ります</p>
<p><button id="btn">押してね</button> <span id="count">0</span></p>
<p><input id="name" placeholder="名前"> <button id="add">追加</button></p>
<ul id="list"></ul>`;

const PAGE_STYLE = '<style>body{font-family:system-ui,sans-serif;margin:12px;color:#111;background:#fff;line-height:1.6}h1{font-size:1.4rem;margin:0 0 .4rem}p{margin:0 0 .6rem}button,input{font:inherit;padding:.15rem .5rem}</style>';

// iframe の中で動くコード。ページ側から {code, calls, actions, checks} を受け取り、結果を返す。
// .then を付け忘れた Promise の失敗(unhandledrejection)や、ボタンの処理の中のエラーも、エラーとして返す。
// 結果を返したあとの console.log やエラー(自分でボタンを押したときなど)は、__log で1行ずつ送る。
const RUNNER_SCRIPT = `<script>
(function () {
  var runUserCode = ${runUserCode.toString()};
  var judgeDom = ${judgeDom.toString()};
  var doDomAction = ${doDomAction.toString()};
  var unhandled = null;
  var finished = false;
  function late(line) { if (finished) parent.postMessage({ __log: line }, '*'); }
  // フォームの送信を止め忘れると、本物のブラウザではページが読み込み直されて、入力も処理も消える。
  // 練習場では送信を止めたうえで、エラーとして知らせる(window で最後に受け取るので、利用者の preventDefault が先に効く)
  var SUBMIT_MSG = 'フォームが送信されて、ページが読み込み直されるところでした(練習場では止めました)。submit の処理の最初で e.preventDefault() を呼んでください。';
  addEventListener('submit', function (ev) {
    if (ev.defaultPrevented) return;
    ev.preventDefault();
    if (finished) late('エラー: ' + SUBMIT_MSG); else if (!unhandled) unhandled = SUBMIT_MSG;
  });
  addEventListener('unhandledrejection', function (ev) {
    if (finished) late('エラー: ' + String(ev.reason)); else if (!unhandled) unhandled = String(ev.reason);
    ev.preventDefault();
  });
  addEventListener('error', function (ev) {
    var msg = ev.error ? String(ev.error) : String(ev.message);
    if (finished) late('エラー: ' + msg); else if (!unhandled) unhandled = msg;
    ev.preventDefault();
  });
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  addEventListener('message', function (ev) {
    var data = ev.data || {};
    if (!data.__run) return;
    unhandled = null;
    var checks = data.checks || null;
    var actions = data.actions || [];
    var dom = null;
    var after = checks ? function (settle) {
      return (async function () {
        for (var i = 0; i < actions.length; i++) {
          var err = doDomAction(document, actions[i]);
          if (err) { dom = { correct: false, message: err }; return; }
          await settle();
        }
        // ボタンの処理が fetch などで少し遅れても間に合うように、1.5秒までは調べ直す
        var end = Date.now() + 1500;
        for (;;) {
          dom = judgeDom(document, window, checks);
          if (dom.correct || Date.now() > end) return;
          await wait(50);
        }
      })();
    } : null;
    var onStorage = function (s) { if (finished) parent.postMessage({ __storage: s }, '*'); };
    runUserCode(String(data.code), data.calls || [], { onLog: late, after: after, storage: data.storage || {}, onStorage: onStorage }).then(function (r) {
      if (r.ok && unhandled) r = { ok: false, logs: r.logs, error: unhandled, storage: r.storage };
      var msg = { __result: true, ok: r.ok, logs: r.logs, error: r.error, dom: dom, storage: r.storage };
      if (r.results) {
        try { msg.results = JSON.parse(JSON.stringify(r.results)); } catch (e) { msg.results = r.results.map(function () { return { e: String(e) }; }); }
      }
      finished = true;
      parent.postMessage(msg, '*');
    });
  });
  parent.postMessage({ __ready: true }, '*');
})();
</script>`;

function runnerHtml(page?: string): string {
  return `<!doctype html><html lang="ja"><meta charset="utf-8">${PAGE_STYLE}<body>${page ?? ''}${RUNNER_SCRIPT}</body></html>`;
}

function makeFrame(page: string | undefined, visible: boolean): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  // allow-forms がないと、フォームの submit イベントそのものが起きない(送信は RUNNER_SCRIPT で止める)
  iframe.setAttribute('sandbox', 'allow-scripts allow-forms');
  if (visible) {
    iframe.title = '画面';
    iframe.className = 'screen-frame';
  } else {
    // display:none にすると、ブラウザが iframe のタイマーを最大1秒単位に間引き、setTimeout や fetch の待ちがのびる。
    // そのため、見えない 1px の iframe として画面に置く
    iframe.setAttribute('aria-hidden', 'true');
    iframe.tabIndex = -1;
    iframe.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;border:0;pointer-events:none;';
  }
  iframe.srcdoc = runnerHtml(page);
  return iframe;
}

/** 実行する前の見本のページを、画面の欄に表示する */
export function showPage(container: HTMLElement, page: string) {
  container.replaceChildren(makeFrame(page, true));
}

/** JavaScriptのエラーメッセージに日本語の補足を付ける */
export function translateJsError(msg: string): string {
  let m: RegExpMatchArray | null;
  if (/フォームが送信されて/.test(msg)) return 'submit の処理で e.preventDefault() を呼んでいないか、呼ぶ前にエラーで止まっています。';
  if (/localStorage|Storage/.test(msg) && /SecurityError|denied/i.test(msg)) return 'この練習場では window.localStorage ではなく、localStorage とだけ書いてください。';
  if (/Failed to fetch/.test(msg)) return '通信できませんでした(返事が来ませんでした)。URL のつづりを確認してください。この練習場で使えるのは https://shop.example/ の練習用 API だけです。';
  if (/await is only valid/.test(msg)) return 'await は async を付けた関数の中で使います。function の前に async を付けてください。';
  if (/\.json is not a function/.test(msg)) return 'json() は、await fetch(...) で受け取ったレスポンスにあります。fetch の前の await を忘れていないか、すでに取り出したデータに .json() を付けていないか確認してください。';
  if (/is not valid JSON|Unexpected end of JSON input|in JSON at position/.test(msg)) return 'JSON として読めない文字列です。JSON.stringify で作った文字列か確認してください。';
  if ((m = msg.match(/ReferenceError: (\S+) is not defined/))) return `「${m[1]}」という名前の変数や関数がありません。つづりや、let / const で宣言したかを確認してください。`;
  if ((m = msg.match(/TypeError: (\S+) is not a function/))) return `「${m[1]}」は関数ではないので呼び出せません。名前やカッコの位置を確認してください。`;
  if (/TypeError: Cannot (read|set) properties of null/.test(msg)) return '要素が見つからず null になっています。querySelector に渡したセレクタ(#id や .class)のつづりと、# や . の付け忘れを確認してください。';
  if (/TypeError: Cannot read propert/.test(msg)) return '存在しないもの(undefined や null)の中身を読もうとしています。変数に値が入っているか確認してください。';
  if (/TypeError: Assignment to constant variable/.test(msg)) return 'const で宣言した変数には、あとから別の値を入れられません。変えたい変数は let で宣言してください。';
  if (/SyntaxError: Unexpected end of input/.test(msg)) return 'コードが途中で終わっています。閉じカッコ ) や } が足りないかもしれません。';
  if (/SyntaxError: Unexpected token|SyntaxError: Unexpected identifier|SyntaxError: Unexpected string|SyntaxError: Unexpected number/.test(msg)) return '文法の誤りがあります。カッコ、引用符、カンマ、セミコロンの位置を確認してください。';
  if (/SyntaxError: missing \) after argument list/.test(msg)) return '閉じカッコ ) が足りません。';
  if (/SyntaxError: Invalid or unexpected token/.test(msg)) return '読み取れない文字があります。引用符(\' や ")が閉じているか確認してください。';
  if (/SyntaxError: Identifier .* has already been declared/.test(msg)) return '同じ名前の変数を2回宣言しています。2回目は let / const を付けずに代入してください。';
  if (/SyntaxError: Missing initializer in const/.test(msg)) return 'const は宣言と同時に値を入れる必要があります。';
  if (/RangeError: Maximum call stack/.test(msg)) return '関数が自分自身を呼び続けて止まらなくなりました。';
  return 'コードを見直してください。';
}

let seq = 0;

export interface ScreenOptions {
  container: HTMLElement; // 画面の欄。前の iframe は消して、新しいページで実行する
  page: string;
  actions?: DomAction[];
  checks?: HtmlCheck[];
  onLateLog?: (line: string) => void; // 実行が終わったあとに出た console.log やエラー
}

export interface StorageOptions {
  initial: Record<string, string>; // 実行を始めるときの localStorage の中身
  onChange?: (s: Record<string, string>) => void; // 実行が終わったあとに中身が変わったとき(画面のボタンを押したときなど)
}

/** 利用者のコードを隔離された iframe で実行する。timeoutMs を超えたら打ち切る。screen を渡すと画面の欄で実行する */
export function runJs(code: string, calls: string[] = [], timeoutMs = 3000, screen?: ScreenOptions, storage?: StorageOptions): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const iframe = makeFrame(screen?.page, !!screen);
    const id = ++seq;
    let done = false;
    const finish = (o: RunOutcome) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      // 画面の欄の iframe は、結果のあとも自分で操作できるように残す(次の実行で入れ替わる)
      if (!screen) { window.removeEventListener('message', onMessage); iframe.remove(); }
      resolve(o);
    };
    const timer = setTimeout(() => finish({ ok: false, logs: [], timeout: true, error: 'タイムアウト', hint: `${timeoutMs / 1000}秒たっても終わりませんでした。無限ループになっていないか、終わらない待ち(setTimeout の繰り返しなど)がないか確認してください。` }), timeoutMs);
    const onMessage = (ev: MessageEvent) => {
      if (!iframe.isConnected) { window.removeEventListener('message', onMessage); return; }
      if (ev.source !== iframe.contentWindow) return;
      const d = ev.data || {};
      if (d.__ready) {
        iframe.contentWindow!.postMessage({ __run: id, code, calls, actions: screen?.actions, checks: screen?.checks, storage: storage?.initial ?? {} }, '*');
      } else if (d.__result) {
        finish({ ok: d.ok, logs: d.logs ?? [], error: d.error, hint: d.error ? translateJsError(d.error) : undefined, results: d.results, dom: d.dom ?? undefined, storage: d.storage ?? {} });
      } else if (typeof d.__log === 'string') {
        screen?.onLateLog?.(d.__log);
      } else if (d.__storage) {
        storage?.onChange?.(d.__storage);
      }
    };
    window.addEventListener('message', onMessage);
    if (screen) screen.container.replaceChildren(iframe); else document.body.appendChild(iframe);
  });
}

export interface JsJudgement {
  correct: boolean;
  message: string;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function show(v: unknown): string {
  if (typeof v === 'string') return `"${v}"`;
  return JSON.stringify(v) ?? String(v);
}

/** 実行結果を課題の期待値と比べる。expectStorage は localStorage のキー → 値(null は「ない」) */
export function judgeJs(out: RunOutcome, expectOutput?: string[], calls?: JsCall[], checks?: HtmlCheck[], expectStorage?: Record<string, string | null>): JsJudgement {
  if (!out.ok) return { correct: false, message: out.timeout ? out.hint! : 'エラーになりました。右の出力を確認してください。' };
  if (checks) {
    if (!out.dom) return { correct: false, message: '画面を調べられませんでした。もう一度実行してください。' };
    if (!out.dom.correct) return { correct: false, message: out.dom.message };
  }
  if (expectStorage) {
    for (const [k, v] of Object.entries(expectStorage)) {
      const got = out.storage?.[k] ?? null;
      if (got !== v) {
        const show = (x: string | null) => (x === null ? '(ない)' : `「${x}」`);
        return { correct: false, message: `localStorage の「${k}」が違います(あなた: ${show(got)}、期待: ${show(v)})。` };
      }
    }
  }
  if (expectOutput) {
    const got = out.logs.map((l) => l.trim());
    const exp = expectOutput.map((l) => l.trim());
    if (got.length !== exp.length) {
      return { correct: false, message: `出力の行数が違います(あなた: ${got.length}行、期待: ${exp.length}行)。console.log の回数を確認してください。` };
    }
    for (let i = 0; i < exp.length; i++) {
      if (got[i] !== exp[i]) return { correct: false, message: `出力の${i + 1}行目が違います(あなた: 「${got[i]}」、期待: 「${exp[i]}」)。` };
    }
  }
  if (calls) {
    for (let i = 0; i < calls.length; i++) {
      const r = out.results?.[i];
      if (!r) return { correct: false, message: `${calls[i].call} を実行できませんでした。` };
      if ('e' in r) {
        return { correct: false, message: `${calls[i].call} でエラー: ${translateJsError(r.e)}` };
      }
      if (!same(r.v, calls[i].expect)) {
        return { correct: false, message: `${calls[i].call} の結果が違います(あなた: ${show(r.v)}、期待: ${show(calls[i].expect)})。` };
      }
    }
  }
  return { correct: true, message: '' };
}
