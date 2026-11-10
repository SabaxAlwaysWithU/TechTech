// コンテンツの読み込み(ビルド時)。
// content/<分野>/field.json          分野の名前と説明、練習場の種類
// content/<分野>/<レッスン>/article.md 記事(記事本体は content collection で扱う)
// content/<分野>/<レッスン>/quiz.json  クイズ
// content/<分野>/<レッスン>/tasks.json 練習場の課題
// content/<分野>/schema.sql           分野共通の練習用データ(SQLのみ)
import { getCollection } from 'astro:content';

export type PracticeKind = 'sql' | 'html';

export interface Field {
  id: string;
  title: string;
  description: string;
  order: number;
  practice: PracticeKind;
  languages: string[]; // 記事中でこの言語のコード例に「練習場で試す」を付ける
}

export interface QuizQuestion {
  question: string;
  options: string[]; // 4つ。先頭が正解(表示時にシャッフルする)
  explanation: string;
}

/** HTML練習場の判定条件。すべて満たせば正解 */
export interface HtmlCheck {
  selector: string;
  count?: number; // 指定がなければ1つ以上
  text?: string; // textContent(前後の空白を除く)と完全一致
  textIncludes?: string; // textContent に含まれる
  attr?: Record<string, string>; // 属性の値が一致
  css?: Record<string, string>; // getComputedStyle の値が一致
  message: string; // 満たさないときに出す1行
}

export interface Task {
  id: string;
  title: string;
  text: string;
  hints: string[];
  // SQL用
  answer?: string;
  ordered?: boolean; // 行の順番も比べる
  mutation?: boolean; // 実行後の表の中身で比べる
  // HTML用
  starter?: string; // 入力欄の初期内容
  checks?: HtmlCheck[];
}

export interface Lesson {
  field: string;
  slug: string; // 例: 02-select
  id: string; // 例: sql/02-select
  number: number;
  title: string;
  description: string;
  quiz: QuizQuestion[];
  tasks: Task[];
}

const fieldFiles = import.meta.glob<Omit<Field, 'id'>>('/content/*/field.json', { eager: true, import: 'default' });
const quizFiles = import.meta.glob<QuizQuestion[]>('/content/*/*/quiz.json', { eager: true, import: 'default' });
const taskFiles = import.meta.glob<Task[]>('/content/*/*/tasks.json', { eager: true, import: 'default' });

export function getFields(): Field[] {
  return Object.entries(fieldFiles)
    .map(([path, f]) => ({ id: path.split('/')[2], ...f }))
    .sort((a, b) => a.order - b.order);
}

export function getField(id: string): Field | undefined {
  return getFields().find((f) => f.id === id);
}

export async function getLessons(field?: string): Promise<Lesson[]> {
  const articles = await getCollection('articles');
  const lessons = articles
    .filter((a) => !field || a.id.startsWith(field + '/'))
    .map((a) => {
      const [f, slug] = a.id.split('/');
      return {
        field: f,
        slug,
        id: a.id,
        number: parseInt(slug, 10) || 0,
        title: a.data.title,
        description: a.data.description,
        quiz: quizFiles[`/content/${a.id}/quiz.json`] ?? [],
        tasks: taskFiles[`/content/${a.id}/tasks.json`] ?? [],
      };
    });
  return lessons.sort((a, b) => a.field.localeCompare(b.field) || a.number - b.number);
}
