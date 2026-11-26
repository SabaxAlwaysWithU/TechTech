// 「コンピュータの中の数」の練習場の計算と判定。画面(BitsPractice.astro)と scripts/check-tasks.mjs の両方で使う。
// ビットの並びは配列で持つ。bits[0] がいちばん左(いちばん大きい桁)。
//
// 課題の bits(練習場の設定):
//   { width: 8, fraction: 0, start: "00000000", ops: ["inc", "dec", "shl", "shr", "not"] }
//   fraction は小数点より右のビットの数(小数の課題)。start は最初の並び(省略すると全部 0)
// 課題の bitChecks(すべて満たせば正解):
//   { value: 13 }      符号なしの整数としての値
//   { signed: -1 }     2の補数(符号あり)としての値
//   { fixed: 2.75 }    小数点の位置を fraction で決めたときの値
//   { usedOp: "inc" }  その操作のボタンを1回以上押した
//   { ones: 3 }        1 のビットの数
//   message: 満たさないときに出す1行

export var OPS = {
  inc: '+1',
  dec: '-1',
  shl: '左へずらす <<',
  shr: '右へずらす >>',
  not: '反転 ~',
};

export function fromString(s, width) {
  var clean = String(s || '').replace(/[^01]/g, '');
  var out = [];
  for (var i = 0; i < width; i++) out.push(0);
  // 右詰めで入れる(短ければ左を 0 で埋める)
  for (var j = 0; j < Math.min(clean.length, width); j++) out[width - 1 - j] = clean[clean.length - 1 - j] === '1' ? 1 : 0;
  return out;
}

/** 区切りの大きさ。ふつうは4ビットずつ(16進数の1文字)、9ビットのように3の倍数なら3ビットずつ(8進数の1文字) */
export function groupSize(width) {
  return width % 4 !== 0 && width % 3 === 0 ? 3 : 4;
}

export function toString(bits) {
  var g = groupSize(bits.length);
  var s = '';
  for (var i = 0; i < bits.length; i++) {
    if (i > 0 && (bits.length - i) % g === 0) s += ' ';
    s += bits[i];
  }
  return s;
}

/** 符号なしの整数 */
export function unsigned(bits) {
  var v = 0;
  for (var i = 0; i < bits.length; i++) v = v * 2 + bits[i];
  return v;
}

/** 2の補数(いちばん左のビットが 1 なら負) */
export function signed(bits) {
  var v = unsigned(bits);
  return bits[0] === 1 ? v - Math.pow(2, bits.length) : v;
}

/** 小数点より右に fraction 個のビットがあるとしたときの値 */
export function fixed(bits, fraction) {
  return unsigned(bits) / Math.pow(2, fraction || 0);
}

export function hex(bits) {
  var digits = Math.ceil(bits.length / 4);
  var h = unsigned(bits).toString(16).toUpperCase();
  while (h.length < digits) h = '0' + h;
  return h;
}

/** 表示できる ASCII の文字なら、その文字 */
export function asChar(bits) {
  var v = unsigned(bits);
  if (bits.length > 8 || v < 32 || v > 126) return null;
  return String.fromCharCode(v);
}

/** 桁の重み(左から)。小数の部分は 1/2、1/4 … */
export function placeLabels(width, fraction) {
  var out = [];
  for (var i = 0; i < width; i++) {
    var p = width - fraction - 1 - i;
    out.push(p >= 0 ? String(Math.pow(2, p)) : '1/' + Math.pow(2, -p));
  }
  return out;
}

/** 操作をして、新しい並びを返す。あふれたビットは捨てる(本物の CPU と同じ) */
export function applyOp(bits, op) {
  var w = bits.length;
  var max = Math.pow(2, w);
  var v = unsigned(bits);
  if (op === 'inc') v = (v + 1) % max;
  else if (op === 'dec') v = (v - 1 + max) % max;
  else if (op === 'shl') v = (v * 2) % max;
  else if (op === 'shr') v = Math.floor(v / 2);
  else if (op === 'not') v = max - 1 - v;
  var s = v.toString(2);
  return fromString(s, w);
}

/**
 * 判定。state は { bits, used: { inc: true, ... } }
 * @returns {{ correct: boolean, message: string }}
 */
export function judgeBits(state, setup, checks) {
  var fraction = (setup && setup.fraction) || 0;
  for (var i = 0; i < checks.length; i++) {
    var c = checks[i];
    var ok = true;
    if (c.value !== undefined && unsigned(state.bits) !== c.value) ok = false;
    if (c.signed !== undefined && signed(state.bits) !== c.signed) ok = false;
    if (c.fixed !== undefined && Math.abs(fixed(state.bits, fraction) - c.fixed) > 1e-12) ok = false;
    if (c.usedOp !== undefined && !(state.used && state.used[c.usedOp])) ok = false;
    if (c.ones !== undefined && state.bits.filter(function (b) { return b === 1; }).length !== c.ones) ok = false;
    if (!ok) return { correct: false, message: c.message };
  }
  return { correct: true, message: '' };
}

/**
 * 模範解答を実行する(check-tasks.mjs と browser-check.mjs 用)。answer は1行に1つ:
 *   「0000 1101」のような 0 と 1 の並び → その並びにする
 *   「操作: +1」のような行 → そのボタンを押す(OPS の表示名か、inc などの名前)
 */
export function parseBitsAnswer(answer) {
  var steps = [];
  String(answer || '').split('\n').forEach(function (raw) {
    var line = raw.trim();
    if (!line) return;
    var m = /^操作[::]\s*(.+)$/.exec(line);
    if (m) {
      var name = m[1].trim();
      var op = OPS[name] ? name : Object.keys(OPS).filter(function (k) { return OPS[k] === name || OPS[k].split(' ')[0] === name; })[0];
      steps.push({ op: op || null, raw: line });
    } else if (/^[01 ]+$/.test(line)) {
      steps.push({ set: line.replace(/ /g, '') });
    } else {
      steps.push({ op: null, raw: line });
    }
  });
  return steps;
}

export function runBitsAnswer(setup, answer) {
  var width = (setup && setup.width) || 8;
  var state = { bits: fromString((setup && setup.start) || '', width), used: {} };
  var steps = parseBitsAnswer(answer);
  for (var i = 0; i < steps.length; i++) {
    var s = steps[i];
    if (s.set !== undefined) state.bits = fromString(s.set, width);
    else if (s.op) { state.bits = applyOp(state.bits, s.op); state.used[s.op] = true; }
    else return { error: '模範解答の行を読み取れません: ' + s.raw, state: state };
  }
  return { state: state };
}
