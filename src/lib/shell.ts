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

export interface ShellState {
  root: DirNode;
  cwd: string;
  user: string;
  home: string;
  env: Record<string, string>;
  processes: Process[];
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
  clear            画面を消す
  help             この一覧`;

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
    const names = Object.keys(node.children).sort();
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
};

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
  message: string;
}

export function judgeShell(state: ShellState, checks: ShellCheck[]): { correct: boolean; message: string } {
  for (const c of checks) {
    const fail = { correct: false, message: c.message };
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
