# منصة مرحلة التأهيل

تطبيق ويب عربي (RTL) لمتابعة طلاب الدفعة 48: رصد حضور الجلسات والخميسيات، وتكاليف القرآن والدروس، ولوحة الإنجاز. يعمل كتطبيق ويب تقدمي (PWA) قابل للتثبيت على الجوال.

## البوابات

- **بوابة الطالب:** عرض التكليفات وتسجيل الإنجاز ومتابعة النقاط.
- **بوابة المشرف العام:** إدارة الطلاب والتكليفات والمحاضن والإعدادات.
- **بوابة مسؤول التحضير:** تسجيل الحضور والغياب.

## التقنيات

- JavaScript (ES Modules) بدون إطار عمل
- Vite و Tailwind CSS 4
- Firebase: المصادقة وقاعدة بيانات Firestore
- Cloudflare Workers (أصول ثابتة) أو GitHub Pages للاستضافة

## التشغيل محليًا

المتطلبات: Node.js 20 أو أحدث.

```bash
npm install
npm run dev
```

يعمل التطبيق على `http://localhost:3000`.

## الأوامر

| الأمر | الوظيفة |
| --- | --- |
| `npm run dev` | تشغيل خادم التطوير |
| `npm run build` | بناء النسخة النهائية في مجلد `dist` |
| `npm run preview` | معاينة النسخة المبنية |

## هيكل المشروع

```
index.html            الصفحة الرئيسية
css/                  أنماط التطبيق (style.css, responsive.css)
src/index.css         استيراد Tailwind
js/
  app.js              نقطة الدخول
  auth.js             تسجيل الدخول والأدوار
  firebase.js         تهيئة Firebase (يقرأ firebase-applet-config.json)
  *Service.js         خدمات Firestore (المستخدمون، التكليفات، الحضور، الإنجاز)
  student.js          واجهة الطالب
  supervisor.js       واجهة المشرف ومسؤول التحضير
  attendance.js       واجهة التحضير
public/               الأيقونات وملفات PWA (manifest.json, sw.js)
branding/             الأصول الأصلية للشعار
tools/                سكربت توليد الأيقونات
firebase-applet-config.json  إعدادات مشروع Firebase للويب
firestore.rules       قواعد أمان Firestore
security_spec.md      مواصفات الأمان
wrangler.jsonc        إعدادات النشر على Cloudflare
```

## توليد الأيقونات

يولّد السكربت أيقونات `public/` من `branding/taaheel-logo.png` (يحتاج Python وحزمة Pillow):

```bash
python3 tools/generate-icons.py
```

## النشر

شغّل `npm run build` ثم انشر مجلد `dist/`:

- **Cloudflare:** عبر `wrangler deploy` (الإعدادات في `wrangler.jsonc`).
- **قواعد Firestore:** `firebase deploy --only firestore:rules` بعد أي تعديل.
