// 全レッスンの課題の模範解答を実際に実行し、エラーなく結果が出ることを確かめる。
// 使い方: node scripts/check-tasks.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import initSqlJs from 'sql.js';
import { runUserCode } from '../src/lib/jsrun-core.js';
import { runPython } from '../src/lib/pyrun-core.js';
import { loadPyodide } from 'pyodide';

/** 練習場と同じ jsrun-core.js の関数を、vm の別環境で動かす(await、setTimeout、練習用の fetch が使える) */
function runJsInVm(code, calls, storage) {
  const run = vm.runInNewContext(`(${runUserCode.toString()})`, { setTimeout, clearTimeout });
  const timeout = new Promise((resolve) => setTimeout(() => resolve({ ok: false, logs: [], error: '5秒たっても終わりませんでした' }), 5000).unref());
  return Promise.race([run(code, calls, { storage: { ...storage } }), timeout]);
}

/** 練習場と同じ pyrun-core.js を、Node の Pyodide で動かす(初めて使うときに読み込む) */
let pyodide = null;
async function runPy(code, calls, files) {
  pyodide ??= await loadPyodide();
  return runPython(pyodide, code, calls, files);
}

/** Python の判定と同じく、辞書のキーの順番は問わずに比べる(pyrunner.ts の samePy と同じ) */
function samePy(a, b) {
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => samePy(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every((k) => k in b && samePy(a[k], b[k]));
  }
  return a === b;
}

const SQL = await initSqlJs();
const root = join(import.meta.dirname, '..', 'content');
let failures = 0;

for (const field of readdirSync(root)) {
  if (!statSync(join(root, field)).isDirectory()) continue;
  const fieldJson = join(root, field, 'field.json');
  const fieldInfo = existsSync(fieldJson) ? JSON.parse(readFileSync(fieldJson, 'utf8')) : {};
  const practice = fieldInfo.practice ?? 'sql';
  // renamed(古いフォルダ名 → 新しい名前)の行き先が、今あるレッスンか
  for (const [from, to] of Object.entries(fieldInfo.renamed ?? {})) {
    if (!existsSync(join(root, field, to, 'article.md'))) { console.log(`!! ${field}/field.json の renamed: ${from} → ${to} の行き先がありません`); failures++; }
    if (existsSync(join(root, field, from))) { console.log(`!! ${field}/field.json の renamed: ${from} はまだあるレッスンです`); failures++; }
  }
  const schemaPath = join(root, field, 'schema.sql');
  const schema = existsSync(schemaPath) ? readFileSync(schemaPath, 'utf8') : '';
  for (const lesson of readdirSync(join(root, field)).filter((d) => statSync(join(root, field, d)).isDirectory())) {
    const dir = join(root, field, lesson);
    const tasksPath = join(dir, 'tasks.json');
    const quizPath = join(dir, 'quiz.json');
    const articlePath = join(dir, 'article.md');
    console.log(`\n== ${field}/${lesson}`);
    if (!existsSync(articlePath)) { console.log('  !! article.md がありません'); failures++; }
    else {
      const body = readFileSync(articlePath, 'utf8').replace(/^---[\s\S]*?---/, '');
      const chars = body.replace(/```[\s\S]*?```/g, '').replace(/\s/g, '').length;
      console.log(`  記事: 約${chars}字(コード除く)`);
    }
    if (existsSync(quizPath)) {
      const quiz = JSON.parse(readFileSync(quizPath, 'utf8'));
      for (const [i, q] of quiz.entries()) {
        if (q.options.length !== 4) { console.log(`  !! クイズ${i + 1}: 選択肢が4つではありません`); failures++; }
        if (new Set(q.options).size !== 4) { console.log(`  !! クイズ${i + 1}: 選択肢に重複があります`); failures++; }
      }
      console.log(`  クイズ: ${quiz.length}問`);
    }
    if (existsSync(tasksPath) && (practice === 'js' || practice === 'python')) {
      // JavaScript / Python: 模範解答を実行し、期待する出力・戻り値と一致するか確かめる
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        if (t.page && !t.dom) { console.log(`  !! 課題 ${t.id}: page は画面の課題("dom": true)でだけ使えます`); failures++; }
        if (t.dom) {
          // JavaScript の画面の課題: Node には画面がないので、形だけ確かめる(正解になるかは browser-check.mjs)
          if (!Array.isArray(t.checks) || t.checks.length === 0) { console.log(`  !! 課題 ${t.id}: 画面の課題には checks が必要です`); failures++; }
          if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); failures++; }
          for (const a of t.actions ?? []) if (!a.click && !a.fill) { console.log(`  !! 課題 ${t.id}: actions は click か fill です: ${JSON.stringify(a)}`); failures++; }
          console.log(`  課題 ${t.id}: 画面の判定 ${t.checks?.length ?? 0}件、操作 ${t.actions?.length ?? 0}件(ブラウザで確かめる)`);
          continue;
        }
        if (!t.expectOutput && !t.calls && !t.expectStorage) { console.log(`  !! 課題 ${t.id}: expectOutput か calls か expectStorage が必要です`); failures++; continue; }
        const calls = (t.calls ?? []).map((c) => c.call);
        try {
          const out = practice === 'python' ? await runPy(t.answer, calls, t.files) : await runJsInVm(t.answer, calls, t.storage);
          if (!out.ok) throw new Error(out.error);
          const logs = out.logs;
          const results = out.results;
          let ok = true;
          if (t.expectOutput) {
            const exp = t.expectOutput.map((s) => s.trim());
            const got = logs.map((s) => s.trim());
            if (JSON.stringify(exp) !== JSON.stringify(got)) { ok = false; console.log(`  !! 課題 ${t.id}: 出力が違います\n     期待 ${JSON.stringify(exp)}\n     実際 ${JSON.stringify(got)}`); }
          }
          (t.calls ?? []).forEach((c, i) => {
            const r = results[i];
            const same = practice === 'python' ? r && 'v' in r && samePy(r.v, c.expect) : r && !('e' in r) && JSON.stringify(r.v) === JSON.stringify(c.expect);
            if (!same) { ok = false; console.log(`  !! 課題 ${t.id}: ${c.call} → ${JSON.stringify(r)}(期待 ${JSON.stringify(c.expect)})`); }
          });
          for (const [k, v] of Object.entries(t.expectStorage ?? {})) {
            const got = out.storage?.[k] ?? null;
            if (got !== v) { ok = false; console.log(`  !! 課題 ${t.id}: localStorage の ${k} → ${JSON.stringify(got)}(期待 ${JSON.stringify(v)})`); }
          }
          if (ok) console.log(`  課題 ${t.id}: OK(出力${logs.length}行、呼び出し${calls.length}件${t.expectStorage ? '、保存' + Object.keys(t.expectStorage).length + '件' : ''})`); else failures++;
        } catch (e) {
          console.log(`  !! 課題 ${t.id}: ${e.message}`);
          failures++;
        }
      }
    }
    if (existsSync(tasksPath) && practice === 'stack') {
      // 構成(Webアプリの道具): picks の id がカタログに存在するか、全層に正解があるかを確かめる
      const catalog = JSON.parse(readFileSync(join(root, field, 'catalog.json'), 'utf8'));
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        let ok = true;
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); ok = false; }
        for (const layer of catalog.layers) {
          const accepted = t.picks?.[layer.id];
          if (!accepted || !accepted.length) { console.log(`  !! 課題 ${t.id}: 層 ${layer.id} の正解(picks)がありません`); ok = false; continue; }
          for (const id of accepted) if (!layer.options.some((o) => o.id === id)) { console.log(`  !! 課題 ${t.id}: 層 ${layer.id} に選択肢 ${id} はありません`); ok = false; }
          for (const id of Object.keys(t.rejects?.[layer.id] ?? {})) if (!layer.options.some((o) => o.id === id)) { console.log(`  !! 課題 ${t.id}: rejects の ${layer.id}/${id} はカタログにありません`); ok = false; }
        }
        for (const layerId of Object.keys(t.picks ?? {})) if (!catalog.layers.some((l) => l.id === layerId)) { console.log(`  !! 課題 ${t.id}: 層 ${layerId} はカタログにありません`); ok = false; }
        if (ok) console.log(`  課題 ${t.id}: OK(${catalog.layers.map((l) => `${l.id}=${t.picks[l.id].join('|')}`).join(', ')})`); else failures++;
      }
    }
    if (existsSync(tasksPath) && practice === 'net') {
      // ネットワーク: 構造だけ確かめる。模範解答の検証は browser-check.mjs で行う
      const PARTS = ['cable', 'ipconfig', 'router', 'wan', 'dns', 'server', 'port', 'cert', 'app', 'db'];
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        let ok = true;
        if (!Array.isArray(t.netChecks) || t.netChecks.length === 0) { console.log(`  !! 課題 ${t.id}: netChecks がありません`); ok = false; }
        if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); ok = false; }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); ok = false; }
        for (const f of t.faults ?? []) if (!PARTS.includes(f)) { console.log(`  !! 課題 ${t.id}: faults の ${f} は部品ではありません`); ok = false; }
        for (const c of t.netChecks ?? []) for (const k of Object.keys(c.parts ?? {})) if (!PARTS.includes(k)) { console.log(`  !! 課題 ${t.id}: parts の ${k} は部品ではありません`); ok = false; }
        if (ok) console.log(`  課題 ${t.id}: 判定条件 ${t.netChecks.length}件${t.faults?.length ? '、故障 ' + t.faults.join('/') : ''}`); else failures++;
      }
    }
    if (existsSync(tasksPath) && practice === 'shell') {
      // シェル(OS): 構造だけ確かめる。模範解答の検証は browser-check.mjs で行う
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!Array.isArray(t.shellChecks) || t.shellChecks.length === 0) { console.log(`  !! 課題 ${t.id}: shellChecks がありません`); failures++; }
        if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); failures++; }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        console.log(`  課題 ${t.id}: 判定条件 ${t.shellChecks?.length ?? 0}件`);
      }
    }
    if (existsSync(tasksPath) && practice === 'html') {
      // HTML: 構造だけ確かめる。模範解答の検証は browser-check.mjs で行う
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!Array.isArray(t.checks) || t.checks.length === 0) { console.log(`  !! 課題 ${t.id}: checks がありません`); failures++; }
        if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); failures++; }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        console.log(`  課題 ${t.id}: 判定条件 ${t.checks?.length ?? 0}件`);
      }
    }
    if (existsSync(tasksPath) && practice === 'sql') {
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        const db = new SQL.Database();
        db.run(schema);
        try {
          const res = db.exec(t.answer);
          if (t.mutation) {
            console.log(`  課題 ${t.id}: OK(変更 ${db.getRowsModified()}行)`);
          } else {
            const last = res.at(-1);
            if (!last) throw new Error('結果が返りませんでした');
            console.log(`  課題 ${t.id}: OK(${last.columns.length}列 × ${last.values.length}行) ${JSON.stringify(last.values.slice(0, 2))}`);
          }
        } catch (e) {
          console.log(`  !! 課題 ${t.id}: ${e.message}`);
          failures++;
        } finally {
          db.close();
        }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
      }
    }
  }
}
console.log(failures ? `\n${failures}件の問題があります` : '\nすべてOK');
process.exit(failures ? 1 : 0);
