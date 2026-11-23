// Python練習場で使う Pyodide(ブラウザで動く Python)を、node_modules から public/pyodide/ にコピーする。
// npm run dev / npm run build の前に自動で走る(package.json の predev / prebuild)。
// 約12MBあるので git には入れない(.gitignore)。版は package.json の pyodide で決まる。
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const from = join(import.meta.dirname, '..', 'node_modules', 'pyodide');
const to = join(import.meta.dirname, '..', 'public', 'pyodide');
const files = ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'python_stdlib.zip', 'pyodide-lock.json'];

mkdirSync(to, { recursive: true });
for (const f of files) {
  const src = join(from, f);
  if (!existsSync(src)) {
    console.error(`${src} がありません。npm install(npm ci)を先に実行してください。`);
    process.exit(1);
  }
  const dst = join(to, f);
  if (existsSync(dst) && statSync(dst).size === statSync(src).size && statSync(dst).mtimeMs >= statSync(src).mtimeMs) continue;
  copyFileSync(src, dst);
}
console.log('Pyodide を public/pyodide/ に用意しました');
