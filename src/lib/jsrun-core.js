// JavaScript 練習場の「利用者のコードを動かす部分」。
// ブラウザでは jsrunner.ts がこの関数を文字列にして iframe に埋め込み、
// Node では scripts/check-tasks.mjs が模範解答の確認に使う。両方で同じ動きにするため、ここ1か所に置く。
// 文字列にして埋め込むので、この関数の外の変数や import を参照しないこと(Promise、JSON、setTimeout などの組み込みは使ってよい)。
//
// - コードは async 関数として動かすので、いちばん外側でも await が使える
// - fetch は本物のネットワークにつながず、練習用のにせ API(https://shop.example/api/...)が答える
// - setTimeout と fetch がすべて終わるまで待ってから結果を返す(1回の待ちは最大2秒)

/**
 * @param {string} code 利用者のコード
 * @param {string[]} calls コードを動かしたあとに評価する式(判定用)。Promise なら結果を待つ
 * @param {{ onLog?: (line: string) => void, after?: (settle: () => Promise<void>) => Promise<void> }} [hooks]
 *   onLog: console.log のたびに呼ぶ(実行が終わったあと、ボタンの処理などから出た行を画面に足すため)
 *   after: コードと待ちが終わったあとに呼ぶ(画面の課題で、ボタンを押すなどの操作をしてから判定するため)。
 *          settle を await すると、操作で始まった setTimeout や fetch が終わるまで待てる
 * @returns {Promise<{ ok: boolean, logs: string[], error?: string, results?: ({ v: unknown } | { e: string })[] }>}
 */
export function runUserCode(code, calls, hooks) {
  var logs = [];
  function out(s) {
    logs.push(s);
    if (hooks && hooks.onLog) hooks.onLog(s);
  }
  var pending = 0; // まだ終わっていない setTimeout と fetch の数
  var idleWaiters = []; // pending が 0 になったら呼ぶ関数
  var asyncError = null; // setTimeout の中で起きたエラー

  function begin() { pending++; }
  function end() {
    pending--;
    if (pending === 0) {
      var w = idleWaiters;
      idleWaiters = [];
      for (var i = 0; i < w.length; i++) w[i]();
    }
  }

  function fmt(v) {
    if (typeof v === 'string') return v;
    if (v === undefined) return 'undefined';
    if (typeof v === 'function') return '[関数 ' + (v.name || '') + ']';
    if (v && typeof v.then === 'function') return '[Promise]';
    if (v && v.__response) return '[Response ' + v.status + ' ' + v.statusText + ']';
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  function line(args) { return Array.prototype.map.call(args, fmt).join(' '); }
  var fakeConsole = {
    log: function () { out(line(arguments)); },
    info: function () { out(line(arguments)); },
    error: function () { out('エラー: ' + line(arguments)); },
    warn: function () { out('警告: ' + line(arguments)); },
  };

  // ---- setTimeout / clearTimeout(終わるまで待てるように数を数える) ----
  var timers = {};
  var timerSeq = 0;
  function userSetTimeout(fn, ms) {
    var args = Array.prototype.slice.call(arguments, 2);
    var id = ++timerSeq;
    var delay = Math.min(Math.max(Number(ms) || 0, 0), 2000);
    begin();
    timers[id] = setTimeout(function () {
      delete timers[id];
      try { if (typeof fn === 'function') fn.apply(null, args); } catch (e) { if (!asyncError) asyncError = String(e); }
      end();
    }, delay);
    return id;
  }
  function userClearTimeout(id) {
    if (!timers[id]) return;
    clearTimeout(timers[id]);
    delete timers[id];
    end();
  }

  // ---- 練習用のにせ API(SQL 分野のネットショップと同じ商品) ----
  var products = [
    { id: 1, name: 'ノートパソコン', category: 'パソコン', price: 128000, stock: 5 },
    { id: 2, name: 'デスクトップパソコン', category: 'パソコン', price: 98000, stock: 3 },
    { id: 3, name: 'タブレット', category: 'パソコン', price: 54000, stock: 8 },
    { id: 4, name: 'マウス', category: '周辺機器', price: 2500, stock: 40 },
    { id: 5, name: 'キーボード', category: '周辺機器', price: 6800, stock: 25 },
    { id: 6, name: 'モニター', category: '周辺機器', price: 32000, stock: 10 },
    { id: 7, name: 'Webカメラ', category: '周辺機器', price: 4200, stock: 15 },
    { id: 8, name: 'ヘッドセット', category: '周辺機器', price: 7500, stock: 12 },
    { id: 9, name: 'USBメモリ', category: '記憶装置', price: 1800, stock: 60 },
    { id: 10, name: '外付けSSD', category: '記憶装置', price: 12000, stock: 20 },
    { id: 11, name: '外付けHDD', category: '記憶装置', price: 9800, stock: 18 },
    { id: 12, name: 'LANケーブル', category: 'ケーブル', price: 800, stock: 100 },
  ];
  var nextOrderId = 1001;
  var STATUS_TEXT = { 200: 'OK', 201: 'Created', 400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed', 500: 'Internal Server Error' };

  function copy(v) { return JSON.parse(JSON.stringify(v)); }

  // [ステータス, 返す JSON] を返す。null ならつながらない(fetch がエラーになる)
  function route(url, options) {
    var m = /^https:\/\/shop\.example(\/[^?#]*)?/.exec(url);
    if (!m) return null;
    var path = (m[1] || '/').replace(/\/+$/, '') || '/';
    var method = String(options.method || 'GET').toUpperCase();
    var one;
    if (path === '/api/products') {
      if (method !== 'GET') return [405, { error: 'この URL は GET だけ使えます' }];
      return [200, copy(products)];
    }
    if ((one = /^\/api\/products\/([^/]+)$/.exec(path))) {
      if (method !== 'GET') return [405, { error: 'この URL は GET だけ使えます' }];
      var p = products.filter(function (x) { return String(x.id) === one[1]; })[0];
      return p ? [200, copy(p)] : [404, { error: '商品が見つかりません' }];
    }
    if (path === '/api/orders') {
      if (method !== 'POST') return [405, { error: 'この URL は POST だけ使えます' }];
      var body;
      try { body = JSON.parse(String(options.body)); } catch (e) { body = null; }
      if (!body || typeof body !== 'object') return [400, { error: '送るデータは JSON.stringify で JSON にしてください' }];
      var item = products.filter(function (x) { return x.id === body.productId; })[0];
      if (!item) return [404, { error: '商品が見つかりません' }];
      var q = body.quantity;
      if (typeof q !== 'number' || q < 1 || Math.floor(q) !== q) return [400, { error: '数量は1以上の整数にしてください' }];
      if (q > item.stock) return [400, { error: '在庫が足りません(在庫 ' + item.stock + '個)' }];
      return [201, { orderId: nextOrderId++, productId: item.id, name: item.name, quantity: q, total: item.price * q }];
    }
    if (path === '/api/broken') return [500, { error: 'サーバーで問題が起きました' }];
    return [404, { error: 'その URL はありません' }];
  }

  function makeResponse(status, data, url) {
    var text = JSON.stringify(data);
    var res = {
      ok: status >= 200 && status < 300,
      status: status,
      statusText: STATUS_TEXT[status] || '',
      url: url,
      headers: { get: function (name) { return String(name).toLowerCase() === 'content-type' ? 'application/json' : null; } },
      json: function () { return Promise.resolve(JSON.parse(text)); },
      text: function () { return Promise.resolve(text); },
    };
    Object.defineProperty(res, '__response', { value: true });
    return res;
  }

  function fakeFetch(url, options) {
    var u = String(url);
    var opts = options || {};
    begin();
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        var r = route(u, opts);
        if (!r) reject(new TypeError('Failed to fetch'));
        else resolve(makeResponse(r[0], r[1], u));
        end();
      }, 200);
    });
  }

  // setTimeout と fetch がすべて終わり、そのあとの .then も流れ終わるまで待つ。
  // 待ちが 0 になったら、念のため2回だけ次の順番(setTimeout 0)まで様子を見て、新しい待ちが増えていなければ終わり
  function settle() {
    return new Promise(function (resolve) {
      function check(n) {
        if (pending > 0) { idleWaiters.push(function () { check(0); }); return; }
        if (n < 2) { setTimeout(function () { check(n + 1); }, 0); return; }
        resolve();
      }
      check(0);
    });
  }

  var AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  var tail = '\n;return [' + calls.map(function (c) {
    return 'await (async function(){try{return {v: await (' + c + ')}}catch(e){return {e:String(e)}}})()';
  }).join(',') + '];';
  var fn;
  try {
    fn = new AsyncFunction('console', 'alert', 'prompt', 'fetch', 'setTimeout', 'clearTimeout', code + tail);
  } catch (e) {
    return Promise.resolve({ ok: false, logs: logs, error: String(e) });
  }
  var alertFn = function (m) { out('[alert] ' + fmt(m)); };
  var promptFn = function () { return null; };
  return fn(fakeConsole, alertFn, promptFn, fakeFetch, userSetTimeout, userClearTimeout).then(
    function (results) {
      return settle().then(function () {
        if (asyncError || !hooks || !hooks.after) return;
        return Promise.resolve()
          .then(function () { return hooks.after(settle); })
          .then(settle, function (e) { if (!asyncError) asyncError = String(e); });
      }).then(function () {
        return asyncError ? { ok: false, logs: logs, error: asyncError } : { ok: true, logs: logs, results: results };
      });
    },
    function (e) {
      return settle().then(function () { return { ok: false, logs: logs, error: String(e) }; });
    }
  );
}
