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
    UserService.seedInitialFirestoreData().catch(() => {});

    // Setup global auth listener
    Auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      if (user) {
        if (user.role === 'supervisor') {
          this.activeSection = 'hub';
          UserService.seedInitialFirestoreData();
          AssignmentService.seedInitialFirestoreData();
        } else if (user.role === 'attendance' || user.role === 'attendanceAdmin') {
          this.activeSection = 'attendance';
        } else {
          this.activeSection = 'home';
        }
      }
      this.render();
    });

    // Realtime subscriptions for supervisor remote data updates
    UserService.subscribeToStudents(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        if (this.activeSection === 'students' || this.activeSection === 'hub' || this.activeSection === 'dashboard') {
          this.mountCurrentSection();
        }
      }
    });

    AssignmentService.subscribeToAssignments(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        if (this.activeSection === 'assignments' || this.activeSection === 'hub' || this.activeSection === 'dashboard') {
          this.mountCurrentSection();
        }
      }
    });

    ProgressService.subscribeToProgress(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        if (this.activeSection === 'hub' || this.activeSection === 'dashboard') {
          this.mountCurrentSection();
        }
      }
    });

    AttendanceService.subscribeToAttendance(() => {
      if (this.currentUser && this.currentUser.role === 'supervisor') {
        if (this.activeSection === 'hub' || this.activeSection === 'dashboard') {
          this.mountCurrentSection();
        }
      }
    });

    window.addEventListener('logo-updated', () => {
      this.render();
    });

    this.currentUser = await Auth.getCurrentUser();
    if (this.currentUser) {
      if (this.currentUser.role === 'supervisor') {
        if (!this.activeSection || this.activeSection === 'home') {
          this.activeSection = 'hub';
        }
      } else if (this.currentUser.role === 'attendance' || this.currentUser.role === 'attendanceAdmin') {
        this.activeSection = 'attendance';
      } else {
        this.activeSection = 'home';
      }
    }
    this.render();
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

          <!-- Clean Footer with Direct Support Link -->
          <div class="mt-6 sm:mt-7 text-center relative z-10 flex flex-col items-center gap-1">
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

    // Hook Forgot Password Modal via Footer Support Link
    const supportBtn = root.querySelector('#btn-login-support');
    const forgotModal = document.getElementById('forgot-password-modal');
    const forgotClose = document.getElementById('forgot-pwd-close');
    const forgotCloseX = document.getElementById('forgot-pwd-x');
    const copyPhoneBtn = document.getElementById('btn-copy-phone');
    const copyIcon = document.getElementById('copy-icon');
    const checkIcon = document.getElementById('check-icon');
    const copyStatus = document.getElementById('copy-status');

    const openForgotModal = () => {
      if (!forgotModal) return;
      forgotModal.classList.remove('hidden');
      forgotModal.classList.add('active');
      forgotModal.style.display = 'flex';
      // Reset copy indicator
      if (copyIcon && checkIcon) {
        copyIcon.classList.remove('hidden');
        checkIcon.classList.add('hidden');
      }
      if (copyStatus) {
        copyStatus.classList.add('opacity-0');
        copyStatus.classList.remove('opacity-100');
      }
    };

    const closeForgotModal = () => {
      if (!forgotModal) return;
      forgotModal.classList.add('hidden');
      forgotModal.classList.remove('active');
      forgotModal.style.display = 'none';
    };

    if (supportBtn && forgotModal) {
      supportBtn.addEventListener('click', openForgotModal);
    }

    if (forgotClose && forgotModal) {
      forgotClose.addEventListener('click', closeForgotModal);
    }

    if (forgotCloseX && forgotModal) {
      forgotCloseX.addEventListener('click', closeForgotModal);
    }

    if (forgotModal) {
      forgotModal.addEventListener('click', (e) => {
        if (e.target === forgotModal) {
          closeForgotModal();
        }
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !forgotModal.classList.contains('hidden')) {
          closeForgotModal();
        }
      });
    }

    // Hook copy phone button with clear visual feedback
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

    const colsClass = role === 'supervisor' ? 'grid-cols-4' : 'grid-cols-2';

    root.innerHTML = `
      <div class="min-h-screen flex flex-col site-pattern-bg text-slate-900 pb-24 md:pb-6">
        <!-- Top App Bar with Uniform max-w-5xl Architecture aligned with Content -->
        <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 shadow-xs">
          <div class="max-w-5xl mx-auto flex items-center justify-between gap-2.5 sm:gap-4">
            
            <!-- Zone 1: Brand & Logo -->
            <div class="flex items-center gap-2 sm:gap-3 shrink min-w-0 flex-1 sm:flex-none">
              ${headerLogoHtml}
              <div class="flex flex-col justify-center min-w-0">
                <span class="text-base sm:text-lg md:text-xl font-black text-slate-900 tracking-tight leading-tight truncate">
                  مرحلة التأهيل
                </span>
                <div class="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-xs text-amber-900 mt-0.5">
                  <span class="inline-flex items-center gap-1 font-bold shrink-0">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-600 inline-block shrink-0"></span>
                    <span>دفعة التأهيل 48</span>
                  </span>
                  <span class="text-stone-600 font-medium text-[10px] sm:text-[11px] leading-tight">
                    (إياك والتلون.. فإن دين الله واحد)
                  </span>
                </div>
              </div>
            </div>

            <!-- Zone 2: Navigation Links for Desktop -->
            <div id="desktop-nav-links" class="hidden md:flex items-center gap-2">
              ${this.renderNavLinksHtml(role)}
            </div>

            <!-- Zone 3: Account Actions (Icon-only Logout Button) -->
            <div class="flex items-center gap-2 shrink-0">
              <button id="btn-logout" type="button" class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 active:scale-95 text-red-700 border border-red-200/90 shadow-2xs transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-red-500 shrink-0" aria-label="تسجيل الخروج" title="تسجيل الخروج">
                <svg class="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              </button>
            </div>
          </div>
        </header>

        <!-- Main Content Area with Perfectly Matched max-w-5xl Width -->
        <main class="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6" id="main-view-container">
          <!-- Active view mounted here -->
        </main>

        <!-- Mobile Bottom Navigation Bar (Fixed Footer with Safe-Area Support) -->
        <nav id="mobile-bottom-nav" class="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 py-1 bottom-nav-safe">
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

    this.mountCurrentSection();
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
          <span>سجل الحضور (الأحد والثلاثاء)</span>
        </div>
      `;
    }
    return '';
  },

  renderMobileTabsHtml(role) {
    if (role === 'student') {
      return `
        <button data-section="home" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 text-blue-900 font-bold active:scale-95 transition-transform cursor-pointer">
          <svg class="w-5 h-5 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
          <span class="text-[11px] mt-0.5 font-bold">التكاليف</span>
        </button>
        <button id="mobile-logout-btn" type="button" class="btn-trigger-logout min-h-[48px] flex flex-col items-center justify-center py-1 text-red-600 hover:text-red-800 active:scale-95 transition-transform cursor-pointer">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          <span class="text-[11px] mt-0.5 font-bold">خروج</span>
        </button>
      `;
    } else if (role === 'supervisor') {
      const isHub = this.activeSection === 'hub';
      const isDashboard = this.activeSection === 'dashboard';
      const isAttendance = this.activeSection === 'attendance';
      return `
        <button data-section="hub" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isHub ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isHub ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isHub ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
          </div>
          <span class="text-[10px] mt-0.5 ${isHub ? 'font-black text-blue-950' : 'font-medium'}">الرئيسية</span>
        </button>

        <button data-section="dashboard" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isDashboard ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isDashboard ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isDashboard ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
          </div>
          <span class="text-[10px] mt-0.5 ${isDashboard ? 'font-black text-blue-950' : 'font-medium'}">غرفة القيادة</span>
        </button>

        <button data-section="attendance" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 ${isAttendance ? 'text-blue-900 font-extrabold' : 'text-stone-500 hover:text-slate-900'} active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl ${isAttendance ? 'bg-blue-50 text-blue-900 shadow-2xs' : ''}">
            <svg class="w-5 h-5 ${isAttendance ? 'text-blue-900' : 'text-stone-400'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          </div>
          <span class="text-[10px] mt-0.5 ${isAttendance ? 'font-black text-blue-950' : 'font-medium'}">الحضور</span>
        </button>

        <button id="mobile-logout-btn" type="button" class="btn-trigger-logout min-h-[48px] flex flex-col items-center justify-center py-1 text-red-600 hover:text-red-800 active:scale-95 transition-transform cursor-pointer">
          <div class="p-1 rounded-xl text-red-600">
            <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </div>
          <span class="text-[10px] mt-0.5 font-bold text-red-700">خروج</span>
        </button>
      `;
    } else {
      return `
        <button data-section="attendance" class="mobile-tab-btn min-h-[48px] flex flex-col items-center justify-center py-1 text-sky-800 font-bold active:scale-95 transition-transform cursor-pointer">
          <svg class="w-5 h-5 text-sky-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
          <span class="text-[11px] mt-0.5 font-bold">سجل الحضور</span>
        </button>
        <button id="mobile-logout-btn" type="button" class="btn-trigger-logout min-h-[48px] flex flex-col items-center justify-center py-1 text-red-600 hover:text-red-800 active:scale-95 transition-transform cursor-pointer">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          <span class="text-[11px] mt-0.5 font-bold">خروج</span>
        </button>
      `;
    }
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
      const colsClass = role === 'supervisor' ? 'grid-cols-4' : 'grid-cols-2';
      mobileNavContainer.innerHTML = `
        <div class="grid ${colsClass} items-center justify-around max-w-md mx-auto">
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
      // Attach logout handlers to mobile bottom nav
      const handleLogout = async () => {
        const confirmed = await Utils.confirm('هل ترغب في تسجيل الخروج من المنصة؟', 'تأكيد تسجيل الخروج');
        if (confirmed) {
          await Auth.logout();
        }
      };
      mobileNavContainer.querySelectorAll('.btn-trigger-logout').forEach(btn => {
        btn.addEventListener('click', handleLogout);
      });
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

        <!-- The Two Cards Grid: Equal Stature & Tactile Elevation -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          
          <!-- Big Card 1: التحضير (Right side in RTL) -->
          <div id="hub-card-attendance" class="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-sky-50/40 rounded-3xl p-6 sm:p-8 border border-stone-200/90 hover:border-sky-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between">
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
                <h2 class="text-2xl font-black text-slate-900 group-hover:text-blue-900 transition-colors">
                  التحضير
                </h2>
                <p class="text-sm text-slate-600 mt-2 leading-relaxed">
                  رصد حضور وغياب الطلاب وتوثيق الأعذار، مع التقويم والتحضير الجماعي السريع.
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

          <!-- Big Card 2: غرفة القيادة (Left side in RTL) -->
          <div id="hub-card-command" class="group relative bg-white hover:bg-gradient-to-b hover:from-white hover:to-amber-50/40 rounded-3xl p-6 sm:p-8 border border-stone-200/90 hover:border-amber-400 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between">
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
                <h2 class="text-2xl font-black text-slate-900 group-hover:text-blue-950 transition-colors">
                  غرفة القيادة
                </h2>
                <p class="text-sm text-slate-600 mt-2 leading-relaxed">
                  متابعة سجلات الطلاب، ومقارنة أداء المحاضن، ونسب إنجاز التكاليف والمهام.
                </p>
              </div>
            </div>

            <!-- Unified Solid Royal Action Button: Same weight as Card 1 for balanced hierarchy -->
            <div class="pt-6">
              <button type="button" id="btn-hub-goto-command" class="w-full min-h-[46px] py-3.5 px-5 rounded-2xl bg-blue-900 hover:bg-blue-950 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-blue-950/15 group-hover:shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
                <span>الدخول إلى غرفة القيادة</span>
                <svg class="w-4 h-4 rotate-180 group-hover:-translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
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
