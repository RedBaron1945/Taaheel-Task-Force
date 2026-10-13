# منصة مرحلة التأهيل

منصة تعليمية عربية (RTL) لمتابعة طلاب مرحلة التأهيل: بوابة طالب، وبوابة موحّدة للمشرف العام ومسؤول التحضير.

## 📁 هيكلية المشروع

```
├── index.html                  # نقطة الدخول؛ يحمّل js/app.js
├── css/                        # تنسيقات الواجهة
├── js/                         # منطق التطبيق (المصادقة، الحضور، التكاليف، Firebase)
├── public/                     # أصول ثابتة تُنسخ كما هي إلى dist
│   ├── favicon.ico / favicon-16x16.png / favicon-32x32.png / apple-touch-icon.png
│   ├── pwa-192x192.png / pwa-512x512.png   # أيقونات تثبيت الهاتف (PWA)
│   ├── whatsapp-share.png / logo-share.png # بطاقة مربعة لمعاينة واتساب
│   ├── logo.png / og-image.png
│   ├── manifest.json           # إعدادات PWA
│   └── sw.js                   # Service Worker
├── branding/taaheel-logo.png   # الشعار الرسمي (المصدر الوحيد لكل الأيقونات)
├── tools/generate-icons.py     # يعيد توليد كل أصول public/ من الشعار
├── .github/workflows/deploy.yml# نشر على GitHub Pages (بديل)
├── wrangler.jsonc              # إعداد Cloudflare (assets.directory — لا تغيّره)
├── firebase.json / firestore.rules / security_spec.md
├── firebase-applet-config.json # يُستورد فعليًا من js/firebase.js
├── package.json
└── vite.config.js
```

الموقع المنشور: https://taaheel-task-force.bbrys005.workers.dev

## 🖼️ الشعار والأيقونات
المصدر الوحيد `branding/taaheel-logo.png`. عند تغييره:
```bash
sudo apt install librsvg2-bin   # مرة واحدة (لصور المشاركة)
pip install pillow numpy
python3 tools/generate-icons.py
```

## 🚀 التشغيل
```bash
npm install
npm run dev
npm run build
```

## 🌐 النشر
- **Cloudflare (الاستخدام الحالي):** `wrangler.jsonc` يحدّد `assets.directory: "./dist"`، وأمر البناء `npm run build`.
- **GitHub Pages (بديل):** Settings ← Pages ← Source: GitHub Actions.
- في كل الحالات: أضف نطاق النشر في Firebase Console ← Authentication ← Authorized domains.
- **قواعد Firestore لا تُنشر مع الموقع:** انسخ `firestore.rules` إلى Firebase Console ← Firestore ← Rules واضغط Publish.
