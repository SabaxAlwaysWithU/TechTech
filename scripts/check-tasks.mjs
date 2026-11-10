// 全レッスンの課題の模範解答を実際に実行し、エラーなく結果が出ることを確かめる。
// 使い方: node scripts/check-tasks.mjs
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import initSqlJs from 'sql.js';

const SQL = await initSqlJs();
const root = join(import.meta.dirname, '..', 'content');
let failures = 0;

for (const field of readdirSync(root)) {
  if (!statSync(join(root, field)).isDirectory()) continue;
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
    if (existsSync(tasksPath) && !existsSync(schemaPath)) {
      // SQL以外(HTMLなど): 構造だけ確かめる。模範解答の検証はブラウザのテストで行う
      const tasks = JSON.parse(readFileSync(tasksPath, 'utf8'));
      for (const t of tasks) {
        if (!Array.isArray(t.checks) || t.checks.length === 0) { console.log(`  !! 課題 ${t.id}: checks がありません`); failures++; }
        if (!t.answer) { console.log(`  !! 課題 ${t.id}: answer(模範解答)がありません`); failures++; }
        if (!t.hints || t.hints.length !== 2) { console.log(`  !! 課題 ${t.id}: ヒントは2つ必要です`); failures++; }
        console.log(`  課題 ${t.id}: 判定条件 ${t.checks?.length ?? 0}件`);
      }
    }
    if (existsSync(tasksPath) && existsSync(schemaPath)) {
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
