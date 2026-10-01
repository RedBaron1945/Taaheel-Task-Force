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
├── branding/taaheel-logo.png   # الشعار الرسمي (المصدر الوحيد لكل الأيقونات)
├── tools/generate-icons.py     # يعيد توليد الأيقونات من الشعار الرسمي
├── .github/workflows/deploy.yml# نشر تلقائي على GitHub Pages
├── firestore.rules             # قواعد الأمان لقاعدة البيانات
├── security_spec.md            # مواصفة الصلاحيات وسيناريوهات الاختراق المختبرة
├── package.json
└── vite.config.js
```

---

## 🖼️ الشعار والأيقونات

الشعار الرسمي هو الملف `branding/taaheel-logo.png` (صورة PNG شفافة الخلفية)، ومنه تُولَّد كل الأيقونات (تبويب المتصفح، أيقونة آيفون، أيقونات التثبيت على أندرويد بنوعيها العادي والقابل للقص/maskable). نسخة مصغّرة منه مُضمَّنة أيضاً داخل `js/logo.js` كـ base64 (الثابت `OFFICIAL_TAHEEL_LOGO_DATA_URL`) لتظهر داخل واجهة التطبيق وتقارير PDF دون طلب شبكة إضافي.

عند تغيير الشعار:
1. استبدل `branding/taaheel-logo.png` بالملف الجديد (PNG بخلفية شفافة، يُفضَّل أبعاد مربّعة تقريباً).
2. أعد توليد الأيقونات:
   ```bash
   pip install pillow numpy
   python3 tools/generate-icons.py
   ```
3. حدّث يدوياً الثابت `OFFICIAL_TAHEEL_LOGO_DATA_URL` في `js/logo.js` بنسخة base64 لنسخة مصغّرة (~500px) من نفس الشعار الجديد.

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
