// 正誤判定。SQLの文面ではなく実行結果で比べる。
import type { Database } from 'sql.js';
import { createDb, listTables, runSql, type ResultSet } from './sqldb';

export interface JudgeTask {
  answer: string;
  ordered?: boolean;
  mutation?: boolean;
}

export interface Judgement {
  correct: boolean;
  message: string; // 不正解のとき、どこが違うかを1行で
}

function cellKey(v: unknown): string {
  if (v === null || v === undefined) return '\u0000NULL';
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : String(Math.round(v * 1e6) / 1e6);
  return String(v);
}

function rowKey(row: unknown[]): string {
  return row.map(cellKey).join('\u0001');
}

function compareResultSets(user: ResultSet | undefined, expect: ResultSet | undefined, ordered: boolean): Judgement {
  const u = user ?? { columns: [], values: [] };
  const e = expect ?? { columns: [], values: [] };
  if (u.columns.length !== e.columns.length) {
    return {
      correct: false,
      message:
        u.columns.length < e.columns.length
          ? `列が足りません(あなた: ${u.columns.length}列、期待: ${e.columns.length}列)。`
          : `列が多すぎます(あなた: ${u.columns.length}列、期待: ${e.columns.length}列)。`,
    };
  }
  if (u.values.length !== e.values.length) {
    return {
      correct: false,
      message: `行数が違います(あなた: ${u.values.length}行、期待: ${e.values.length}行)。絞り込みの条件を見直してください。`,
    };
  }
  let uRows = u.values.map(rowKey);
  let eRows = e.values.map(rowKey);
  if (!ordered) {
    uRows = [...uRows].sort();
    eRows = [...eRows].sort();
  }
  for (let i = 0; i < uRows.length; i++) {
    if (uRows[i] !== eRows[i]) {
      if (!ordered) {
        return { correct: false, message: '行数は合っていますが、値が違う行があります。取り出す列や条件を見直してください。' };
      }
      // 並び順だけが違うのかを確かめる
      const sortedSame = [...uRows].sort().join('\n') === [...eRows].sort().join('\n');
      return {
        correct: false,
        message: sortedSame
          ? `値は合っていますが、並び順が違います(${i + 1}行目から)。ORDER BY を見直してください。`
          : `${i + 1}行目の値が違います。取り出す列や条件を見直してください。`,
      };
    }
  }
  return { correct: true, message: '' };
}

function dumpTables(db: Database): Record<string, ResultSet> {
  const out: Record<string, ResultSet> = {};
  for (const t of listTables(db)) {
    const r = db.exec(`SELECT * FROM "${t}" ORDER BY rowid`);
    out[t] = r[0] ?? { columns: [], values: [] };
  }
  return out;
}

function compareDatabases(user: Database, expect: Database): Judgement {
  const u = dumpTables(user);
  const e = dumpTables(expect);
  for (const t of Object.keys(e)) {
    if (!u[t]) return { correct: false, message: `表「${t}」がなくなっています。` };
    if (u[t].values.length !== e[t].values.length) {
      return {
        correct: false,
        message: `表「${t}」の行数が違います(あなた: ${u[t].values.length}行、期待: ${e[t].values.length}行)。`,
      };
    }
    const ur = u[t].values.map(rowKey).sort();
    const er = e[t].values.map(rowKey).sort();
    for (let i = 0; i < ur.length; i++) {
      if (ur[i] !== er[i]) return { correct: false, message: `表「${t}」の中身が違います。変更する行や値を見直してください。` };
    }
  }
  for (const t of Object.keys(u)) {
    if (!e[t]) return { correct: false, message: `余分な表「${t}」があります。` };
  }
  return { correct: true, message: '' };
}

/**
 * 利用者のSQLと模範解答を、それぞれ初期状態のデータベースで実行して比べる。
 * 戻り値の userDb は利用者のSQLを実行した後の状態(画面表示に使う)。
 */
export async function judge(
  userSql: string,
  task: JudgeTask,
): Promise<{ judgement: Judgement; userDb: Database; userRun: ReturnType<typeof runSql> }> {
  const userDb = await createDb();
  const expectDb = await createDb();
  const userRun = runSql(userDb, userSql);
  const expectRun = runSql(expectDb, task.answer);
  if (!expectRun.ok) {
    expectDb.close();
    return { judgement: { correct: false, message: '模範解答の実行に失敗しました(コンテンツの不具合)。' }, userDb, userRun };
  }
  if (!userRun.ok) {
    expectDb.close();
    return { judgement: { correct: false, message: 'SQLにエラーがあります。' }, userDb, userRun };
  }
  let judgement: Judgement;
  if (task.mutation) {
    judgement = compareDatabases(userDb, expectDb);
  } else {
    const u = userRun.results.at(-1);
    const e = expectRun.results.at(-1);
    judgement = u ? compareResultSets(u, e, !!task.ordered) : { correct: false, message: '結果が何も返っていません。SELECT文を書いてください。' };
  }
  expectDb.close();
  return { judgement, userDb, userRun };
}
