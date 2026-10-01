# منصة مرحلة التأهيل

منصة تعليمية عربية (RTL) لمتابعة طلاب مرحلة التأهيل: بوابة طالب، وبوابة موحّدة للمشرف العام ومسؤول التحضير (التحضير وغرفة القيادة).

## 📁 هيكلية المشروع

```
├── index.html                  # نقطة الدخول؛ يحمّل js/app.js
├── css/                        # تنسيقات الواجهة (style.css وresponsive.css)
├── js/                         # منطق التطبيق (المصادقة، الحضور، التكاليف، Firebase)
├── public/                     # أصول ثابتة تُنسخ كما هي إلى dist
│   ├── favicon.ico             # أيقونة التبويب
│   ├── icons/                  # أيقونات التبويب والتثبيت على الهاتف (مولّدة من الشعار)
│   ├── manifest.webmanifest    # إعدادات تطبيق الويب التقدمي (PWA)
│   └── robots.txt              # يمنع فهرسة محركات البحث (المنصة تحوي بيانات طلاب)
├── branding/taaheel-logo.svg   # الشعار الرسمي (المصدر الوحيد لكل الأيقونات)
├── tools/generate-icons.py     # يعيد توليد الأيقونات من الشعار الرسمي
├── .github/workflows/deploy.yml# نشر تلقائي على GitHub Pages
├── firestore.rules             # قواعد الأمان لقاعدة البيانات
├── security_spec.md            # مواصفة الصلاحيات وسيناريوهات الاختراق المختبرة
├── package.json
└── vite.config.js
```

---

## 🖼️ الشعار والأيقونات

الشعار الرسمي هو الشارة المعرّفة داخل `js/logo.js` (OFFICIAL_TAHEEL_LOGO_SVG)، وهو نفسه المحفوظ كملف مستقل في `branding/taaheel-logo.svg` ومنه تُولَّد كل الأيقونات (تبويب المتصفح، أيقونة آيفون، أيقونات التثبيت على أندرويد بنوعيها العادي والقابل للقص). عند تغيير الشعار حدّث `js/logo.js` ثم انسخ محتوى SVG إلى `branding/taaheel-logo.svg` وشغّل:

```bash
sudo apt install librsvg2-bin   # مرة واحدة فقط
pip install pillow numpy
python3 tools/generate-icons.py
```

---

## 🚀 التشغيل والتطوير

```bash
npm install
npm run dev        # وضع التطوير
npm run build      # بناء نسخة الإنتاج في dist/
```

---

## 🌐 النشر على GitHub Pages

1. ارفع المشروع إلى مستودع على GitHub (الفرع `main`).
2. من **Settings ← Pages** اختر **Source: GitHub Actions**.
3. عند كل `push` يُبنى الموقع وينشر تلقائيًا.
4. من Firebase Console ← Authentication ← Settings ← **Authorized domains** أضف `USERNAME.github.io` وإلا فلن يعمل تسجيل الدخول على الموقع المنشور.
