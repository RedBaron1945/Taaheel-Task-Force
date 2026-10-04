#!/usr/bin/env python3
"""يولّد كل أيقونات الموقع (favicon / PWA / apple-touch-icon / logo.png) من
الشعار الرسمي branding/taaheel-logo.png
الاستخدام: python3 tools/generate-icons.py
يحتاج: pip install pillow numpy

ملاحظة: صورة معاينة الروابط (public/og-image.png) لا تُولَّد من هذا السكربت،
بل تلقائياً عند كل build عبر scripts/generate-assets.js (مرحلة prebuild في
package.json)، لأنها تحتاج إلى resvg لتركيب الشعار داخل تصميم البانر.

إذا تغيّر الشعار: استبدل branding/taaheel-logo.png بالملف الجديد ثم شغّل هذا
السكربت، وحدّث يدوياً الثابت OFFICIAL_TAHEEL_LOGO_DATA_URL في js/logo.js
بنسخة base64 لنسخة مصغّرة (~520px) من نفس الشعار الجديد.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "branding" / "taaheel-logo.png"
PUBLIC = ROOT / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

logo = Image.open(MASTER).convert("RGBA")
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
    if w > size * 0.98 and radius_ratio is None:
        w = int(size * 0.98)
        h = max(1, round(logo.height * w / logo.width))
    img = logo.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (255, 255, 255, 255))
    canvas.alpha_composite(img, ((size - w) // 2, (size - h) // 2))
    return canvas.convert("RGB")

def save(name, img):
    img.save(PUBLIC / name, optimize=True)
    print("✔", name, img.size)

save("logo.png", compose(512, fill_ratio=0.92))
save("favicon-16x16.png", compose(16, fill_ratio=0.98))
save("favicon-32x32.png", compose(32, fill_ratio=0.98))
save("apple-touch-icon.png", compose(180, fill_ratio=0.90))
save("pwa-192x192.png", compose(192, fill_ratio=0.92))
save("pwa-512x512.png", compose(512, fill_ratio=0.92))
save("pwa-maskable-192x192.png", compose(192, radius_ratio=0.40))
save("pwa-maskable-512x512.png", compose(512, radius_ratio=0.40))
compose(256, fill_ratio=0.98).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✔ favicon.ico")
