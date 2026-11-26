// C 練習場の実行と判定(ページ側)。
// 実際の実行は cworker.ts(Web Worker)の中の picoc が行う。ここは作業者の用意、打ち切り、エラーの日本語化、判定。
import { replaceMain, translateCError } from './crun-core.js';
import type { CTest } from './content';

export interface COutcome {
  ok: boolean;
  logs: string[]; // printf の出力(1行ずつ)
  error?: string; // picoc のエラー(例: "'y' is undefined")
  line?: number;
  col?: number;
  hint?: string; // エラーの日本語補足
  exitCode: number; // main の return や exit の値
  timeout?: boolean;
}

let worker: Worker | null = null;
let ready: Promise<void> | null = null;
let seq = 0;

/** C を用意する。何度呼んでもよい */
export function prepareC(): Promise<void> {
  if (ready) return ready;
  const w = new Worker(new URL('./cworker.ts', import.meta.url), { type: 'module' });
  worker = w;
  ready = new Promise<void>((resolve, reject) => {
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === 'ready') { w.removeEventListener('message', onMessage); resolve(); }
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', (e) => reject(new Error(e.message)), { once: true });
  });
  ready.catch(() => { worker?.terminate(); worker = null; ready = null; });
  return ready;
}

/** コードを実行する。timeoutMs を超えたら作業者ごと止める(次の実行の前に作り直す) */
export async function runCode(code: string, timeoutMs = 3000): Promise<COutcome> {
  await prepareC();
  const w = worker!;
  const id = ++seq;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMessage);
      w.terminate();
      if (worker === w) { worker = null; ready = null; }
      resolve({ ok: false, logs: [], exitCode: 1, timeout: true, error: 'タイムアウト', hint: `${timeoutMs / 1000}秒たっても終わりませんでした。for や while の条件がずっと成り立ったまま(無限ループ)になっていないか確認してください。` });
    }, timeoutMs);
    const onMessage = (ev: MessageEvent) => {
      const d = ev.data || {};
      if (d.type !== 'result' || d.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve({ ok: d.ok, logs: d.logs ?? [], error: d.error, line: d.line, col: d.col, exitCode: d.exitCode ?? 0, hint: d.error ? translateCError(d.error) : undefined });
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ type: 'run', id, code });
  });
}

export interface CJudgement {
  correct: boolean;
  message: string;
}

function compareLines(got: string[], expected: string[], where: string): string | null {
  const g = got.map((l) => l.trimEnd());
  const e = expected.map((l) => l.trimEnd());
  if (g.length !== e.length) return `${where}出力の行数が違います(あなた: ${g.length}行、期待: ${e.length}行)。printf の \\n の数や、繰り返しの回数を確認してください。`;
  for (let i = 0; i < e.length; i++) {
    if (g[i] !== e[i]) return `${where}出力の${i + 1}行目が違います(あなた: 「${g[i]}」、期待: 「${e[i]}」)。`;
  }
  return null;
}

/**
 * 判定。expectOutput は利用者のコードそのままの出力と比べる。
 * tests は、利用者の main を取り除いて確かめ用の main に差し替えたコードを1つずつ実行して比べる(関数の課題)
 */
export async function judgeC(code: string, out: COutcome, expectOutput?: string[], tests?: CTest[]): Promise<CJudgement> {
  if (!out.ok) return { correct: false, message: out.timeout ? out.hint! : 'エラーになりました。右の出力を確認してください。' };
  if (expectOutput) {
    const bad = compareLines(out.logs, expectOutput, '');
    if (bad) return { correct: false, message: bad };
  }
  for (const t of tests ?? []) {
    const r = await runCode(replaceMain(code, t.main));
    const where = `確かめ用の main(${t.label})で、`;
    if (!r.ok) return { correct: false, message: `${where}${r.timeout ? '時間内に終わりませんでした' : 'エラーになりました: ' + (r.hint ?? '') + `(${r.error})`}` };
    const bad = compareLines(r.logs, t.expectOutput, where);
    if (bad) return { correct: false, message: bad };
  }
  return { correct: true, message: '' };
}
