import fs from 'fs';
import { Resvg } from '@resvg/resvg-js';
import { OFFICIAL_TAHEEL_LOGO_SVG } from '../js/logo.js';

if (!fs.existsSync('public')) {
  fs.mkdirSync('public', { recursive: true });
}

const logoSvg = OFFICIAL_TAHEEL_LOGO_SVG.trim();
fs.writeFileSync('public/logo.svg', logoSvg);

// Extract defs and content inside <svg>
const defsMatch = logoSvg.match(/<defs>([\s\S]*?)<\/defs>/);
const defs = defsMatch ? defsMatch[1] : '';
const bodyMatch = logoSvg.match(/<g filter="url\(#badgeShadow\)">([\s\S]*?)<\/svg>/);
const logoContent = bodyMatch ? bodyMatch[1].replace(/<\/g>[\s\n]*$/, '') : '';

// Build 1200x630 OG Banner SVG
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#040a1c" />
      <stop offset="40%" stop-color="#081636" />
      <stop offset="100%" stop-color="#112554" />
    </linearGradient>
    <radialGradient id="glowGrad" cx="50%" cy="38%" r="45%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.22" />
      <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.04" />
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
    </radialGradient>
    <pattern id="geometricGrid" width="36" height="36" patternUnits="userSpaceOnUse">
      <circle cx="18" cy="18" r="1" fill="#f59e0b" opacity="0.1" />
    </pattern>
    ${defs}
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#ogBgGrad)" />
  <rect width="1200" height="630" fill="url(#geometricGrid)" />
  <circle cx="600" cy="240" r="380" fill="url(#glowGrad)" />

  <!-- Elegant Inner Border -->
  <rect x="24" y="24" width="1152" height="582" rx="24" fill="none" stroke="#d5a036" stroke-width="1.8" stroke-opacity="0.35" />
  <rect x="34" y="34" width="1132" height="562" rx="16" fill="none" stroke="#d5a036" stroke-width="1" stroke-dasharray="6 4" stroke-opacity="0.25" />

  <!-- Corner Flourishes -->
  <g stroke="#d5a036" stroke-width="2" fill="none" opacity="0.6">
    <path d="M44,68 L44,44 L68,44" />
    <path d="M1156,68 L1156,44 L1132,44" />
    <path d="M44,562 L44,586 L68,586" />
    <path d="M1156,562 L1156,586 L1132,586" />
  </g>

  <!-- Center Emblem -->
  <g transform="translate(470, 48) scale(1.1)">
    <g filter="url(#badgeShadow)">
      ${logoContent}
    </g>
  </g>

  <!-- Accent Divider -->
  <g transform="translate(600, 445)">
    <line x1="-180" y1="0" x2="-24" y2="0" stroke="#d5a036" stroke-width="1.5" opacity="0.6" />
    <path d="M0,-5 L5,0 L0,5 L-5,0 Z" fill="#d5a036" />
    <line x1="24" y1="0" x2="180" y2="0" stroke="#d5a036" stroke-width="1.5" opacity="0.6" />
  </g>

  <!-- Title -->
  <text x="600" y="500" 
        font-family="system-ui, -apple-system, 'Tajawal', 'Segoe UI', Tahoma, sans-serif" 
        font-size="44" 
        font-weight="900" 
        fill="#ffffff" 
        text-anchor="middle"
        letter-spacing="0.6">
    منصة مرحلة التأهيل
  </text>

  <!-- Subtitle -->
  <text x="600" y="544" 
        font-family="system-ui, -apple-system, 'Tajawal', 'Segoe UI', Tahoma, sans-serif" 
        font-size="20" 
        font-weight="600" 
        fill="#d5a036" 
        text-anchor="middle"
        opacity="0.95">
    خطة التكاليف المقررة • متابعة الإنجاز والدرجات • سجل الحضور والغياب
  </text>
</svg>`;

// Render 1200x630 OG image
const ogResvg = new Resvg(ogSvg, { fitTo: { mode: 'width', value: 1200 } });
const ogPng = ogResvg.render().asPng();
fs.writeFileSync('public/og-image.png', ogPng);

// Render Logo 512x512
const logo512 = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 512 } });
fs.writeFileSync('public/logo.png', logo512.render().asPng());

// Render Favicons
const fav32 = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 32 } });
fs.writeFileSync('public/favicon-32x32.png', fav32.render().asPng());
fs.writeFileSync('public/favicon.ico', fav32.render().asPng());

const fav16 = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 16 } });
fs.writeFileSync('public/favicon-16x16.png', fav16.render().asPng());

const touchIcon = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 180 } });
fs.writeFileSync('public/apple-touch-icon.png', touchIcon.render().asPng());

const pwa192 = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 192 } });
fs.writeFileSync('public/pwa-192x192.png', pwa192.render().asPng());

const pwa512 = new Resvg(logoSvg, { fitTo: { mode: 'width', value: 512 } });
fs.writeFileSync('public/pwa-512x512.png', pwa512.render().asPng());

console.log('All social, brand, and PWA assets generated successfully in public/');
