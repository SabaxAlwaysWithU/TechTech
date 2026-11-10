// コンテンツの読み込み(ビルド時)。
// content/<分野>/field.json          分野の名前と説明
// content/<分野>/<レッスン>/article.md 記事(記事本体は content collection で扱う)
// content/<分野>/<レッスン>/quiz.json  クイズ
// content/<分野>/<レッスン>/tasks.json 練習場の課題
// content/<分野>/schema.sql           分野共通の練習用データ
import { getCollection } from 'astro:content';

export interface Field {
  id: string;
  title: string;
  description: string;
  order: number;
}

export interface QuizQuestion {
  question: string;
  options: string[]; // 4つ。先頭が正解(表示時にシャッフルする)
  explanation: string;
}

export interface Task {
  id: string;
  title: string;
  text: string;
  answer: string;
  hints: string[];
  ordered?: boolean; // 行の順番も比べる
  mutation?: boolean; // 実行後の表の中身で比べる(INSERT/UPDATE/DELETE)
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

const fieldFiles = import.meta.glob<{ title: string; description: string; order: number }>('/content/*/field.json', {
  eager: true,
  import: 'default',
});
const quizFiles = import.meta.glob<QuizQuestion[]>('/content/*/*/quiz.json', { eager: true, import: 'default' });
const taskFiles = import.meta.glob<Task[]>('/content/*/*/tasks.json', { eager: true, import: 'default' });

export function getFields(): Field[] {
  return Object.entries(fieldFiles)
    .map(([path, f]) => ({ id: path.split('/')[2], ...f }))
    .sort((a, b) => a.order - b.order);
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
