// OS分野の練習場: ブラウザの中で動く小さな疑似ターミナル。
// 仮想のファイル、プロセス、ユーザーを持ち、基本的なコマンドを受け付ける。
// 本物のOSには何もしない。

export interface FileNode {
  type: 'file';
  content: string;
  mode: string; // 例: 'rw-r--r--'
  owner: string;
}
export interface DirNode {
  type: 'dir';
  children: Record<string, Node>;
  mode: string;
  owner: string;
}
export type Node = FileNode | DirNode;

export interface Process {
  pid: number;
  user: string;
  cpu: number; // %
  mem: number; // MB
  cmd: string;
}

/** 仮想の Git リポジトリ(1つだけ) */
export interface GitCommit {
  id: string;
  parent: string | null;
  message: string;
  tree: Record<string, string>; // リポジトリ内の相対パス → 内容
  n: number; // 通し番号(表示用)
}
export interface GitRepo {
  root: string; // 絶対パス
  branch: string; // 今いるブランチ
  branches: Record<string, string | null>; // ブランチ名 → 先頭コミットid(なし = null)
  commits: Record<string, GitCommit>;
  index: Record<string, string>; // ステージ(相対パス → 内容)
  remote: string | null; // origin の URL
  pushed: Record<string, string | null>; // ブランチ → push 済みのコミットid
  upstream: Record<string, boolean>; // -u で送り先を覚えたブランチ
  seq: number;
}

export interface ShellState {
  root: DirNode;
  cwd: string;
  user: string;
  home: string;
  env: Record<string, string>;
  processes: Process[];
  repo: GitRepo | null;
  lastOutput: string;
  lastCommand: string;
  history: string[];
}

const USER = 'saba';
const HOME = '/home/saba';

function file(content: string, mode = 'rw-r--r--', owner = USER): FileNode {
  return { type: 'file', content, mode, owner };
}
function dir(children: Record<string, Node> = {}, mode = 'rwxr-xr-x', owner = USER): DirNode {
  return { type: 'dir', children, mode, owner };
}

/** 初期状態のファイルシステム */
function initialFs(): DirNode {
  return dir(
    {
      bin: dir({ ls: file('', 'rwxr-xr-x', 'root'), cat: file('', 'rwxr-xr-x', 'root'), bash: file('', 'rwxr-xr-x', 'root'), cp: file('', 'rwxr-xr-x', 'root'), mv: file('', 'rwxr-xr-x', 'root'), rm: file('', 'rwxr-xr-x', 'root'), mkdir: file('', 'rwxr-xr-x', 'root'), ps: file('', 'rwxr-xr-x', 'root'), kill: file('', 'rwxr-xr-x', 'root'), echo: file('', 'rwxr-xr-x', 'root') }, 'rwxr-xr-x', 'root'),
      usr: dir({ bin: dir({ python3: file('', 'rwxr-xr-x', 'root'), node: file('', 'rwxr-xr-x', 'root'), git: file('', 'rwxr-xr-x', 'root') }, 'rwxr-xr-x', 'root') }, 'rwxr-xr-x', 'root'),
      etc: dir(
        {
          hostname: file('study-pc\n', 'rw-r--r--', 'root'),
          passwd: file('root:x:0:0:root:/root:/bin/bash\nsaba:x:1000:1000:Saba:/home/saba:/bin/bash\n', 'rw-r--r--', 'root'),
          shadow: file('root:$6$abc123:19500:0:99999:7:::\nsaba:$6$xyz789:19500:0:99999:7:::\n', 'rw-------', 'root'),
          'os-release': file('NAME="Study Linux"\nVERSION="1.0"\n', 'rw-r--r--', 'root'),
        },
        'rwxr-xr-x',
        'root',
      ),
      var: dir({ log: dir({ 'system.log': file('10:00:01 system: boot complete\n10:00:05 network: connected to wifi\n10:12:30 app: music-player started\n10:30:44 kernel: warning: process 777 using 99% cpu\n10:31:02 app: backup finished\n', 'rw-r--r--', 'root') }, 'rwxr-xr-x', 'root') }, 'rwxr-xr-x', 'root'),
      tmp: dir({}, 'rwxrwxrwx', 'root'),
      root: dir({}, 'rwx------', 'root'),
      home: dir(
        {
          saba: dir({
            docs: dir({
              'report.txt': file('今月の売上レポート\n合計: 153,900円\n一番売れた商品: ノートパソコン\n'),
              'memo.txt': file('買うもの: 牛乳、卵\n'),
              'old.txt': file('古いメモ。もう使わない。\n'),
            }),
            notes: dir({}),
            photos: dir({ 'cat.jpg': file('(画像データ)'), 'trip.jpg': file('(画像データ)') }),
            'script.sh': file('#!/bin/bash\necho "バックアップを開始します"\n', 'rw-r--r--'),
            'readme.txt': file('ようこそ。ここはあなたのホームディレクトリです。\n'),
            // Git分野で使う作業中のプロジェクト
            project: dir({
              'README.md': file('# my-app\n\n自己紹介ページを作るプロジェクト。\n'),
              'index.html': file('<!DOCTYPE html>\n<html lang="ja">\n<head><meta charset="UTF-8"><title>my-app</title></head>\n<body>\n  <h1>自己紹介</h1>\n</body>\n</html>\n'),
              'style.css': file('body { font-family: sans-serif; }\n'),
              'memo.txt': file('あとでやること: 写真を足す\n'),
              node_modules: dir({ 'some-lib': dir({ 'index.js': file('module.exports = {};\n') }) }),
            }),
          }),
        },
        'rwxr-xr-x',
        'root',
      ),
    },
    'rwxr-xr-x',
    'root',
  );
}

function initialProcesses(): Process[] {
  return [
    { pid: 1, user: 'root', cpu: 0.0, mem: 8, cmd: 'init' },
    { pid: 42, user: USER, cpu: 0.1, mem: 12, cmd: 'bash' },
    { pid: 318, user: USER, cpu: 2.5, mem: 920, cmd: 'firefox' },
    { pid: 522, user: USER, cpu: 1.0, mem: 140, cmd: 'music-player' },
    { pid: 640, user: 'root', cpu: 0.2, mem: 30, cmd: 'network-manager' },
    { pid: 777, user: USER, cpu: 99.0, mem: 65, cmd: 'runaway-script' },
  ];
}

export function createShell(): ShellState {
  return {
    root: initialFs(),
    cwd: HOME,
    user: USER,
    home: HOME,
    env: { HOME, USER, PATH: '/usr/bin:/bin', SHELL: '/bin/bash', LANG: 'ja_JP.UTF-8' },
    processes: initialProcesses(),
    repo: null,
    lastOutput: '',
    lastCommand: '',
    history: [],
  };
}

// ---- パス ----

export function resolvePath(state: ShellState, p: string): string {
  if (!p || p === '~') p = state.home;
  else if (p.startsWith('~/')) p = state.home + p.slice(1);
  const parts = (p.startsWith('/') ? p : state.cwd + '/' + p).split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

export function getNode(state: ShellState, abs: string): Node | null {
  if (abs === '/') return state.root;
  let node: Node = state.root;
  for (const part of abs.split('/').filter(Boolean)) {
    if (node.type !== 'dir') return null;
    const next: Node | undefined = node.children[part];
    if (!next) return null;
    node = next;
  }
  return node;
}

function parentOf(abs: string): { dir: string; name: string } {
  const i = abs.lastIndexOf('/');
  return { dir: i <= 0 ? '/' : abs.slice(0, i), name: abs.slice(i + 1) };
}

function canRead(state: ShellState, node: Node, asUser: string): boolean {
  if (asUser === 'root') return true;
  const m = node.mode;
  if (node.owner === asUser) return m[0] === 'r';
  return m[6] === 'r';
}
function canWrite(state: ShellState, node: Node, asUser: string): boolean {
  if (asUser === 'root') return true;
  const m = node.mode;
  if (node.owner === asUser) return m[1] === 'w';
  return m[7] === 'w';
}

export function displayCwd(state: ShellState): string {
  return state.cwd === state.home ? '~' : state.cwd.startsWith(state.home + '/') ? '~' + state.cwd.slice(state.home.length) : state.cwd;
}

export function prompt(state: ShellState): string {
  return `${state.user}@study-pc:${displayCwd(state)}$ `;
}

// ---- コマンド ----

interface Ctx {
  state: ShellState;
  user: string; // sudo のときは root
}

type Cmd = (ctx: Ctx, args: string[]) => string;

const HELP = `使えるコマンド:
  pwd              今いる場所を表示
  ls [-l] [-a] [場所]  ファイルの一覧
  cd 場所           移動(.. で1つ上、~ でホーム)
  cat ファイル       中身を表示
  echo 文字          文字を表示($HOME などの変数も使える。> ファイル で書き込み)
  mkdir 名前         ディレクトリを作る
  touch 名前         空のファイルを作る
  cp 元 先           コピー
  mv 元 先           移動または名前の変更
  rm [-r] 名前       削除
  chmod +x/-x ファイル  実行権限を付ける/外す
  ps               動いているプロセスの一覧
  kill PID          プロセスを終了させる
  free             メモリの使用状況
  df               ディスクの使用状況
  env              環境変数の一覧
  which コマンド     コマンドの場所
  whoami / hostname / uname / date
  sudo コマンド      管理者(root)として実行
  git ...          バージョン管理(git help で一覧)
  clear            画面を消す
  help             この一覧`;

const GIT_HELP = `使える git コマンド:
  git init                      今いる場所をリポジトリにする
  git status                    変更の状態を見る
  git add ファイル | .           次のコミットに入れる(ステージ)
  git commit -m "メッセージ"     記録する
  git log [--oneline]           履歴を見る
  git diff                      まだステージしていない変更を見る
  git restore ファイル           ファイルを最後のコミットの状態に戻す
  git branch [名前]             ブランチの一覧 / 作成
  git switch [-c] 名前          ブランチを移動(-c で作って移動)
  git checkout [-b] 名前        switch と同じ(古い書き方)
  git merge 名前                今のブランチに取り込む
  git remote add origin URL     リモートを登録
  git remote -v                 リモートの一覧
  git push [-u origin ブランチ]  リモートへ送る
  git pull                      リモートから取り込む(この練習場では何も変わりません)`;

const commands: Record<string, Cmd> = {
  help: () => HELP,
  pwd: ({ state }) => state.cwd,
  whoami: ({ user }) => user,
  hostname: () => 'study-pc',
  uname: (_, args) => (args.includes('-a') ? 'Linux study-pc 6.1.0 #1 SMP x86_64 GNU/Linux' : 'Linux'),
  date: () => new Date().toLocaleString('ja-JP'),
  clear: () => '\u0000clear',
  env: ({ state }) => Object.entries(state.env).map(([k, v]) => `${k}=${v}`).join('\n'),
  echo: ({ state }, args) => args.map((a) => a.replace(/\$(\w+)/g, (_, k) => state.env[k] ?? '')).join(' '),
  which: ({ state }, args) => {
    if (!args[0]) return 'which: コマンド名を指定してください';
    for (const d of state.env.PATH.split(':')) {
      const n = getNode(state, `${d}/${args[0]}`);
      if (n && n.type === 'file') return `${d}/${args[0]}`;
    }
    return `which: ${args[0]} は見つかりません`;
  },
  ls: ({ state, user }, args) => {
    const long = args.includes('-l') || args.includes('-la') || args.includes('-al');
    const all = args.includes('-a') || args.includes('-la') || args.includes('-al');
    const target = args.find((a) => !a.startsWith('-')) ?? '.';
    const abs = resolvePath(state, target);
    const node = getNode(state, abs);
    if (!node) return `ls: '${target}' にアクセスできません: そのようなファイルやディレクトリはありません`;
    if (!canRead(state, node, user)) return `ls: '${target}' を開けません: 許可がありません`;
    if (node.type === 'file') return long ? longLine(target, node) : target;
    // 本物と同じく、. で始まる名前(.git、.gitignore など)は -a のときだけ見せる
    const names = Object.keys(node.children).sort().filter((n) => all || !n.startsWith('.'));
    const list = all ? ['.', '..', ...names] : names;
    if (!long) return list.map((n) => (node.children[n]?.type === 'dir' ? n + '/' : n)).join('  ');
    return list.map((n) => (n === '.' || n === '..' ? longLine(n, node) : longLine(n, node.children[n]))).join('\n');
  },
  cd: ({ state, user }, args) => {
    const abs = resolvePath(state, args[0] ?? '~');
    const node = getNode(state, abs);
    if (!node) return `cd: ${args[0]}: そのようなファイルやディレクトリはありません`;
    if (node.type !== 'dir') return `cd: ${args[0]}: ディレクトリではありません`;
    if (!canRead(state, node, user)) return `cd: ${args[0]}: 許可がありません`;
    state.cwd = abs;
    return '';
  },
  cat: ({ state, user }, args) => {
    if (!args[0]) return 'cat: ファイル名を指定してください';
    const outs: string[] = [];
    for (const a of args) {
      const node = getNode(state, resolvePath(state, a));
      if (!node) { outs.push(`cat: ${a}: そのようなファイルやディレクトリはありません`); continue; }
      if (node.type === 'dir') { outs.push(`cat: ${a}: ディレクトリです`); continue; }
      if (!canRead(state, node, user)) { outs.push(`cat: ${a}: 許可がありません`); continue; }
      outs.push(node.content.replace(/\n$/, ''));
    }
    return outs.join('\n');
  },
  mkdir: ({ state, user }, args) => {
    const p = args.includes('-p');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) return 'mkdir: 名前を指定してください';
    for (const t of targets) {
      const abs = resolvePath(state, t);
      if (getNode(state, abs)) return `mkdir: '${t}' を作成できません: ファイルが存在します`;
      const { dir: d, name } = parentOf(abs);
      let parent = getNode(state, d);
      if (!parent && p) { const r = commands.mkdir({ state, user }, ['-p', d]); if (r) return r; parent = getNode(state, d); }
      if (!parent || parent.type !== 'dir') return `mkdir: '${t}' を作成できません: そのようなファイルやディレクトリはありません`;
      if (!canWrite(state, parent, user)) return `mkdir: '${t}' を作成できません: 許可がありません`;
      parent.children[name] = dir({}, 'rwxr-xr-x', user);
    }
    return '';
  },
  touch: ({ state, user }, args) => {
    if (!args[0]) return 'touch: 名前を指定してください';
    for (const t of args) {
      const abs = resolvePath(state, t);
      if (getNode(state, abs)) continue;
      const { dir: d, name } = parentOf(abs);
      const parent = getNode(state, d);
      if (!parent || parent.type !== 'dir') return `touch: '${t}' に touch できません: そのようなファイルやディレクトリはありません`;
      if (!canWrite(state, parent, user)) return `touch: '${t}' に touch できません: 許可がありません`;
      parent.children[name] = file('', 'rw-r--r--', user);
    }
    return '';
  },
  rm: ({ state, user }, args) => {
    const recursive = args.includes('-r') || args.includes('-rf');
    const targets = args.filter((a) => !a.startsWith('-'));
    if (!targets.length) return 'rm: 名前を指定してください';
    for (const t of targets) {
      const abs = resolvePath(state, t);
      if (abs === '/' || abs === state.home) return `rm: '${t}' は削除できません(大事な場所です)`;
      const node = getNode(state, abs);
      if (!node) return `rm: '${t}' を削除できません: そのようなファイルやディレクトリはありません`;
      if (node.type === 'dir' && !recursive) return `rm: '${t}' を削除できません: ディレクトリです(-r を付けると中身ごと削除します)`;
      const { dir: d, name } = parentOf(abs);
      const parent = getNode(state, d) as DirNode;
      if (!canWrite(state, parent, user)) return `rm: '${t}' を削除できません: 許可がありません`;
      delete parent.children[name];
    }
    return '';
  },
  cp: ({ state, user }, args) => {
    const targets = args.filter((a) => !a.startsWith('-'));
    if (targets.length < 2) return 'cp: コピー元とコピー先を指定してください';
    const src = getNode(state, resolvePath(state, targets[0]));
    if (!src) return `cp: '${targets[0]}' を stat できません: そのようなファイルやディレクトリはありません`;
    if (src.type === 'dir' && !args.includes('-r')) return `cp: '${targets[0]}' はディレクトリです(-r を付けると中身ごとコピーします)`;
    return place(state, user, structuredClone(src), targets[0], targets[1], 'cp');
  },
  mv: ({ state, user }, args) => {
    if (args.length < 2) return 'mv: 移動元と移動先を指定してください';
    const abs = resolvePath(state, args[0]);
    const src = getNode(state, abs);
    if (!src) return `mv: '${args[0]}' を stat できません: そのようなファイルやディレクトリはありません`;
    const r = place(state, user, src, args[0], args[1], 'mv');
    if (r) return r;
    const { dir: d, name } = parentOf(abs);
    delete (getNode(state, d) as DirNode).children[name];
    return '';
  },
  chmod: ({ state, user }, args) => {
    if (args.length < 2) return 'chmod: 使い方: chmod +x ファイル / chmod -x ファイル';
    const [modeArg, ...files] = args;
    for (const f of files) {
      const node = getNode(state, resolvePath(state, f));
      if (!node) return `chmod: '${f}' にアクセスできません: そのようなファイルやディレクトリはありません`;
      if (node.owner !== user && user !== 'root') return `chmod: '${f}' の許可を変更しています: 許可がありません`;
      const m = node.mode.split('');
      if (modeArg === '+x') { m[2] = 'x'; m[5] = 'x'; m[8] = 'x'; }
      else if (modeArg === '-x') { m[2] = '-'; m[5] = '-'; m[8] = '-'; }
      else if (modeArg === '+w') { m[1] = 'w'; }
      else if (modeArg === '-w') { m[1] = '-'; m[4] = '-'; m[7] = '-'; }
      else if (/^[0-7]{3}$/.test(modeArg)) {
        const bits = modeArg.split('').map(Number);
        bits.forEach((b, i) => { m[i * 3] = b & 4 ? 'r' : '-'; m[i * 3 + 1] = b & 2 ? 'w' : '-'; m[i * 3 + 2] = b & 1 ? 'x' : '-'; });
      } else return `chmod: '${modeArg}' は分かりません(+x、-x、755 などが使えます)`;
      node.mode = m.join('');
    }
    return '';
  },
  ps: ({ state }, args) => {
    const rows = state.processes.map((p) => `${String(p.pid).padStart(5)} ${p.user.padEnd(6)} ${p.cpu.toFixed(1).padStart(5)} ${String(p.mem).padStart(6)}  ${p.cmd}`);
    return ['  PID USER     %CPU MEM(MB)  COMMAND', ...rows].join('\n') + (args.length && !args.includes('aux') ? '' : '');
  },
  kill: ({ state, user }, args) => {
    const pidStr = args.find((a) => !a.startsWith('-'));
    if (!pidStr) return 'kill: 使い方: kill PID(PID は ps で調べられます)';
    const pid = Number(pidStr);
    const i = state.processes.findIndex((p) => p.pid === pid);
    if (i < 0) return `kill: (${pidStr}): そのようなプロセスはありません`;
    const p = state.processes[i];
    if (p.user !== user && user !== 'root') return `kill: (${pid}): 許可がありません(${p.user} のプロセスです)`;
    if (pid === 1) return 'kill: (1): 許可がありません(init は止められません)';
    state.processes.splice(i, 1);
    return '';
  },
  free: ({ state }) => {
    const used = state.processes.reduce((s, p) => s + p.mem, 0);
    const total = 8192;
    return `              total        used        free\nMem:        ${String(total).padStart(7)}     ${String(used).padStart(7)}     ${String(total - used).padStart(7)}   (MB)\nSwap:          2048           0        2048`;
  },
  df: () => 'Filesystem     Size  Used Avail Use% Mounted on\n/dev/sda1      256G   98G  158G  39% /\n/dev/sdb1      1.0T  410G  614G  40% /home',
  sudo: (ctx, args) => {
    if (!args.length) return 'sudo: 使い方: sudo コマンド';
    return runArgs({ ...ctx, user: 'root' }, args);
  },
  git: (ctx, args) => gitCommand(ctx.state, args),
};

// ---- Git ----

/** ディレクトリ以下のファイルを「相対パス → 内容」で集める(.git と無視パターンは除く) */
function collectFiles(node: DirNode, prefix: string, ignore: (p: string) => boolean, out: Record<string, string> = {}): Record<string, string> {
  for (const [name, child] of Object.entries(node.children)) {
    if (name === '.git') continue;
    const p = prefix ? `${prefix}/${name}` : name;
    if (ignore(p + (child.type === 'dir' ? '/' : ''))) continue;
    if (child.type === 'file') out[p] = child.content;
    else collectFiles(child, p, ignore, out);
  }
  return out;
}

function ignoreMatcher(state: ShellState, repo: GitRepo): (p: string) => boolean {
  const gi = getNode(state, `${repo.root}/.gitignore`);
  const patterns = gi && gi.type === 'file' ? gi.content.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('#')) : [];
  return (p: string) => {
    const path = p.replace(/\/$/, '');
    const base = path.split('/').pop()!;
    for (let pat of patterns) {
      const dirOnly = pat.endsWith('/');
      pat = pat.replace(/\/$/, '').replace(/^\//, '');
      if (dirOnly && !p.endsWith('/') && !path.includes('/')) continue;
      if (pat.startsWith('*.')) { if (base.endsWith(pat.slice(1))) return true; continue; }
      if (path === pat || base === pat || path.startsWith(pat + '/')) return true;
    }
    return false;
  };
}

function repoFor(state: ShellState): GitRepo | string {
  const r = state.repo;
  if (!r || !(state.cwd === r.root || state.cwd.startsWith(r.root + '/'))) {
    return 'fatal: ここは git リポジトリではありません(git init で作れます)';
  }
  return r;
}

function headTree(repo: GitRepo): Record<string, string> {
  const id = repo.branches[repo.branch];
  return id ? repo.commits[id].tree : {};
}

function relToRepo(state: ShellState, repo: GitRepo, p: string): string | null {
  const abs = resolvePath(state, p);
  if (abs === repo.root) return '';
  if (!abs.startsWith(repo.root + '/')) return null;
  return abs.slice(repo.root.length + 1);
}

interface Changes {
  staged: { path: string; kind: '新規' | '変更' | '削除' }[];
  unstaged: { path: string; kind: '変更' | '削除' }[];
  untracked: string[];
}

function changes(state: ShellState, repo: GitRepo): Changes {
  const rootNode = getNode(state, repo.root) as DirNode;
  const work = collectFiles(rootNode, '', ignoreMatcher(state, repo));
  const head = headTree(repo);
  const staged: Changes['staged'] = [];
  const unstaged: Changes['unstaged'] = [];
  const untracked: string[] = [];
  const all = new Set([...Object.keys(work), ...Object.keys(head), ...Object.keys(repo.index)]);
  for (const p of [...all].sort()) {
    const inHead = p in head, inIndex = p in repo.index, inWork = p in work;
    if (inIndex && !inHead) staged.push({ path: p, kind: '新規' });
    else if (inIndex && inHead && repo.index[p] !== head[p]) staged.push({ path: p, kind: '変更' });
    else if (!inIndex && inHead) staged.push({ path: p, kind: '削除' });
    if (inIndex && inWork && work[p] !== repo.index[p]) unstaged.push({ path: p, kind: '変更' });
    else if (inIndex && !inWork) unstaged.push({ path: p, kind: '削除' });
    if (inWork && !inIndex && !inHead) untracked.push(p);
  }
  return { staged, unstaged, untracked };
}

/** 作業フォルダの中身を、from のツリーから to のツリーへそろえる(追跡しているファイルだけ触る) */
function checkoutTree(state: ShellState, repo: GitRepo, from: Record<string, string>, to: Record<string, string>) {
  const tracked = new Set([...Object.keys(from), ...Object.keys(to)]);
  for (const p of tracked) {
    const abs = `${repo.root}/${p}`;
    const { dir: d, name } = parentOf(abs);
    let parent = getNode(state, d);
    if (!parent) { commands.mkdir({ state, user: state.user }, ['-p', d]); parent = getNode(state, d); }
    if (!parent || parent.type !== 'dir') continue;
    if (p in to) parent.children[name] = file(to[p], 'rw-r--r--', state.user);
    else delete parent.children[name];
  }
}

function newId(repo: GitRepo): string {
  repo.seq++;
  // 見た目だけ本物らしい7桁の16進数
  let h = 2166136261 ^ repo.seq;
  h = Math.imul(h, 16777619) >>> 0;
  return (h.toString(16) + '0000000').slice(0, 7);
}

function gitCommand(state: ShellState, args: string[]): string {
  const [sub, ...rest] = args;
  if (!sub || sub === 'help' || sub === '--help') return GIT_HELP;

  if (sub === 'init') {
    if (state.repo && state.repo.root === state.cwd) return `Reinitialized existing Git repository in ${state.cwd}/.git/`;
    if (state.repo) return `この練習場ではリポジトリは1つだけ作れます(すでに ${state.repo.root} にあります)`;
    const cwd = getNode(state, state.cwd) as DirNode;
    cwd.children['.git'] = dir({}, 'rwxr-xr-x', state.user);
    state.repo = { root: state.cwd, branch: 'main', branches: { main: null }, commits: {}, index: {}, remote: null, pushed: {}, upstream: {}, seq: 0 };
    return `Initialized empty Git repository in ${state.cwd}/.git/`;
  }

  const repo = repoFor(state);
  if (typeof repo === 'string') return repo;

  switch (sub) {
    case 'status': {
      const c = changes(state, repo);
      const lines = [`On branch ${repo.branch}`];
      if (!repo.branches[repo.branch]) lines.push('', 'No commits yet');
      if (c.staged.length) {
        lines.push('', 'Changes to be committed:(コミットされる変更)', '  (git restore --staged <file> で取り消し)');
        for (const s of c.staged) lines.push(`\t${s.kind}:   ${s.path}`);
      }
      if (c.unstaged.length) {
        lines.push('', 'Changes not staged for commit:(まだステージしていない変更)', '  (git add <file> でステージ)');
        for (const s of c.unstaged) lines.push(`\t${s.kind}:   ${s.path}`);
      }
      if (c.untracked.length) {
        lines.push('', 'Untracked files:(まだ追跡していないファイル)', '  (git add <file> で追跡を始める)');
        for (const p of c.untracked) lines.push(`\t${p}`);
      }
      if (!c.staged.length && !c.unstaged.length && !c.untracked.length) lines.push('', 'nothing to commit, working tree clean(変更はありません)');
      return lines.join('\n');
    }
    case 'add': {
      const targets = rest.filter((a) => !a.startsWith('-') || a === '-A');
      if (!targets.length) return 'git add: 何を追加するか指定してください(例: git add README.md、git add .)';
      const rootNode = getNode(state, repo.root) as DirNode;
      const work = collectFiles(rootNode, '', ignoreMatcher(state, repo));
      let count = 0;
      for (const t of targets) {
        if (t === '-A' || t === '.' || t === '--all') {
          for (const [p, content] of Object.entries(work)) { repo.index[p] = content; count++; }
          for (const p of Object.keys(repo.index)) if (!(p in work)) { delete repo.index[p]; count++; }
          continue;
        }
        const rel = relToRepo(state, repo, t);
        if (rel === null) return `fatal: '${t}' はリポジトリの外です`;
        const matched = Object.keys(work).filter((p) => p === rel || p.startsWith(rel + '/'));
        if (!matched.length) {
          if (rel in repo.index) { delete repo.index[rel]; count++; continue; }
          return `fatal: pathspec '${t}' はどのファイルにも一致しません`;
        }
        for (const p of matched) { repo.index[p] = work[p]; count++; }
      }
      return '';
    }
    case 'commit': {
      const mi = rest.indexOf('-m');
      const message = mi >= 0 ? rest[mi + 1] : undefined;
      if (rest.includes('-a') || rest.includes('-am')) return 'この練習場では -a は使えません。先に git add をしてください';
      if (!message) return 'git commit: メッセージが必要です。git commit -m "メッセージ" の形で書いてください';
      const c = changes(state, repo);
      if (!c.staged.length) return c.untracked.length || c.unstaged.length
        ? 'nothing added to commit(ステージされた変更がありません。先に git add をしてください)'
        : 'nothing to commit, working tree clean(変更はありません)';
      const id = newId(repo);
      const parent = repo.branches[repo.branch];
      repo.commits[id] = { id, parent, message, tree: { ...repo.index }, n: Object.keys(repo.commits).length + 1 };
      repo.branches[repo.branch] = id;
      const files = c.staged.length;
      return `[${repo.branch}${parent ? '' : ' (root-commit)'} ${id}] ${message}\n ${files} file${files > 1 ? 's' : ''} changed`;
    }
    case 'log': {
      let id = repo.branches[repo.branch];
      if (!id) return `fatal: ブランチ '${repo.branch}' にはまだコミットがありません`;
      const oneline = rest.includes('--oneline');
      const out: string[] = [];
      while (id) {
        const c = repo.commits[id];
        if (oneline) out.push(`${c.id} ${c.message}`);
        else out.push(`commit ${c.id}${c.id === repo.branches[repo.branch] ? ` (HEAD -> ${repo.branch})` : ''}`, `Author: ${state.user} <${state.user}@example.com>`, '', `    ${c.message}`, '');
        id = c.parent;
      }
      return out.join('\n').replace(/\n$/, '');
    }
    case 'diff': {
      const c = changes(state, repo);
      if (rest.includes('--staged') || rest.includes('--cached')) {
        if (!c.staged.length) return '';
        return c.staged.map((s) => `--- ${s.path}(${s.kind}、ステージ済み)`).join('\n');
      }
      if (!c.unstaged.length) return '';
      const rootNode = getNode(state, repo.root) as DirNode;
      const work = collectFiles(rootNode, '', () => false);
      return c.unstaged.map((s) => {
        const before = (repo.index[s.path] ?? '').split('\n').filter(Boolean);
        const after = (work[s.path] ?? '').split('\n').filter(Boolean);
        const lines = [`diff --git a/${s.path} b/${s.path}`, `--- a/${s.path}`, `+++ b/${s.path}`];
        for (const l of before) if (!after.includes(l)) lines.push(`-${l}`);
        for (const l of after) if (!before.includes(l)) lines.push(`+${l}`);
        return lines.join('\n');
      }).join('\n');
    }
    case 'restore': {
      const stagedMode = rest.includes('--staged');
      const targets = rest.filter((a) => !a.startsWith('-'));
      if (!targets.length) return 'git restore: ファイルを指定してください';
      for (const t of targets) {
        const rel = relToRepo(state, repo, t);
        if (rel === null) return `fatal: '${t}' はリポジトリの外です`;
        if (stagedMode) {
          const head = headTree(repo);
          if (rel in head) repo.index[rel] = head[rel]; else delete repo.index[rel];
          continue;
        }
        const src = rel in repo.index ? repo.index[rel] : headTree(repo)[rel];
        if (src === undefined) return `error: pathspec '${t}' はコミットにもステージにもありません`;
        const abs = `${repo.root}/${rel}`;
        const { dir: d, name } = parentOf(abs);
        (getNode(state, d) as DirNode).children[name] = file(src, 'rw-r--r--', state.user);
      }
      return '';
    }
    case 'branch': {
      const name = rest.find((a) => !a.startsWith('-'));
      if (rest.includes('-d') || rest.includes('-D')) {
        if (!name) return 'git branch -d: 名前を指定してください';
        if (name === repo.branch) return `error: 今いるブランチ '${name}' は削除できません`;
        if (!(name in repo.branches)) return `error: ブランチ '${name}' はありません`;
        delete repo.branches[name];
        return `Deleted branch ${name}.`;
      }
      if (!name) return Object.keys(repo.branches).sort().map((b) => (b === repo.branch ? `* ${b}` : `  ${b}`)).join('\n');
      if (name in repo.branches) return `fatal: ブランチ '${name}' はすでにあります`;
      repo.branches[name] = repo.branches[repo.branch];
      return '';
    }
    case 'switch':
    case 'checkout': {
      const create = rest.includes('-c') || rest.includes('-b');
      const name = rest.find((a) => !a.startsWith('-'));
      if (!name) return `git ${sub}: ブランチ名を指定してください`;
      if (create) {
        if (name in repo.branches) return `fatal: ブランチ '${name}' はすでにあります`;
        repo.branches[name] = repo.branches[repo.branch];
        repo.branch = name;
        return `Switched to a new branch '${name}'`;
      }
      if (!(name in repo.branches)) return `fatal: ブランチ '${name}' はありません(-c を付けると作れます)`;
      const c = changes(state, repo);
      if (c.staged.length || c.unstaged.length) return 'error: コミットしていない変更があります。先に commit するか restore してください';
      // 作業ツリーを移動先のコミットの内容にそろえる
      const target = repo.branches[name];
      const tree = target ? repo.commits[target].tree : {};
      checkoutTree(state, repo, headTree(repo), tree);
      repo.index = { ...tree };
      repo.branch = name;
      return `Switched to branch '${name}'`;
    }
    case 'merge': {
      const name = rest.find((a) => !a.startsWith('-'));
      if (!name) return 'git merge: 取り込むブランチ名を指定してください';
      if (!(name in repo.branches)) return `merge: ${name} - そのようなブランチはありません`;
      const theirs = repo.branches[name];
      const ours = repo.branches[repo.branch];
      if (!theirs || theirs === ours) return 'Already up to date.';
      // ours が theirs の祖先なら早送り
      let p: string | null = theirs;
      let ff = ours === null;
      while (p && !ff) { if (p === ours) ff = true; p = repo.commits[p].parent; }
      const before = headTree(repo);
      if (ff) {
        const tree = repo.commits[theirs].tree;
        repo.branches[repo.branch] = theirs;
        repo.index = { ...tree };
        checkoutTree(state, repo, before, tree);
        return `Updating ${ours ? ours : '0000000'}..${theirs}\nFast-forward`;
      }
      // 分岐している場合はマージコミットを作る(衝突は扱わない)
      const base = { ...repo.commits[ours!].tree, ...repo.commits[theirs].tree };
      const id = newId(repo);
      repo.commits[id] = { id, parent: ours, message: `Merge branch '${name}'`, tree: base, n: Object.keys(repo.commits).length + 1 };
      repo.branches[repo.branch] = id;
      repo.index = { ...base };
      checkoutTree(state, repo, before, base);
      return `Merge made by the 'ort' strategy.`;
    }
    case 'remote': {
      if (rest[0] === 'add') {
        if (rest[1] !== 'origin' || !rest[2]) return 'git remote add: 使い方: git remote add origin URL';
        if (repo.remote) return 'error: remote origin already exists.';
        repo.remote = rest[2];
        return '';
      }
      if (!repo.remote) return '';
      return rest.includes('-v') ? `origin\t${repo.remote} (fetch)\norigin\t${repo.remote} (push)` : 'origin';
    }
    case 'push': {
      if (!repo.remote) return "fatal: 'origin' という名前のリモートがありません。先に git remote add origin URL をしてください";
      const u = rest.includes('-u') || rest.includes('--set-upstream');
      const named = rest.filter((a) => !a.startsWith('-'));
      if (named.length && named[0] !== 'origin') return `fatal: '${named[0]}' という名前のリモートはありません`;
      const branch = named[1] ?? repo.branch;
      if (!(branch in repo.branches)) return `error: ブランチ '${branch}' はありません`;
      if (!named.length && !repo.upstream[repo.branch]) return `fatal: このブランチの送り先がまだ決まっていません。\n\n    git push -u origin ${repo.branch}\n\nと打ってください(次からは git push だけで送れます)`;
      const head = repo.branches[branch];
      if (!head) return `error: ブランチ '${branch}' にはまだコミットがありません`;
      if (repo.pushed[branch] === head) return 'Everything up-to-date';
      const prev = repo.pushed[branch];
      repo.pushed[branch] = head;
      if (u) repo.upstream[branch] = true;
      return `To ${repo.remote}\n ${prev ? `  ${prev}..${head}` : ' * [new branch]     '} ${branch} -> ${branch}${u ? `\nbranch '${branch}' set up to track 'origin/${branch}'.` : ''}`;
    }
    case 'pull':
      return repo.remote ? 'Already up to date.' : "fatal: 'origin' という名前のリモートがありません";
    case 'clone':
      return 'この練習場では clone は使えません(自分の project フォルダで git init から始めます)';
    default:
      return `git: '${sub}' は git のコマンドではありません。git help で一覧が見られます`;
  }
}

function longLine(name: string, node: Node): string {
  const t = node.type === 'dir' ? 'd' : '-';
  const size = node.type === 'file' ? node.content.length : 4096;
  return `${t}${node.mode} ${node.owner.padEnd(5)} ${String(size).padStart(6)} ${name}`;
}

/** cp / mv の共通処理: src を dest に置く。dest がディレクトリならその中へ */
function place(state: ShellState, user: string, src: Node, srcName: string, dest: string, cmd: string): string {
  let abs = resolvePath(state, dest);
  const destNode = getNode(state, abs);
  if (destNode && destNode.type === 'dir') abs = abs.replace(/\/$/, '') + '/' + parentOf(resolvePath(state, srcName)).name;
  const { dir: d, name } = parentOf(abs);
  const parent = getNode(state, d);
  if (!parent || parent.type !== 'dir') return `${cmd}: '${dest}' にアクセスできません: そのようなファイルやディレクトリはありません`;
  if (!canWrite(state, parent, user)) return `${cmd}: '${dest}' に書き込めません: 許可がありません`;
  parent.children[name] = src;
  return '';
}

function tokenize(line: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

function runArgs(ctx: Ctx, tokens: string[]): string {
  // リダイレクト > と >>
  const gt = tokens.findIndex((t) => t === '>' || t === '>>');
  let redirect: { file: string; append: boolean } | null = null;
  if (gt >= 0) {
    if (!tokens[gt + 1]) return 'エラー: > のあとにファイル名が必要です';
    redirect = { file: tokens[gt + 1], append: tokens[gt] === '>>' };
    tokens = tokens.slice(0, gt);
  }
  const [name, ...args] = tokens;
  if (!name) return '';
  const cmd = commands[name];
  if (!cmd) return `${name}: コマンドが見つかりません(help で一覧が見られます)`;
  const out = cmd(ctx, args);
  if (redirect) {
    const abs = resolvePath(ctx.state, redirect.file);
    const existing = getNode(ctx.state, abs);
    if (existing && existing.type === 'dir') return `bash: ${redirect.file}: ディレクトリです`;
    const { dir: d, name: fname } = parentOf(abs);
    const parent = getNode(ctx.state, d);
    if (!parent || parent.type !== 'dir') return `bash: ${redirect.file}: そのようなファイルやディレクトリはありません`;
    if (existing ? !canWrite(ctx.state, existing, ctx.user) : !canWrite(ctx.state, parent, ctx.user)) return `bash: ${redirect.file}: 許可がありません`;
    const prev = existing && existing.type === 'file' && redirect.append ? existing.content : '';
    parent.children[fname] = file(prev + out + '\n', existing?.mode ?? 'rw-r--r--', existing?.owner ?? ctx.user);
    return '';
  }
  return out;
}

/** 1行のコマンドを実行し、出力を返す */
export function exec(state: ShellState, line: string): string {
  const trimmed = line.trim();
  state.lastCommand = trimmed;
  if (trimmed) state.history.push(trimmed);
  const out = runArgs({ state, user: state.user }, tokenize(trimmed));
  state.lastOutput = out;
  return out;
}

// ---- 判定 ----

export interface ShellCheck {
  cwd?: string;
  exists?: string;
  notExists?: string;
  isDir?: string;
  content?: { path: string; includes?: string; equals?: string };
  executable?: string;
  notExecutable?: string;
  processGone?: number;
  processExists?: number;
  lastOutputIncludes?: string;
  lastCommandIncludes?: string;
  git?: GitCheck;
  message: string;
}

export interface GitCheck {
  initialized?: boolean;
  commits?: number; // 今のブランチのコミット数がこの値以上
  lastMessageIncludes?: string;
  branch?: string;
  branchExists?: string;
  staged?: string; // このファイルがステージされている(最後のコミットと違う内容で)
  notStaged?: string; // このファイルはステージされていない(最後のコミットと同じ)
  tracked?: string; // 最後のコミットに含まれている
  notTracked?: string; // 最後のコミットに含まれていない
  clean?: boolean;
  remote?: boolean;
  pushed?: boolean; // 今のブランチが最新まで push 済み
  upstream?: boolean;
  merged?: string; // このブランチの先頭が今のブランチの履歴に含まれている
}

function gitCheck(state: ShellState, g: GitCheck): boolean {
  const r = state.repo;
  if (g.initialized !== undefined && !!r !== g.initialized) return false;
  if (!r) return !Object.keys(g).some((k) => k !== 'initialized');
  const head = r.branches[r.branch];
  const count = (id: string | null) => { let n = 0; while (id) { n++; id = r.commits[id].parent; } return n; };
  if (g.commits !== undefined && count(head) < g.commits) return false;
  if (g.lastMessageIncludes !== undefined && !(head && r.commits[head].message.includes(g.lastMessageIncludes))) return false;
  if (g.branch !== undefined && r.branch !== g.branch) return false;
  if (g.branchExists !== undefined && !(g.branchExists in r.branches)) return false;
  if (g.staged !== undefined && !changes(state, r).staged.some((s) => s.path === g.staged)) return false;
  if (g.notStaged !== undefined && changes(state, r).staged.some((s) => s.path === g.notStaged)) return false;
  if (g.tracked !== undefined && !(g.tracked in headTree(r))) return false;
  if (g.notTracked !== undefined && g.notTracked in headTree(r)) return false;
  if (g.clean !== undefined) { const c = changes(state, r); const clean = !c.staged.length && !c.unstaged.length && !c.untracked.length; if (clean !== g.clean) return false; }
  if (g.remote !== undefined && !!r.remote !== g.remote) return false;
  if (g.pushed !== undefined && (r.pushed[r.branch] === head && !!head) !== g.pushed) return false;
  if (g.upstream !== undefined && !!r.upstream[r.branch] !== g.upstream) return false;
  if (g.merged !== undefined) {
    const tip = r.branches[g.merged];
    if (!tip) return false;
    let id = head, found = false;
    while (id) { if (id === tip) { found = true; break; } id = r.commits[id].parent; }
    if (!found) return false;
  }
  return true;
}

export function judgeShell(state: ShellState, checks: ShellCheck[]): { correct: boolean; message: string } {
  for (const c of checks) {
    const fail = { correct: false, message: c.message };
    if (c.git && !gitCheck(state, c.git)) return fail;
    if (c.cwd !== undefined && state.cwd !== c.cwd) return fail;
    if (c.exists !== undefined && !getNode(state, c.exists)) return fail;
    if (c.notExists !== undefined && getNode(state, c.notExists)) return fail;
    if (c.isDir !== undefined && getNode(state, c.isDir)?.type !== 'dir') return fail;
    if (c.content) {
      const n = getNode(state, c.content.path);
      if (!n || n.type !== 'file') return fail;
      if (c.content.includes !== undefined && !n.content.includes(c.content.includes)) return fail;
      if (c.content.equals !== undefined && n.content.trim() !== c.content.equals.trim()) return fail;
    }
    if (c.executable !== undefined) { const n = getNode(state, c.executable); if (!n || n.mode[2] !== 'x') return fail; }
    if (c.notExecutable !== undefined) { const n = getNode(state, c.notExecutable); if (!n || n.mode[2] === 'x') return fail; }
    if (c.processGone !== undefined && state.processes.some((p) => p.pid === c.processGone)) return fail;
    if (c.processExists !== undefined && !state.processes.some((p) => p.pid === c.processExists)) return fail;
    if (c.lastOutputIncludes !== undefined && !state.lastOutput.includes(c.lastOutputIncludes)) return fail;
    if (c.lastCommandIncludes !== undefined && !state.lastCommand.includes(c.lastCommandIncludes)) return fail;
  }
  return { correct: true, message: '' };
}
