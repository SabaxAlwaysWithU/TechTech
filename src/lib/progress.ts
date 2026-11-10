// 進捗の記録。ブラウザの localStorage にだけ保存する。
const KEY = 'progress:v1';

export interface LessonProgress {
  read?: boolean;
  quizBest?: number; // 最高正答数
  quizTotal?: number;
  tasks?: Record<string, boolean>; // 課題id → クリア
}

type Store = Record<string, LessonProgress>; // "sql/02-select" → 進捗

function load(): Store {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
}

export function getProgress(lessonId: string): LessonProgress {
  return load()[lessonId] ?? {};
}

export function markRead(lessonId: string) {
  const s = load();
  s[lessonId] = { ...s[lessonId], read: true };
  save(s);
}

export function recordQuiz(lessonId: string, correct: number, total: number) {
  const s = load();
  const p = s[lessonId] ?? {};
  s[lessonId] = { ...p, quizBest: Math.max(p.quizBest ?? 0, correct), quizTotal: total };
  save(s);
}

export function markTaskCleared(lessonId: string, taskId: string) {
  const s = load();
  const p = s[lessonId] ?? {};
  s[lessonId] = { ...p, tasks: { ...p.tasks, [taskId]: true } };
  save(s);
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}

/** レッスンの3ステップのうち、いくつ終わったか(0〜3) */
export function lessonScore(p: LessonProgress, quizCount: number, taskCount: number): number {
  let n = 0;
  if (p.read) n++;
  if (quizCount > 0 && (p.quizBest ?? 0) >= quizCount) n++;
  if (taskCount > 0 && Object.values(p.tasks ?? {}).filter(Boolean).length >= taskCount) n++;
  return n;
}
