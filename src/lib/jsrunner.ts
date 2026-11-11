// JavaScript練習場の実行と判定。
// 利用者のコードは sandbox 付きの iframe(別オリジン)の中で動かし、結果だけを postMessage で受け取る。
import type { JsCall } from './content';

export interface RunOutcome {
  ok: boolean;
  logs: string[]; // console.log の出力(1行ずつ)
  error?: string; // 実行時または文法のエラー
  hint?: string; // エラーの日本語補足
  results?: ({ v: unknown } | { e: string })[]; // tests.calls の結果
  timeout?: boolean;
}

// iframe の中で動くコード。ページ側から {code, calls} を受け取り、結果を返す。
const RUNNER_HTML = `<!doctype html><meta charset="utf-8"><script>
(function () {
  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return '[関数 ' + (v.name || '') + ']';
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  addEventListener('message', function (ev) {
    var data = ev.data || {};
    if (!data.__run) return;
    var logs = [];
    var fakeConsole = {
      log: function () { logs.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
      error: function () { logs.push('エラー: ' + Array.prototype.map.call(arguments, fmt).join(' ')); },
      warn: function () { logs.push('警告: ' + Array.prototype.map.call(arguments, fmt).join(' ')); },
    };
    var calls = data.calls || [];
    var tail = '\\n;return [' + calls.map(function (c) {
      return '(function(){try{return {v:(' + c + ')}}catch(e){return {e:String(e)}}})()';
    }).join(',') + '];';
    var fn;
    try {
      fn = new Function('console', 'alert', 'prompt', data.code + tail);
    } catch (e) {
      parent.postMessage({ __result: true, ok: false, logs: logs, error: String(e) }, '*');
      return;
    }
    try {
      var results = fn(fakeConsole, function (m) { logs.push('[alert] ' + fmt(m)); }, function () { return null; });
      parent.postMessage({ __result: true, ok: true, logs: logs, results: JSON.parse(JSON.stringify(results)) }, '*');
    } catch (e) {
      parent.postMessage({ __result: true, ok: false, logs: logs, error: String(e) }, '*');
    }
  });
  parent.postMessage({ __ready: true }, '*');
})();
</script>`;

/** JavaScriptのエラーメッセージに日本語の補足を付ける */
export function translateJsError(msg: string): string {
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/ReferenceError: (\S+) is not defined/))) return `「${m[1]}」という名前の変数や関数がありません。つづりや、let / const で宣言したかを確認してください。`;
  if ((m = msg.match(/TypeError: (\S+) is not a function/))) return `「${m[1]}」は関数ではないので呼び出せません。名前やカッコの位置を確認してください。`;
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

/** 利用者のコードを隔離された iframe で実行する。timeoutMs を超えたら打ち切る */
export function runJs(code: string, calls: string[] = [], timeoutMs = 3000): Promise<RunOutcome> {
  return new Promise((resolve) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = RUNNER_HTML;
    const id = ++seq;
    let done = false;
    const finish = (o: RunOutcome) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      iframe.remove();
      resolve(o);
    };
    const timer = setTimeout(() => finish({ ok: false, logs: [], timeout: true, error: 'タイムアウト', hint: `${timeoutMs / 1000}秒たっても終わりませんでした。無限ループになっていませんか?` }), timeoutMs);
    const onMessage = (ev: MessageEvent) => {
      if (ev.source !== iframe.contentWindow) return;
      const d = ev.data || {};
      if (d.__ready) {
        iframe.contentWindow!.postMessage({ __run: id, code, calls }, '*');
      } else if (d.__result) {
        finish({ ok: d.ok, logs: d.logs ?? [], error: d.error, hint: d.error ? translateJsError(d.error) : undefined, results: d.results });
      }
    };
    window.addEventListener('message', onMessage);
    document.body.appendChild(iframe);
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

/** 実行結果を課題の期待値と比べる */
export function judgeJs(out: RunOutcome, expectOutput?: string[], calls?: JsCall[]): JsJudgement {
  if (!out.ok) return { correct: false, message: out.timeout ? out.hint! : 'エラーになりました。右の出力を確認してください。' };
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
