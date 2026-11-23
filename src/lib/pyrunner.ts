// Python練習場の実行と判定(ページ側)。
// 実際の実行は pyworker.ts(Web Worker)の中の Pyodide が行う。ここは作業者の用意、打ち切り、エラーの日本語化、判定。
import type { JsCall } from './content';

export interface PyOutcome {
  ok: boolean;
  logs: string[]; // print の出力(1行ずつ)
  error?: string; // 例: "NameError: name 'x' is not defined"
  line?: number; // エラーの行(分かるとき)
  hint?: string; // エラーの日本語補足
  results?: ({ v: unknown; r: string } | { e: string })[]; // calls の結果。r は Python での見え方(repr)
  files?: Record<string, string>; // 実行後の作業フォルダのファイル(名前 → 中身)
  timeout?: boolean;
}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let seq = 0;

/** Python を用意する(初回は Pyodide の読み込みで数秒かかる)。何度呼んでもよい */
export function preparePython(): Promise<void> {
  if (ready) return ready;
  const w = new Worker(new URL('./pyworker.ts', import.meta.url), { type: 'module' });
  worker = w;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const indexURL = new URL(`${base}/pyodide/`, location.href).href;
  ready = new Promise<void>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'ready') { w.removeEventListener('message', onMessage); resolve(); }
      if (ev.data?.type === 'failed') { w.removeEventListener('message', onMessage); reject(new Error(ev.data.error)); }
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'init', indexURL });
  });
  ready.catch(() => { worker?.terminate(); worker = null; ready = null; });
  return ready;
}

/** コードを実行する。files は練習用のファイルに足すもの。timeoutMs を超えたら作業者ごと止める(次の実行の前に作り直す) */
export async function runPy(code: string, calls: string[] = [], files: Record<string, string> = {}, timeoutMs = 5000): Promise<PyOutcome> {
  await preparePython();
  const w = worker!;
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMessage);
      w.terminate();
      if (worker === w) { worker = null; ready = null; }
      resolve({ ok: false, logs: [], timeout: true, error: 'タイムアウト', hint: `${timeoutMs / 1000}秒たっても終わりませんでした。while の条件がずっと True のまま(無限ループ)になっていないか確認してください。` });
    }, timeoutMs);
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data || {};
      if (d.type !== 'result' || d.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve({ ok: d.ok, logs: d.logs ?? [], error: d.error, line: d.line, results: d.results, files: d.files, hint: d.error ? translatePyError(d.error) : undefined });
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'run', id, code, calls, files });
  });
}

/** Python のエラーの最後の1行に、日本語の補足を付ける */
export function translatePyError(msg: string): string {
  let m: RegExpMatchArray | null;
  const didYouMean = msg.match(/Did you mean: '([^']+)'\?/);
  const maybe = didYouMean ? `もしかして「${didYouMean[1]}」ですか？` : '';
  if (/input\(\) は使えません/.test(msg)) return 'この練習場では input() で入力を受け取れません。値は変数に直接書いてください。';
  if ((m = msg.match(/^NameError: name '([^']+)' is not defined/))) return `「${m[1]}」という名前がありません。つづり、代入する前に使っていないか、文字のつもりなら引用符(" ")で囲んだかを確認してください。${maybe}`;
  if (/^IndentationError: expected an indented block/.test(msg)) return ': で終わる行の次は、字下げ(行の頭にスペース4つ)が必要です。';
  if (/^IndentationError: unexpected indent/.test(msg)) return 'いらない字下げがあります。行の頭のスペースを確認してください。';
  if (/^IndentationError: unindent does not match/.test(msg)) return '字下げの深さがそろっていません。同じかたまりの行は、同じ数のスペースで始めます。';
  if (/^TabError/.test(msg)) return 'タブとスペースが混ざっています。字下げはスペース4つにそろえてください。';
  if (/expected ':'/.test(msg)) return 'if、for、while、def などの行の終わりには : (コロン)が必要です。';
  if (/unterminated string literal|unterminated triple-quoted/.test(msg)) return '文字列の引用符が閉じていません。" や \' の数を確認してください。';
  if ((m = msg.match(/'(.)' was never closed/))) return `開いたカッコ ${m[1]} が閉じていません。`;
  if (/unmatched '(.)'/.test(msg)) return '閉じカッコが多すぎます。カッコの数を確認してください。';
  if (/Maybe you meant '==' or ':=' instead of '='/.test(msg) || /cannot assign to .* here/.test(msg)) return '比べるときは = ではなく == を使います(= は代入です)。';
  if (/^SyntaxError: invalid syntax/.test(msg)) return `文法の誤りがあります。カッコ、引用符、カンマ、行末の : を確認してください。${maybe}`;
  if (/^SyntaxError/.test(msg)) return '文法の誤りがあります。エラーの行とその1つ前の行を確認してください。';
  if (/can only concatenate str \(not "(int|float)"\) to str/.test(msg)) return '文字列と数は + でつなげません。str(数) で文字列にするか、f文字列(f"...{数}...")を使ってください。';
  if (/unsupported operand type\(s\) for [+\-*/]+: '(int|float)' and 'str'/.test(msg)) return '数と文字列は計算できません。文字列の数は int(...) で数にしてください。';
  if (/unsupported operand type\(s\)/.test(msg)) return 'この組み合わせの値どうしは計算できません。それぞれの値の種類(数、文字列、リスト)を確認してください。';
  if ((m = msg.match(/^TypeError: '(\w+)' object is not callable/))) return `${m[1]} の値を関数のように呼び出しています。変数名が関数名(list、str、sum など)と重なっていないか確認してください。`;
  if ((m = msg.match(/^TypeError: ([\w.]+)\(\) missing (\d+) required positional argument/))) {
    const name = m[1].replace(/\.__init__$/, '');
    return `${name}() に渡す値(引数)が ${m[2]}個 足りません。${m[1].endsWith('__init__') ? 'クラスから作るときは、__init__ の self 以外の引数をすべて渡します。' : ''}`;
  }
  if ((m = msg.match(/^TypeError: ([\w.]+)\(\) takes (\d+) positional arguments? but (\d+) (were|was) given/))) {
    const self = m[1].includes('.') && Number(m[3]) === Number(m[2]) + 1 ? ' メソッドの最初の引数に self を書き忘れていませんか？' : '';
    return `${m[1]}() は引数を ${m[2]}個 受け取りますが、${m[3]}個 渡しています。${self}`;
  }
  if (/object is not subscriptable/.test(msg)) return '[ ] で中身を取り出せない値に [ ] を付けています。変数の中身を確認してください。';
  if (/object is not iterable/.test(msg)) return 'for で1つずつ取り出せない値(数など)を回そうとしています。数の回数なら range(...) を使います。';
  if (/list indices must be integers/.test(msg)) return 'リストの番号は整数で指定します。辞書のつもりなら { } で作ったか確認してください。';
  if (/^IndexError: (list|string|tuple) index out of range/.test(msg)) return '番号が大きすぎます。番号は 0 から始まり、最後は len(...) - 1 です。';
  if ((m = msg.match(/^KeyError: (.+)/))) return `辞書にキー ${m[1]} がありません。キーのつづりを確認するか、.get(キー) を使ってください。`;
  if (/^ValueError: invalid literal for int\(\)/.test(msg)) return '数に変換できない文字列を int() に渡しています。';
  if (/^ZeroDivisionError/.test(msg)) return '0 で割り算をしています。';
  if ((m = msg.match(/^AttributeError: '(\w+)' object has no attribute '(\w+)'/))) return `${m[1]} には .${m[2]} がありません。つづりや、値の種類を確認してください。${maybe}`;
  if (/^RecursionError/.test(msg)) return '関数が自分自身を呼び続けて止まらなくなりました。';
  if ((m = msg.match(/^FileNotFoundError: .*'([^']+)'$/))) return `ファイル「${m[1]}」がありません。ファイル名のつづりを、「練習用のファイル」の一覧と見比べてください。`;
  if (/not readable|not writable/.test(msg)) return 'ファイルを開いたときのモードと、していることが合っていません。読むときは "r"、書くときは "w" か "a" で開きます。';
  if (/^ModuleNotFoundError/.test(msg)) return 'その名前のモジュールはこの練習場にありません。標準ライブラリ(math、datetime など)は使えます。';
  if (/^UnboundLocalError/.test(msg)) return '関数の中で、値を入れる前にその変数を使っています。';
  return 'エラーの行とメッセージを確認してください。';
}

export interface PyJudgement {
  correct: boolean;
  message: string;
}

/** JSON の値を Python での書き方にする(期待値の表示用) */
export function pyRepr(v: unknown): string {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  if (typeof v === 'object') return `{${Object.entries(v as Record<string, unknown>).map(([k, x]) => `${pyRepr(k)}: ${pyRepr(x)}`).join(', ')}}`;
  return String(v);
}

/** 辞書のキーの順番は問わずに比べる */
export function samePy(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => samePy(x, b[i]));
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in (b as object) && samePy((a as any)[k], (b as any)[k]));
  }
  return a === b;
}

/** 実行結果を課題の期待値と比べる */
export function judgePy(out: PyOutcome, expectOutput?: string[], calls?: JsCall[]): PyJudgement {
  if (!out.ok) return { correct: false, message: out.timeout ? out.hint! : 'エラーになりました。右の出力を確認してください。' };
  if (expectOutput) {
    const got = out.logs.map((l) => l.trim());
    const exp = expectOutput.map((l) => l.trim());
    if (got.length !== exp.length) {
      return { correct: false, message: `出力の行数が違います(あなた: ${got.length}行、期待: ${exp.length}行)。print の回数を確認してください。` };
    }
    for (let i = 0; i < exp.length; i++) {
      if (got[i] !== exp[i]) return { correct: false, message: `出力の${i + 1}行目が違います(あなた: 「${got[i]}」、期待: 「${exp[i]}」)。` };
    }
  }
  if (calls) {
    for (let i = 0; i < calls.length; i++) {
      const r = out.results?.[i];
      if (!r) return { correct: false, message: `${calls[i].call} を実行できませんでした。` };
      if ('e' in r) return { correct: false, message: `${calls[i].call} でエラー: ${translatePyError(r.e)}(${r.e})` };
      if (!samePy(r.v, calls[i].expect)) {
        const noReturn = r.r === 'None' ? ' 関数の最後で return していますか？ print で表示するだけでは、呼び出した側に値が返りません。' : '';
        return { correct: false, message: `${calls[i].call} の結果が違います(あなた: ${r.r}、期待: ${pyRepr(calls[i].expect)})。${noReturn}` };
      }
    }
  }
  return { correct: true, message: '' };
}
