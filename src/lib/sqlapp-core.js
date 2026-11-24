// SQL 分野の「アプリの画面」(SQL インジェクションの体験用)。
// 課題の app に書いた画面(ログインや検索)に入力すると、アプリが入力を SQL に埋め込んで実行する。
// ブラウザ(Practice.astro)と scripts/check-tasks.mjs の両方で使うので、sql.js の Database だけに頼る素の JavaScript で書く。
//
// app の形:
//   { kind: "login" | "search", title, button, query, safe?, fields: [{ id, label, type? }] }
//   query の {id} に入力がそのまま入る(safe でないとき)。safe のときは {id} を ? に置き換え、入力は値として渡す(プレースホルダ)。
//   SQL の中の '{id}' のように引用符で囲まれた {id} は、safe のときは引用符ごと ? になる。

/** 入力から、実行する SQL と、プレースホルダに渡す値を作る */
export function buildAppQuery(app, values) {
  if (!app.safe) {
    var sql = app.query.replace(/\{(\w+)\}/g, function (_, id) { return values[id] == null ? '' : String(values[id]); });
    return { sql: sql, params: null };
  }
  var params = [];
  var safeSql = app.query.replace(/'?\{(\w+)\}'?/g, function (_, id) {
    params.push(values[id] == null ? '' : String(values[id]));
    return '?';
  });
  return { sql: safeSql, params: params };
}

/**
 * アプリとして実行する。safe でなければ db.exec(複数の文も実行される)、safe なら1文だけを、値を渡して実行する
 * @returns {{ ok: boolean, sql: string, params: string[] | null, result?: { columns: string[], values: unknown[][] }, error?: string }}
 */
export function runApp(db, app, values) {
  var q = buildAppQuery(app, values);
  try {
    if (!q.params) {
      var rs = db.exec(q.sql);
      // 「;」で文をつなげられたときは、最初の SELECT の結果をアプリが使う(SELECT 以外の文も実行はされる)
      var first = rs.length ? rs[0] : null;
      return { ok: true, sql: q.sql, params: null, result: first ? { columns: first.columns, values: first.values } : { columns: [], values: [] } };
    }
    var stmt = db.prepare(q.sql);
    try {
      stmt.bind(q.params);
      var columns = stmt.getColumnNames();
      var rows = [];
      while (stmt.step()) rows.push(stmt.get());
      return { ok: true, sql: q.sql, params: q.params, result: { columns: columns, values: rows } };
    } finally {
      stmt.free();
    }
  } catch (e) {
    return { ok: false, sql: q.sql, params: q.params, error: e && e.message ? e.message : String(e) };
  }
}

/** ログイン画面の結果から、ログインした人の行(最初の行)を取り出す。いなければ null */
export function loggedInUser(run) {
  if (!run.ok || !run.result || !run.result.values.length) return null;
  var cols = run.result.columns;
  var row = run.result.values[0];
  var user = {};
  for (var i = 0; i < cols.length; i++) user[cols[i]] = row[i];
  return user;
}

/**
 * 判定。truthDb は、利用者の入力で書き換えられていない、最初の状態のデータベース(本当のパスワードなどを調べる)。
 * expect: { error, fail, success, loginAs, bypass, unknownName, inputIncludes: { 欄id: 文字 }, leaks: "SELECT ..." }
 * @returns {{ correct: boolean, message: string }}
 */
export function judgeApp(truthDb, app, values, run, expect) {
  function no(message) { return { correct: false, message: message }; }
  function col(sql, params) {
    var stmt = truthDb.prepare(sql);
    var out = [];
    try { stmt.bind(params || []); while (stmt.step()) out.push(stmt.get()[0]); } finally { stmt.free(); }
    return out;
  }
  for (var id in expect.inputIncludes || {}) {
    if (String(values[id] || '').indexOf(expect.inputIncludes[id]) < 0) {
      var label = (app.fields.filter(function (f) { return f.id === id; })[0] || { label: id }).label;
      return no('「' + label + '」に ' + expect.inputIncludes[id] + ' を入れて試してください。');
    }
  }
  if (expect.error) {
    return run.ok ? no('エラーになりませんでした。入力に \' を入れてみてください。') : { correct: true, message: '' };
  }
  if (!run.ok) return no('SQL のエラーになりました。下の「アプリが組み立てた SQL」を見て、引用符の数や -- の位置を確かめてください。');
  var user = loggedInUser(run);
  if (expect.fail) {
    return user ? no('ログインできてしまいました(' + user.name + ' さん)。') : { correct: true, message: '' };
  }
  if (app.kind === 'login') {
    if (!user) return no('ログインできませんでした。');
    if (expect.loginAs && user.name !== expect.loginAs) return no(user.name + ' さんとしてログインしました。' + expect.loginAs + ' さんとしてログインしてください。');
    if (expect.bypass) {
      var real = col('SELECT password FROM users WHERE name = ?', [String(user.name)]);
      if (real.indexOf(String(values.password || '')) >= 0) return no('本当のパスワードでログインしています。パスワードを使わずにログインしてください。');
    }
    if (expect.unknownName) {
      var typed = String(values.name || '');
      var known = col('SELECT name FROM users').filter(function (n) { return typed.indexOf(String(n)) >= 0; });
      if (known.length) return no('名前の欄に、実在する利用者の名前(' + known[0] + ')が入っています。名前も知らない前提でログインしてください。');
    }
  }
  if (expect.leaks) {
    var secrets = col(expect.leaks).map(String);
    var shown = {};
    (run.result ? run.result.values : []).forEach(function (r) { r.forEach(function (v) { shown[String(v)] = true; }); });
    var missing = secrets.filter(function (s) { return !shown[s]; });
    if (missing.length) return no('結果に、まだ見えていない秘密の値があります(' + missing.length + '件)。');
  }
  if (expect.success && !(run.result && run.result.values.length)) return no('結果が1行もありません。');
  return { correct: true, message: '' };
}

/** 模範解答の「ラベル: 値」の行から、入力の値を読み取る(例: 「名前: admin' --」) */
export function parseAppAnswer(app, answer) {
  var values = {};
  String(answer || '').split('\n').forEach(function (line) {
    var i = line.indexOf(': ');
    if (i < 0) return;
    var label = line.slice(0, i).trim();
    var f = app.fields.filter(function (x) { return x.label === label; })[0];
    if (f) values[f.id] = line.slice(i + 2);
  });
  return values;
}
