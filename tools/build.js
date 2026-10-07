// 使い方: node tools/build.js <08のmdファイルのパス> [<10のmdファイルのパス>]（10は省略すると08と同じフォルダから読む）
// プロンプトの元になるmdを正本にして index.html を組み立てる。
// 文字の写し間違いを防ぐため、核・部品・選択肢はmdの見出しごとに機械的に読み込む。
// mdの書き違いは、黙って壊れたページを作らずに、行番号つきの日本語のエラーで止める。
const fs = require("fs");
const path = require("path");
process.on("uncaughtException", (e) => { console.error("ビルドを止めました：" + e.message); process.exit(1); });

const SITE_URL = "https://gafu-copy.netlify.app"; // 公開先が決まったらここを直す（OGP用）
const ROOT = path.join(__dirname, "..");
const mdPath = process.argv[2];
if (!mdPath) throw new Error("mdファイルのパスを指定してください");
// 先頭のBOMを外し、改行をLFにそろえて読む（エディタの設定でCRLFになっても読めるように）
const readMd = (p) => fs.readFileSync(p, "utf8").replace(/^﻿/, "").replace(/\r\n?/g, "\n");
const t = readMd(mdPath);
const split = (s) => { const m = s.match(/^(.*?)（(.*)）$/); return m ? [m[1], m[2]] : [s, ""]; };

// 「## 見出し」の直後にあるコードブロックを取り出す。終わりの ``` は行の先頭にあるものだけを見る
function blockAt(text, heading, fail) {
  const i = text.indexOf("## " + heading);
  if (i < 0) fail("見出しが見つかりません：" + heading);
  const rest = text.slice(i);
  const m = rest.match(/^```\n([\s\S]*?)\n```[ \t]*$/m);
  if (!m) fail("コードブロックが見つかりません：" + heading + "（``` で始まる行と ``` だけの行で囲んでください）");
  const line = text.slice(0, i + m.index).split("\n").length + 1; // コードブロックの1行目の行番号
  return { body: m[1].replace(/\s+$/, ""), line };
}
const fail08 = (msg) => { throw new Error(path.basename(mdPath) + "：" + msg); };
const block = (heading) => blockAt(t, heading, fail08).body;
const core = block("プロンプトの核");
const partsText = block("プロンプトの部品");
const examples = block("仕上がりの雰囲気の例");
const opt2 = block("② 画像内の文字の選択肢");
const opt3 = block("③ 縦横比の選択肢");
const opt4 = block("④ 避けることの選択肢");
const tips = block("ツリー最後");
const core2 = block("2枚モードの核");
const parts2Text = block("2枚モードの部品");
// 注意書き：見出しの下の「- 」で始まる行（次の --- まで）
const notes2 = (() => {
  const i = t.indexOf("## 2枚モードの注意書き");
  if (i < 0) throw new Error("2枚モードの注意書きが見つかりません");
  const rest = t.slice(i).split("\n").slice(1);
  const out = [];
  for (const line of rest) { if (line.startsWith("---") || line.startsWith("## ")) break; if (line.startsWith("- ")) out.push(line.slice(2)); }
  return out;
})();

for (const tok of ["{{画風}}", "{{作り方}}", "{{質感}}", "{{足してよいもの}}", "{{追加}}"]) {
  if (!core.includes(tok)) throw new Error("核に " + tok + " がありません");
}
const parts = {};
for (const line of partsText.split("\n")) {
  const k = line.indexOf("：");
  if (k > 0) parts[line.slice(0, k)] = line.slice(k + 1);
}
for (const tok of ["{{合成のしかた}}", "{{主役の行}}", "{{足さない行}}", "{{追加}}"]) {
  if (!core2.includes(tok)) throw new Error("2枚モードの核に " + tok + " がありません");
}
const parts2 = {};
for (const line of parts2Text.split("\n")) {
  const k = line.indexOf("：");
  if (k > 0) parts2[line.slice(0, k)] = line.slice(k + 1);
}
for (const key of ["差し込む", "場所の既定", "差し替える", "相手の既定", "主役（画風なし）", "主役（画風あり）", "足さない（文字なし）", "足さない（文字あり）", "画風そのまま", "画風あり", "文字あり", "縦横比あり", "縦横比なし", "除外"]) {
  if (!parts2[key]) throw new Error("2枚モードの部品が見つかりません：" + key);
}
if (notes2.length < 3) throw new Error("2枚モードの注意書きが少なすぎます");
for (const key of ["画風の既定", "作り方（絵）", "作り方（写真）", "質感（絵）", "質感（写真）", "足してよいもの", "素材", "文字あり", "文字を残す", "文字の優先", "縦横比あり", "縦横比なし", "避けること", "除外（文字あり）", "除外（文字なし）"]) {
  if (!parts[key]) throw new Error("部品が見つかりません：" + key);
}

const categories = []; let cur = null, legend1 = "";
for (const line of examples.split("\n")) {
  if (line.startsWith("★＝")) legend1 = line;
  else if (line.startsWith("■")) { const h = line.slice(1).match(/^(.*?)(?:〔(素材|写真)〕)?$/); cur = { name: h[1], kind: h[2] || "", items: [] }; categories.push(cur); } // 見出しの終わりの〔素材〕〔写真〕は種類の印。画面には出さない
  else { const m = line.match(/^(\d+)\. ([★◆]?)(.+)$/); if (m && cur) cur.items.push({ n: +m[1], mark: m[2], text: m[3] }); }
}
// 素材の画風（作品を撮った写真として描くもの）。見出しに〔素材〕と付けた系統の全部と、フィギュア・3Dプリンタの画風
const material = categories.flatMap((c) => c.items.filter((it) => c.kind === "素材" || /フィギュア|3Dプリンタ/.test(it.text)).map((it) => it.text));
// 写真系の画風（イラストではなく写真として仕上げるもの）。見出しに〔写真〕と付けた系統の全部
const photo = categories.flatMap((c) => c.items.filter((it) => c.kind === "写真").map((it) => it.text));
// 画風の番号は、一覧の上から順に、系統をまたいで1から続けて振る（もしもと同じ決まり）。形の合わない行は読み飛ばされるので、ここで気づく
const styleItems = categories.flatMap((c) => c.items);
styleItems.forEach((it, i) => { if (it.n !== i + 1) fail08("画風の番号が、上から順の続き番号になっていません：「" + split(it.text)[0] + "」は " + it.n + " ですが、" + (i + 1) + " のはずです（系統をまたいで1から続けて振ります。「番号. 画風」の形になっていない行がないかも見てください）"); });
const styleNames = styleItems.map((it) => split(it.text)[0]);
styleNames.forEach((nm, i) => { if (styleNames.indexOf(nm) !== i) fail08("同じ名前の画風が2つあります：「" + nm + "」（名前は、種類とリンクの照らし合わせに使うので、重ねられません）"); });
// 画風の名前で照らす表（tools/style_table.json）。番号は並びで変わるので、変わらない名前で持つ
let styleTable; try { styleTable = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "style_table.json"), "utf8")); } catch (e) { throw new Error("tools/style_table.json が読めません（" + e.message + "）"); }
// 素材・写真になる画風。見出しの印の付け忘れや系統の入れ違いで、種類が黙って変わるのを止める（素材・写真の画風を足したら、表にも足す）
for (const [k, list] of [["素材", material], ["写真", photo]]) {
  const got = styleItems.filter((it) => list.includes(it.text)).map((it) => split(it.text)[0]), want = styleTable[k];
  const lack = want.filter((x) => !got.includes(x)), extra = got.filter((x) => !want.includes(x));
  if (lack.length || extra.length) fail08(k + "の画風が、決めた物と違います。" + (lack.length ? k + "になっていない：" + lack.join("・") + "。" : "") + (extra.length ? "決めた物にないのに" + k + "になっている：" + extra.join("・") + "。" : "") + "（見出しの〔" + k + "〕と、tools/style_table.json を見てください）");
}
// 番号つきリンク（sheet/?s=番号）が指す画風。2026-10-07に番号を上から順へ振り直す前の番号で、出回っているリンクが同じ画風を開くように残す
const sid = {};
for (const [id, nm] of Object.entries(styleTable["リンクの番号"])) {
  const it = styleItems.find((x) => split(x.text)[0] === nm);
  if (!it) fail08("番号つきリンク（?s=" + id + "）が指す画風「" + nm + "」が、一覧にありません（名前を変えた・消したときは、tools/style_table.json も直してください）");
  sid[id] = it.text;
}

function parseOpts(text) {
  const items = []; let legend = "";
  for (const line of text.split("\n")) {
    if (/^◎＝/.test(line)) legend = line;
    const m = line.match(/^(\d+)\. ([◎○]?)(.+)$/); if (m) items.push({ n: +m[1], mark: m[2], text: m[3] });
  }
  return { items, legend };
}
const o2 = parseOpts(opt2), o3 = parseOpts(opt3), o4 = parseOpts(opt4);
const total = categories.reduce((a, c) => a + c.items.length, 0);
// もしもモードは④の1・3・4・5番を番号で差し替える（template.html の moshiAvoidList）。番号と中身がずれたら止める
const AVOID_NO = { 1: "別人にしない", 3: "照明と色を強くしすぎない", 4: "飾りを増やしすぎない", 5: "背景の景色を描かない" };
for (const [n, head] of Object.entries(AVOID_NO)) {
  const it = o4.items.find((x) => x.n === +n);
  if (!it || !it.text.startsWith(head)) throw new Error("08の④の" + n + "番が「" + head + "…」ではありません。④の番号を変えたときは、template.html の moshiAvoidList と build.js の AVOID_NO も直してください");
}

// ---------- もしもシリーズ（10のmd。08と同じフォルダ、または3つ目の引数） ----------
const moshiPath = process.argv[3] || path.join(path.dirname(mdPath), "10_もしもシリーズプロンプト.md");
const tm = readMd(moshiPath);
const mfail = (msg) => { throw new Error(path.basename(moshiPath) + "：" + msg); };
const mblock = (heading) => blockAt(tm, heading, mfail);
const mcore = mblock("もしもモードの核").body;
const MTOK = ["{{会話の扱い}}", "{{テーマ文}}", "{{作り方}}", "{{絵柄の行}}", "{{説明}}", "{{選び方}}", "{{本人らしさ}}", "{{似せ方}}", "{{足してよいもの}}", "{{質感}}", "{{華やかさ}}", "{{守り}}", "{{露出}}", "{{カメラ}}", "{{追加}}"];
for (const tok of MTOK) if (!mcore.includes(tok)) mfail("核に " + tok + " がありません");
for (const tok of mcore.match(/\{\{[^}]*\}\}/g)) if (!MTOK.includes(tok)) mfail("核に知らないトークン " + tok + " があります");

// 部品：1行1部品（「部品名：中身」）。2行目以降は「・」で始める。読めない行・重なった部品名はエラー
const mparts = {}; let mlast = null;
{
  const pb = mblock("もしもモードの部品");
  pb.body.split("\n").forEach((line, i) => {
    const ln = pb.line + i;
    if (!line.trim()) return;
    if (line.startsWith("・")) {
      if (!mlast) mfail(ln + "行目：「・」の続きの行の前に、部品名の行がありません");
      mparts[mlast] = mparts[mlast] ? mparts[mlast] + "\n" + line.trim() : line.trim();
      return;
    }
    const k = line.indexOf("：");
    if (k <= 0) mfail(ln + "行目：読めない行です。「部品名：中身」か、「・」で始まる続きの行にしてください（字下げや「- 」は使えません）：" + line.slice(0, 30));
    const key = line.slice(0, k).trim();
    if (key in mparts) mfail(ln + "行目：部品名が重なっています：" + key);
    mlast = key; mparts[key] = line.slice(k + 1).trim();
  });
}
// 部品の中で使ってよいトークン（ほかの {{ }} は打ち間違いとして止める）
const PART_TOK = { "カメラの行": ["{{カメラワーク}}"], "絵柄の行": ["{{絵柄}}"], "文字あり（もしも・自分の言葉）": ["{{組}}"], "縦横比あり（もしも）": ["{{比率}}"], "避けること（もしも）": ["{{項目}}"] };
for (const [k, v] of Object.entries(mparts)) {
  const allowed = k.startsWith("テーマ文（") ? ["{{もしも}}"] : PART_TOK[k] || [];
  for (const tok of v.match(/\{\{[^}]*\}\}/g) || []) if (!allowed.includes(tok)) mfail("部品「" + k + "」に使えないトークン " + tok + " があります（打ち間違いかもしれません）");
  for (const tok of allowed) if (!v.includes(tok)) mfail("部品「" + k + "」に " + tok + " がありません");
}

// 選択肢：「番号. 印言葉｜型｜仕上がり｜向き｜本人｜テーマ｜AIが考える文字｜華やかさ｜似せ方｜縦横比｜季節の月｜絵柄｜守り：説明」
const COLS = ["言葉", "型", "仕上がり", "向き", "本人", "テーマ", "AIが考える文字", "華やかさ", "似せ方", "縦横比", "季節の月", "絵柄", "守り", "カメラ"];
// カメラワークの一覧（「名前｜一言：文」。おまかせだけは文が空でよい）
const mcams = [];
{
  const cb = mblock("もしものカメラワーク");
  cb.body.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    const m = line.match(/^([^｜：]+)｜([^：]*)：(.*)$/);
    if (!m) mfail((cb.line + i) + "行目：カメラワークの行が読めません（「名前｜一言：文」の形にしてください）：" + line.slice(0, 30));
    const label = m[1].trim(), text = m[3].trim();
    if (mcams.some((c) => c.label === label)) mfail((cb.line + i) + "行目：カメラワークの名前が重なっています：" + label);
    if (!text && label !== "おまかせ") mfail((cb.line + i) + "行目：カメラワーク「" + label + "」の文が空です（空でよいのはおまかせだけ）");
    if (/\{\{|}}/.test(text)) mfail((cb.line + i) + "行目：カメラワークの文にトークンが入っています");
    mcams.push({ label, hint: m[2].trim(), text });
  });
  if (!mcams.length || mcams[0].label !== "おまかせ") mfail("カメラワークの一覧の先頭は「おまかせ」にしてください");
}
const ENUM = { "型": ["選ぶ", "おまかせ", "会話から"], "仕上がり": ["写真", "絵"], "向き": ["なんでも", "人以外"],
  "本人": ["基本", "年齢", "物", "動物にする", "人にする", "似顔絵", "キャラ"], "テーマ": ["だったら", "になったら", "たとえ"],
  "AIが考える文字": ["なし", "名前と称号", "題名とひとこと", "ステータス", "セリフと言葉"], "華やかさ": ["ふつう", "豪華"], "似せ方": ["しっかり", "のびのび"],
  "絵柄": ["－", "アニメ", "絵本", "似顔絵"], "守り": ["基本", "作品"] };
const mcats = []; let mc = null, mit = null;
{
  const ob = mblock("もしもの選択肢");
  ob.body.split("\n").forEach((line, i) => {
    const ln = ob.line + i;
    const at = ln + "行目：";
    if (!line.trim()) return;
    if (line.startsWith("■")) {
      if (mc && !mc.items.length) mfail(at + "前の系統「" + mc.name + "」に選択肢が1つもありません");
      mc = { name: line.slice(1).trim(), items: [] }; mcats.push(mc); mit = null; return;
    }
    if (/^\s*(一言|注意)\s*[：:]/.test(line) && !/^　(一言|注意)：/.test(line)) mfail(at + "一言・注意の行は、全角スペース1つで字下げし、全角の「：」で書いてください");
    if (line.startsWith("　一言：")) { if (!mit) mfail(at + "一言の前に、選択肢の行がありません"); if (mit.hint) mfail(at + "一言が2つあります（" + mit.label + "）"); mit.hint = line.slice(4).trim(); return; }
    if (line.startsWith("　注意：")) { if (!mit) mfail(at + "注意の前に、選択肢の行がありません"); mit.notes.push(line.slice(4).trim()); return; }
    const m = line.match(/^(\d+)\. ([★◆]?)([^：]+)：(.+)$/);
    if (!m) mfail(at + "読めない行です。「番号. 印言葉｜…｜守り：説明」の形にしてください（番号のあとは「. 」、説明の前は全角の「：」）：" + line.slice(0, 30));
    if (!mc) mfail(at + "最初の「■系統名」より前に選択肢があります");
    const f = m[3].split("｜").map((s) => s.trim());
    if (f.length !== COLS.length) mfail(at + "項目の数が" + f.length + "です（" + COLS.length + "のはず）。区切りは全角の「｜」です。言葉や項目の中に「：」があると、そこで説明と見なされるので使わないでください");
    const v = Object.fromEntries(COLS.map((c, j) => [c, f[j]]));
    if (!v["言葉"] || /^[☆★◆◇●○・]/.test(v["言葉"])) mfail(at + "言葉がないか、言葉の先頭に記号があります。印は★か◆だけで、「番号. 」の直後にスペースなしで付けます：" + v["言葉"]);
    for (const [c, list] of Object.entries(ENUM)) if (!list.includes(v[c])) mfail(at + v["言葉"] + " の「" + c + "」が「" + v[c] + "」になっています。使えるのは " + list.join("・") + " です");
    // 季節の月：1〜12の半角数字を半角カンマで区切る（「－」は出さない）
    let months = [];
    if (v["季節の月"] !== "－") {
      months = v["季節の月"].split(",");
      if (!months.every((x) => /^(1[0-2]|[1-9])$/.test(x))) mfail(at + v["言葉"] + " の「季節の月」は、1〜12の半角数字を半角カンマで区切って書いてください（出さないときは全角の「－」）：" + v["季節の月"]);
      months = months.map(Number);
    }
    // 縦横比：③の「（」より前と同じ言葉（例：縦長 2:3）か「おまかせ」
    let ratio = "";
    if (v["縦横比"] !== "おまかせ") {
      const r3 = o3.items.find((x) => split(x.text)[0] === v["縦横比"]);
      if (!r3 || r3.text.startsWith("おまかせ")) mfail(at + v["言葉"] + " の「縦横比」が③にありません：" + v["縦横比"] + "（使えるのは おまかせ・" + o3.items.filter((x) => !x.text.startsWith("おまかせ")).map((x) => split(x.text)[0]).join("・") + "）");
      ratio = r3.text;
    }
    // 列どうしの組み合わせ
    const pair = (ok, msg) => { if (!ok) mfail(at + v["言葉"] + "：" + msg); };
    pair(v["AIが考える文字"] !== "名前と称号" || v["型"] === "おまかせ", "名前と称号は、型がおまかせの選択肢だけで使えます");
    pair((v["AIが考える文字"] === "セリフと言葉") === false || v["守り"] === "作品", "セリフと言葉は、守りが作品の選択肢だけで使えます");
    pair(v["守り"] !== "作品" || ["なし", "セリフと言葉"].includes(v["AIが考える文字"]), "守りが作品の選択肢の文字は、なし か セリフと言葉 にしてください");
    pair(v["本人"] !== "人にする" || v["向き"] === "人以外", "本人が人にするの選択肢は、向きを人以外にしてください");
    pair(!["絵本", "似顔絵"].includes(v["絵柄"]) || v["仕上がり"] === "絵", "絵柄が絵本・似顔絵の選択肢は、仕上がりを絵にしてください（写真には切り替えられません）");
    pair(v["カメラ"] === "固定" || mcams.some((c) => c.label === v["カメラ"]), "「カメラ」は 固定 か、カメラワークの一覧の名前（" + mcams.map((c) => c.label).join("・") + "）にしてください：" + v["カメラ"]);
    pair(v["カメラ"] === "固定" || v["カメラ"] === "おまかせ" || v["似せ方"] === "のびのび", "カメラワークを最初から選ぶ選択肢は、似せ方を のびのび にしてください");
    if (/\{\{|}}|（本人らしさ|（既定|（おすすめ/.test(m[4])) mfail(at + v["言葉"] + " の説明に、トークンか運用メモが混ざっています");
    mit = { n: +m[1], mark: m[2], label: v["言葉"], kind: v["型"], look: v["仕上がり"], aim: v["向き"], self: v["本人"], theme: v["テーマ"], ai: v["AIが考える文字"],
      gor: v["華やかさ"], like: v["似せ方"], art: v["絵柄"], guard: v["守り"], ratio, months, text: m[4].trim(), hint: "", notes: [],
      fixedLook: ["絵本", "似顔絵"].includes(v["絵柄"]), camera: v["カメラ"] };
    mc.items.push(mit);
  });
  if (mc && !mc.items.length) mfail("最後の系統「" + mc.name + "」に選択肢が1つもありません");
}
const mitems = mcats.flatMap((c) => c.items);
// 守りが作品の選択肢（42）の核：短くした文面。守りの行・除外の行は入らない
const MTOK_WORK = ["{{テーマ文}}", "{{作り方}}", "{{絵柄の行}}", "{{説明}}", "{{選び方}}", "{{本人らしさ}}", "{{似せ方}}", "{{足してよいもの}}", "{{質感}}", "{{華やかさ}}", "{{露出}}", "{{カメラ}}", "{{追加}}"];
let mcoreWork = "";
if (mitems.some((it) => it.guard === "作品")) {
  mcoreWork = mblock("作品キャラの核").body;
  for (const tok of MTOK_WORK) if (!mcoreWork.includes(tok)) mfail("作品キャラの核に " + tok + " がありません");
  for (const tok of mcoreWork.match(/\{\{[^}]*\}\}/g)) if (!MTOK_WORK.includes(tok)) mfail("作品キャラの核に使えないトークン " + tok + " があります");
}
// 作品キャラの画面の文（守りが作品の選択肢の画面に出す文。プロンプトには入らない）。その選択肢を公開するときだけページに入れる
let mworkUi = null;
if (mitems.some((it) => it.guard === "作品")) {
  const wb = mblock("作品キャラの画面の文"), WKEY = { "セーフティON": "safeOn", "セーフティOFF": "safeOff", "文字の名前": "aiLabel" };
  mworkUi = {};
  wb.body.split("\n").forEach((line, i) => {
    if (!line.trim()) return;
    const k = line.indexOf("："), key = line.slice(0, k).trim(), val = line.slice(k + 1).trim();
    if (k <= 0 || !Object.hasOwn(WKEY, key) || !val) mfail((wb.line + i) + "行目：作品キャラの画面の文が読めません（「セーフティON：文」「セーフティOFF：文」「文字の名前：文」の3行にしてください）：" + line.slice(0, 30));
    if (mworkUi[WKEY[key]]) mfail((wb.line + i) + "行目：作品キャラの画面の文に「" + key + "」の行が2回あります");
    mworkUi[WKEY[key]] = val;
  });
  for (const [key, f] of Object.entries(WKEY)) if (!mworkUi[f]) mfail("作品キャラの画面の文に「" + key + "」の行がありません");
}
// 公開・鍵つきは言葉で見分けるので、同じ言葉の選択肢が2つあると、片方が黙って公開になる。重なりは止める
mitems.forEach((it, i) => { if (mitems.findIndex((x) => x.label === it.label) !== i) mfail("選択肢の言葉が重なっています：" + it.n + "番「" + it.label + "」（言葉は重ねられません）"); });
mitems.forEach((it, i) => { if (it.n !== i + 1) mfail("番号が連番ではありません：" + it.label + " は " + it.n + " ですが、" + (i + 1) + " のはずです（系統をまたいで1から続けて振ります）"); });
// 公開するもしも（鍵なしで使える選択肢）。「公開するもしも」の節の枠に、言葉を1行ずつ書く。全部を公開にするときは、枠の中を「全部」の1行だけにする
// 節や枠が無い・見出しを打ち間違えたときに、黙って全部が公開にならないよう、無ければ止める
let mopen = [];
{
  // 節を探す場所は1つだけにする：見出しはちょうど1つ、枠はその節の中にちょうど1つ（別の場所の枠を読んで、全部が公開にならないように）
  const heads = [...tm.matchAll(/^## 公開するもしも.*$/gm)];
  if (!heads.length) mfail("「## 公開するもしも」の節がありません（鍵なしで使える選択肢の言葉を、枠の中に1行ずつ書きます。全部を公開にするときは、枠の中を「全部」の1行だけにしてください）");
  if (heads.length > 1) mfail("「## 公開するもしも」で始まる見出しが" + heads.length + "つあります（1つだけにしてください）");
  const hi = heads[0].index, next = tm.indexOf("\n## ", hi + 1), sec = tm.slice(hi, next < 0 ? tm.length : next);
  const fences = sec.match(/^```.*$/gm) || [];
  if (!fences.length) mfail("「公開するもしも」の節に、``` で囲んだ枠がありません");
  if (fences.length !== 2) mfail("「公開するもしも」の節の枠は、1つだけにしてください（``` で始まる行が" + fences.length + "つあります）");
  const ob = blockAt(sec, "公開するもしも", mfail);
  ob.line += tm.slice(0, hi).split("\n").length - 1; // 節の中の行番号を、ファイルの行番号に直す
  ob.body.split("\n").forEach((line, i) => {
    const lab = line.trim(); if (!lab) return;
    if (lab !== "全部" && !mitems.some((it) => it.label === lab)) mfail((ob.line + i) + "行目：公開するもしも「" + lab + "」が、選択肢にありません（選択肢の言葉を変えたときは、ここも直してください）");
    if (mopen.includes(lab)) mfail((ob.line + i) + "行目：公開するもしもに「" + lab + "」が2回あります");
    mopen.push(lab);
  });
  if (!mopen.length) mfail("公開するもしもが1つもありません（全部を公開にするときは、枠の中を「全部」の1行だけにしてください）");
  if (mopen.includes("全部")) { if (mopen.length > 1) mfail("公開するもしもの「全部」は、ほかの言葉といっしょには書けません"); mopen = null; }
}
const isOpen = (it) => !mopen || mopen.includes(it.label);

// 画面が使う部品が全部あるか。空でよい部品以外が空ならエラー。どこからも使われない部品もエラー
const MAY_EMPTY = new Set(["選び方（選ぶ）", "足してよいもの（文字なし）", "華やかさ（ふつう）"]);
const MBASE = ["カメラの行", "会話の扱い（基本）", "作り方（写真）", "作り方（絵）", "絵柄の行", "絵柄（アニメ）", "本人らしさ（基本・写真）", "本人らしさ（基本・絵）", "本人らしさ（人以外の行）", "絵の描き直し",
  "似せ方（しっかり）", "似せ方（のびのび）", "足してよいもの（文字なし）", "足してよいもの（文字あり）", "質感（写真）", "質感（絵）", "華やかさ（ふつう）", "華やかさ（豪華）",
  "文字（AI・題名とひとこと）", "文字（AI・ステータス）", "文字あり（もしも・自分の言葉）", "縦横比あり（もしも）", "縦横比なし（もしも）", "避けること（もしも）",
  "④1番（もしも・写真）", "④1番（もしも・絵）", "④4番（もしも・きらめきと統合）", "④5番（もしも・差し替え）", "除外（もしも・文字なし）", "除外（もしも・文字あり）"];
// その選択肢が使う部品を set に足す
const needOf = (it, set) => {
  set.add("テーマ文（" + it.theme + "）"); if (it.guard !== "作品") set.add("守り（" + it.guard + "）");
  set.add(it.guard === "作品" ? "選び方（会話から・作品）" : "選び方（" + it.kind + "）");
  if (it.kind === "会話から") set.add("会話の扱い（会話から）");
  if (it.kind === "おまかせ") set.add("文字（AI・名前と称号）");
  if (it.guard === "作品") { set.add("文字（AI・セリフと言葉）"); set.add("ロゴの行"); set.add("露出（おさえる）"); set.add("露出（キャラどおり）"); }
  if (it.self !== "基本") set.add("本人らしさ（" + it.self + "）");
  if (it.aim === "人以外") set.add("人以外向けの行");
  if (it.art !== "－") set.add("絵柄（" + it.art + "）");
};
const mneed = new Set(MBASE);
for (const it of mitems) needOf(it, mneed);
for (const k of mneed) {
  if (mparts[k] === undefined) mfail("部品が見つかりません：" + k);
  if (mparts[k] === "" && !MAY_EMPTY.has(k)) mfail("部品「" + k + "」の中身が空です（空でよいのは " + [...MAY_EMPTY].join("・") + " だけです）");
}
for (const k of Object.keys(mparts)) if (!mneed.has(k)) mfail("部品「" + k + "」はどこからも使われていません（部品名の打ち間違いか、続きの行の書き方の間違いかもしれません）");

// 注意書き：「- 」で始まる1行が1項目。[最初] の3行は一覧の下にいつも出す
const mnotes = (() => {
  const i = tm.indexOf("## もしもモードの注意書き");
  if (i < 0) mfail("注意書きの見出しが見つかりません");
  const base = tm.slice(0, i).split("\n").length;
  const out = []; let started = false;
  const lines = tm.slice(i).split("\n").slice(1);
  for (let j = 0; j < lines.length; j++) {
    const line = lines[j];
    if (line.startsWith("---") || line.startsWith("## ")) break;
    if (line.startsWith("- ")) { started = true; out.push(line.slice(2).trim()); continue; }
    if (started && line.trim()) mfail("注意書きの " + (base + j + 1) + "行目：「- 」で始まらない行があります（1項目は1行で書き、折り返さないでください）：" + line.slice(0, 30));
  }
  for (const n of out) if (/^[\[［]\s*最初\s*[\]］]/.test(n) && !n.startsWith("[最初] ")) mfail("注意書きの [最初] の書き方が違います（半角の [最初] と半角スペース）：" + n.slice(0, 20));
  return out;
})();
// ページに入れるもしも。鍵つきの選択肢は、一覧に出す物（名前・印・一言など）だけにして、説明・注意は入れない。部品と作品の核も、公開する選択肢が使う物だけを入れる
const pneed = new Set(MBASE);
for (const it of mitems.filter(isOpen)) needOf(it, pneed);
const pageCats = mcats.map((c) => ({ name: c.name, items: c.items.map((it) => isOpen(it) ? it : { n: it.n, mark: it.mark, label: it.label, kind: it.kind, look: it.look, aim: it.aim, months: it.months, hint: it.hint, locked: true }) }));
const pageParts = Object.fromEntries(Object.entries(mparts).filter(([k]) => pneed.has(k)));
const workOpen = mitems.some((it) => isOpen(it) && it.guard === "作品");
const moshi = { core: mcore, coreWork: workOpen ? mcoreWork : "", work: workOpen ? mworkUi : null, parts: pageParts, cats: pageCats, cams: mcams, total: mitems.length, open: mitems.filter(isOpen).length, tips: mblock("もしもの直し方のコツ").body,
  notesTop: mnotes.filter((x) => x.startsWith("[最初] ")).map((x) => x.slice(5)), notesMore: mnotes.filter((x) => !x.startsWith("[最初] ")) };
if (moshi.notesTop.length !== 3) mfail("注意書きの [最初] は3行のはずですが、" + moshi.notesTop.length + "行です");
if (moshi.notesMore.length < 3) mfail("注意書き（くわしい注意）が少なすぎます");

const data = { core, parts, core2, parts2, notes2, tips, categories, legend1, total, material, photo, sid,
  list2: o2.items, legend2: o2.legend, list3: o3.items, list4: o4.items, legend4: o4.legend, moshi };

// 書き出しの前に組み立てと構文チェックを済ませる（失敗したら壊れたファイルを残さない）
const json = JSON.stringify(data).replace(/</g, "\\u003c");
let html = fs.readFileSync(path.join(ROOT, "src", "template.html"), "utf8");
html = html.replace("/*__DATA__*/null", () => json).split("__SITE_URL__").join(SITE_URL); // 置き換えは関数で渡す（mdの「$」が特別な意味にならないように）
new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]); // 構文チェック
// トップページ（見本の絵と案内。プロンプトのデータは使わない）
const topSrc = fs.readFileSync(path.join(ROOT, "src", "top.html"), "utf8");
// 作例リンク（m=番号）が、その番号の選択肢を指しているか（番号を振り直したときのずれを止める）
for (const mm of topSrc.matchAll(/href="sheet\/\?mode=3&amp;m=(\d+)[^"]*"([^>]*)>/g)) {
  const lab = (mm[2].match(/data-moshi="([^"]+)"/) || [])[1];
  const it = mitems.find((x) => x.n === +mm[1]);
  if (!lab) throw new Error("src/top.html の作例リンク m=" + mm[1] + " に data-moshi（選択肢の言葉）がありません");
  if (!it || it.label !== lab) throw new Error("src/top.html の作例リンク m=" + mm[1] + " は「" + lab + "」のはずですが、選択肢" + mm[1] + "は「" + (it ? it.label : "ありません") + "」です。番号を直してください");
}
// 鍵つきの選択肢の作例には印を付ける（トップで「現在非公開」と出す）
const topMarked = topSrc.replace(/<a class="card mcard" (href="sheet\/\?mode=3&amp;m=\d+[^"]*" data-moshi="([^"]+)")/g, (all, rest, lab) => { const it = mitems.find((x) => x.label === lab); return it && !isOpen(it) ? '<a class="card mcard locked" ' + rest : all; });
const lockedSamples = [...topSrc.matchAll(/data-moshi="([^"]+)"/g)].filter((mm) => { const it = mitems.find((x) => x.label === mm[1]); return it && !isOpen(it); }).length;
if ((topMarked.match(/<a class="card mcard locked" /g) || []).length !== lockedSamples) throw new Error("src/top.html の作例のうち、鍵つきの選択肢に「鍵つき」の印を付けられない物があります（<a class=\"card mcard\" href=… data-moshi=…> の書き方を、ほかの作例とそろえてください）");
const moshiCount = moshi.open < moshi.total ? moshi.open + "種（現在非公開" + (moshi.total - moshi.open) + "種）" : moshi.total + "種";
const top = topMarked.split("もしも __MOSHI_TOTAL__種").join("もしも " + moshiCount).split("__SITE_URL__").join(SITE_URL).split("画風の例 50種").join("画風の例 " + total + "種").split("ほか全50種").join("ほか全" + total + "種");
const left = top.match(/__[A-Z_]+__/); if (left) throw new Error("トップに置き換えていない " + left[0] + " が残っています");
fs.mkdirSync(path.join(ROOT, "sheet"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "sheet", "index.html"), html);
fs.writeFileSync(path.join(ROOT, "index.html"), top);
console.log("index.html（トップ）と sheet/index.html（道具）を作成：①", total, "（素材", material.length, "・写真", photo.length, "・2枚モード注意書き", notes2.length, "）②", o2.items.length, "③", o3.items.length, "④", o4.items.length, "もしも", moshi.total, "（公開", moshi.open, "・鍵つき", moshi.total - moshi.open, "・部品", Object.keys(mparts).length, "・注意", mnotes.length, "）");
