// 使い方: node tools/build.js <08のmdファイルのパス>
// プロンプトの元になるmdを正本にして index.html を組み立てる。
// 文字の写し間違いを防ぐため、核・部品・選択肢はmdの見出しごとに機械的に読み込む。
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://gafu-copy.netlify.app"; // 公開先が決まったらここを直す（OGP用）
const ROOT = path.join(__dirname, "..");
const mdPath = process.argv[2];
if (!mdPath) throw new Error("mdファイルのパスを指定してください");
const t = fs.readFileSync(mdPath, "utf8");

// 「## 見出し」の直後にあるコードブロックを取り出す
function block(heading) {
  const i = t.indexOf("## " + heading);
  if (i < 0) throw new Error("見出しが見つかりません：" + heading);
  const m = t.slice(i).match(/```\n([\s\S]*?)```/);
  if (!m) throw new Error("コードブロックが見つかりません：" + heading);
  return m[1].trimEnd();
}
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
  else if (line.startsWith("■")) { cur = { name: line.slice(1), items: [] }; categories.push(cur); }
  else { const m = line.match(/^(\d+)\. ([★◆]?)(.+)$/); if (m && cur) cur.items.push({ n: +m[1], mark: m[2], text: m[3] }); }
}
// 素材の画風（作品を撮った写真として描くもの）
const material = categories.flatMap((c) => c.items.filter((it) => c.name.includes("素材") || /フィギュア|3Dプリンタ/.test(it.text)).map((it) => it.text));
// 写真系の画風（イラストではなく写真として仕上げるもの）
const photo = categories.flatMap((c) => c.items.filter((it) => c.name.includes("写真") && /^(フィルム写真|モノクロ写真)/.test(it.text)).map((it) => it.text));

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
const data = { core, parts, core2, parts2, notes2, tips, categories, legend1, total, material, photo,
  list2: o2.items, legend2: o2.legend, list3: o3.items, list4: o4.items, legend4: o4.legend };

let html = fs.readFileSync(path.join(ROOT, "src", "template.html"), "utf8");
html = html.replace("/*__DATA__*/null", JSON.stringify(data).replace(/</g, "\\u003c")).split("__SITE_URL__").join(SITE_URL);
fs.mkdirSync(path.join(ROOT, "sheet"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "sheet", "index.html"), html);
// トップページ（見本の絵と案内。プロンプトのデータは使わない）
const top = fs.readFileSync(path.join(ROOT, "src", "top.html"), "utf8").split("__SITE_URL__").join(SITE_URL).split("画風の例 50種").join("画風の例 " + total + "種").split("ほか全50種").join("ほか全" + total + "種");
fs.writeFileSync(path.join(ROOT, "index.html"), top);
new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]); // 構文チェック
console.log("index.html（トップ）と sheet/index.html（道具）を作成：①", total, "（素材", material.length, "・写真", photo.length, "・2枚モード注意書き", notes2.length, "）②", o2.items.length, "③", o3.items.length, "④", o4.items.length);
