// Python練習場の裏で動く作業者(Web Worker)。Pyodide を読み込み、ページから届いたコードを実行して結果を返す。
// 別の作業者にしておくと、無限ループになってもページは固まらず、ページ側から作業者ごと止められる。
import { runPython } from './pyrun-core.js';

let ready: Promise<any> | null = null;

self.onmessage = async (ev: MessageEvent) => {
  const d = ev.data || {};
  if (d.type === 'init') {
    // Pyodide はビルド時に public/pyodide/ へコピーしたものを使う(scripts/copy-pyodide.mjs)
    ready = import(/* @vite-ignore */ `${d.indexURL}pyodide.mjs`).then((m) => m.loadPyodide({ indexURL: d.indexURL }));
    try {
      await ready;
      postMessage({ type: 'ready' });
    } catch (e) {
      postMessage({ type: 'failed', error: String(e) });
    }
  } else if (d.type === 'run') {
    try {
      const py = await ready;
      postMessage({ type: 'result', id: d.id, ...runPython(py, String(d.code), d.calls || [], d.files || {}) });
    } catch (e) {
      postMessage({ type: 'result', id: d.id, ok: false, logs: [], error: String(e) });
    }
  }
};
