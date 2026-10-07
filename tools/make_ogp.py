# Xなどでリンクを貼ったときに出るカード画像（1200x630）を作る。サイトと同じ「水彩紙とパレット」の見た目に、トップの見本の画像を並べる
# 使い方: python tools/make_ogp.py   （Playwright とインストール済みのChromeを使う。images/gafu/ の見本の画像を使う）
import base64, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
# 並べる画像（images/gafu/ の名前と、下に出す言葉）。1つ目は元の写真
PICS = [("base", "元の写真"), ("s01", "やさしい水彩画"), ("s16", "ステンドグラス"), ("s45", "ネオンサイン")]
def data_uri(name):
    return "data:image/webp;base64," + base64.b64encode((ROOT / "images" / "gafu" / (name + ".webp")).read_bytes()).decode("ascii")
figs = ""
for i, (n, lab) in enumerate(PICS):
    cls = ' class="src"' if i == 0 else ""
    figs += f'<figure{cls}><img src="{data_uri(n)}"><figcaption>{lab}</figcaption></figure>'
GRAIN = ("url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E"
         "%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.35 0 0 0 0 0.3 0 0 0 0 0.25 0 0 0 0.08 0'/%3E"
         "%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")")
HTML = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@700&family=Kaisei+Decol:wght@700&display=swap">
<style>
body {{ margin:0; width:1200px; height:630px; font-family:"Zen Kaku Gothic New",sans-serif; color:#2a2f3a; background-color:#f7f5f0;
  background-image: radial-gradient(ellipse 40% 40% at 4% 6%, rgba(244,150,160,.45), transparent 70%),
    radial-gradient(ellipse 36% 40% at 98% 10%, rgba(120,180,235,.45), transparent 70%),
    radial-gradient(ellipse 38% 40% at 96% 96%, rgba(150,210,160,.40), transparent 70%),
    radial-gradient(ellipse 36% 40% at 3% 96%, rgba(250,205,110,.40), transparent 70%), {GRAIN}; }}
.card {{ position:absolute; inset:40px 52px; background:rgba(255,255,255,.84); border:2px solid #ddd6c9; border-radius:28px;
  box-shadow:0 18px 40px -26px rgba(40,50,90,.5); padding:36px 36px 36px 44px; display:grid; grid-template-columns:1fr 556px; gap:28px; align-items:center; }}
.text {{ display:flex; flex-direction:column; gap:22px; }}
h1 {{ font-family:"Kaisei Decol",serif; font-size:50px; line-height:1.2; margin:0; letter-spacing:.04em; white-space:nowrap; }}
h1 span {{ background:linear-gradient(transparent 62%, rgba(120,180,235,.45) 62%, rgba(120,180,235,.45) 92%, transparent 92%); }}
p {{ margin:0; font-size:27px; line-height:1.6; color:#5d6573; }}
.chips {{ display:flex; flex-wrap:wrap; gap:10px; }}
.credit {{ font-size:17px; color:#5d6573; line-height:1.5; }}
.chip {{ font-size:21px; padding:4px 14px; border-radius:12px; background:#fff; border:2px solid #ddd6c9; border-bottom-width:5px; }}
.grid {{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }}
figure {{ margin:0; position:relative; }}
img {{ width:100%; aspect-ratio:3/2; object-fit:cover; border-radius:14px; box-shadow:0 10px 22px -14px rgba(40,50,90,.6); display:block; }}
figcaption {{ position:absolute; left:10px; bottom:10px; font-size:19px; padding:3px 12px; border-radius:999px; background:rgba(255,255,255,.92); color:#2a2f3a; }}
.src figcaption {{ background:#3a5aa6; color:#fff; }}
</style></head><body><div class="card">
<div class="text"><h1><span>画風コピペシート</span></h1>
<p>写真1枚を、好きな画風に。<br>もしもの姿にも。<br>ChatGPTなどのAIに貼る<br>プロンプトを、<br>選ぶだけで作れます。</p>
<div class="chips"><span class="chip" style="border-bottom-color:#7fb4e8">画風の例 78種</span><span class="chip" style="border-bottom-color:#f096a0">もしも 48種</span></div>
<p class="credit">見本は、AIで作った架空の人物と犬の写真を<br>このサイトのプロンプトで描き直したものです</p></div>
<div class="grid">{figs}</div>
</div></body></html>"""

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(HTML, wait_until="networkidle")
    pg.screenshot(path=sys.argv[1] if len(sys.argv) > 1 else str(ROOT / "ogp.png"))  # 引数があれば、そこへ書き出す（見本の確認用）
    b.close()
print("ogp.png を作成")
