// 練習場のデータベース。ブラウザ内で sql.js(SQLite)を動かす。
// 外部には何も送らない。ページを開くたびに初期状態から作り直す。
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import schemaSql from '../../content/sql/schema.sql?raw';

let sqlJs: SqlJsStatic | null = null;

export interface ResultSet {
  columns: string[];
  values: unknown[][];
}

export interface RunResult {
  ok: true;
  results: ResultSet[];
  rowsModified: number;
}
export interface RunError {
  ok: false;
  message: string; // 元のエラー
  hint: string; // 日本語の補足
}

export async function initSql(): Promise<SqlJsStatic> {
  if (sqlJs) return sqlJs;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  // ブラウザでは sql.js が sql-wasm-browser.wasm を要求する(sql-wasm.wasm ではない)。
  // public/ にはそのファイルを node_modules/sql.js/dist/ からコピーして置く。
  sqlJs = await initSqlJs({ locateFile: (f: string) => `${base}/${f}` });
  return sqlJs;
}

/** 初期状態のデータベースを新しく作る */
export async function createDb(): Promise<Database> {
  const SQL = await initSql();
  const db = new SQL.Database();
  db.run(schemaSql);
  return db;
}

export function listTables(db: Database): string[] {
  const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid");
  return r.length ? r[0].values.map((v) => String(v[0])) : [];
}

export function tableColumns(db: Database, table: string): { name: string; type: string; pk: boolean }[] {
  const r = db.exec(`PRAGMA table_info("${table.replace(/"/g, '""')}")`);
  if (!r.length) return [];
  return r[0].values.map((v) => ({ name: String(v[1]), type: String(v[2]), pk: Number(v[5]) > 0 }));
}

export function tableContents(db: Database, table: string): ResultSet {
  const r = db.exec(`SELECT * FROM "${table.replace(/"/g, '""')}"`);
  return r[0] ?? { columns: tableColumns(db, table).map((c) => c.name), values: [] };
}

export function runSql(db: Database, sql: string): RunResult | RunError {
  try {
    const results = db.exec(sql);
    return { ok: true, results, rowsModified: db.getRowsModified() };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, message, hint: translateError(message) };
  }
}

/** SQLiteのエラーメッセージに日本語の補足を付ける */
export function translateError(msg: string): string {
  let m: RegExpMatchArray | null;
  if ((m = msg.match(/no such table: (\S+)/))) return `表「${m[1]}」がありません。表の名前のつづりを確認してください。`;
  if ((m = msg.match(/no such column: (\S+)/))) return `列「${m[1]}」がありません。列の名前のつづりを確認してください。`;
  if ((m = msg.match(/no such function: (\S+)/))) return `関数「${m[1]}」はありません。関数名のつづりを確認してください。`;
  if ((m = msg.match(/ambiguous column name: (\S+)/))) return `列「${m[1]}」が複数の表にあり、どちらか決められません。「表名.列名」の形で書いてください。`;
  if ((m = msg.match(/near "(.+?)": syntax error/))) return `「${m[1]}」の近くに文法の誤りがあります。キーワードのつづりや、カンマ・括弧の位置を確認してください。`;
  if (/incomplete input/.test(msg)) return 'SQLが途中で終わっています。括弧や引用符が閉じているか確認してください。';
  if (/unrecognized token/.test(msg)) return '読み取れない文字があります。引用符(\')が閉じているか確認してください。';
  if (/UNIQUE constraint failed/.test(msg)) return '同じ主キー(id)の行がすでにあります。別の値を使ってください。';
  if (/NOT NULL constraint failed: (\S+)/.test(msg)) return `必須の列「${msg.match(/NOT NULL constraint failed: (\S+)/)![1]}」に値がありません。`;
  if (/FOREIGN KEY constraint failed/.test(msg)) return '参照先の表に存在しない値です。外部キーの値を確認してください。';
  if (/a GROUP BY clause is required/.test(msg)) return '集計関数と通常の列を一緒に使うときは GROUP BY が必要です。';
  if (/misuse of aggregate/.test(msg)) return '集計関数(COUNT、SUMなど)はWHEREでは使えません。HAVINGを使ってください。';
  if (/datatype mismatch/.test(msg)) return '列の型と合わない値です。数値の列に文字列を入れていないか確認してください。';
  return 'SQLの書き方を見直してください。';
}

export function formatCell(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (v instanceof Uint8Array) return `<BLOB ${v.length} bytes>`;
  return String(v);
}
