/**
 * Official Emblem & Logo for Platform «مرحلة التأهيل»
 * Single source of truth: the official artwork file at
 * src/assets/images/taaheel-logo.png (imported as a build asset so Vite
 * bundles and hashes it correctly). The original, untouched upload is kept
 * at branding/taaheel-logo.png for reference.
 */

import officialLogoUrl from '../src/assets/images/taaheel-logo.png';

/**
 * Returns the URL of the official logo, for use in <img src="..."> tags
 * and in the in-page printable report.
 */
export function getOfficialLogoDataUrl() {
  return officialLogoUrl;
}
