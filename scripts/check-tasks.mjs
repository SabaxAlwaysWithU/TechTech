// 全レッスンの課題の模範解答を実際に実行し、エラーなく結果が出ることを確かめる。
// 使い方: node scripts/check-tasks.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const root = join(import.meta.dirname, '..', 'content');
let failures = 0;

for (const field of readdirSync(root)) {
  if (!statSync(join(root, field)).isDirectory()) continue;
  const fieldJson = join(root, field, 'field.json');
  const practice = existsSync(fieldJson) ? JSON.parse(readFileSync(fieldJson, 'utf8')).practice : 'sql';
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
    if (existsSync(tasksPath) && practice === 'js') {
      // JavaScript: 模範解答を vm で実行し、期待する出力・戻り値と一致するか確かめる
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        if (!t.expectOutput && !t.calls) { console.log(`  !! 課題 ${t.id}: expectOutput か calls が必要です`); failures++; continue; }
        const logs = [];
        const fmt = (v) => (typeof v === 'string' ? v : v === undefined ? 'undefined' : typeof v === 'function' ? '[関数 ' + v.name + ']' : JSON.stringify(v));
        const fakeConsole = { log: (...a) => logs.push(a.map(fmt).join(' ')), error: (...a) => logs.push('エラー: ' + a.map(fmt).join(' ')) };
        const calls = (t.calls ?? []).map((c) => c.call);
        const tail = '\n;return [' + calls.map((c) => `(function(){try{return {v:(${c})}}catch(e){return {e:String(e)}}})()`).join(',') + '];';
        try {
          const fn = vm.runInNewContext(`(function(console){${t.answer}${tail}})`, {}, { timeout: 2000 });
          const results = fn(fakeConsole);
          let ok = true;
          if (t.expectOutput) {
            const exp = t.expectOutput.map((s) => s.trim());
            const got = logs.map((s) => s.trim());
            if (JSON.stringify(exp) !== JSON.stringify(got)) { ok = false; console.log(`  !! 課題 ${t.id}: 出力が違います\n     期待 ${JSON.stringify(exp)}\n     実際 ${JSON.stringify(got)}`); }
          }
          (t.calls ?? []).forEach((c, i) => {
            const r = results[i];
            if (!r || 'e' in r || JSON.stringify(r.v) !== JSON.stringify(c.expect)) { ok = false; console.log(`  !! 課題 ${t.id}: ${c.call} → ${JSON.stringify(r)}(期待 ${JSON.stringify(c.expect)})`); }
          });
          if (ok) console.log(`  課題 ${t.id}: OK(出力${logs.length}行、呼び出し${calls.length}件)`); else failures++;
        } catch (e) {
          console.log(`  !! 課題 ${t.id}: ${e.message}`);
          failures++;
        }
      }
    }
    if (existsSync(tasksPath) && practice === 'shell') {
      // シェル(OS): 構造だけ確かめる。模範解答の検証はブラウザのテストで行う
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!Array.isArray(t.shellChecks) || t.shellChecks.length === 0) { console.log(`  !! 課題 ${t.id}: shellChecks がありません`); failures++; }
        if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); failures++; }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        console.log(`  課題 ${t.id}: 判定条件 ${t.shellChecks?.length ?? 0}件`);
      }
    }
    if (existsSync(tasksPath) && practice === 'html') {
      // HTML: 構造だけ確かめる。模範解答の検証はブラウザのテストで行う
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
