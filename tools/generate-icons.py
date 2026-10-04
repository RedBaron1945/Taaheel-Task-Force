#!/usr/bin/env python3
"""يولّد كل أيقونات الموقع وصورة المشاركة الاجتماعية (OG) من الشعار الرسمي
branding/taaheel-logo.png — المصدر الوحيد.

الاستخدام: python3 tools/generate-icons.py
يحتاج: Pillow, numpy, وأداة rsvg-convert لصورة OG فقط
       (تثبيتها مرة واحدة: sudo apt install librsvg2-bin)
"""
import base64
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "branding" / "taaheel-logo.png"
PUB = ROOT / "public"
APP_LOGO = ROOT / "src" / "assets" / "images" / "taaheel-logo.png"
PUB.mkdir(parents=True, exist_ok=True)
APP_LOGO.parent.mkdir(parents=True, exist_ok=True)

logo = Image.open(SRC).convert("RGBA")
alpha = np.array(logo)[..., 3]
ys, xs = np.where(alpha > 10)
PAD = 8
x0, x1 = max(0, xs.min() - PAD), min(logo.width, xs.max() + 1 + PAD)
y0, y1 = max(0, ys.min() - PAD), min(logo.height, ys.max() + 1 + PAD)
logo = logo.crop((x0, y0, x1, y1))
logo.save(APP_LOGO, optimize=True)  # شعار داخل التطبيق (شفاف) يستورده js/logo.js

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
    img.save(PUB / name, optimize=True)
    print("✔", name, img.size)


# --- أيقونات التبويب والتثبيت ---
save("logo.png", compose(512, fill_ratio=0.94))
save("favicon-32x32.png", compose(32, fill_ratio=0.94))
save("favicon-16x16.png", compose(16, fill_ratio=0.98))
save("apple-touch-icon.png", compose(180, fill_ratio=0.90))
fav48 = compose(48, fill_ratio=0.94)
fav48.save(PUB / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✔ favicon.ico")

# --- أيقونات PWA (تثبيت على الهاتف) ---
save("icon-192.png", compose(192, fill_ratio=0.94))
save("icon-512.png", compose(512, fill_ratio=0.94))
save("icon-maskable-192.png", compose(192, radius_ratio=0.38))
save("icon-maskable-512.png", compose(512, radius_ratio=0.38))

# --- صورة المشاركة الاجتماعية (OG banner 1200×630) ---
transparent_path = ROOT / "_og_logo_tmp.png"
logo.save(transparent_path)
b64 = base64.b64encode(transparent_path.read_bytes()).decode("ascii")
transparent_path.unlink()

target_h = 420
target_w = round(logo.width * target_h / logo.height)
img_x = 600 - target_w / 2
img_y = 55

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#040a1c" />
      <stop offset="40%" stop-color="#081636" />
      <stop offset="100%" stop-color="#112554" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="35%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22" />
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.04" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>
    <pattern id="geometricGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1" fill="#f59e0b" opacity="0.1" />
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#ogBgGrad)" />
  <rect width="1200" height="630" fill="url(#geometricGrid)" />
  <circle cx="600" cy="230" r="380" fill="url(#glowGrad)" />
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#d5a036" stroke-width="1.8" stroke-opacity="0.35" />
  <rect x="34" y="34" width="1132" height="562" rx="16" fill="none" stroke="#d5a036" stroke-width="1" stroke-dasharray="6 4" stroke-opacity="0.25" />
  <g stroke="#d5a036" stroke-width="2" fill="none" opacity="0.6">
    <path d="M44,68 L44,44 L68,44" />
    <path d="M1156,68 L1156,44 L1132,44" />
    <path d="M44,562 L44,586 L68,586" />
    <path d="M1156,562 L1156,586 L1132,586" />
  </g>
  <image x="{img_x:.1f}" y="{img_y}" width="{target_w}" height="{target_h}" href="data:image/png;base64,{b64}" />
  <g transform="translate(600, 500)">
    <line x1="-180" y1="0" x2="-24" y2="0" stroke="#d5a036" stroke-width="1.5" opacity="0.6" />
    <path d="M0,-5 L5,0 L0,5 L-5,0 Z" fill="#d5a036" />
    <line x1="24" y1="0" x2="180" y2="0" stroke="#d5a036" stroke-width="1.5" opacity="0.6" />
  </g>
  <text x="600" y="555" font-family="system-ui, -apple-system, 'Tajawal', 'Segoe UI', Tahoma, sans-serif" font-size="44" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.6">منصة مرحلة التأهيل</text>
  <text x="600" y="597" font-family="system-ui, -apple-system, 'Tajawal', 'Segoe UI', Tahoma, sans-serif" font-size="20" font-weight="600" fill="#d5a036" text-anchor="middle" opacity="0.95">خطة التكاليف المقررة • متابعة الإنجاز والدرجات • سجل الحضور والغياب</text>
</svg>'''

svg_path = ROOT / "_og_banner_tmp.svg"
svg_path.write_text(svg, encoding="utf-8")
subprocess.run(
    ["rsvg-convert", "-w", "1200", "-h", "630", str(svg_path), "-o", str(PUB / "og-image.png")],
    check=True,
)
svg_path.unlink()
print("✔ og-image.png")
