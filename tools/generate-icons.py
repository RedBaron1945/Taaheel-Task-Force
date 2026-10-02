#!/usr/bin/env python3
"""يولّد كل أيقونات الموقع من الشعار الرسمي branding/taaheel-logo.png
الاستخدام: python3 tools/generate-icons.py
يحتاج: Pillow و numpy
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "branding" / "taaheel-logo.png"
ICONS = ROOT / "public" / "icons"
APP_LOGO = ROOT / "src" / "assets" / "images" / "taaheel-logo.png"
ICONS.mkdir(parents=True, exist_ok=True)
APP_LOGO.parent.mkdir(parents=True, exist_ok=True)

logo = Image.open(SRC).convert("RGBA")
alpha = np.array(logo)[..., 3]
ys, xs = np.where(alpha > 10)
PAD = 8
x0, x1 = max(0, xs.min() - PAD), min(logo.width, xs.max() + 1 + PAD)
y0, y1 = max(0, ys.min() - PAD), min(logo.height, ys.max() + 1 + PAD)
logo = logo.crop((x0, y0, x1, y1))
logo.save(APP_LOGO, optimize=True)   # شعار داخل التطبيق (شفاف) يستورده js/logo.js

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
save("icon-maskable-512.png", compose(512, radius_ratio=0.38))
save("icon-maskable-192.png", compose(192, radius_ratio=0.38))
save("apple-touch-icon.png", compose(180, fill_ratio=0.90))
fav = {s: compose(s, fill_ratio=0.98) for s in (16, 32, 48)}
save("favicon-16.png", fav[16]); save("favicon-32.png", fav[32]); save("favicon-48.png", fav[48])
fav[48].save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✔ favicon.ico")
