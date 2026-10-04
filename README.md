# منصة مرحلة التأهيل

منصة تعليمية عربية (RTL) لمتابعة طلاب مرحلة التأهيل: بوابة طالب، وبوابة موحّدة للمشرف العام ومسؤول التحضير (التحضير وغرفة القيادة).

## 📁 هيكلية المشروع

```
├── index.html                  # نقطة الدخول؛ يحمّل js/app.js
├── css/                        # تنسيقات الواجهة (style.css وresponsive.css)
├── js/                         # منطق التطبيق (المصادقة، الحضور، التكاليف، Firebase)
├── public/                     # أصول ثابتة تُنسخ كما هي إلى dist
│   ├── favicon.ico / favicon-16x16.png / favicon-32x32.png / apple-touch-icon.png
│   ├── icon-192.png / icon-512.png / icon-maskable-*.png   # أيقونات تثبيت الهاتف (PWA)
│   ├── logo.png                # شعار بخلفية بيضاء لأي استخدام عام
│   ├── og-image.png            # صورة المشاركة على واتساب/تيليجرام/تويتر (1200×630)
│   └── manifest.webmanifest    # إعدادات تطبيق الويب التقدمي (PWA)
├── branding/taaheel-logo.png   # الشعار الرسمي (المصدر الوحيد لكل الأيقونات وصورة OG)
├── tools/generate-icons.py     # يعيد توليد كل أصول public/ من الشعار الرسمي
├── .github/workflows/deploy.yml# نشر تلقائي على GitHub Pages (إن استُخدم بدل Cloudflare)
├── wrangler.jsonc               # إعداد Cloudflare Pages/Workers (assets.directory)
├── firestore.rules
├── security_spec.md
├── firebase-applet-config.json # إعداد مشروع Firebase (يُستورد فعليًا من js/firebase.js)
├── package.json
└── vite.config.js
```

---

## 🖼️ الشعار وكل الأيقونات وصورة المشاركة

المصدر الوحيد هو `branding/taaheel-logo.png`. عند تغييره شغّل:

```bash
sudo apt install librsvg2-bin   # مرة واحدة فقط (لصورة OG)
pip install pillow numpy
python3 tools/generate-icons.py
```

يولّد هذا كل أيقونات `public/` (التبويب، آيفون، تثبيت أندرويد العادي والقابل للقص) وصورة `og-image.png` التي تظهر عند مشاركة رابط الموقع في واتساب وتيليجرام وتويتر، والشعار المستخدم داخل التطبيق نفسه (`src/assets/images/taaheel-logo.png`).

### ⚠️ بعد أول نشر، حدّث رابط النطاق
في `index.html` يوجد نص placeholder هو `https://REPLACE-WITH-YOUR-DEPLOYED-DOMAIN` في وسوم `og:url` و`og:image` و`twitter:image` وبيانات Schema.org. استبدله بالنطاق الفعلي بعد النشر (مثل `https://your-project.pages.dev` أو نطاقك الخاص)، وإلا ستظهر معاينة رابط مكسورة عند مشاركته.

---

## 🚀 التشغيل والتطوير

```bash
npm install
npm run dev        # وضع التطوير
npm run build      # بناء نسخة الإنتاج في dist/
```

---

## 🌐 النشر

### Cloudflare Pages / Workers
المشروع يحتوي `wrangler.jsonc` يحدّد `assets.directory: "./dist"`. اربط المستودع من لوحة Cloudflare، وتأكد أن Build command هو `npm run build` (وليس bun).

### GitHub Pages (بديل)
1. ارفع المشروع إلى مستودع على GitHub (الفرع `main`).
2. من **Settings ← Pages** اختر **Source: GitHub Actions**.
3. عند كل `push` يُبنى الموقع وينشر تلقائيًا عبر `.github/workflows/deploy.yml`.

### في كل الحالات
من Firebase Console ← Authentication ← Settings ← **Authorized domains** أضف نطاق النشر الفعلي، وإلا فلن يعمل تسجيل الدخول على الموقع المنشور.
