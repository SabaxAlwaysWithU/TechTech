// HTML練習場の正誤判定。プレビューの中にできあがったページ(DOM)を調べる。
import type { HtmlCheck } from './content';

export interface HtmlJudgement {
  correct: boolean;
  message: string; // 最初に満たさなかった条件の説明
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim();
}

export function judgeHtml(doc: Document, win: Window, checks: HtmlCheck[]): HtmlJudgement {
  for (const c of checks) {
    let els: Element[];
    try {
      els = Array.from(doc.querySelectorAll(c.selector));
    } catch {
      return { correct: false, message: `判定条件のセレクタが不正です: ${c.selector}` };
    }
    if (c.count !== undefined) {
      if (els.length !== c.count) return { correct: false, message: c.message };
    } else if (els.length === 0) {
      return { correct: false, message: c.message };
    }
    // text / attr / css は「どれか1つの要素が満たせばよい」
    const needsDetail = c.text !== undefined || c.textIncludes !== undefined || c.attr || c.css;
    if (needsDetail && els.length > 0) {
      const ok = els.some((el) => {
        if (c.text !== undefined && normalize(el.textContent) !== normalize(c.text)) return false;
        if (c.textIncludes !== undefined && !normalize(el.textContent).includes(normalize(c.textIncludes))) return false;
        if (c.attr) {
          for (const [k, v] of Object.entries(c.attr)) if (el.getAttribute(k) !== v) return false;
        }
        if (c.css) {
          const cs = win.getComputedStyle(el);
          for (const [k, v] of Object.entries(c.css)) if (cs.getPropertyValue(k).trim() !== v) return false;
        }
        return true;
      });
      if (!ok) return { correct: false, message: c.message };
    }
  }
  return { correct: true, message: '' };
}
