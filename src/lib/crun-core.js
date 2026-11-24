// C 練習場で利用者のコードを動かす部分。ブラウザ(cworker.ts)と scripts/check-tasks.mjs の両方で使う。
// 動かすのは picoc(小さな C のインタプリタ)。作り手の関数 picoc は src/lib/picoc.gen.js(scripts/prepare-picoc.mjs が作る)。
// - 実行のたびに新しい picoc を作る(前の実行の変数やメモリは残らない)
// - printf の出力は1行ずつ受け取る
// - picoc のエラーは「ソースの行 / ^ の行 / file.c:行:列 メッセージ」の3行で出るので、出力から取り除いて error / line / col にする
// - exit や main の return の値は exitCode に入る(Node でもプロセスを終わらせない)
// picoc は C の全部ではない。const、long long、構造体の { } での初期化、構造体を値で返す関数は使えない。

/**
 * @param {(overrides: object) => any} factory picoc.gen.js の picoc
 * @param {string} code 利用者のコード
 * @returns {Promise<{ ok: boolean, logs: string[], error?: string, line?: number, col?: number, exitCode: number }>}
 */
export function runCCode(factory, code) {
  return new Promise(function (resolve) {
    var lines = [];
    var exitCode = 0;
    var mod = null;
    var wrapped = wrapMain(code);
    function write(s) { lines.push(String(s)); }
    function finish(runtimeError) {
      // 改行で終わらない最後の出力を出す(scripts/prepare-picoc.mjs で足した関数)
      try { if (mod && mod.flushTTY) mod.flushTTY(); } catch (e) {}
      var last = lines[lines.length - 1] || '';
      if (exitCode !== 0 && last === 'main() is not defined') {
        lines.pop();
        resolve({ ok: false, logs: lines, error: last, exitCode: exitCode });
        return;
      }
      var m = /^file\.c:(\d+):(\d+) (.*)$/.exec(last);
      if (m && exitCode !== 0) {
        lines.pop();
        // その前の2行は、エラーの起きたソースの行と、位置を示す ^ の行
        if (lines.length >= 2 && /^\s*\^\s*$/.test(lines[lines.length - 1])) lines.splice(lines.length - 2, 2);
        var line = Number(m[1]), col = Number(m[2]) + 1;
        // main の名前を変えた行で、それより右なら、長くなった分を戻す
        if (line === wrapped.line && col > wrapped.col) col = Math.max(wrapped.col, col - wrapped.shift);
        resolve({ ok: false, logs: lines, error: m[3].replace(/__techtech_main/g, 'main'), line: line, col: col, exitCode: exitCode });
        return;
      }
      if (runtimeError) { resolve({ ok: false, logs: lines, error: runtimeError, exitCode: exitCode || 1 }); return; }
      resolve({ ok: true, logs: lines, exitCode: exitCode });
    }
    try {
      mod = factory({
        consoleWrite: write,
        printErr: function () {},
        // C の exit や、main の 0 以外の return。Node でもブラウザでもプロセスやページを止めず、値だけ覚えて実行を抜ける
        quit: function (status, toThrow) { exitCode = status; throw toThrow; },
        onRuntimeInitialized: function () {
          var runtimeError = null;
          try {
            mod.runc(wrapped.code, write);
          } catch (e) {
            if (!(e && e.name === 'ExitStatus')) runtimeError = 'RuntimeError: ' + (e && e.message ? e.message : String(e));
          }
          finish(runtimeError);
        },
      });
    } catch (e) {
      resolve({ ok: false, logs: [], error: 'C を動かす準備に失敗しました: ' + String(e), exitCode: 1 });
    }
  });
}

/**
 * 改行で終わらない最後の printf の出力は、C の stdout にたまったまま捨てられてしまう。
 * そこで、利用者の main を __techtech_main という名前に変え、それを呼んでから fflush(stdout) する本当の main を最後に足す。
 * 名前を変えるだけなので、エラーの行番号はずれない。main(int argc, ...) のように引数のある main はそのままにする
 */
export function wrapMain(code) {
  var re = /\b(int|void)(\s+)main(\s*\(\s*(?:void)?\s*\))/g;
  var m;
  while ((m = re.exec(code))) {
    if (insideCommentOrString(code, m.index)) continue;
    var at = m.index + m[1].length + m[2].length; // main の位置
    var renamed = code.slice(0, at) + '__techtech_main' + code.slice(at + 4);
    var call = m[1] === 'int'
      ? 'int __techtech_r = __techtech_main(); fflush(stdout); return __techtech_r;'
      : '__techtech_main(); fflush(stdout); return 0;';
    var before = code.slice(0, at);
    var line = before.split('\n').length;
    var col = at - before.lastIndexOf('\n'); // 1 から数えた列
    return { code: renamed + '\n#include <stdio.h>\nint main() { ' + call + ' }\n', line: line, col: col, shift: '__techtech_main'.length - 4 };
  }
  return { code: code, line: 0, col: 0, shift: 0 };
}

/**
 * コードの中の main 関数を取り除き、代わりに testMain を付ける(課題の tests で、関数だけを別の main で確かめるため)。
 * 文字列・文字・コメントの中の { } は数えない
 */
export function replaceMain(code, testMain) {
  var re = /\b(?:int|void)\s+main\s*\(/g;
  var m;
  while ((m = re.exec(code))) {
    if (insideCommentOrString(code, m.index)) continue;
    var open = code.indexOf('{', re.lastIndex);
    if (open < 0) break;
    var end = matchBrace(code, open);
    if (end < 0) break;
    return code.slice(0, m.index) + code.slice(end + 1) + '\n' + testMain + '\n';
  }
  return code + '\n' + testMain + '\n';
}

function insideCommentOrString(code, pos) {
  var i = 0, mode = '';
  while (i < pos) {
    var c = code[i], n = code[i + 1];
    if (!mode) {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue; }
      if (c === '"' || c === "'") { mode = c; i++; continue; }
    } else if (mode === 'line') { if (c === '\n') mode = ''; }
    else if (mode === 'block') { if (c === '*' && n === '/') { mode = ''; i += 2; continue; } }
    else { if (c === '\\') { i += 2; continue; } if (c === mode) mode = ''; }
    i++;
  }
  return mode !== '';
}

function matchBrace(code, open) {
  var depth = 0, i = open, mode = '';
  while (i < code.length) {
    var c = code[i], n = code[i + 1];
    if (!mode) {
      if (c === '/' && n === '/') { mode = 'line'; i += 2; continue; }
      if (c === '/' && n === '*') { mode = 'block'; i += 2; continue; }
      if (c === '"' || c === "'") { mode = c; i++; continue; }
      if (c === '{') depth++;
      if (c === '}') { depth--; if (depth === 0) return i; }
    } else if (mode === 'line') { if (c === '\n') mode = ''; }
    else if (mode === 'block') { if (c === '*' && n === '/') { mode = ''; i += 2; continue; } }
    else { if (c === '\\') { i += 2; continue; } if (c === mode) mode = ''; }
    i++;
  }
  return -1;
}

/** picoc のエラーメッセージに日本語の補足を付ける */
export function translateCError(msg) {
  var m;
  if (/illegal character/.test(msg)) return '読めない文字があります。全角のスペース、全角のカッコ(()や;など、日本語入力のままの記号が混ざっていないか確認してください。';
  if ((m = /^'(.+)' is (?:undefined|not defined)/.exec(msg))) return '「' + m[1] + '」が宣言されていません。変数は使う前に int ' + m[1] + '; のように宣言します。関数なら名前のつづりを確認してください。';
  if (/semicolon expected|';' expected/.test(msg)) return '文の終わりの ; (セミコロン)が足りません。示された位置か、その1つ前の行の終わりを確認してください。';
  if (/identifier not expected here|value not expected here/.test(msg)) return '思わぬところに名前や値があります。1つ前の行の終わりの ; や、演算子(+ や ,)の書き忘れがないか確認してください。';
  if (/type not expected here/.test(msg)) return 'ここに型(int など)は書けません。この練習場の C(picoc)では const が使えないので、const を消してください。宣言の位置も確認してください。';
  if (/can't assign struct .* from array initializer|can't assign .* from array initializer/.test(msg)) return 'この練習場の C(picoc)では、構造体を { } でまとめて初期化できません。p.x = 1; のように、1つずつ代入してください。';
  if (/'[(){}\[\]]' expected|close bracket expected|brackets not closed/.test(msg)) return 'カッコの組み合わせがそろっていません。( と )、[ と ]、{ と } の数を確認してください。';
  if (/expected "'"/.test(msg)) return '文字の引用符 \' が閉じていません。1文字は \'a\'、文字列は "abc" のように書きます。';
  if (/NULL pointer dereference|invalid use of a NULL pointer/.test(msg)) return 'NULL(どこも指していない)ポインタの先を読み書きしています。ポインタに & で変数のアドレスを入れたか、malloc が成功したかを確認してください。';
  if (/divide by zero/.test(msg)) return '0 で割り算をしています。割る数が 0 にならないか確認してください。';
  if ((m = /not enough arguments to '?([\w]+)'?/.exec(msg))) return m[1] + ' に渡す値(引数)が足りません。関数の定義と、呼び出すときの数を比べてください。';
  if (/too many arguments to/.test(msg)) return '関数に渡す値(引数)が多すぎます。関数の定義と、呼び出すときの数を比べてください。';
  if (/no value returned from a function returning/.test(msg)) return '値を返す関数(int など)なのに、return で値を返さずに終わっています。';
  if (/main\(\) is not defined/.test(msg)) return 'main 関数がありません。C のプログラムは int main() { ... } から始まります。';
  if ((m = /'(.+)' is already defined/.exec(msg))) return '「' + m[1] + '」を2回宣言しています。2回目は型(int など)を付けずに代入してください。';
  if (/not an lvalue|can't assign to this/.test(msg)) return '値を入れられないものに = で代入しています。比べるつもりなら == を使います。';
  if (/array index must be an integer/.test(msg)) return '配列の番号は整数で指定します。';
  if (/is not an array/.test(msg)) return '配列ではないものに [ ] を付けています。';
  if (/not a struct or union/.test(msg)) return '構造体ではないものに . や -> を付けています。構造体そのものには .、構造体へのポインタには -> を使います。';
  if (/is not a function/.test(msg)) return '関数ではないものを ( ) で呼び出しています。';
  if (/'while' expected/.test(msg)) return 'do { ... } のあとには while (条件); が必要です。';
  if (/statement expected|expression expected|identifier expected|function definition expected|bad function definition/.test(msg)) return '文法の誤りがあります。カッコ、セミコロン、つづりを、示された位置の近くで確認してください。';
  if (/out of memory/.test(msg)) return 'メモリが足りなくなりました。とても大きな配列や、終わらない malloc がないか確認してください。';
  if (/RuntimeError/.test(msg)) return '実行中に止まりました。0 での割り算や、配列の範囲外、壊れたポインタがないか確認してください。';
  return 'エラーの位置とメッセージを確認してください。';
}
