#!/usr/bin/env python3
"""يولّد كل أيقونات الموقع من الشعار الرسمي branding/taaheel-logo.png
الاستخدام: python3 tools/generate-icons.py
يحتاج: Pillow و numpy فقط (لا حاجة لـ rsvg-convert بعد الآن، الشعار الرسمي صورة PNG شفافة)

بعد توليد الأيقونات، إن تغيّر الشعار الرسمي، يجب أيضاً تحديث الثابت
OFFICIAL_TAHEEL_LOGO_DATA_URL في js/logo.js يدوياً (base64 لنسخة مصغّرة من نفس
الملف) حتى يظهر الشعار الجديد داخل الواجهة وتقارير PDF، وليس فقط كأيقونة.
"""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MASTER = ROOT / "branding" / "taaheel-logo.png"
ICONS = ROOT / "public" / "icons"
ICONS.mkdir(parents=True, exist_ok=True)

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
    img.save(ICONS / name, optimize=True)
    print("✔", name, img.size)

save("icon-512.png", compose(512, fill_ratio=0.92))
save("icon-192.png", compose(192, fill_ratio=0.92))
save("icon-maskable-512.png", compose(512, radius_ratio=0.40))
save("icon-maskable-192.png", compose(192, radius_ratio=0.40))
save("apple-touch-icon.png", compose(180, fill_ratio=0.90))
# أيقونات التبويب الصغيرة: الشعار كاملاً مصغّراً (وضوح النص غير مضمون تحت 32px،
# لكن الشارة الدائرية بألوانها تبقى مميزة حتى بحجم 16px)
fav = {s: compose(s, fill_ratio=0.98) for s in (16, 32, 48)}
save("favicon-16.png", fav[16]); save("favicon-32.png", fav[32]); save("favicon-48.png", fav[48])
fav[48].save(ROOT / "public" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("✔ favicon.ico")
