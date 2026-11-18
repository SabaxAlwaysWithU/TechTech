// ネットワーク分野の練習場: 小さなネットワークのシミュレータ。
// PC → ルーター → インターネット → DNS / Webサーバー の部品を壊したり直したりして、
// ping / curl / nslookup などのコマンドが本物と同じ失敗の仕方をするのを見る。

export type Part = 'cable' | 'ipconfig' | 'router' | 'wan' | 'dns' | 'server' | 'port' | 'cert' | 'app' | 'db';

export interface NetState {
  // true = 正常
  cable: boolean; // PCとルーターの間のケーブル(Wi-Fi)
  ipconfig: boolean; // PCがIPアドレスをもらえている(DHCP)
  router: boolean; // ルーターの電源
  wan: boolean; // ルーターの先(プロバイダ、インターネット)
  dns: boolean; // DNSサーバー
  server: boolean; // Webサーバーの電源
  port: boolean; // Webサーバーの80/443番ポートが開いている(ファイアウォール)
  // Webサーバーの中身: nginx(受付)→ アプリ(Express、:3000)→ データベース(PostgreSQL、:5432)
  cert: boolean; // nginx の HTTPS 証明書が有効
  app: boolean; // nginx の後ろのアプリが動いている
  db: boolean; // アプリの後ろのデータベースが動いている
  lastOutput: string;
  lastCommand: string;
  used: string[]; // 使ったコマンド名
  history: string[];
}

export const PARTS: { id: Part; label: string; where: string; broken: string; fixed: string }[] = [
  { id: 'cable', label: 'ケーブル / Wi-Fi', where: 'PC とルーターの間', broken: 'ケーブルが抜けている(Wi-Fi が切れている)', fixed: 'つながっている' },
  { id: 'ipconfig', label: 'IPアドレスの設定', where: 'PC', broken: 'IPアドレスをもらえていない(DHCP 失敗)', fixed: '192.168.1.10 をもらっている' },
  { id: 'router', label: 'ルーター', where: '家の中', broken: '電源が入っていない', fixed: '動いている(192.168.1.1)' },
  { id: 'wan', label: 'インターネット回線', where: 'ルーターの先', broken: 'プロバイダとの接続が切れている', fixed: 'つながっている' },
  { id: 'dns', label: 'DNSサーバー', where: 'インターネット上', broken: '応答しない', fixed: '動いている(8.8.8.8)' },
  { id: 'server', label: 'Webサーバー', where: 'インターネット上', broken: '電源が入っていない', fixed: '動いている(93.184.216.34)' },
  { id: 'port', label: 'サーバーのポート', where: 'Webサーバーのファイアウォール', broken: '80 / 443 番が閉じている', fixed: '80 / 443 番が開いている' },
  { id: 'cert', label: '証明書', where: 'Webサーバーの nginx', broken: '有効期限が切れている', fixed: '有効(認証局: Let\'s Encrypt)' },
  { id: 'app', label: 'アプリ', where: 'nginx の後ろ(localhost:3000)', broken: '止まっている', fixed: '動いている(Express)' },
  { id: 'db', label: 'データベース', where: 'アプリの後ろ(localhost:5432)', broken: '止まっている', fixed: '動いている(PostgreSQL)' },
];

export const HOSTS: Record<string, string> = {
  'example.com': '93.184.216.34',
  'www.example.com': '93.184.216.34',
  'techtech.example': '93.184.216.34',
};
const SERVER_IP = '93.184.216.34';
const GATEWAY = '192.168.1.1';
const PC_IP = '192.168.1.10';
const DNS_IP = '8.8.8.8';

export function createNet(): NetState {
  return { cable: true, ipconfig: true, router: true, wan: true, dns: true, server: true, port: true, cert: true, app: true, db: true, lastOutput: '', lastCommand: '', used: [], history: [] };
}

export function toggle(state: NetState, part: Part) {
  state[part] = !state[part];
}

export function healthy(state: NetState): boolean {
  return PARTS.every((p) => state[p.id]);
}

const HELP = `使えるコマンド:
  ip addr            自分のIPアドレスを見る(Windows の ipconfig と同じ)
  ping 宛先           宛先に届くか確かめる(例: ping 192.168.1.1、ping example.com)
  nslookup 名前       名前からIPアドレスを引く(DNS)
  traceroute 宛先     宛先までの経路を1段ずつ見る
  curl URL           Webページを取りに行く(例: curl http://example.com/)
  curl -I URL        ヘッダー(状態コードなど)だけ見る
  curl -k URL        証明書の確認を飛ばす(危険。確認用)
  help               この一覧

試せるURL:
  http://example.com/                静的ページ(nginx が直接返す)
  http://example.com/api/products    API(nginx → アプリ → データベース)
  https://example.com/               HTTPS(証明書が必要)`;

// ---- 到達性の判定(下の層から順に調べる) ----

type Reach =
  | { ok: true }
  | { ok: false; stage: 'ipconfig' | 'cable' | 'router' | 'wan' | 'server' };

function reach(state: NetState, ip: string): Reach {
  if (!state.ipconfig) return { ok: false, stage: 'ipconfig' };
  if (!state.cable) return { ok: false, stage: 'cable' };
  if (ip === PC_IP || ip === '127.0.0.1') return { ok: true };
  if (!state.router) return { ok: false, stage: 'router' };
  if (ip === GATEWAY) return { ok: true };
  if (!state.wan) return { ok: false, stage: 'wan' };
  if (ip === DNS_IP) return state.dns ? { ok: true } : { ok: false, stage: 'server' };
  if (ip === SERVER_IP) return state.server ? { ok: true } : { ok: false, stage: 'server' };
  return { ok: false, stage: 'server' };
}

type Resolve = { ok: true; ip: string } | { ok: false; error: string };

function resolve(state: NetState, host: string): Resolve {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return { ok: true, ip: host };
  if (host === 'localhost') return { ok: true, ip: '127.0.0.1' };
  const r = reach(state, DNS_IP);
  if (!r.ok || !state.dns) return { ok: false, error: 'Temporary failure in name resolution' };
  const ip = HOSTS[host];
  if (!ip) return { ok: false, error: 'Name or service not known' };
  return { ok: true, ip };
}

function isIp(s: string) { return /^\d+\.\d+\.\d+\.\d+$/.test(s); }

// ---- コマンド ----

function cmdIp(state: NetState): string {
  if (!state.ipconfig) return `1: lo: <LOOPBACK,UP>\n    inet 127.0.0.1/8\n2: eth0: <BROADCAST,MULTICAST${state.cable ? ',UP' : ''}>\n    inet 169.254.33.7/16 (自動構成アドレス: DHCP からIPをもらえていません)`;
  return `1: lo: <LOOPBACK,UP>\n    inet 127.0.0.1/8\n2: eth0: <BROADCAST,MULTICAST${state.cable ? ',UP,LOWER_UP' : ''}>\n    inet ${PC_IP}/24\n    gateway ${GATEWAY}\n    dns ${DNS_IP}`;
}

function cmdPing(state: NetState, target?: string): string {
  if (!target) return 'ping: 宛先を指定してください(例: ping 192.168.1.1)';
  const res = resolve(state, target);
  if (!res.ok) return `ping: ${target}: ${res.error}`;
  const ip = res.ip;
  const r = reach(state, ip);
  const head = `PING ${target} (${ip}) 56(84) bytes of data.`;
  if (r.ok) {
    const ms = ip === PC_IP || ip === '127.0.0.1' ? 0.05 : ip === GATEWAY ? 0.8 : 12.4;
    const lines = [1, 2, 3].map((i) => `64 bytes from ${ip}: icmp_seq=${i} ttl=${ip === GATEWAY ? 64 : 56} time=${(ms + i * 0.1).toFixed(1)} ms`);
    return [head, ...lines, '', `--- ${target} ping statistics ---`, '3 packets transmitted, 3 received, 0% packet loss'].join('\n');
  }
  switch (r.stage) {
    case 'ipconfig':
    case 'cable':
      return `ping: connect: Network is unreachable`;
    case 'router':
      return [head, `From ${PC_IP} icmp_seq=1 Destination Host Unreachable`, `From ${PC_IP} icmp_seq=2 Destination Host Unreachable`, `From ${PC_IP} icmp_seq=3 Destination Host Unreachable`, '', `--- ${target} ping statistics ---`, '3 packets transmitted, 0 received, +3 errors, 100% packet loss'].join('\n');
    case 'wan':
    case 'server':
      return [head, '', `--- ${target} ping statistics ---`, '3 packets transmitted, 0 received, 100% packet loss, time 2050ms'].join('\n');
  }
}

function cmdNslookup(state: NetState, host?: string): string {
  if (!host) return 'nslookup: 名前を指定してください(例: nslookup example.com)';
  const r = reach(state, DNS_IP);
  if (!r.ok || !state.dns) {
    return `;; connection timed out; no servers could be reached\n\n(DNSサーバー ${DNS_IP} に届きません)`;
  }
  if (isIp(host)) return `Server:\t\t${DNS_IP}\nAddress:\t${DNS_IP}#53\n\n${host} の名前は登録されていません(逆引きなし)`;
  const ip = HOSTS[host];
  if (!ip) return `Server:\t\t${DNS_IP}\nAddress:\t${DNS_IP}#53\n\n** server can't find ${host}: NXDOMAIN`;
  return `Server:\t\t${DNS_IP}\nAddress:\t${DNS_IP}#53\n\nNon-authoritative answer:\nName:\t${host}\nAddress: ${ip}`;
}

function cmdTraceroute(state: NetState, target?: string): string {
  if (!target) return 'traceroute: 宛先を指定してください';
  const res = resolve(state, target);
  if (!res.ok) return `traceroute: ${target}: ${res.error}`;
  const ip = res.ip;
  const lines = [`traceroute to ${target} (${ip}), 30 hops max`];
  if (!state.ipconfig || !state.cable) return `traceroute: connect: Network is unreachable`;
  lines.push(state.router ? ` 1  ${GATEWAY} (${GATEWAY})  0.8 ms  0.7 ms  0.9 ms` : ' 1  * * *');
  if (!state.router) { lines.push(' 2  * * *', ' 3  * * *', '(ルーターから先に進めません)'); return lines.join('\n'); }
  if (ip === GATEWAY) return lines.join('\n');
  lines.push(state.wan ? ' 2  10.0.0.1 (10.0.0.1)  4.2 ms  4.0 ms  4.3 ms(プロバイダ)' : ' 2  * * *');
  if (!state.wan) { lines.push(' 3  * * *', '(インターネット回線の先に進めません)'); return lines.join('\n'); }
  lines.push(' 3  203.0.113.1 (203.0.113.1)  8.1 ms  8.3 ms  8.0 ms');
  const alive = ip === DNS_IP ? state.dns : ip === SERVER_IP ? state.server : false;
  lines.push(alive ? ` 4  ${ip} (${ip})  12.4 ms  12.6 ms  12.3 ms` : ' 4  * * *\n 5  * * *\n(宛先が応答しません)');
  return lines.join('\n');
}

const NGINX_502 = '<html>\n<head><title>502 Bad Gateway</title></head>\n<body>\n<center><h1>502 Bad Gateway</h1></center>\n<hr><center>nginx/1.24.0</center>\n</body>\n</html>';

function cmdCurl(state: NetState, args: string[]): string {
  const headOnly = args.includes('-I') || args.includes('--head');
  const insecure = args.includes('-k') || args.includes('--insecure');
  const url = args.find((a) => !a.startsWith('-'));
  if (!url) return 'curl: URL を指定してください(例: curl http://example.com/)';
  const m = url.match(/^(https?):\/\/([^/:]+)(?::(\d+))?(\/.*)?$/);
  if (!m) return `curl: (3) URL using bad/illegal format: ${url}(http:// か https:// から始めてください)`;
  const [, scheme, host, portStr, path = '/'] = m;
  const port = portStr ? Number(portStr) : scheme === 'https' ? 443 : 80;
  const res = resolve(state, host);
  if (!res.ok) return `curl: (6) Could not resolve host: ${host}`;
  const ip = res.ip;
  const r = reach(state, ip);
  if (!r.ok) {
    if (r.stage === 'ipconfig' || r.stage === 'cable') return `curl: (7) Failed to connect to ${host} port ${port}: Network is unreachable`;
    if (r.stage === 'router') return `curl: (7) Failed to connect to ${host} port ${port}: No route to host`;
    return `curl: (28) Failed to connect to ${host} port ${port} after 30000 ms: Connection timed out`;
  }
  if (ip !== SERVER_IP) return `curl: (7) Failed to connect to ${host} port ${port}: Connection refused`;
  if (!state.port || (port !== 80 && port !== 443)) return `curl: (7) Failed to connect to ${host} port ${port}: Connection refused`;
  if (scheme === 'http' && port === 443) return `curl: (1) Received HTTP/0.9 when not allowed(443番は HTTPS 用です。https:// にしてください)`;
  if (scheme === 'https' && port === 80) return `curl: (35) error:0A00010B:SSL routines::wrong version number(80番は HTTP 用です。http:// にしてください)`;
  // HTTPS: nginx が証明書を見せる。期限切れなら curl は通信を始める前に止める
  if (scheme === 'https' && !state.cert && !insecure) {
    return `curl: (60) SSL certificate problem: certificate has expired\nMore details here: https://curl.se/docs/sslcerts.html\n\n(証明書の有効期限が切れています。ブラウザなら「この接続ではプライバシーが保護されません」と表示されます)`;
  }

  let status: number;
  let type = 'text/html; charset=utf-8';
  let body: string;
  const extra: string[] = [];
  if (path.startsWith('/api/')) {
    // /api/ 宛ては nginx がアプリ(localhost:3000)へ回す(リバースプロキシ)
    if (!state.app) {
      status = 502;
      body = NGINX_502;
    } else {
      extra.push('X-Powered-By: Express');
      type = 'application/json; charset=utf-8';
      if (path === '/api/products') {
        if (!state.db) {
          status = 500;
          body = '{"error":"connect ECONNREFUSED 127.0.0.1:5432"}';
        } else {
          status = 200;
          body = '{"products":[{"id":1,"name":"ノートパソコン","price":128000},{"id":4,"name":"マウス","price":2500},{"id":9,"name":"USBメモリ","price":1800}]}';
        }
      } else {
        status = 404;
        body = `{"error":"${path} は見つかりません"}`;
      }
    }
  } else {
    // それ以外は nginx が自分でファイルを返す(アプリもデータベースも使わない)
    status = path === '/' || path === '/index.html' ? 200 : path === '/admin' ? 403 : path === '/boom' ? 500 : 404;
    body = status === 200
      ? '<!doctype html>\n<html>\n<head><title>Example Domain</title></head>\n<body>\n<h1>Example Domain</h1>\n<p>このドメインは説明用の例です。</p>\n</body>\n</html>'
      : status === 404 ? `<h1>404 Not Found</h1>\n<p>${path} というページはありません。</p>`
      : status === 403 ? '<h1>403 Forbidden</h1>\n<p>このページを見る権限がありません。</p>'
      : '<h1>500 Internal Server Error</h1>\n<p>サーバー側のプログラムでエラーが起きました。</p>';
  }
  const reason = ({ 200: 'OK', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway' } as Record<number, string>)[status];
  const headers = [
    `HTTP/1.1 ${status} ${reason}`,
    'Server: nginx/1.24.0',
    `Content-Type: ${type}`,
    ...extra,
    `Date: ${new Date().toUTCString()}`,
    scheme === 'https' ? 'Strict-Transport-Security: max-age=31536000' : '',
  ].filter(Boolean);
  const warn = scheme === 'https' && !state.cert && insecure ? '(警告: 証明書の確認を飛ばしています。本番では使わないでください)\n' : '';
  if (headOnly) return warn + headers.join('\n');
  return warn + body;
}

function tokenize(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function exec(state: NetState, line: string): string {
  const trimmed = line.trim();
  state.lastCommand = trimmed;
  if (trimmed) state.history.push(trimmed);
  const [name, ...args] = tokenize(trimmed);
  let out = '';
  if (!name) out = '';
  else if (name === 'help') out = HELP;
  else if (name === 'ip' || name === 'ipconfig' || name === 'ifconfig') out = cmdIp(state);
  else if (name === 'ping') out = cmdPing(state, args.find((a) => !a.startsWith('-')));
  else if (name === 'nslookup' || name === 'dig' || name === 'host') out = cmdNslookup(state, args[0]);
  else if (name === 'traceroute' || name === 'tracert') out = cmdTraceroute(state, args[0]);
  else if (name === 'curl' || name === 'wget') out = cmdCurl(state, args);
  else if (name === 'clear') out = '\u0000clear';
  else out = `${name}: コマンドが見つかりません(help で一覧が見られます)`;
  if (name && !state.used.includes(name)) state.used.push(name);
  state.lastOutput = out;
  return out;
}

// ---- 判定 ----

export interface NetCheck {
  parts?: Partial<Record<Part, boolean>>; // 各部品の状態がこの通り
  healthy?: boolean;
  lastCommandIncludes?: string;
  lastOutputIncludes?: string;
  usedCommand?: string; // このコマンドを一度は使った
  message: string;
}

export function judgeNet(state: NetState, checks: NetCheck[]): { correct: boolean; message: string } {
  for (const c of checks) {
    const fail = { correct: false, message: c.message };
    if (c.parts) for (const [k, v] of Object.entries(c.parts)) if (state[k as Part] !== v) return fail;
    if (c.healthy !== undefined && healthy(state) !== c.healthy) return fail;
    if (c.lastCommandIncludes !== undefined && !state.lastCommand.includes(c.lastCommandIncludes)) return fail;
    if (c.lastOutputIncludes !== undefined && !state.lastOutput.includes(c.lastOutputIncludes)) return fail;
    if (c.usedCommand !== undefined && !state.used.includes(c.usedCommand)) return fail;
  }
  return { correct: true, message: '' };
}
