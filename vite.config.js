import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// base نسبي ليعمل الموقع من أي مسار (جذر النطاق أو داخل مجلد مستودع)
export default defineConfig({
  base: './',
  plugins: [tailwindcss()],
  build: { outDir: 'dist', emptyOutDir: true },
  server: { port: 3000, host: true },
});
