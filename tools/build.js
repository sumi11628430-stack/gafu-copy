// 使い方: node tools/build.js <08のmdファイルのパス>
// SNS事業部の「08_好きな画像を好きな画風にプロンプト.md」を正本にして index.html を組み立てる。
// 文字の写し間違いを防ぐため、プロンプトや選択肢はmdから機械的に読み込む。
const fs = require("fs");
const path = require("path");

const SITE_URL = "https://gafu-copy.netlify.app"; // 公開先が決まったらここを直す（OGP用）
const ROOT = path.join(__dirname, "..");
const mdPath = process.argv[2];
if (!mdPath) throw new Error("mdファイルのパスを指定してください");

const t = fs.readFileSync(mdPath, "utf8");
const b = [...t.matchAll(/```\n([\s\S]*?)```/g)].map((x) => x[1].trimEnd());
const [, prompt, examples, opt2, opt3, opt4, tips] = b;
const ph1 = "【　　　　ここに好きなプロンプトを入力　　　　】";
const ph2 = "【　　　　ここに好きな選択肢を入力　　　　】";
const phWords = "「　　　　」";
for (const [name, ph] of [["ph1", ph1], ["ph2", ph2], ["phWords", phWords]]) {
  if (!prompt.includes(ph)) throw new Error(name + " がプロンプトに見つかりません");
}

const categories = []; let cur = null, legend1 = "";
for (const line of examples.split("\n")) {
  if (line.startsWith("★＝")) legend1 = line;
  else if (line.startsWith("■")) { cur = { name: line.slice(1), items: [] }; categories.push(cur); }
  else { const m = line.match(/^(\d+)\. ([★◆]?)(.+)$/); if (m && cur) cur.items.push({ n: +m[1], mark: m[2], text: m[3] }); }
}
function parseOpts(block) {
  const items = []; let legend = "";
  for (const line of block.split("\n")) {
    if (/^◎＝/.test(line)) legend = line;
    const m = line.match(/^(\d+)\. ([◎○]?)(.+)$/); if (m) items.push({ n: +m[1], mark: m[2], text: m[3] });
  }
  return { items, legend };
}
const o2 = parseOpts(opt2), o3 = parseOpts(opt3), o4 = parseOpts(opt4);
const total = categories.reduce((a, c) => a + c.items.length, 0);
const data = { ph1, ph2, phWords, prompt, tips, categories, legend1, total,
  list2: o2.items, legend2: o2.legend, list3: o3.items, list4: o4.items, legend4: o4.legend };

let html = fs.readFileSync(path.join(ROOT, "src", "template.html"), "utf8");
html = html.replace("/*__DATA__*/null", JSON.stringify(data).replace(/</g, "\\u003c")).split("__SITE_URL__").join(SITE_URL);
fs.writeFileSync(path.join(ROOT, "index.html"), html);
new Function(html.match(/<script>([\s\S]*)<\/script>/)[1]); // 構文チェック
console.log("index.html を作成：①", total, "②", o2.items.length, "③", o3.items.length, "④", o4.items.length);
