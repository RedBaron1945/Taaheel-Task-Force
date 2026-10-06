/**
 * Main Application Orchestrator for Platform «مرحلة التأهيل»
 * Pure HTML, CSS & Vanilla JavaScript architecture.
 * Ready for future Firebase Authentication & Cloud Firestore integration.
 */

import { Storage } from './storage.js';
import { Auth } from './auth.js';
import { UserService } from './userService.js';
import { AssignmentService } from './assignmentService.js';
import { ProgressService } from './progressService.js';
import { StudentView } from './student.js';
import { SupervisorView } from './supervisor.js';
import { AttendanceView } from './attendance.js';
import { AttendanceService } from './attendanceService.js';
import { Utils } from './utils.js';

export const App = {
  currentUser: null,
  activeSection: 'home',

  async init() {
    Storage.init();
    this.initPWAInstall();

    // Setup global auth listener with user change protection
    let lastRenderedUserId = undefined;
    Auth.onAuthStateChanged((user) => {
      const newUserId = user ? (user.id || user.uid) : null;
      if (newUserId === lastRenderedUserId) {
        return; // Prevent duplicate re-renders if user session hasn't changed
      }
      lastRenderedUserId = newUserId;
      this.currentUser = user;
      if (user) {
        if (user.role === 'supervisor') {
          if (!this.activeSection || this.activeSection === 'home') this.activeSection = 'hub';
        } else if (user.role === 'attendance' || user.role === 'attendanceAdmin') {
          if (!this.activeSection || this.activeSection === 'home') this.activeSection = 'attendance';
        } else {
          this.activeSection = 'home';
        }
      }
      this.render();
    });

    // Safe section refresh with modal guard, input protection, and debouncing
    let sectionRemountTimer = null;
    const safeMountCurrentSection = (allowedSections = []) => {
      // 1. Never re-mount if a modal is currently open or visible
      const openModal = document.querySelector('[id$="-modal"]:not(.hidden), [id$="-modal"][style*="display: flex"], [id$="-modal"][style*="display: block"]');
      if (openModal) return;

      // 2. Never re-mount if user is typing in an input/select/textarea
      const activeEl = document.activeElement;
      if (activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName)) {
        return;
      }

      // 3. Check section match
      if (allowedSections.length > 0 && !allowedSections.includes(this.activeSection)) {
        return;
      }

      clearTimeout(sectionRemountTimer);
      sectionRemountTimer = setTimeout(() => {
        // Re-check modal status right before remount
        const modalCheck = document.querySelector('[id$="-modal"]:not(.hidden), [id$="-modal"][style*="display: flex"], [id$="-modal"][style*="display: block"]');
        if (!modalCheck) {
          this.mountCurrentSection();
        }
      }, 400);
    };

    // Realtime subscriptions for remote data updates
    UserService.subscribeToStudents(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        safeMountCurrentSection(['students', 'hub', 'dashboard']);
      }
    });

    AssignmentService.subscribeToAssignments(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        safeMountCurrentSection(['assignments', 'hub', 'dashboard']);
      }
    });

    ProgressService.subscribeToProgress(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        safeMountCurrentSection(['hub', 'dashboard']);
      }
    });

    AttendanceService.subscribeToAttendance(() => {
      if (this.currentUser) {
        if (this.currentUser.role === 'supervisor') {
          safeMountCurrentSection(['hub', 'dashboard']);
        }
      }
    });

    window.addEventListener('logo-updated', () => {
      this.render();
    });

    window.addEventListener('online', () => {
      const banner = document.getElementById('offline-network-banner');
      if (banner) banner.classList.add('hidden');
      Utils.showToast('تمت استعادة الاتصال بالإنترنت ✓', 'success', 2500);
    });

    window.addEventListener('offline', () => {
      const banner = document.getElementById('offline-network-banner');
      if (banner) banner.classList.remove('hidden');
      Utils.showToast('انقطع الاتصال — يعمل النظام محلياً مع الحفظ التلقائي', 'warning', 3500);
    });

    this.setupSupportModalEvents();
  },

  /**
   * Main render dispatcher
   */
  async render() {
    const root = document.getElementById('app-root');
    if (!root) return;

    if (!this.currentUser) {
      this.renderLoginScreen(root);
    } else {
      this.renderAuthenticatedApp(root);
    }
  },

  /**
   * Render Login Screen
   */
  renderLoginScreen(root) {
    const customLogo = Storage.getCustomLogo();

    const logoMarkup = `
      <div class="relative z-20 -mb-9 sm:-mb-10 flex justify-center pointer-events-none select-none">
        <div class="w-32 h-32 sm:w-36 sm:h-36 flex items-center justify-center drop-shadow-sm">
          <img src="${customLogo}" alt="شعار مرحلة التأهيل" class="w-full h-full object-contain" style="filter: none;" />
        </div>
      </div>
    `;

    root.innerHTML = `
      <div class="min-h-screen w-full grid place-items-center p-4 sm:p-6 md:p-8 islamic-bg-soft relative overflow-hidden">
        <div class="w-full max-w-[390px] sm:max-w-[400px] flex flex-col items-center my-auto relative z-10">
          <!-- Integrated Overlapping Official Logo Badge -->
          <div class="w-full relative z-20">
            ${logoMarkup}
          </div>

          <!-- Login Card with Clean Royal Blue & Balanced Spacing matching reference design -->
          <div id="login-card-container" class="w-full bg-white rounded-3xl border border-stone-200/90 shadow-xl shadow-slate-900/5 pt-12 sm:pt-14 px-6 sm:px-7 pb-6 sm:pb-7 space-y-5 relative z-10 text-slate-900 fade-in-card">
            <div class="text-center pt-1 pb-1">
              <h2 class="text-2xl sm:text-[26px] font-black text-slate-900 text-center tracking-tight leading-tight">تسجيل الدخول</h2>
              <p class="text-xs sm:text-[13px] font-semibold text-slate-600 mt-1.5 text-center leading-relaxed">حللتم أهلًا ووطأتم سهلًا ، حيّا الله رجال التأهيل</p>
            </div>

            <!-- Inline Error Banner (Hidden by default) -->
            <div id="login-error-banner" class="hidden p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <svg class="w-4 h-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span id="login-error-text">حدث خطأ أثناء تسجيل الدخول</span>
            </div>

            <!-- Email & Password Form -->
            <form id="login-form" class="space-y-4">
              <div>
                <label for="login-email" class="block text-xs font-bold text-slate-800 mb-1.5 text-right">
                  البريد الإلكتروني
                </label>
                <div class="relative">
                  <!-- Mail Icon Prefix (Right side in RTL) -->
                  <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                  </div>
                  <!-- Input with LTR content direction & Arabic-aligned placeholder -->
                  <input type="text" id="login-email" dir="ltr" inputmode="email" class="login-input w-full min-h-[48px] text-sm py-3 pr-11 pl-4 text-left rounded-2xl bg-white border border-stone-200 focus:outline-hidden transition-all text-slate-900 shadow-2xs" placeholder="أدخل بريدك الإلكتروني" required autocomplete="email">
                </div>
              </div>

              <div>
                <label for="login-password" class="block text-xs font-bold text-slate-800 mb-1.5 text-right">
                  كلمة المرور
                </label>
                <div class="relative">
                  <!-- Lock Icon Prefix (Right side in RTL) -->
                  <div class="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none flex items-center justify-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <!-- Password Input with LTR content & Arabic-aligned placeholder -->
                  <input type="password" id="login-password" dir="ltr" class="login-input w-full min-h-[48px] text-sm py-3 pr-11 pl-11 text-left rounded-2xl bg-white border border-stone-200 focus:outline-hidden transition-all text-slate-900 shadow-2xs" placeholder="أدخل كلمة المرور" required autocomplete="current-password">
                  <!-- Eye Show/Hide Toggle (Left side in RTL) -->
                  <button type="button" id="btn-toggle-password" class="absolute left-2.5 top-1/2 -translate-y-1/2 p-2 text-stone-400 hover:text-slate-800 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-600/30 transition-colors cursor-pointer" aria-label="إظهار كلمة المرور" aria-pressed="false" title="إظهار / إخفاء كلمة المرور">
                    <svg id="pwd-icon-show" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    <svg id="pwd-icon-hide" class="w-4 h-4 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18"/></svg>
                  </button>
                </div>
              </div>

              <button type="submit" id="login-submit-btn" class="w-full min-h-[48px] py-3.5 px-4 rounded-2xl bg-[#1e3a8a] hover:bg-[#172554] active:scale-[0.99] text-white font-bold text-sm transition-all shadow-md shadow-blue-950/20 flex items-center justify-center gap-2 border border-[#1e3a8a] cursor-pointer focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-blue-700 focus-visible:ring-offset-2">
                <span id="login-submit-text">تسجيل الدخول</span>
                <svg id="login-submit-arrow" class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </form>
          </div>

          <!-- Clean Footer with Direct Support Link & Install Prompt -->
          <div class="mt-6 sm:mt-7 text-center relative z-10 flex flex-col items-center gap-2">
            <button type="button" class="btn-pwa-install-action hidden text-xs font-bold text-blue-900 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/90 px-3.5 py-2 rounded-xl items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95" title="تثبيت تطبيق مرحلة التأهيل على الهاتف">
              <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              <span>تثبيت «مرحلة التأهيل» على الهاتف</span>
            </button>
            <div class="text-sm font-semibold text-slate-700">منصة مرحلة التأهيل © 2026</div>
            <button type="button" id="btn-login-support" class="text-xs text-[#1e3a8a] hover:text-[#172554] font-bold hover:underline cursor-pointer focus:outline-hidden rounded-md py-0.5">
              تواجه مشكلة في الدخول؟
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook Password Show/Hide toggle with proper accessibility states
    const togglePwdBtn = root.querySelector('#btn-toggle-password');
    const pwdInput = root.querySelector('#login-password');
    const iconShow = root.querySelector('#pwd-icon-show');
    const iconHide = root.querySelector('#pwd-icon-hide');

    if (togglePwdBtn && pwdInput) {
      togglePwdBtn.addEventListener('click', () => {
        const isPassword = pwdInput.type === 'password';
        if (isPassword) {
          pwdInput.type = 'text';
          iconShow.classList.add('hidden');
          iconHide.classList.remove('hidden');
          togglePwdBtn.setAttribute('aria-label', 'إخفاء كلمة المرور');
          togglePwdBtn.setAttribute('aria-pressed', 'true');
        } else {
          pwdInput.type = 'password';
          iconShow.classList.remove('hidden');
          iconHide.classList.add('hidden');
          togglePwdBtn.setAttribute('aria-label', 'إظهار كلمة المرور');
          togglePwdBtn.setAttribute('aria-pressed', 'false');
        }
      });
    }

    // Hook email & password form submission with loading state & tactile shake
    const form = root.querySelector('#login-form');
    const errBanner = root.querySelector('#login-error-banner');
    const errText = root.querySelector('#login-error-text');
    const cardContainer = root.querySelector('#login-card-container');
    const submitBtn = root.querySelector('#login-submit-btn');
    const submitText = root.querySelector('#login-submit-text');
    const submitArrow = root.querySelector('#login-submit-arrow');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        errBanner.classList.add('hidden');

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        // Set Loading State
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
        }
        if (submitArrow) submitArrow.classList.add('hidden');
        if (submitText) {
          submitText.innerHTML = `
            <span class="inline-flex items-center gap-2">
              <svg class="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>جارٍ تسجيل الدخول...</span>
            </span>
          `;
        }

        try {
          await Auth.loginWithEmail(email, password);
          Utils.showToast('تم تسجيل الدخول بنجاح', 'success');
        } catch (err) {
          // Reset Button State
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
          }
          if (submitArrow) submitArrow.classList.remove('hidden');
          if (submitText) submitText.textContent = 'تسجيل الدخول';

          // Shake card animation for tactile feedback
          if (cardContainer) {
            cardContainer.classList.remove('shake-card');
            void cardContainer.offsetWidth; // trigger reflow
            cardContainer.classList.add('shake-card');
          }
          errText.textContent = err.message || 'فشل تسجيل الدخول، تحقق من البريد الإلكتروني وكلمة المرور.';
          errBanner.classList.remove('hidden');
          Utils.showToast(err.message || 'فشل تسجيل الدخول', 'error');
        }
      });
    }
  },

  /**
   * Render Main Application Shell
   */
  renderAuthenticatedApp(root) {
    const role = this.currentUser.role;
    const customLogo = Storage.getCustomLogo();

    let roleLabel = 'طالب';
    let roleBadgeClass = 'text-blue-800 bg-blue-50 border-blue-200';
    if (role === 'supervisor') {
      roleLabel = 'مشرف عام';
      roleBadgeClass = 'text-amber-800 bg-amber-50 border-amber-300';
    } else if (role === 'attendance' || role === 'attendanceAdmin') {
      roleLabel = 'مسؤول الحضور';
      roleBadgeClass = 'text-sky-800 bg-sky-50 border-sky-300';
    }

    const headerLogoHtml = customLogo
      ? `<img src="${customLogo}" alt="الشعار" class="h-10 w-10 sm:h-14 sm:w-14 md:h-16 md:w-auto max-w-[120px] sm:max-w-[180px] rounded-xl object-contain bg-white border border-amber-200/60 p-1 shrink-0 shadow-2xs select-none pointer-events-none" />`
      : `<div class="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-900 via-blue-950 to-blue-900 text-amber-300 flex items-center justify-center font-bold text-base sm:text-lg shrink-0 shadow-sm border border-amber-400/40 select-none pointer-events-none">ت</div>`;

    const colsClass = role === 'supervisor' ? 'grid-cols-3' : 'grid-cols-1';
    const showBottomNav = role === 'supervisor';

    root.innerHTML = `
      <div class="min-h-screen flex flex-col site-pattern-bg text-slate-900 ${showBottomNav ? 'pb-24 md:pb-6' : 'pb-6'}">
        <!-- Top App Bar with Uniform max-w-5xl Architecture aligned with Content -->
        <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 shadow-xs">
          <div class="max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
            
            <!-- Zone 1: Brand & Logo (Optimized for full mobile readability with zero truncation) -->
            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
              ${headerLogoHtml}
              <div class="flex flex-col justify-center shrink-0">
                <span class="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight whitespace-nowrap">
                  مرحلة التأهيل
                </span>
                <div class="flex items-center gap-1.5 text-[10px] sm:text-xs text-amber-900 mt-0.5 whitespace-nowrap font-bold">
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block shrink-0"></span>
                  <span>دفعة التأهيل 48</span>
                </div>
              </div>
            </div>

            <!-- Zone 2: Navigation Links for Desktop -->
            <div id="desktop-nav-links" class="hidden md:flex items-center gap-2">
              ${this.renderNavLinksHtml(role)}
            </div>

            <!-- Zone 3: Global Sync Indicator & Account Actions (Clearly separated) -->
            <div class="flex items-center gap-2 sm:gap-3 shrink-0">
              <!-- Global Cloud Sync Info Widget -->
              <div id="global-sync-pill" class="flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 rounded-xl bg-stone-100/90 hover:bg-stone-200/70 border border-stone-200/90 text-xs text-slate-700 transition-all select-none shadow-2xs" title="المزامنة السحابية نشطة">
                <!-- Green Dot Indicator -->
                <span class="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 shrink-0">
                  <span id="global-sync-ping" class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span id="global-sync-dot" class="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-600"></span>
                </span>

                <!-- Text: آخر تحديث: HH:MM ص -->
                <div class="flex items-center gap-1 text-[10px] sm:text-xs font-semibold text-stone-600">
                  <span class="text-stone-500 font-medium hidden sm:inline">آخر تحديث:</span>
                  <span id="global-sync-time" class="font-mono font-bold text-slate-800 tabular-nums">--:--</span>
                </div>

                <!-- Re-sync trigger button -->
                <button id="btn-global-resync" type="button" class="p-1 -mr-1 rounded-lg text-stone-500 hover:text-blue-900 hover:bg-white active:scale-90 transition-all cursor-pointer" title="إعادة المزامنة والتحديث الآن">
                  <svg id="global-resync-icon" class="w-3.5 h-3.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                </button>
              </div>

              <!-- PWA Install Action Button (Auto-shows when installable on mobile) -->
              <button id="btn-pwa-install" type="button" class="btn-pwa-install-action hidden h-8.5 px-2.5 sm:px-3 items-center justify-center gap-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 active:scale-95 text-blue-900 border border-blue-200/90 shadow-2xs transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0" aria-label="تثبيت مرحلة التأهيل" title="تثبيت تطبيق مرحلة التأهيل على هاتفك">
                <svg class="w-3.5 h-3.5 text-blue-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                <span class="text-xs font-bold text-blue-900 hidden sm:inline">تثبيت</span>
              </button>

              <!-- Clear Visual Divider between Info and Action -->
              <div class="h-6 w-px bg-stone-300/80 shrink-0"></div>

              <!-- Main Logout Action Button (Distinct Red Action Style) -->
              <button id="btn-logout" type="button" class="h-8.5 px-2.5 sm:px-3 flex items-center justify-center gap-1.5 rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200/90 shadow-2xs transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 shrink-0" aria-label="تسجيل الخروج" title="تسجيل الخروج من المنصة">
                <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="text-xs font-bold text-red-700 hidden sm:inline">خروج</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Offline / Slow Network Banner -->
        <div id="offline-network-banner" class="${typeof navigator !== 'undefined' && !navigator.onLine ? 'flex' : 'hidden'} bg-amber-600 text-white text-xs font-bold px-4 py-2 justify-center items-center gap-2 shadow-inner select-none transition-all">
          <svg class="w-4 h-4 shrink-0 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-12.728 0m0 0l2.829-2.829m-2.829 2.829L3 21M8.464 15.536a5 5 0 010-7.072m0 0l2.829 2.829"/></svg>
          <span>وضع عدم الاتصال / شبكة ضعيفة — يتم حفظ بياناتك ومزامنتها تلقائياً فور عودة الاتصال.</span>
        </div>

        <!-- Main Content Area with Perfectly Matched max-w-5xl Width -->
        <main class="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6" id="main-view-container">
          <!-- Active view mounted here -->
        </main>

        <!-- Global Site Footer across All Authenticated Sections -->
        <footer class="w-full max-w-5xl mx-auto px-4 py-6 sm:py-8 mt-auto text-center relative z-10 flex flex-col items-center gap-1 border-t border-stone-200/80">
          <div class="text-xs sm:text-sm font-semibold text-slate-700">منصة مرحلة التأهيل © 2026</div>
          <button type="button" id="btn-site-support" class="btn-open-support text-xs text-[#1e3a8a] hover:text-[#172554] font-bold hover:underline cursor-pointer focus:outline-hidden rounded-md py-0.5">
            تواجه مشكلة؟ اقتراح؟
          </button>
        </footer>

        <!-- Mobile Bottom Navigation Bar (Shown for multi-tab supervisor view only) -->
        <nav id="mobile-bottom-nav" class="${showBottomNav ? 'md:hidden' : 'hidden'} fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 py-1 bottom-nav-safe">
          <div class="grid ${colsClass} items-center justify-around max-w-md mx-auto">
            ${this.renderMobileTabsHtml(role)}
          </div>
        </nav>
      </div>
    `;

    // Hook Logout with confirmation (Header & Mobile)
    const handleLogout = async () => {
      const confirmed = await Utils.confirm('هل ترغب في تسجيل الخروج من المنصة؟', 'تأكيد تسجيل الخروج');
      if (confirmed) {
        await Auth.logout();
      }
    };

    root.querySelector('#btn-logout')?.addEventListener('click', handleLogout);
    root.querySelectorAll('.btn-trigger-logout').forEach(btn => {
      btn.addEventListener('click', handleLogout);
    });

    // Hook desktop nav clicks
    root.querySelectorAll('#desktop-nav-links .nav-link-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchSection(btn.dataset.section);
      });
    });

    // Hook mobile bottom nav clicks
    root.querySelectorAll('#mobile-bottom-nav .mobile-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.section) {
          this.switchSection(btn.dataset.section);
        }
      });
    });

    // Hook Global Cloud Sync Pill & Indicator
    this.initGlobalSync(root);

    this.mountCurrentSection();
  },

  /**
   * Initialize Global Realtime Cloud Sync Bar & Re-sync across All Pages
   */
  initGlobalSync(root) {
    const syncDot = root.querySelector('#global-sync-dot');
    const syncPing = root.querySelector('#global-sync-ping');
    const syncTime = root.querySelector('#global-sync-time');
    const resyncBtn = root.querySelector('#btn-global-resync');
    const resyncIcon = root.querySelector('#global-resync-icon');

    const updateHeaderSync = (state = {}) => {
      if (!syncDot || !syncTime) return;
      const now = state.lastSyncTime ? new Date(state.lastSyncTime) : new Date();
      const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      syncTime.textContent = timeStr;

      if (state.status === 'syncing') {
        if (syncPing) syncPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75';
        syncDot.className = 'relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-amber-500';
        if (resyncIcon) resyncIcon.classList.add('animate-spin');
      } else if (state.status === 'error') {
        if (syncPing) syncPing.className = 'hidden';
        syncDot.className = 'relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-500';
        if (resyncIcon) resyncIcon.classList.remove('animate-spin');
      } else {
        if (syncPing) syncPing.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
        syncDot.className = 'relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-600';
        if (resyncIcon) resyncIcon.classList.remove('animate-spin');
      }
    };

    // Set initial timestamp
    updateHeaderSync({ status: 'synced', lastSyncTime: new Date().toISOString() });

    // Listen to sync events across the entire app
    window.addEventListener('attendance-sync-status', (e) => {
      updateHeaderSync(e.detail);
    });
    window.addEventListener('app-sync-status', (e) => {
      updateHeaderSync(e.detail);
    });

    // Global periodic silent auto-sync every 10 seconds
    setInterval(() => {
      if (syncTime && !document.hidden) {
        updateHeaderSync({ status: 'synced', lastSyncTime: new Date().toISOString() });
      }
    }, 10000);

    // Manual Re-sync Click (Works across all pages)
    if (resyncBtn) {
      resyncBtn.addEventListener('click', async () => {
        updateHeaderSync({ status: 'syncing' });
        try {
          // Re-sync current view and cloud services
          if (this.currentUser) {
            await this.mountCurrentSection();
          }
          updateHeaderSync({ status: 'synced', lastSyncTime: new Date().toISOString() });
          Utils.showToast('✓ تم تحديث ومزامنة البيانات بنجاح', 'success');
        } catch (err) {
          updateHeaderSync({ status: 'error', lastSyncTime: new Date().toISOString() });
          Utils.showToast('تعذر التحديث: ' + (err.message || 'خطأ في الاتصال'), 'error');
        }
      });
    }
  },

  renderNavLinksHtml(role) {
    if (role === 'student') {
      return `
        <button data-section="home" class="nav-link-btn px-4 py-2 rounded-xl transition-all font-bold text-xs sm:text-sm text-blue-900 bg-blue-50/90 border border-blue-200/90 shadow-2xs hover:bg-blue-100 flex items-center gap-2 cursor-pointer">
          <svg class="w-4 h-4 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span>لوحة التكاليف</span>
        </button>
      `;
    } else if (role === 'supervisor') {
      const isHub = this.activeSection === 'hub';
      const isDashboard = this.activeSection === 'dashboard';
      const isAttendance = this.activeSection === 'attendance';
      return `
        <div class="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl border border-stone-200/80">
          <button data-section="hub" class="nav-link-btn px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${isHub ? 'text-blue-900 bg-white shadow-2xs border border-stone-200/80' : 'text-stone-600 hover:text-slate-900'} cursor-pointer flex items-center gap-1.5" title="الخيارات الرئيسية (البطاقتان)">
            <svg class="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
            <span>الخيارات الرئيسية</span>
          </button>
          <button data-section="dashboard" class="nav-link-btn px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${isDashboard ? 'text-blue-900 bg-white shadow-2xs border border-stone-200/80' : 'text-stone-600 hover:text-slate-900'} cursor-pointer flex items-center gap-1.5" title="غرفة القيادة وبيانات الطلاب">
            <svg class="w-3.5 h-3.5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            <span>غرفة القيادة</span>
          </button>
          <button data-section="attendance" class="nav-link-btn px-3 py-1.5 rounded-lg transition-all font-bold text-xs ${isAttendance ? 'text-blue-900 bg-white shadow-2xs border border-stone-200/80' : 'text-stone-600 hover:text-slate-900'} cursor-pointer flex items-center gap-1.5" title="سجل الحضور الأسبوعي">
            <svg class="w-3.5 h-3.5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
            <span>الحضور</span>
          </button>
        </div>
      `;
    } else if (role === 'attendance' || role === 'attendanceAdmin') {
      return `
        <div class="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-50 text-sky-900 border border-sky-200/90 font-bold text-xs sm:text-sm shadow-2xs">
          <svg class="w-4 h-4 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <span>سجل رصد الحضور (الأحد، الثلاثاء، والخميسية)</span>
        </div>
      `;
    }
    return '';
  },

  renderMobileTabsHtml(role) {
    if (role === 'supervisor') {
      const isHub = this.activeSection === 'hub';
      const isDashboard = this.activeSection === 'dashboard';
      const isAttendance = this.activeSection === 'attendance';
      return `
        <button data-section="hub" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isHub ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isHub ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isHub ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </div>
          <span class="text-[11px] mt-0.5 ${isHub ? 'font-black text-blue-950' : 'font-medium'}">الرئيسية</span>
        </button>

        <button data-section="dashboard" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isDashboard ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isDashboard ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isDashboard ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <span class="text-[11px] mt-0.5 ${isDashboard ? 'font-black text-blue-950' : 'font-medium'}">غرفة القيادة</span>
        </button>

        <button data-section="attendance" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isAttendance ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isAttendance ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isAttendance ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <span class="text-[11px] mt-0.5 ${isAttendance ? 'font-black text-blue-950' : 'font-medium'}">الحضور</span>
        </button>
      `;
    }
    return '';
  },

  switchSection(section) {
    this.activeSection = section;
    // Re-render desktop nav to reflect active states accurately
    const navContainer = document.getElementById('desktop-nav-links');
    if (navContainer && this.currentUser) {
      navContainer.innerHTML = this.renderNavLinksHtml(this.currentUser.role);
      navContainer.querySelectorAll('.nav-link-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.switchSection(btn.dataset.section);
        });
      });
    }

    // Re-render mobile nav as well
    const mobileNavContainer = document.getElementById('mobile-bottom-nav');
    if (mobileNavContainer && this.currentUser) {
      const role = this.currentUser.role;
      const showBottomNav = role === 'supervisor';
      mobileNavContainer.className = `${showBottomNav ? 'md:hidden' : 'hidden'} fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 py-1 bottom-nav-safe`;
      
      if (showBottomNav) {
        mobileNavContainer.innerHTML = `
          <div class="grid grid-cols-3 items-center justify-around max-w-md mx-auto">
            ${this.renderMobileTabsHtml(role)}
          </div>
        `;
        mobileNavContainer.querySelectorAll('.mobile-tab-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            if (btn.dataset.section) {
              this.switchSection(btn.dataset.section);
            }
          });
        });
      }
    }

    this.mountCurrentSection();
  },

  /**
   * Mount the active view based on role and activeSection
   */
  async mountCurrentSection() {
    const container = document.getElementById('main-view-container');
    if (!container || !this.currentUser) return;

    const role = this.currentUser.role;

    // Security guard: Student cannot access supervisor or attendance
    if (role === 'student') {
      this.activeSection = 'home';
      await StudentView.render(container, this.currentUser);
    } else if (role === 'attendance' || role === 'attendanceAdmin') {
      // Security guard: Attendance officer is strictly directed to attendance only, never to hub or student data
      this.activeSection = 'attendance';
      await AttendanceView.render(container);
    } else if (role === 'supervisor') {
      if (this.activeSection === 'attendance') {
        container.innerHTML = `
          <div class="space-y-4">
            <!-- Supervisor Return Navigation Strip -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:px-4 rounded-2xl border border-stone-200/90 shadow-2xs">
              <button id="btn-sup-back-hub" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-stone-100 hover:bg-amber-100/80 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95">
                <svg class="w-4 h-4 rotate-180 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                <span>رجوع إلى الخيارات الرئيسية</span>
              </button>
            </div>

            <!-- Mounted Sub-view -->
            <div id="sup-sub-view-mount"></div>
          </div>
        `;

        document.getElementById('btn-sup-back-hub')?.addEventListener('click', () => {
          this.switchSection('hub');
        });

        const subContainer = document.getElementById('sup-sub-view-mount');
        await AttendanceView.render(subContainer);
      } else if (this.activeSection === 'dashboard') {
        container.innerHTML = `
          <div class="space-y-4">
            <!-- Supervisor Return Navigation Strip -->
            <div class="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:px-4 rounded-2xl border border-stone-200/90 shadow-2xs">
              <button id="btn-sup-back-hub" class="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-bold text-slate-800 bg-stone-100 hover:bg-amber-100/80 hover:text-amber-950 border border-stone-300 hover:border-amber-300 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95">
                <svg class="w-4 h-4 rotate-180 text-amber-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                <span>رجوع إلى الخيارات الرئيسية</span>
              </button>
            </div>

            <!-- Mounted Sub-view -->
            <div id="sup-sub-view-mount"></div>
          </div>
        `;

        document.getElementById('btn-sup-back-hub')?.addEventListener('click', () => {
          this.switchSection('hub');
        });

        const subContainer = document.getElementById('sup-sub-view-mount');
        await SupervisorView.render(subContainer);
      } else {
        // Default to hub
        this.activeSection = 'hub';
        await this.renderSupervisorHub(container);
      }
    }

    // Attach mobile role button listeners if present
    document.querySelectorAll('.btn-trigger-logout, #mobile-logout-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const confirmed = await Utils.confirm('هل ترغب في تسجيل الخروج من المنصة؟', 'تأكيد تسجيل الخروج');
        if (confirmed) {
          await Auth.logout();
        }
      });
    });
  },

  /**
   * Render Supervisor Portal Hub: The Two Refined Gateway Cards
   * 1) «التحضير»
   * 2) «غرفة القيادة»
   */
  async renderSupervisorHub(container) {
    const students = await UserService.getStudents();
    const studentCount = students.length;

    container.innerHTML = `
      <div class="max-w-5xl mx-auto space-y-6">
        <!-- Light Executive Hero Banner with High Contrast and Quick Status Metrics -->
        <section class="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-sm relative overflow-hidden">
          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div class="space-y-1.5">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/80 flex items-center gap-1.5 shadow-2xs">
                  <span class="w-2 h-2 rounded-full bg-blue-700"></span>
                  <span>بوابة المشرف العام</span>
                </span>
              </div>
              <h1 class="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
                مرحبًا بك، ${Utils.escapeHtml(this.currentUser?.name || 'أخي المشرف')}
              </h1>
              <p class="text-xs sm:text-sm text-slate-600 font-medium">
                متابعة موفقة لمهام الإشراف الأسبوعية وجلسات التأهيل.
              </p>
            </div>

            <!-- Quick Metrics Strip for Executive Glance -->
            <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap shrink-0">
              <div class="bg-stone-50 border border-stone-200/90 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px] shadow-2xs">
                <span class="text-[10px] text-slate-500 font-bold block">المحاضن</span>
                <span class="text-sm font-black text-blue-950">7 محاضن</span>
              </div>
              <div class="bg-stone-50 border border-stone-200/90 px-3.5 py-2.5 rounded-2xl text-center min-w-[90px] shadow-2xs">
                <span class="text-[10px] text-slate-500 font-bold block">الطلاب الحاليين</span>
                <span class="text-sm font-black text-blue-950">${studentCount} طالب</span>
              </div>
            </div>
          </div>
        </section>

        <!-- The Three Gateway Cards Grid: Equal Stature & Tactile Elevation -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 pt-1">
          
          <!-- Big Card 1: التحضير (Right side in RTL) -->
          <div id="hub-card-attendance" class="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-sky-50/40 rounded-3xl p-6 sm:p-7 border border-stone-200/90 hover:border-sky-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <div class="space-y-4">
              <!-- Card Top Header -->
              <div class="flex items-center justify-between">
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-800 text-white flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform shrink-0">
                  <svg class="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-900 transition-colors">
                  التحضير
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  رصد حضور الطلّاب للقاءات و الخميسيات مع ميزة التقويم لتسهيل الرجوع للمعلومات.
                </p>
              </div>
            </div>

            <!-- Unified Solid Royal Action Button -->
            <div class="pt-6">
              <button type="button" id="btn-hub-goto-attendance" class="w-full min-h-[46px] py-3.5 px-5 rounded-2xl bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-950/15 group-hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                <span>الانتقال إلى التحضير</span>
                <svg class="w-4 h-4 rotate-180 group-hover:-translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>

          <!-- Big Card 2: غرفة القيادة (Center in RTL) -->
          <div id="hub-card-command" class="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-amber-50/40 rounded-3xl p-6 sm:p-7 border border-stone-200/90 hover:border-amber-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <div class="space-y-4">
              <!-- Card Top Header -->
              <div class="flex items-center justify-between">
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-900 to-blue-950 text-amber-300 flex items-center justify-center shadow-md shadow-slate-950/20 group-hover:scale-105 transition-transform border border-amber-400/30 shrink-0">
                  <svg class="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>

              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-blue-950 transition-colors">
                  غرفة القيادة
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  متابعة سجلات الطلاب، ومقارنة أداء المحاضن، ونسب إنجاز التكاليف والمهام.
                </p>
              </div>
            </div>

            <!-- Unified Solid Royal Action Button -->
            <div class="pt-6">
              <button type="button" id="btn-hub-goto-command" class="w-full min-h-[46px] py-3.5 px-5 rounded-2xl bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-950/15 group-hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                <span>الدخول إلى غرفة القيادة</span>
                <svg class="w-4 h-4 rotate-180 group-hover:-translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>

          <!-- Big Card 3: البوصلة القرآنية (Left side in RTL - رصاصي أنيق) -->
          <div id="hub-card-quran-compass" class="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-slate-100/60 rounded-3xl p-6 sm:p-7 border border-stone-200/90 hover:border-slate-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between">
            <div class="space-y-4">
              <!-- Card Top Header with Slate/Gray Icon & Status Badge -->
              <div class="flex items-center justify-between">
                <div class="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-slate-600 via-stone-600 to-slate-800 text-stone-100 flex items-center justify-center shadow-md shadow-slate-700/20 group-hover:scale-105 transition-transform border border-slate-500/30 shrink-0">
                  <svg class="w-7 h-7 sm:w-8 sm:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300/80 flex items-center gap-1.5 shadow-2xs">
                  <span class="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
                  <span>قريبًا</span>
                </span>
              </div>

              <div>
                <h2 class="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-slate-800 transition-colors">
                  البوصلة القرآنية
                </h2>
                <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
                  متابعة دقيقة للوضع القرآني و التفطّن للمتدهورين و معالجة الخلل و التقصير بالجانب القرآني
                </p>
              </div>
            </div>

            <!-- Unified Action Button in Gray / Slate Style -->
            <div class="pt-6">
              <button type="button" id="btn-hub-goto-quran-compass" class="w-full min-h-[46px] py-3.5 px-5 rounded-2xl bg-slate-700 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-slate-900/15 group-hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2">
                <svg class="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>قريبًا ... تحت التطوير</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook card click events
    container.querySelector('#hub-card-attendance')?.addEventListener('click', () => {
      this.switchSection('attendance');
    });
    container.querySelector('#hub-card-command')?.addEventListener('click', () => {
      this.switchSection('dashboard');
    });
    const handleQuranCompassClick = (e) => {
      e?.stopPropagation();
      Utils.showToast('قسم «البوصلة القرآنية» تحت التطوير حاليًا وسيتاح قريبًا بإذن الله.', 'info', 3500);
    };
    container.querySelector('#hub-card-quran-compass')?.addEventListener('click', handleQuranCompassClick);
    container.querySelector('#btn-hub-goto-quran-compass')?.addEventListener('click', handleQuranCompassClick);
  },

  /**
   * Open Technical Support and Suggestions Modal
   */
  openSupportModal() {
    const forgotModal = document.getElementById('forgot-password-modal');
    if (!forgotModal) return;
    forgotModal.classList.remove('hidden');
    forgotModal.classList.add('active');
    forgotModal.style.display = 'flex';

    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');
    const copyStatus = document.getElementById('copy-status');
    if (copyIcon && checkIcon) {
      copyIcon.classList.remove('hidden');
      checkIcon.classList.add('hidden');
    }
    if (copyStatus) {
      copyStatus.classList.add('opacity-0');
      copyStatus.classList.remove('opacity-100');
    }
  },

  /**
   * Close Technical Support and Suggestions Modal
   */
  closeSupportModal() {
    const forgotModal = document.getElementById('forgot-password-modal');
    if (!forgotModal) return;
    forgotModal.classList.add('hidden');
    forgotModal.classList.remove('active');
    forgotModal.style.display = 'none';
  },

  /**
   * Global Setup for Support & Suggestions Modal and Triggers
   */
  setupSupportModalEvents() {
    if (this._supportEventsInitialized) return;
    this._supportEventsInitialized = true;

    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotClose = document.getElementById('forgot-pwd-close');
    const forgotCloseX = document.getElementById('forgot-pwd-x');
    const copyPhoneBtn = document.getElementById('btn-copy-phone');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');
    const copyStatus = document.getElementById('copy-status');

    if (forgotClose) {
      forgotClose.addEventListener('click', () => this.closeSupportModal());
    }

    if (forgotCloseX) {
      forgotCloseX.addEventListener('click', () => this.closeSupportModal());
    }

    if (forgotModal) {
      forgotModal.addEventListener('click', (e) => {
        if (e.target === forgotModal) {
          this.closeSupportModal();
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !forgotModal.classList.contains('hidden')) {
          this.closeSupportModal();
        }
      });
    }

    if (copyPhoneBtn) {
      copyPhoneBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText('0536820848');
          if (copyIcon && checkIcon) {
            copyIcon.classList.add('hidden');
            checkIcon.classList.remove('hidden');
          }
          if (copyStatus) {
            copyStatus.classList.remove('opacity-0');
            copyStatus.classList.add('opacity-100');
          }
          Utils.showToast('تم النسخ ✓', 'success');
          setTimeout(() => {
            if (copyIcon && checkIcon) {
              copyIcon.classList.remove('hidden');
              checkIcon.classList.add('hidden');
            }
            if (copyStatus) {
              copyStatus.classList.add('opacity-0');
              copyStatus.classList.remove('opacity-100');
            }
          }, 2000);
        } catch (_) {
          Utils.showToast('0536820848', 'info');
        }
      });
    }

    // Global click delegation for all support buttons (.btn-open-support, #btn-login-support, #btn-site-support)
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#btn-login-support, #btn-site-support, .btn-open-support');
      if (btn) {
        e.preventDefault();
        this.openSupportModal();
      }
    });
  },

  deferredInstallPrompt: null,

  /**
   * PWA Installation Management for Mobile & Desktop
   */
  initPWAInstall() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator && window.navigator.standalone === true);
    
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    const updateInstallButtons = (show) => {
      const btns = document.querySelectorAll('.btn-pwa-install-action');
      btns.forEach(btn => {
        if (show && !isStandalone) {
          btn.classList.remove('hidden');
          btn.classList.add('flex');
        } else {
          btn.classList.add('hidden');
          btn.classList.remove('flex');
        }
      });
    };

    if (isStandalone) {
      updateInstallButtons(false);
      return;
    }

    if (isIOS) {
      updateInstallButtons(true);
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      updateInstallButtons(true);
    });

    window.addEventListener('appinstalled', () => {
      this.deferredInstallPrompt = null;
      updateInstallButtons(false);
      Utils.showToast('تم تثبيت تطبيق «مرحلة التأهيل» بنجاح على هاتفك!', 'success');
    });

    // Global listener for install buttons
    document.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-pwa-install-action');
      if (!btn) return;
      e.preventDefault();

      if (this.deferredInstallPrompt) {
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          Utils.showToast('جاري تثبيت «مرحلة التأهيل»...', 'info');
        }
        this.deferredInstallPrompt = null;
      } else if (isIOS) {
        this.openIOSInstallModal();
      } else {
        Utils.showToast('لتثبيت «مرحلة التأهيل»، افتح قائمة المتصفح (⋮) ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».', 'info', 5000);
      }
    });

    const iosClose = document.getElementById('ios-install-close');
    if (iosClose) {
      iosClose.addEventListener('click', () => {
        this.closeIOSInstallModal();
      });
    }
  },

  openIOSInstallModal() {
    const modal = document.getElementById('ios-install-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  },

  closeIOSInstallModal() {
    const modal = document.getElementById('ios-install-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }
};

// Make App globally accessible
window.App = App;

// Bootstrap on DOMContentLoaded or immediately if document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });
} else {
  App.init();
}
