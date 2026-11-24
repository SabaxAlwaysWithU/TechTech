// 本物のブラウザ(ヘッドレスの Chrome / Edge)で、サイトを確かめる。
//   1. 全課題の模範解答(tasks.json の answer)を練習場に入れて実行し、「正解です」になるか
//   2. HTML、JavaScript、Python、C の課題は、初期状態(starter)のままでは正解にならないか
//   3. 全ページをスマホ幅(375px)で開き、横にはみ出していないか
//
// 使い方: npm run build のあと node scripts/browser-check.mjs
//   BASE    ビルドと同じ base(例: /TechTech)。なければ /
//   CHROME  ブラウザの場所。なければ Edge / Chrome / Chromium を探す
//   ONLY    この文字を含む課題・ページだけ確かめる(例: ONLY=js/08)
//   WORKERS 同時に開くタブの数(既定 4)
//
// ネットワークの模範解答には、コマンドのほかに括弧書きの手順を書ける(1行に1つ):
//   (図でケーブルを壊す) / (… なので DNS を直す)  → 部品の一覧で、その名前の部品を押す
//   (設定画面: 手動 ip=192.168.1.10 mask=255.255.255.0 gateway=192.168.1.1 dns=8.8.8.8) → 設定画面に入れて適用
// 読み取れない括弧書きがあれば失敗にする。
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, delimiter } from 'node:path';
import { tmpdir } from 'node:os';
import { parseAppAnswer } from '../src/lib/sqlapp-core.js';
import { parseBitsAnswer } from '../src/lib/bits-core.js';

const root = join(import.meta.dirname, '..');
const dist = join(root, 'dist');
const content = join(root, 'content');
const base = (process.env.BASE || '/').replace(/\/$/, '');
const only = process.env.ONLY || '';
const workers = Number(process.env.WORKERS) || 4;

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/ がありません。先に npm run build してください(BASE はビルドと同じにします)。');
  process.exit(1);
}

// ---- dist を配る小さなサーバー ----
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.zip': 'application/zip', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (base) {
    if (path !== base && !path.startsWith(base + '/')) { res.writeHead(404).end(); return; }
    path = path.slice(base.length) || '/';
  }
  let file = join(dist, path);
  if (!file.startsWith(dist)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}${base}`;

// ---- ブラウザを起動して DevTools プロトコルでつなぐ ----
function findBrowser() {
  if (process.env.CHROME) return process.env.CHROME;
  const fixed = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ];
  for (const f of fixed) if (existsSync(f)) return f;
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
      if (existsSync(join(dir, name))) return join(dir, name);
    }
  }
  throw new Error('Chrome / Edge が見つかりません。環境変数 CHROME で場所を指定してください。');
}
const profile = mkdtempSync(join(tmpdir(), 'techtech-check-'));
const args = [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${profile}`,
  '--remote-debugging-port=0', '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  '--disable-backgrounding-occluded-windows', 'about:blank',
];
if (process.platform === 'linux') args.unshift('--no-sandbox');
const browser = spawn(findBrowser(), args, { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise((resolve, reject) => {
  let buf = '';
  const t = setTimeout(() => reject(new Error('ブラウザが起動しませんでした')), 20000);
  browser.stderr.on('data', (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); resolve(m[1]); }
  });
  browser.on('exit', (code) => reject(new Error(`ブラウザが終了しました(${code})\n${buf}`)));
});
const ws = new WebSocket(wsUrl);
await new Promise((r, j) => { ws.addEventListener('open', r, { once: true }); ws.addEventListener('error', j, { once: true }); });
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (!m.id || !pending.has(m.id)) return;
  const p = pending.get(m.id);
  pending.delete(m.id);
  if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
});
// タブが落ちると返事が来ないまま待ち続けてしまうので、1回の呼び出しは最大45秒で打ち切る
const cdp = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++seq;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error(`ブラウザから45秒たっても返事がありません(${method})`)); }, 45000);
  pending.set(id, { resolve: (v) => { clearTimeout(timer); resolve(v); }, reject: (e) => { clearTimeout(timer); reject(e); } });
  ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, timeout, what) {
  const end = Date.now() + timeout;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error(`${what}を待ちましたが、${timeout / 1000}秒たっても来ませんでした`);
    await sleep(50);
  }
}

async function openTab() {
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p) => cdp(m, p, sessionId);
  await send('Page.enable');
  // 毎回まっさらな状態で開く(進捗や起動画面の記録を残さない)
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "try { localStorage.clear(); localStorage.setItem('intro', 'off'); sessionStorage.setItem('intro:seen', '1'); } catch (e) {}" });
  await send('Emulation.setFocusEmulationEnabled', { enabled: true });
  let width = 0;
  const tab = {
    async viewport(w) {
      if (w === width) return;
      width = w;
      await send('Emulation.setDeviceMetricsOverride', { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 600 });
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
      return r.result.value;
    },
    async goto(url) {
      await tab.eval('window.__old = true').catch(() => {});
      await send('Page.navigate', { url });
      await waitFor(() => tab.eval('!window.__old && document.readyState === "complete"').catch(() => false), 15000, 'ページの読み込み');
    },
    close: () => cdp('Target.closeTarget', { targetId }),
  };
  return tab;
}

// ---- 課題を練習場で動かす ----
const js = JSON.stringify;
const verdict = (tab) => tab.eval(`(() => { const v = document.getElementById('verdict'); return v && !v.hidden ? v.innerText.trim() : ''; })()`);
const setValue = (id, value) => `(() => { const el = document.getElementById(${js(id)}); el.value = ${js(value)}; el.dispatchEvent(new Event('input', { bubbles: true })); })()`;

const typeCommand = (tab, line) => tab.eval(`(() => { const i = document.getElementById('cmd'); i.value = ${js(line)}; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); })()`);

// 部品の一覧から、文中に名前が出てくる部品を押す。「DNSサーバー」は「DNS」、「ケーブル / Wi-Fi」は「ケーブル」でも当たる
const clickPart = (tab, text) => tab.eval(`(() => {
  const text = ${js(text)};
  let best = null, bestLen = 0;
  for (const btn of document.querySelectorAll('#part-list button')) {
    const label = btn.querySelector('.part-name')?.textContent.trim() ?? '';
    const names = [label, label.split(' / ')[0], label.replace(/サーバー$/, '')].filter((n) => n.length >= 2);
    for (const n of names) if (text.includes(n) && n.length > bestLen) { best = btn; bestLen = n.length; }
  }
  if (!best) return null;
  best.click();
  return best.querySelector('.part-name').textContent.trim();
})()`);

const applyConfig = (tab, text) => tab.eval(`(() => {
  const text = ${js(text)};
  const manual = !text.includes('自動');
  const radio = document.getElementById(manual ? 'cfg-manual' : 'cfg-auto');
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  for (const k of ['ip', 'mask', 'gateway', 'dns']) {
    const m = text.match(new RegExp(k + '=([^\\\\s)）]+)'));
    if (m) document.getElementById('cfg-' + k).value = m[1];
  }
  document.getElementById('cfg').requestSubmit();
  return true;
})()`);

async function runTerminalAnswer(tab, answer, allowSteps) {
  for (const raw of answer.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (/^[(（].*[)）]$/.test(line)) {
      if (!allowSteps) throw new Error(`括弧書きの手順はこの練習場では使えません: ${line}`);
      if (line.includes('設定画面')) await applyConfig(tab, line);
      else if (/壊す|直す/.test(line)) { if (!(await clickPart(tab, line))) throw new Error(`手順の部品が見つかりません: ${line}`); }
      else throw new Error(`手順を読み取れません: ${line}`);
    } else {
      await typeCommand(tab, line);
    }
  }
  // 1行ごとに判定が変わるので、最後に「正解」になるのを少し待つ
  try { return await waitFor(async () => { const v = await verdict(tab); return v.startsWith('正解') && v; }, 3000, '判定'); } catch { return await verdict(tab); }
}

// 1つの課題を動かして判定の文を返す。code を渡すと answer の代わりにそれを使う(starter の確認用)
async function runTask(tab, job) {
  const { practice, task, code } = job;
  await tab.goto(job.url);
  switch (practice) {
    case 'sql':
      if (task.app) {
        // アプリの画面(ログインや検索)に、answer の「ラベル: 値」を入れて送信する
        await waitFor(() => tab.eval(`!document.getElementById('app-run').disabled`), 15000, 'データベースの準備');
        for (const [id, v] of Object.entries(parseAppAnswer(task.app, code))) await tab.eval(setValue('app-' + id, v));
        await tab.eval(`document.getElementById('app-form').requestSubmit()`);
        break;
      }
      await waitFor(() => tab.eval(`!document.getElementById('run').disabled`), 15000, 'データベースの準備');
      await tab.eval(setValue('sql-input', code));
      await tab.eval(`document.getElementById('run').click()`);
      break;
    case 'html':
      await tab.eval(setValue('code-input', code));
      await tab.eval(`document.getElementById('check').click()`);
      break;
    case 'js':
      await tab.eval(setValue('code-input', code));
      await tab.eval(`document.getElementById('run').click()`);
      break;
    case 'python':
      // Pyodide の読み込みが終わると「実行」が押せるようになる
      await waitFor(() => tab.eval(`!document.getElementById('run').disabled`), 30000, 'Python の準備');
      await tab.eval(setValue('code-input', code));
      await tab.eval(`document.getElementById('run').click()`);
      break;
    case 'bits':
      // 模範解答の手順: 0 と 1 の並びにする(違うビットを押す)、または「操作: +1」のボタンを押す
      for (const step of parseBitsAnswer(code)) {
        if (step.set !== undefined) {
          await tab.eval(`(() => { const want = ${js(step.set)}; const n = document.querySelectorAll('#bits .bit').length; const w = want.padStart(n, '0').slice(-n); for (let i = 0; i < n; i++) { const b = document.getElementById('bit-' + i); if (b.querySelector('.v').textContent !== w[i]) b.click(); } })()`);
        } else if (step.op) {
          await tab.eval(`document.querySelector('#ops [data-op="${step.op}"]').click()`);
        } else {
          throw new Error(`模範解答の手順を読み取れません: ${step.raw}`);
        }
      }
      return waitFor(async () => { const v = await verdict(tab); return v.startsWith('正解') && v; }, 3000, '判定').catch(() => verdict(tab));
    case 'c':
      await waitFor(() => tab.eval(`!document.getElementById('run').disabled`), 15000, 'C の準備');
      await tab.eval(setValue('code-input', code));
      await tab.eval(`document.getElementById('run').click()`);
      break;
    case 'stack':
      for (const [layer, ids] of Object.entries(task.picks)) {
        await tab.eval(`(() => { const s = document.getElementById(${js('sel-' + layer)}); s.value = ${js(ids[0])}; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
      }
      await tab.eval(`document.getElementById('check').click()`);
      break;
    case 'shell':
      return runTerminalAnswer(tab, code, false);
    case 'net':
      return runTerminalAnswer(tab, code, true);
    default:
      throw new Error(`知らない練習場の種類です: ${practice}`);
  }
  return waitFor(() => verdict(tab), 10000, '判定');
}

// ---- 確かめることの一覧 ----
const jobs = [];
for (const field of readdirSync(content).sort()) {
  const fieldJson = join(content, field, 'field.json');
  if (!existsSync(fieldJson)) continue;
  const practice = JSON.parse(readFileSync(fieldJson, 'utf8')).practice;
  for (const lesson of readdirSync(join(content, field)).sort()) {
    const tasksPath = join(content, field, lesson, 'tasks.json');
    if (!existsSync(tasksPath)) continue;
    JSON.parse(readFileSync(tasksPath, 'utf8')).forEach((task, i) => {
      const name = `${field}/${lesson} 課題${i + 1}(${task.id})`;
      const url = `${origin}/${field}/${lesson}/practice/?task=${i + 1}`;
      jobs.push({ kind: 'answer', name, url, practice, task, code: task.answer ?? '' });
      if (['html', 'js', 'python', 'c'].includes(practice) && task.starter?.trim()) {
        jobs.push({ kind: 'starter', name: `${name} の初期状態`, url, practice, task, code: task.starter });
      }
    });
  }
}
function pages(dir, rel = '') {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...pages(join(dir, e.name), `${rel}${e.name}/`));
    else if (e.name === 'index.html') out.push(rel);
  }
  return out;
}
for (const rel of pages(dist).sort()) jobs.push({ kind: 'mobile', name: `/${rel}`, url: `${origin}/${rel}` });
const selected = jobs.filter((j) => !only || j.name.includes(only));

// ---- 実行 ----
async function check(tab, job) {
  if (job.kind === 'mobile') {
    await tab.viewport(375);
    await tab.goto(job.url);
    await sleep(150);
    const r = await tab.eval(`(() => {
      const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth;
      if (sw <= cw + 1) return null;
      const wide = [...document.body.querySelectorAll('*')].filter((el) => el.getBoundingClientRect().right > cw + 1 && (!el.parentElement || el.parentElement.getBoundingClientRect().right <= cw + 1));
      return { sw, cw, wide: wide.slice(0, 3).map((el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/)[0] : '') + ' 「' + (el.innerText || '').trim().slice(0, 30) + '」') };
    })()`);
    return r ? `スマホ幅で横にはみ出しています(ページ幅 ${r.sw}px > 画面 ${r.cw}px): ${r.wide.join(' / ')}` : null;
  }
  await tab.viewport(1280);
  const v = await runTask(tab, job);
  if (job.kind === 'answer') return v.startsWith('正解') ? null : `模範解答で正解になりません: ${v || '(判定が出ません)'}`;
  return v.startsWith('正解') ? '初期状態のままで正解になってしまいます' : null;
}

const started = Date.now();
const failures = [];
let next = 0, done = 0;
const tabs = await Promise.all(Array.from({ length: Math.min(workers, selected.length) }, openTab));
// 1つの確認は最大2分。固まったり、エラーで確かめられなかったりしたら、タブを作り直して1回だけやり直す
const limit = (p, ms) => Promise.race([p, new Promise((_, j) => setTimeout(() => j(new Error(`${ms / 1000}秒たっても終わりませんでした`)), ms))]);
await Promise.all(tabs.map(async (firstTab) => {
  let tab = firstTab;
  while (next < selected.length) {
    const job = selected[next++];
    let problem;
    for (let attempt = 1; ; attempt++) {
      try { problem = await limit(check(tab, job), 120000); break; } catch (e) {
        try { await limit(tab.close(), 10000); } catch {}
        tab = await openTab();
        if (attempt >= 2) { problem = `確かめられませんでした: ${e.message}`; break; }
        console.log(`  … ${job.name}: ${e.message}。タブを作り直して、もう一度試します`);
      }
    }
    done++;
    if (problem) { failures.push({ job, problem }); console.log(`✗ ${job.name}\n    ${problem}`); }
    if (done % 50 === 0) console.log(`  … ${done}/${selected.length}`);
  }
}));

const count = (k) => selected.filter((j) => j.kind === k).length;
console.log(`\n課題 ${count('answer')}件、初期状態 ${count('starter')}件、ページ ${count('mobile')}件を確かめました(${Math.round((Date.now() - started) / 1000)}秒)。`);
console.log(failures.length ? `${failures.length}件の問題があります` : 'すべてOK');
ws.close();
browser.kill();
server.close();
try { rmSync(profile, { recursive: true, force: true }); } catch {}
process.exit(failures.length ? 1 : 0);
