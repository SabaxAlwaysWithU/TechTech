// ページ(DOM)を調べる判定と、判定の前に行う操作。HTML練習場と JavaScript練習場の両方で使う。
// JavaScript練習場では、この関数を文字列にして隔離された iframe に埋め込むので、
// 関数の外の変数や import を参照しないこと。

/**
 * checks をすべて満たすか調べる。text / attr / css は「どれか1つの要素が満たせばよい」
 * @param {Document} doc
 * @param {Window} win
 * @param {{ selector: string, count?: number, text?: string, textIncludes?: string, attr?: Record<string, string>, css?: Record<string, string>, message: string }[]} checks
 * @returns {{ correct: boolean, message: string }}
 */
export function judgeDom(doc, win, checks) {
  function normalize(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    var els;
    try {
      els = Array.prototype.slice.call(doc.querySelectorAll(c.selector));
    } catch (e) {
      return { correct: false, message: '判定条件のセレクタが不正です: ' + c.selector };
    }
    if (c.count !== undefined) {
      if (els.length !== c.count) return { correct: false, message: c.message };
    } else if (els.length === 0) {
      return { correct: false, message: c.message };
    }
    var needsDetail = c.text !== undefined || c.textIncludes !== undefined || c.attr || c.css;
    if (needsDetail && els.length > 0) {
      var ok = els.some(function (el) {
        if (c.text !== undefined && normalize(el.textContent) !== normalize(c.text)) return false;
        if (c.textIncludes !== undefined && normalize(el.textContent).indexOf(normalize(c.textIncludes)) < 0) return false;
        if (c.attr) {
          for (var k in c.attr) if (el.getAttribute(k) !== c.attr[k]) return false;
        }
        if (c.css) {
          var cs = win.getComputedStyle(el);
          for (var p in c.css) if (cs.getPropertyValue(p).trim() !== c.css[p]) return false;
        }
        return true;
      });
      if (!ok) return { correct: false, message: c.message };
    }
  }
  return { correct: true, message: '' };
}

/**
 * 判定の前に、人の代わりにページを操作する。できなければ理由の文を返す
 * @param {Document} doc
 * @param {{ click?: string, fill?: string, value?: string }} action
 *   { "click": "#add" } はボタンを押す。{ "fill": "#name", "value": "牛乳" } は入力欄に打つ(input イベントも起こす)
 * @returns {string | null}
 */
export function doDomAction(doc, action) {
  var sel = action.click || action.fill;
  var el = sel ? doc.querySelector(sel) : null;
  if (!el) return '操作する要素 ' + sel + ' が見つかりません。画面の HTML を消したり変えたりしていないか確認してください。';
  if (action.click) {
    el.click();
  } else {
    el.value = action.value == null ? '' : String(action.value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }
  return null;
}
