# منصة مرحلة التأهيل

منصة تعليمية عربية (RTL) لمتابعة طلاب مرحلة التأهيل: بوابة طالب، وبوابة موحّدة للمشرف العام ومسؤول التحضير (التحضير وغرفة القيادة).

## 📁 هيكلية المشروع

```
├── index.html                  # نقطة الدخول؛ يحمّل js/app.js
├── css/                        # تنسيقات الواجهة (style.css وresponsive.css)
├── js/                         # منطق التطبيق (المصادقة، الحضور، التكاليف، Firebase)
├── public/                     # أصول ثابتة تُنسخ كما هي إلى dist
│   ├── favicon.ico / favicon-16x16.png / favicon-32x32.png / apple-touch-icon.png
│   ├── pwa-192x192.png / pwa-512x512.png   # أيقونات تثبيت الهاتف (PWA)
│   ├── logo.png                # شعار بخلفية بيضاء لأي استخدام عام
│   ├── whatsapp-share.png / logo-share.png # بطاقة مربعة (512×512) لمعاينة واتساب وتويتر
│   ├── og-image.png            # بانر كبير (1200×630) لفيسبوك ولينكدإن
│   ├── manifest.json           # إعدادات تطبيق الويب التقدمي (PWA)
│   └── sw.js                   # Service Worker (تخزين مؤقت للعمل بسرعة وبلا اتصال)
├── branding/taaheel-logo.png   # الشعار الرسمي (المصدر الوحيد لكل الأيقونات وصورة OG)
├── tools/generate-icons.py     # يعيد توليد كل أصول public/ من الشعار الرسمي
├── .github/workflows/deploy.yml# نشر تلقائي على GitHub Pages (إن استُخدم بدل Cloudflare)
├── wrangler.jsonc               # إعداد Cloudflare Pages/Workers (assets.directory)
├── firebase.json                # إعداد Firebase Hosting/CLI (قواعد Firestore فقط)
├── firestore.rules
├── security_spec.md
├── firebase-applet-config.json # إعداد مشروع Firebase (يُستورد فعليًا من js/firebase.js)
├── package.json
└── vite.config.js
```

الموقع المنشور حاليًا: https://taaheel-task-force.bbrys005.workers.dev

---

## 🖼️ الشعار وكل الأيقونات وصورة المشاركة

المصدر الوحيد هو `branding/taaheel-logo.png`. عند تغييره شغّل:

```bash
sudo apt install librsvg2-bin   # مرة واحدة فقط (لصورة OG)
pip install pillow numpy
python3 tools/generate-icons.py
```

يولّد هذا كل أيقونات `public/` (التبويب، آيفون، تثبيت أندرويد)، وبطاقة `whatsapp-share.png` المربعة التي تظهر في معاينة واتساب وتويتر، وبانر `og-image.png` الكبير لفيسبوك ولينكدإن، والشعار المستخدم داخل التطبيق نفسه (`src/assets/images/taaheel-logo.png`).

---

## 🚀 التشغيل والتطوير

```bash
npm install
npm run dev        # وضع التطوير
npm run build      # بناء نسخة الإنتاج في dist/
```

---

## 🌐 النشر

### Cloudflare Pages / Workers (الاستخدام الحالي)
المشروع يحتوي `wrangler.jsonc` يحدّد `assets.directory: "./dist"`. اربط المستودع من لوحة Cloudflare، وتأكد أن Build command هو `npm run build` (وليس bun).

### GitHub Pages (بديل)
1. ارفع المشروع إلى مستودع على GitHub (الفرع `main`).
2. من **Settings ← Pages** اختر **Source: GitHub Actions**.
3. عند كل `push` يُبنى الموقع وينشر تلقائيًا عبر `.github/workflows/deploy.yml`.

### في كل الحالات
من Firebase Console ← Authentication ← Settings ← **Authorized domains** أضف نطاق النشر الفعلي (`taaheel-task-force.bbrys005.workers.dev`)، وإلا فلن يعمل تسجيل الدخول على الموقع المنشور.
