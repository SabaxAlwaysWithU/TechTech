// 進捗の記録。ブラウザの localStorage にだけ保存する。
const KEY = 'progress:v1';

export interface LessonProgress {
  read?: boolean;
  quizBest?: number; // 最高正答数
  quizTotal?: number;
  tasks?: Record<string, boolean>; // 課題id → クリア
}

type Store = Record<string, LessonProgress>; // "sql/02-select" → 進捗

// レッスンのフォルダ名を変えたとき(総合演習の番号を後ろにずらしたときなど)に、前の名前の進捗を引き継ぐ。
// field.json の "renamed": { "古いフォルダ名": "新しいフォルダ名" } を読む。
const fieldFiles = import.meta.glob<{ renamed?: Record<string, string> }>('/content/*/field.json', { eager: true, import: 'default' });
const RENAMED: [string, string][] = Object.entries(fieldFiles).flatMap(([path, f]) => {
  const field = path.split('/')[2];
  return Object.entries(f.renamed ?? {}).map(([from, to]) => [`${field}/${from}`, `${field}/${to}`] as [string, string]);
});

/** 2つの進捗を合わせる(読んだ・クリアはどちらかで済んでいれば済み、クイズは良いほう) */
function merge(a: LessonProgress, b: LessonProgress): LessonProgress {
  const best = Math.max(a.quizBest ?? -1, b.quizBest ?? -1);
  return {
    ...(a.read || b.read ? { read: true } : {}),
    ...(best >= 0 ? { quizBest: best, quizTotal: b.quizTotal ?? a.quizTotal } : {}),
    ...(a.tasks || b.tasks ? { tasks: { ...a.tasks, ...b.tasks } } : {}),
  };
}

function migrate(s: Store): boolean {
  let changed = false;
  for (const [from, to] of RENAMED) {
    if (!s[from]) continue;
    s[to] = merge(s[from], s[to] ?? {});
    delete s[from];
    changed = true;
  }
  return changed;
}

function load(): Store {
  try {
    const s: Store = JSON.parse(localStorage.getItem(KEY) || '{}');
    if (migrate(s)) localStorage.setItem(KEY, JSON.stringify(s));
    return s;
  } catch {
    return {};
  }
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
  // 同じページ内の表示(ステップバーなど)に知らせる
  try {
    window.dispatchEvent(new CustomEvent('progress-change'));
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
