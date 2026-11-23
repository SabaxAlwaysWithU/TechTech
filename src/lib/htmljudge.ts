// HTML練習場の正誤判定。プレビューの中にできあがったページ(DOM)を調べる。
// 中身は dom-core.js の judgeDom(JavaScript練習場の画面の判定と共通)。
import type { HtmlCheck } from './content';
import { judgeDom } from './dom-core.js';

export interface HtmlJudgement {
  correct: boolean;
  message: string; // 最初に満たさなかった条件の説明
}

export function judgeHtml(doc: Document, win: Window, checks: HtmlCheck[]): HtmlJudgement {
  return judgeDom(doc, win, checks);
}
