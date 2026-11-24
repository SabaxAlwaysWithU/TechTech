// C 練習場で使う picoc-js(C のインタプリタ picoc を WebAssembly にしたもの。MIT ライセンス)を、
// node_modules から src/lib/picoc.gen.js に書き出す。npm run dev / npm run build / check-tasks の前に自動で走る。
//
// picoc-js は runC(コード, 出力を受け取る関数)しか外に出していない。runC はエラーのときに
// Node ではプロセスごと終了してしまい、終わったことも知らせてくれない。
// そこで、3か所だけ書き換える。
// 1. 中の作り手の関数 picoc(...) も外に出す(最後の export の1行)。出力の受け取り方と終わり方(quit)を自分で指定できる(src/lib/crun-core.js)
// 生成したファイルは git には入れない(.gitignore)。版は package.json の picoc-js で決まる。
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = join(import.meta.dirname, '..');
const from = join(root, 'node_modules', 'picoc-js', 'dist', 'bundle.js');
export const generated = join(root, 'src', 'lib', 'picoc.gen.js');

export function preparePicoc() {
  if (!existsSync(from)) throw new Error(`${from} がありません。npm install(npm ci)を先に実行してください。`);
  const src = readFileSync(from, 'utf8');
  const last = 'export { runC };';
  if (!src.trimEnd().endsWith(last)) throw new Error('picoc-js の bundle.js の最後が想定と違います(版が変わった?)。scripts/prepare-picoc.mjs を見直してください。');
  // 2. 改行で終わらない printf の出力は、改行が来るまで TTY にためられたまま捨てられる。それを出す flushTTY を足す
  const anchor = "Module['runc'] = runc;";
  if (src.split(anchor).length !== 2) throw new Error(`picoc-js の bundle.js に ${anchor} が1つだけある、という想定と違います。`);
  const flush = anchor + "\nModule['flushTTY'] = function () { for (var k in TTY.ttys) { var t = TTY.ttys[k]; if (t && t.ops && t.ops.flush) t.ops.flush(t); } };";
  // 3. 先頭の import(Node の path / fs / crypto / child_process)はブラウザでは読み込めない。
  //    Node で動くときだけ process.getBuiltinModule で取り出し、ブラウザでは undefined にする(ブラウザでは使われない)
  let body = src.trimEnd().slice(0, -last.length).replace(anchor, flush);
  const builtins = [...body.matchAll(/^import (require\$\$\d+) from '(\w+)';\n/gm)];
  if (builtins.length !== 4) throw new Error('picoc-js の bundle.js の先頭の import が想定と違います。');
  for (const [line, name, mod] of builtins) {
    // 置き換える文字列に $$ があるので、関数で渡す(文字列で渡すと $$ が $ 1つに変わってしまう)
    body = body.replace(line, () => `const ${name} = typeof process === 'object' && process.getBuiltinModule ? process.getBuiltinModule('${mod}') : undefined;\n`);
  }
  const out = `// 生成ファイル(scripts/prepare-picoc.mjs)。直接書き換えない。元は node_modules/picoc-js/dist/bundle.js(MIT)\n` +
    body + 'export { runC, picoc };\n';
  if (!existsSync(generated) || readFileSync(generated, 'utf8') !== out) writeFileSync(generated, out);
  return generated;
}

// 直接実行されたとき(npm run dev / build の前)
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    preparePicoc();
    console.log('picoc を src/lib/picoc.gen.js に用意しました');
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
