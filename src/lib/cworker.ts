// C 練習場の裏で動く作業者(Web Worker)。ページから届いたコードを picoc で実行して結果を返す。
// 別の作業者にしておくと、無限ループになってもページは固まらず、ページ側から作業者ごと止められる。
// picoc.gen.js は scripts/prepare-picoc.mjs が node_modules/picoc-js から作る(npm run dev / build の前に自動で走る)。
import { picoc } from './picoc.gen.js';
import { runCCode } from './crun-core.js';

self.onmessage = async (ev: MessageEvent) => {
  const d = ev.data || {};
  if (d.type !== 'run') return;
  try {
    postMessage({ type: 'result', id: d.id, ...(await runCCode(picoc, String(d.code))) });
  } catch (e) {
    postMessage({ type: 'result', id: d.id, ok: false, logs: [], error: String(e), exitCode: 1 });
  }
};
postMessage({ type: 'ready' });
