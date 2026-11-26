// 正規表現の練習場の判定。画面(RegexPractice.astro)と scripts/check-tasks.mjs の両方で使う。
// パターンは JavaScript の RegExp で動かす(u フラグ付き。日本語も1文字として扱う)。
//
// 課題の regex(すべて満たせば正解):
//   match:    ["…"]   どれにも一致する(文字列のどこかに。full なら全体が一致)
//   noMatch:  ["…"]   どれにも一致しない
//   full:     true    match / noMatch を「全体が一致するか」で調べる(入力チェックの課題)
//   extract:  { text: "…", expect: ["…"], group?: 1 }   text から一致した部分を全部取り出すと expect になる
//   replace:  { text: "…", with: "…", expect: "…" }       text の一致した部分を全部 with に置き換えると expect になる
//   flags:    "i"     追加のフラグ(i: 大文字小文字を区別しない)

/** パターンを RegExp にする。だめならエラーの文 */
export function compile(pattern, flags, full) {
  try {
    var src = full ? '^(?:' + pattern + ')$' : pattern;
    return { re: new RegExp(src, 'u' + (flags || '')) };
  } catch (e) {
    return { error: String(e && e.message ? e.message : e) };
  }
}

/** text の中で一致した範囲を [始まり, 終わり] で全部返す(長さ 0 の一致は飛ばす) */
export function ranges(pattern, flags, text) {
  var c = compile(pattern, flags, false);
  if (c.error || !pattern) return [];
  var re = new RegExp(c.re.source, c.re.flags + 'g');
  var out = [];
  var m;
  var guard = 0;
  while ((m = re.exec(text)) && guard++ < 1000) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    out.push([m.index, m.index + m[0].length]);
  }
  return out;
}

function show(s) { return '「' + s + '」'; }

/**
 * @returns {{ correct: boolean, message: string, error?: string, rows: { text: string, want: boolean, got: boolean }[], extracted?: string[], replaced?: string }}
 */
export function judgeRegex(pattern, task) {
  var r = task.regex || {};
  var rows = [];
  if (!pattern) return { correct: false, message: 'パターンを入れてください。', rows: rows };
  var c = compile(pattern, r.flags, !!r.full);
  if (c.error) return { correct: false, message: 'パターンに誤りがあります。', error: c.error, rows: rows };
  var problems = [];
  (r.match || []).forEach(function (s) {
    var got = c.re.test(s);
    rows.push({ text: s, want: true, got: got });
    if (!got) problems.push(show(s) + ' に' + (r.full ? '全体が' : '') + '一致しません');
  });
  (r.noMatch || []).forEach(function (s) {
    var got = c.re.test(s);
    rows.push({ text: s, want: false, got: got });
    if (got) problems.push(show(s) + ' に一致してしまいます');
  });
  var result = { correct: false, message: '', rows: rows };
  if (r.extract) {
    var g = new RegExp(c.re.source.replace(/^\^\(\?:([\s\S]*)\)\$$/, '$1'), c.re.flags + 'g');
    var found = [];
    var m;
    var guard = 0;
    while ((m = g.exec(r.extract.text)) && guard++ < 1000) {
      if (m[0].length === 0) { g.lastIndex++; continue; }
      found.push(r.extract.group ? (m[r.extract.group] === undefined ? '' : m[r.extract.group]) : m[0]);
    }
    result.extracted = found;
    if (JSON.stringify(found) !== JSON.stringify(r.extract.expect)) {
      problems.push('取り出した結果が違います(あなた: ' + (found.length ? found.map(show).join(' ') : 'なし') + '、期待: ' + r.extract.expect.map(show).join(' ') + ')');
    }
  }
  if (r.replace) {
    var rg = new RegExp(c.re.source, c.re.flags + 'g');
    var replaced = r.replace.text.replace(rg, r.replace.with);
    result.replaced = replaced;
    if (replaced !== r.replace.expect) problems.push('置き換えた結果が違います(あなた: ' + show(replaced) + '、期待: ' + show(r.replace.expect) + ')');
  }
  if (problems.length) {
    result.message = problems[0] + (problems.length > 1 ? '(ほか ' + (problems.length - 1) + ' 件)' : '');
    return result;
  }
  result.correct = true;
  return result;
}
