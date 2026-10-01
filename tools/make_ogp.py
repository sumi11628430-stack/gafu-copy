# Xなどでリンクを貼ったときに出るカード画像（1200x630）を作る。
# 使い方: python tools/make_ogp.py   （Playwright とインストール済みのChromeを使う）
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
STYLES = ["やさしい水彩画", "浮世絵の木版画", "ステンドグラス", "ちびキャラ", "アニメの原画",
          "粗いドット絵", "刺しゅう", "ネオンサイン", "古代の壁画", "金地の日本画"]
chips = "".join(f'<span class="chip">{s}</span>' for s in STYLES)
HTML = f"""<!doctype html><html lang="ja"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;700&family=Zen+Old+Mincho:wght@700&display=swap">
<style>
body {{ margin:0; width:1200px; height:630px; background:#f4f6f9; font-family:"Zen Kaku Gothic New",sans-serif; color:#1a2232; }}
.card {{ position:absolute; inset:40px; background:#fff; border:2px solid #d8dee8; border-radius:24px; padding:56px 64px; display:flex; flex-direction:column; gap:22px; }}
h1 {{ font-family:"Zen Old Mincho",serif; font-size:84px; margin:0; letter-spacing:0.04em; color:#2c4687; }}
p {{ margin:0; font-size:34px; color:#5b6577; font-weight:700; }}
.chips {{ display:flex; flex-wrap:wrap; gap:12px; margin-top:auto; }}
.chip {{ font-size:24px; font-weight:700; padding:8px 18px; border-radius:999px; background:#e4eaf7; color:#2c4687; }}
.chip:nth-child(3n+2) {{ background:#fbe9e1; color:#a2441f; }}
.chip:nth-child(3n) {{ background:#e1f2e9; color:#2d6b4f; }}
</style></head><body><div class="card">
<h1>画風コピペシート</h1>
<p>写真1枚を、好きな画風に。<br>ChatGPT用のプロンプトを、選ぶだけで。</p>
<div class="chips">{chips}<span class="chip">ほか全50種</span></div>
</div></body></html>"""

with sync_playwright() as pw:
    b = pw.chromium.launch(channel="chrome")
    pg = b.new_page(viewport={"width": 1200, "height": 630})
    pg.set_content(HTML, wait_until="networkidle")
    pg.screenshot(path=str(ROOT / "ogp.png"))
    b.close()
print("ogp.png を作成")
