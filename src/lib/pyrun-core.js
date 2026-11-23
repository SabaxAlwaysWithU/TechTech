// Python練習場で利用者のコードを動かす部分。ブラウザ(pyworker.ts)と check-tasks.mjs の両方で使う。
// Pyodide(ブラウザで動く Python)の上で、次の Python コードを1回だけ読み込み、実行のたびに _techtech_run を呼ぶ。
// - 利用者のコードは毎回まっさらな名前空間で実行する(前の実行の変数は残らない)
// - print の出力は io.StringIO に集めて、1行ずつの配列で返す
// - エラーは「何行目か」と最後の1行(NameError: ... など)だけを返す(Pyodide の内部の行は見せない)
// - calls(課題の判定用の式)は、コードを実行したあとの同じ名前空間で eval し、値を JSON にして返す

export const PY_RUNNER = String.raw`
import sys as _tt_sys, io as _tt_io, json as _tt_json, traceback as _tt_tb

def _tt_describe(e):
    name = type(e).__name__
    if isinstance(e, SyntaxError):
        line = e.lineno if e.filename == "<code>" else None
        return name + ": " + str(e.msg), line
    line = None
    for fr in _tt_tb.extract_tb(e.__traceback__):
        if fr.filename == "<code>":
            line = fr.lineno
    # 最後の部分だけを使う(「Did you mean: 'print'?」の候補は traceback 付きで整形したときにだけ付く)
    text = _tt_tb.format_exception(type(e), e, e.__traceback__)[-1].strip().splitlines()
    return " ".join(s.strip() for s in text), line

def _tt_value(v):
    r = repr(v)
    try:
        return {"v": _tt_json.loads(_tt_json.dumps(v, ensure_ascii=False, allow_nan=False)), "r": r}
    except Exception:
        return {"v": {"__repr__": r}, "r": r}

def _tt_no_input(prompt=""):
    raise RuntimeError("この練習場では input() は使えません。値は変数に直接入れてください")

def _techtech_run(code, calls_json):
    calls = _tt_json.loads(calls_json)
    out = _tt_io.StringIO()
    ns = {"__name__": "__main__", "input": _tt_no_input}
    res = {"ok": True}
    old_out = _tt_sys.stdout
    _tt_sys.stdout = out
    try:
        try:
            exec(compile(code, "<code>", "exec"), ns)
        except SystemExit:
            pass
        except BaseException as e:
            res["ok"] = False
            res["error"], res["line"] = _tt_describe(e)
        if res["ok"]:
            results = []
            for c in calls:
                try:
                    results.append(_tt_value(eval(compile(c, "<call>", "eval"), ns)))
                except BaseException as e:
                    results.append({"e": _tt_describe(e)[0]})
            res["results"] = results
    finally:
        _tt_sys.stdout = old_out
    res["output"] = out.getvalue()
    return _tt_json.dumps(res, ensure_ascii=False)
`;

/**
 * Pyodide の上で利用者のコードを実行する。
 * @param {any} py loadPyodide() で作った Pyodide
 * @param {string} code 利用者のコード
 * @param {string[]} calls 実行後に評価する式(例: "add(2, 3)")
 * @returns {{ ok: boolean, logs: string[], error?: string, line?: number, results?: ({v: unknown, r: string} | {e: string})[] }}
 */
export function runPython(py, code, calls = []) {
  if (!py.__techtechReady) {
    py.runPython(PY_RUNNER);
    py.__techtechReady = true;
  }
  const fn = py.globals.get('_techtech_run');
  let raw;
  try {
    raw = fn(code, JSON.stringify(calls));
  } finally {
    fn.destroy();
  }
  const r = JSON.parse(raw);
  const text = r.output.endsWith('\n') ? r.output.slice(0, -1) : r.output;
  return { ok: r.ok, logs: text === '' ? [] : text.split('\n'), error: r.error, line: r.line ?? undefined, results: r.results };
}
