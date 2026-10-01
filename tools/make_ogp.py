# Xなどでリンクを貼ったときに出るカード画像（1200x630）を作る。サイトと同じ「水彩紙とパレット」の見た目
# 使い方: python tools/make_ogp.py   （Playwright とインストール済みのChromeを使う）
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
STYLES = ["やさしい水彩画", "浮世絵の木版画", "ステンドグラス", "ちびキャラ", "アニメの原画",
          "粗いドット絵", "刺しゅう", "ネオンサイン", "古代の壁画", "金地の日本画"]
COLORS = ["#f096a0", "#f2c66e", "#8fcf9b", "#7fb4e8", "#b79be0"]
chips = "".join(f'<span class="chip" style="border-bottom-color:{COLORS[i % 5]}">{s}</span>' for i, s in enumerate(STYLES))
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
.card {{ position:absolute; inset:48px 64px; background:rgba(255,255,255,.82); border:2px solid #ddd6c9; border-radius:28px;
  box-shadow:0 18px 40px -26px rgba(40,50,90,.5); padding:52px 60px; display:flex; flex-direction:column; gap:20px; }}
h1 {{ font-family:"Kaisei Decol",serif; font-size:86px; margin:0; letter-spacing:.06em; }}
h1 span {{ background:linear-gradient(transparent 62%, rgba(120,180,235,.45) 62%, rgba(120,180,235,.45) 92%, transparent 92%); }}
p {{ margin:0; font-size:32px; color:#5d6573; }}
.chips {{ display:flex; flex-wrap:wrap; gap:12px; margin-top:auto; }}
.chip {{ font-size:24px; padding:6px 16px; border-radius:14px; background:#fff; border:2px solid #ddd6c9; border-bottom-width:6px; }}
</style></head><body><div class="card">
<h1><span>画風コピペシート</span></h1>
<p>写真1枚を、好きな画風に。<br>ChatGPT用のプロンプトを、選ぶだけで。</p>
<div class="chips">{chips}<span class="chip" style="border-bottom-color:#3a5aa6">ほか全50種</span></div>
</div></body></html>"""

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(HTML, wait_until="networkidle")
    pg.screenshot(path=str(ROOT / "ogp.png"))
    b.close()
print("ogp.png を作成")
