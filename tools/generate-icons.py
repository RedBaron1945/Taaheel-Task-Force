#!/usr/bin/env python3
"""يولّد كل أيقونات الموقع من الشعار الرسمي branding/taaheel-logo.svg
الاستخدام: python3 tools/generate-icons.py
يحتاج: rsvg-convert (apt install librsvg2-bin) و Pillow و numpy
"""
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SVG = ROOT / "branding" / "taaheel-logo.svg"
ICONS = ROOT / "public" / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

RENDER = ROOT / ".icon-render.png"
# نرسم السفج بدقة عالية مرة واحدة (مع شفافية) ثم نولّد الأحجام كلها منها
subprocess.run(["rsvg-convert", "-w", "1024", "-h", "1024", str(SVG), "-o", str(RENDER)], check=True)
logo = Image.open(RENDER).convert("RGBA")

alpha = np.array(logo)[..., 3]
ys, xs = np.where(alpha > 10)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
logo = logo.crop((x0, y0, x1, y1))

alpha_c = np.array(logo)[..., 3]
cy, cx = (logo.height - 1) / 2, (logo.width - 1) / 2
oy, ox = np.where(alpha_c > 10)
far = float(np.sqrt((oy - cy) ** 2 + (ox - cx) ** 2).max())

def compose(size, fill_ratio=None, radius_ratio=None):
    if radius_ratio is not None:
        scale = (size * radius_ratio) / far
    else:
        scale = (size * fill_ratio) / logo.height
    w, h = max(1, round(logo.width * scale)), max(1, round(logo.height * scale))
    img = logo.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    canvas.alpha_composite(img, ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB")

def save(name, img):
    img.save(ICONS / name, optimize=True)
    print("✔", name, img.size)

save("icon-512.png", compose(512, fill_ratio=0.94))
save("icon-192.png", compose(192, fill_ratio=0.94))
save("icon-maskable-512.png", compose(512, radius_ratio=0.36))
save("icon-maskable-192.png", compose(192, radius_ratio=0.36))
save("apple-touch-icon.png", compose(180, fill_ratio=0.90))
fav = {s: compose(s, fill_ratio=0.98) for s in (16, 32, 48)}
save("favicon-16.png", fav[16]); save("favicon-32.png", fav[32]); save("favicon-48.png", fav[48])
fav[48].save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✔ favicon.ico")
RENDER.unlink(missing_ok=True)
