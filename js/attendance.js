/**
 * Attendance Officer View Controller for Platform «مرحلة التأهيل»
 * Attendance takes place exclusively on Sundays and Tuesdays.
 * Refined UX:
 * - Instant 0ms optimistic UI updates for status toggles (present/excused/absent)
 * - Grouped by Mahad as clean section headers
 * - Compact segmented icon buttons
 * - Sticky search and multi-select toolbar
 * - Prominent "المتبقي" primary KPI
 * - Lightweight, non-intrusive floating bottom bulk action bar with soft background
 */

import { UserService } from './userService.js';
import { AttendanceService } from './attendanceService.js';
import { Utils } from './utils.js';

export const AttendanceView = {
  selectedDate: null,
  selectedMahad: 'all',
  statusFilter: 'all', // 'all' | 'unrecorded'
  searchQuery: '',
  selectedStudentIds: new Set(),
  currentCalendarYear: null,
  currentCalendarMonth: null, // 0-indexed (0 = Jan, 11 = Dec)
  currentRecordsCache: new Map(), // studentId -> status

  /**
   * Auto-resolve the most logical attendance date:
   * 1. If today is Sunday or Tuesday -> today
   * 2. Else -> nearest upcoming session within 4 days, or nearest recent past session
   */
  getInitialAttendanceDate() {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];

    if (Utils.isValidAttendanceDay(todayIso)) {
      return todayIso;
    }

    // Look forward up to 4 days for the upcoming session
    for (let i = 1; i <= 4; i++) {
      const cursor = new Date(today);
      cursor.setDate(today.getDate() + i);
      const iso = cursor.toISOString().split('T')[0];
      if (Utils.isValidAttendanceDay(iso)) {
        return iso;
      }
    }

    // Otherwise look backward up to 7 days for the most recent session
    for (let i = 1; i <= 7; i++) {
      const cursor = new Date(today);
      cursor.setDate(today.getDate() - i);
      const iso = cursor.toISOString().split('T')[0];
      if (Utils.isValidAttendanceDay(iso)) {
        return iso;
      }
    }

    return todayIso;
  },

  /**
   * Render Attendance Officer Interface
   */
  async render(container) {
    if (!container) return;

    const mahaden = await UserService.getMahaden();

    if (!this.selectedDate) {
      this.selectedDate = this.getInitialAttendanceDate();
    }

    // Set initial calendar month and year based on selected date
    const [selY, selM] = this.selectedDate.split('-').map(Number);
    this.currentCalendarYear = this.currentCalendarYear || selY;
    this.currentCalendarMonth = (this.currentCalendarMonth !== null) ? this.currentCalendarMonth : (selM - 1);

    container.innerHTML = `
      <div class="space-y-5">
        <!-- Attendance Header Banner with Islamic Royal Blue & Gold Trim -->
        <section class="card bg-gradient-to-l from-slate-950 via-blue-950 to-sky-950 text-white p-5 sm:p-6 rounded-2xl shadow-md border border-amber-500/30 relative overflow-hidden">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>رصد الحضور والتقويم الأسبوعي</span>
              </h2>
              <p class="text-xs text-blue-200/90 mt-1">
                رصد حضور الجلسات المقررة يومي الأحد والثلاثاء لمرحلة التأهيل.
              </p>
            </div>

            <!-- Date Selector Trigger & Quick Navigation -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white/10 backdrop-blur-sm p-2.5 rounded-2xl border border-amber-400/30 shrink-0">
              <!-- Calendar Date Button Trigger -->
              <div class="space-y-1">
                <div class="text-[11px] font-semibold text-amber-200">يوم الجلسة:</div>
                <div class="flex items-center gap-1.5">
                  <button id="att-prev-day-btn" type="button" title="الجلسة السابقة" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                  
                  <button id="att-open-calendar-btn" type="button" class="flex-1 sm:flex-none flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs sm:text-sm shadow-xs hover:bg-amber-50 hover:border-amber-300 border border-transparent transition-all cursor-pointer">
                    <div class="flex items-center gap-2">
                      <svg class="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span id="att-selected-date-display">${this.getFormattedSelectedDate()}</span>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span id="att-date-status-indicator"></span>
                      <span class="text-[10px] text-amber-900 bg-amber-100 font-semibold px-2 py-0.5 rounded-md">التقويم ▾</span>
                    </div>
                  </button>

                  <button id="att-next-day-btn" type="button" title="الجلسة التالية" class="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
                  </button>
                </div>
              </div>

              <!-- Mahad Filter Selector -->
              <div class="space-y-1 sm:border-r sm:border-white/20 sm:pr-2.5">
                <label for="att-mahad-picker" class="block text-[11px] font-semibold text-amber-200">تصفية المحضن:</label>
                <select id="att-mahad-picker" class="w-full text-xs sm:text-sm font-semibold text-slate-900 bg-white rounded-xl px-3 py-2 border border-amber-300 focus:outline-hidden cursor-pointer shadow-xs">
                  <option value="all" ${this.selectedMahad === 'all' ? 'selected' : ''}>جميع المحاضن (7)</option>
                  ${mahaden.map(m => `
                    <option value="${m.id}" ${this.selectedMahad === m.id ? 'selected' : ''}>${m.name}</option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>
        </section>

        <!-- Attendance Metrics Dashboard (Dedicated focus on Remaining) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5" id="att-counts-bar">
          <!-- Primary Highlighted Card: المتبقي (Clickable Toggle) -->
          <div class="card p-4 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-white via-amber-50/30 to-amber-50/50 shadow-xs md:col-span-1 flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group select-none" id="att-card-remaining" title="انقر لعرض الطلاب المتبقين فقط أو عرض الكل">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>المتبقي</span>
                <span class="text-[10px] text-amber-800/80 font-normal group-hover:underline" id="att-filter-toggle-hint">(انقر للتصفية 🔍)</span>
              </span>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900" id="att-progress-badge">—%</span>
            </div>

            <div class="my-2 flex items-baseline gap-2">
              <span class="text-3xl font-black tabular-nums text-slate-900" id="att-count-remaining">—</span>
              <span class="text-xs text-stone-500 font-medium" id="att-count-total-label">طالب متبقي</span>
            </div>

            <!-- Progress mini bar -->
            <div class="space-y-1">
              <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                <div id="att-completion-progress-bar" class="h-full bg-gradient-to-l from-emerald-500 to-blue-700 transition-all duration-300 rounded-full" style="width: 0%"></div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-stone-500">
                <span id="att-recorded-label">0 مكتمل</span>
                <span id="att-total-label">54 إجمالي</span>
              </div>
            </div>
          </div>

          <!-- Secondary Summary Display: الحالات المرصودة (Information only) -->
          <div class="card p-4 rounded-2xl border border-stone-200 bg-white shadow-xs md:col-span-2 flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between border-b border-stone-100 pb-2">
              <span class="text-xs font-bold text-slate-800">حالات الطلاب المرصودة اليوم</span>
              <span class="text-[11px] text-stone-400">إحصائية فورية</span>
            </div>

            <div class="grid grid-cols-3 gap-2.5 text-center">
              <!-- Present -->
              <div class="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80">
                <div class="flex items-center justify-center gap-1 text-[11px] text-emerald-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>حاضر</span>
                </div>
                <div class="text-2xl font-black text-emerald-700 tabular-nums" id="att-count-present">0</div>
              </div>

              <!-- Excused -->
              <div class="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80">
                <div class="flex items-center justify-center gap-1 text-[11px] text-amber-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>معتذر</span>
                </div>
                <div class="text-2xl font-black text-amber-700 tabular-nums" id="att-count-excused">0</div>
              </div>

              <!-- Absent -->
              <div class="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80">
                <div class="flex items-center justify-center gap-1 text-[11px] text-rose-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>غائب</span>
                </div>
                <div class="text-2xl font-black text-rose-700 tabular-nums" id="att-count-absent">0</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Search & Multi-Select Controls Toolbar -->
        <div class="card p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-3" id="att-controls-header">
          <!-- Live Search Bar -->
          <div class="relative w-full">
            <div class="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-stone-400">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input type="text" 
                   id="att-student-search-input" 
                   value="${Utils.escapeHtml(this.searchQuery)}"
                   placeholder="ابحث باسم الطالب مباشرة..." 
                   class="w-full pr-10 pl-9 py-2.5 rounded-xl border border-stone-200 bg-stone-50/70 focus:bg-white focus:border-blue-900 focus:ring-2 focus:ring-blue-900/10 text-xs sm:text-sm text-slate-900 placeholder:text-stone-400 transition-all outline-hidden shadow-2xs" />
            ${this.searchQuery ? `
              <button id="att-clear-search-btn" type="button" class="absolute inset-y-0 left-0 pl-3 flex items-center text-stone-400 hover:text-stone-700 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            ` : ''}
          </div>

          <!-- Multi-Select & Batch Toolbar -->
          <div class="flex items-center justify-between gap-2 flex-wrap pt-1 border-t border-stone-100">
            <div class="flex items-center gap-2">
              <button id="att-select-all-btn" type="button" class="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs">
                <input type="checkbox" id="att-master-checkbox" class="rounded text-blue-900 focus:ring-blue-900/20 cursor-pointer pointer-events-none" />
                <span>تحديد الكل</span>
              </button>

              <button id="att-clear-selection-btn" type="button" class="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-all cursor-pointer ${this.selectedStudentIds.size === 0 ? 'hidden' : ''}">
                إلغاء التحديد (<span id="att-selected-count-badge">${this.selectedStudentIds.size}</span>)
              </button>
            </div>
          </div>

          <!-- Floating Bottom Bulk Actions Bar (Elevated above mobile nav bar with z-50) -->
          <div id="att-bulk-actions-bar" class="${this.selectedStudentIds.size > 0 ? 'flex' : 'hidden'} fixed bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-1.5rem)] items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white/95 backdrop-blur-md border border-stone-300 shadow-xl shadow-slate-900/20 transition-all animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="w-5 h-5 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900 font-bold text-[11px] tabular-nums" id="att-bulk-count">${this.selectedStudentIds.size}</span>
              <span class="text-[11px] font-bold text-slate-700">تطبيق:</span>
            </div>

            <div class="flex items-center gap-1.5">
              <button id="bulk-btn-present" type="button" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95">
                <span>✓ حاضر</span>
              </button>
              <button id="bulk-btn-excused" type="button" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 hover:bg-amber-500 text-amber-800 hover:text-white border border-amber-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95">
                <span>⏱ معتذر</span>
              </button>
              <button id="bulk-btn-absent" type="button" class="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-600 text-rose-800 hover:text-white border border-rose-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95">
                <span>✕ غائب</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Student Attendance List Container -->
        <div id="att-rollcall-container" class="space-y-4 pb-28">
          <div class="p-8 text-center text-stone-400">جاري تحميل كشف الطلاب...</div>
        </div>
      </div>

      <!-- Interactive Calendar Modal (Month Grid Picker for Sundays and Tuesdays) -->
      <div id="attendance-calendar-modal" class="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs hidden items-center justify-center p-4">
        <div class="w-full max-w-md bg-white rounded-3xl border border-stone-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div class="p-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 text-white flex items-center justify-between">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <h3 class="font-bold text-sm sm:text-base text-white">تقويم الجلسات</h3>
            </div>
            <button id="cal-close-btn" type="button" class="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-4 sm:p-5 space-y-4">
            <!-- Month & Year Navigation Header -->
            <div class="flex items-center justify-between">
              <button id="cal-prev-month-btn" type="button" class="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 transition-colors cursor-pointer" title="الشهر السابق">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </button>

              <div class="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                <span id="cal-month-label" class="text-blue-900">—</span>
                <span id="cal-year-label" class="tabular-nums font-bold text-amber-800">—</span>
              </div>

              <button id="cal-next-month-btn" type="button" class="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-slate-800 transition-colors cursor-pointer" title="الشهر التالي">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
            </div>

            <!-- Calendar Days Grid Container -->
            <div id="cal-grid-wrapper" class="min-h-[220px]">
              <!-- Injected by renderCalendarGrid -->
            </div>
          </div>

          <div class="p-3 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-600">
            <div class="flex items-center gap-3">
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded-md bg-blue-900 inline-block"></span>
                <span>اليوم المحدد</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-3 h-3 rounded-md bg-emerald-50 border border-emerald-300 inline-block"></span>
                <span>جلسة معتمدة</span>
              </span>
            </div>
            <button id="cal-cancel-btn" type="button" class="px-3 py-1 rounded-lg bg-stone-200 hover:bg-stone-300 font-semibold text-slate-800 transition-colors cursor-pointer">
              إغلاق
            </button>
          </div>
        </div>
      </div>
    `;

    // Hook KPI card click: Toggle 'المتبقي'
    const cardRemaining = container.querySelector('#att-card-remaining');
    if (cardRemaining) {
      cardRemaining.addEventListener('click', () => {
        this.statusFilter = this.statusFilter === 'unrecorded' ? 'all' : 'unrecorded';
        this.renderQueue();
      });
    }

    // Hook calendar modal buttons
    this.hookCalendarControls(container);

    // Hook mahad picker
    const mahadPicker = container.querySelector('#att-mahad-picker');
    if (mahadPicker) {
      mahadPicker.addEventListener('change', (e) => {
        this.selectedMahad = e.target.value;
        this.renderQueue();
      });
    }

    // Hook search input
    const searchInput = container.querySelector('#att-student-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.renderQueue();
      });
    }

    const clearSearchBtn = container.querySelector('#att-clear-search-btn');
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener('click', () => {
        this.searchQuery = '';
        if (searchInput) searchInput.value = '';
        this.renderQueue();
      });
    }

    // Hook select all button
    const selectAllBtn = container.querySelector('#att-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        const checkboxes = container.querySelectorAll('.att-student-checkbox');
        const allChecked = Array.from(checkboxes).length > 0 && Array.from(checkboxes).every(cb => cb.checked);
        
        checkboxes.forEach(cb => {
          const sid = cb.dataset.studentId;
          if (allChecked) {
            this.selectedStudentIds.delete(sid);
          } else {
            this.selectedStudentIds.add(sid);
          }
        });
        this.updateSelectionUI();
      });
    }

    // Hook clear selection button
    const clearSelectionBtn = container.querySelector('#att-clear-selection-btn');
    if (clearSelectionBtn) {
      clearSelectionBtn.addEventListener('click', () => {
        this.selectedStudentIds.clear();
        this.updateSelectionUI();
      });
    }

    // Hook bulk attendance buttons with instant optimistic application
    const bindBulkBtn = (btnId, status, label) => {
      const btn = container.querySelector(btnId);
      if (btn) {
        btn.addEventListener('click', async () => {
          if (this.selectedStudentIds.size === 0) return;
          const ids = Array.from(this.selectedStudentIds);
          
          // 1. Instant 0ms Optimistic UI updates across all selected rows
          ids.forEach(sid => {
            this.applyOptimisticStudentStatus(sid, status);
          });
          Utils.showToast(`تم رصد ${ids.length} طالب بحالة: ${label}`, 'success', 1500);
          this.selectedStudentIds.clear();
          this.updateSelectionUI();

          // 2. Persist in background
          try {
            for (const sid of ids) {
              await AttendanceService.recordAttendance(sid, this.selectedDate, status);
            }
          } catch (err) {
            Utils.showToast(err.message, 'error');
            await this.renderQueue();
          }
        });
      }
    };

    bindBulkBtn('#bulk-btn-present', 'present', 'حاضر');
    bindBulkBtn('#bulk-btn-excused', 'excused', 'معتذر');
    bindBulkBtn('#bulk-btn-absent', 'absent', 'غائب');

    await this.renderQueue();
  },

  /**
   * Update visual states of selection checkboxes and floating bulk actions bar
   */
  updateSelectionUI() {
    const bulkBar = document.getElementById('att-bulk-actions-bar');
    const bulkCount = document.getElementById('att-bulk-count');
    const clearBtn = document.getElementById('att-clear-selection-btn');
    const countBadge = document.getElementById('att-selected-count-badge');
    const masterCb = document.getElementById('att-master-checkbox');

    const checkboxes = document.querySelectorAll('.att-student-checkbox');
    let checkedCount = 0;

    checkboxes.forEach(cb => {
      const isSelected = this.selectedStudentIds.has(cb.dataset.studentId);
      cb.checked = isSelected;
      if (isSelected) checkedCount++;

      // Highlight card background if selected
      const card = cb.closest('.rollcall-card');
      if (card) {
        if (isSelected) {
          card.classList.add('ring-2', 'ring-blue-600/40', 'bg-blue-50/50');
        } else {
          card.classList.remove('ring-2', 'ring-blue-600/40', 'bg-blue-50/50');
        }
      }
    });

    const size = this.selectedStudentIds.size;
    if (bulkBar) {
      if (size > 0) {
        bulkBar.classList.remove('hidden');
        bulkBar.classList.add('flex');
      } else {
        bulkBar.classList.add('hidden');
        bulkBar.classList.remove('flex');
      }
    }
    if (bulkCount) bulkCount.textContent = size;
    if (countBadge) countBadge.textContent = size;
    if (clearBtn) {
      if (size > 0) {
        clearBtn.classList.remove('hidden');
      } else {
        clearBtn.classList.add('hidden');
      }
    }
    if (masterCb) {
      masterCb.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
      masterCb.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
  },

  /**
   * Format the currently selected date in a friendly Arabic string
   */
  getFormattedSelectedDate() {
    if (!this.selectedDate) return 'اختر التاريخ';
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    const dayName = day === 0 ? 'الأحد' : (day === 2 ? 'الثلاثاء' : 'يوم');
    const monthName = Utils.getArabicMonthName(m - 1);
    return `${dayName}، ${d} ${monthName} ${y}`;
  },

  /**
   * Hook Calendar Controls
   */
  hookCalendarControls(container) {
    const modal = container.querySelector('#attendance-calendar-modal');
    const openBtn = container.querySelector('#att-open-calendar-btn');
    const closeBtn = container.querySelector('#cal-close-btn');
    const cancelBtn = container.querySelector('#cal-cancel-btn');
    const prevMonthBtn = container.querySelector('#cal-prev-month-btn');
    const nextMonthBtn = container.querySelector('#cal-next-month-btn');
    const prevDayBtn = container.querySelector('#att-prev-day-btn');
    const nextDayBtn = container.querySelector('#att-next-day-btn');

    const openCalendar = () => {
      const [selY, selM] = this.selectedDate.split('-').map(Number);
      this.currentCalendarYear = selY;
      this.currentCalendarMonth = selM - 1;
      this.renderCalendarGrid();

      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    };

    const closeCalendar = () => {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    };

    if (openBtn) openBtn.onclick = openCalendar;
    if (closeBtn) closeBtn.onclick = closeCalendar;
    if (cancelBtn) cancelBtn.onclick = closeCalendar;

    if (prevMonthBtn) {
      prevMonthBtn.onclick = () => {
        if (this.currentCalendarMonth === 0) {
          this.currentCalendarMonth = 11;
          this.currentCalendarYear--;
        } else {
          this.currentCalendarMonth--;
        }
        this.renderCalendarGrid();
      };
    }

    if (nextMonthBtn) {
      nextMonthBtn.onclick = () => {
        if (this.currentCalendarMonth === 11) {
          this.currentCalendarMonth = 0;
          this.currentCalendarYear++;
        } else {
          this.currentCalendarMonth++;
        }
        this.renderCalendarGrid();
      };
    }

    if (prevDayBtn) {
      prevDayBtn.onclick = () => {
        this.stepSession(-1);
      };
    }

    if (nextDayBtn) {
      nextDayBtn.onclick = () => {
        this.stepSession(1);
      };
    }
  },

  /**
   * Step to next/previous valid session date (-1 for past, +1 for future)
   */
  stepSession(direction = 1) {
    if (!this.selectedDate) return;
    const [y, m, d] = this.selectedDate.split('-').map(Number);
    const cursor = new Date(y, m - 1, d);
    
    for (let step = 0; step < 7; step++) {
      cursor.setDate(cursor.getDate() + direction);
      const day = cursor.getDay();
      if (day === 0 || day === 2) {
        const nextY = cursor.getFullYear();
        const nextM = String(cursor.getMonth() + 1).padStart(2, '0');
        const nextD = String(cursor.getDate()).padStart(2, '0');
        this.selectDate(`${nextY}-${nextM}-${nextD}`);
        break;
      }
    }
  },

  /**
   * Set new active date and re-render
   */
  async selectDate(dateIso) {
    this.selectedDate = dateIso;
    const display = document.getElementById('att-selected-date-display');
    if (display) {
      display.textContent = this.getFormattedSelectedDate();
    }
    await this.renderQueue();
  },

  /**
   * Render Interactive Calendar Grid
   */
  async renderCalendarGrid() {
    const wrapper = document.getElementById('cal-grid-wrapper');
    const monthLabel = document.getElementById('cal-month-label');
    const yearLabel = document.getElementById('cal-year-label');
    if (!wrapper || !monthLabel || !yearLabel) return;

    const year = this.currentCalendarYear;
    const month = this.currentCalendarMonth;

    monthLabel.textContent = Utils.getArabicMonthName(month);
    yearLabel.textContent = year;

    const allAttendance = await AttendanceService.getAllAttendance();
    const recordedDatesSet = new Set(allAttendance.map(a => a.date));

    // Calendar Calculations
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDays = new Date(year, month + 1, 0).getDate();

    let html = `
      <div class="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-stone-600 mb-2">
        <span class="text-blue-900 bg-blue-50/70 py-1 rounded">أحد</span>
        <span class="py-1">إثنين</span>
        <span class="text-blue-900 bg-blue-50/70 py-1 rounded">ثلاثاء</span>
        <span class="py-1">أربعاء</span>
        <span class="py-1">خميس</span>
        <span class="py-1 text-stone-400">جمعة</span>
        <span class="py-1 text-stone-400">سبت</span>
      </div>
      <div class="grid grid-cols-7 gap-1.5">
    `;

    // Blank cells before month start
    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="p-2 min-h-[46px] rounded-xl bg-stone-50/50 opacity-40"></div>`;
    }

    // Days in current month
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth();
    const todayD = today.getDate();

    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dateIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month, dayNum).getDay();
      const isOfficialSession = (dayOfWeek === 0 || dayOfWeek === 2);
      const isSelected = this.selectedDate === dateIso;
      const isToday = (year === todayY && month === todayM && dayNum === todayD);
      const hasRecords = recordedDatesSet.has(dateIso);

      if (isOfficialSession) {
        html += `
          <button type="button" 
                  data-date="${dateIso}"
                  class="cal-day-btn p-1.5 sm:p-2 min-h-[48px] rounded-xl flex flex-col items-center justify-between transition-all cursor-pointer border ${isSelected ? 'bg-blue-900 text-white font-bold ring-2 ring-amber-400 border-transparent shadow-md' : 'bg-white hover:bg-amber-50 text-slate-900 border-amber-200/80 shadow-2xs'}" 
                  title="${isOfficialSession ? 'جلسة معتمدة' : ''}">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-blue-950'}">${dayNum}</span>
              ${isToday ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-red-500'}" title="اليوم"></span>` : '<span></span>'}
            </div>

            <div class="flex items-center gap-1 w-full justify-center">
              ${hasRecords ? `
                <span class="text-[9px] font-bold px-1.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/90 text-emerald-900'}">
                  مكتمل ✓
                </span>
              ` : `
                <span class="text-[9px] font-semibold px-1 rounded ${isSelected ? 'text-blue-200' : 'text-stone-500'}">
                  جلسة
                </span>
              `}
            </div>
          </button>
        `;
      } else {
        html += `
          <div class="p-2 min-h-[46px] rounded-xl bg-stone-50/50 text-stone-400 flex flex-col items-center justify-center opacity-40 select-none">
            <span class="text-xs">${dayNum}</span>
          </div>
        `;
      }
    }

    html += `</div>`;
    wrapper.innerHTML = html;

    wrapper.querySelectorAll('.cal-day-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const date = btn.dataset.date;
        await this.selectDate(date);
        
        const modal = document.getElementById('attendance-calendar-modal');
        if (modal) {
          modal.classList.add('hidden');
          modal.style.display = 'none';
        }
      });
    });
  },

  /**
   * Helper: Group a list of student items by their Mahad
   */
  groupStudentsByMahad(items, mahaden) {
    const mahadMap = new Map();
    mahaden.forEach(m => {
      mahadMap.set(m.id, {
        mahad: m,
        students: []
      });
    });

    items.forEach(item => {
      const st = item.student || item;
      const mId = st.mahadId;
      if (mahadMap.has(mId)) {
        mahadMap.get(mId).students.push(item);
      } else {
        if (!mahadMap.has('other')) {
          mahadMap.set('other', {
            mahad: { id: 'other', name: st.mahadName || 'المحضن', neighborhood: '' },
            students: []
          });
        }
        mahadMap.get('other').students.push(item);
      }
    });

    return Array.from(mahadMap.values()).filter(g => g.students.length > 0);
  },

  /**
   * Fast 0ms Optimistic status applicator for instantaneous icon color change
   */
  applyOptimisticStudentStatus(studentId, newStatus) {
    // 1. Update in-memory cache
    if (newStatus) {
      this.currentRecordsCache.set(studentId, newStatus);
    } else {
      this.currentRecordsCache.delete(studentId);
    }

    // 2. Find row card
    const card = document.querySelector(`.rollcall-card[data-student-id="${studentId}"]`);
    if (card) {
      const btnPresent = card.querySelector('.att-action-btn[data-status="present"]');
      const btnExcused = card.querySelector('.att-action-btn[data-status="excused"]');
      const btnAbsent = card.querySelector('.att-action-btn[data-status="absent"]');

      const isPresent = newStatus === 'present';
      const isExcused = newStatus === 'excused';
      const isAbsent = newStatus === 'absent';

      // Update buttons styling instantaneously
      if (btnPresent) {
        btnPresent.dataset.currentStatus = newStatus || 'none';
        btnPresent.className = `att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isPresent ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500 shadow-xs' : 'bg-white hover:bg-emerald-50 text-stone-500 hover:text-emerald-700 hover:border-emerald-300 border border-stone-200/70'}`;
        const svg = btnPresent.querySelector('svg');
        if (svg) svg.setAttribute('class', `w-5 h-5 ${isPresent ? 'text-white' : 'text-emerald-700'}`);
      }

      if (btnExcused) {
        btnExcused.dataset.currentStatus = newStatus || 'none';
        btnExcused.className = `att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isExcused ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-400 shadow-xs' : 'bg-white hover:bg-amber-50 text-stone-500 hover:text-amber-700 hover:border-amber-300 border border-stone-200/70'}`;
        const svg = btnExcused.querySelector('svg');
        if (svg) svg.setAttribute('class', `w-5 h-5 ${isExcused ? 'text-white' : 'text-amber-600'}`);
      }

      if (btnAbsent) {
        btnAbsent.dataset.currentStatus = newStatus || 'none';
        btnAbsent.className = `att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isAbsent ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-500 shadow-xs' : 'bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 hover:border-rose-300 border border-stone-200/70'}`;
        const svg = btnAbsent.querySelector('svg');
        if (svg) svg.setAttribute('class', `w-5 h-5 ${isAbsent ? 'text-white' : 'text-rose-600'}`);
      }
    }

    // 3. Instantly update KPI numbers across the dashboard
    this.recalculateKPICounters();
  },

  /**
   * Recalculate dashboard KPI counts instantaneously without rebuilding the DOM
   */
  recalculateKPICounters() {
    let presentCount = 0;
    let excusedCount = 0;
    let absentCount = 0;

    const cards = document.querySelectorAll('.rollcall-card');
    const totalStudents = cards.length;

    cards.forEach(c => {
      const btn = c.querySelector('.att-action-btn');
      const st = btn ? btn.dataset.currentStatus : 'none';
      if (st === 'present') presentCount++;
      else if (st === 'excused') excusedCount++;
      else if (st === 'absent') absentCount++;
    });

    const recordedTotal = presentCount + excusedCount + absentCount;
    const remainingCount = Math.max(0, totalStudents - recordedTotal);
    const completionPct = totalStudents > 0 ? Math.round((recordedTotal / totalStudents) * 100) : 0;

    const remainingEl = document.getElementById('att-count-remaining');
    const progressBadge = document.getElementById('att-progress-badge');
    const progressBar = document.getElementById('att-completion-progress-bar');
    const recordedLabel = document.getElementById('att-recorded-label');
    const totalLabel = document.getElementById('att-total-label');

    const countPresent = document.getElementById('att-count-present');
    const countExcused = document.getElementById('att-count-excused');
    const countAbsent = document.getElementById('att-count-absent');

    if (remainingEl) remainingEl.textContent = remainingCount;
    if (progressBadge) {
      progressBadge.textContent = `${completionPct}% منجز`;
      if (completionPct === 100) {
        progressBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900';
      } else {
        progressBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900';
      }
    }
    if (progressBar) progressBar.style.width = `${completionPct}%`;
    if (recordedLabel) recordedLabel.textContent = `${recordedTotal} مكتمل`;
    if (totalLabel) totalLabel.textContent = `${totalStudents} إجمالي`;

    if (countPresent) countPresent.textContent = presentCount;
    if (countExcused) countExcused.textContent = excusedCount;
    if (countAbsent) countAbsent.textContent = absentCount;
  },

  /**
   * Render student rollcall list in a stable, unified order grouped by Mahad
   */
  async renderQueue() {
    const container = document.getElementById('att-rollcall-container');
    if (!container) return;

    const mahaden = await UserService.getMahaden();
    let allCohortStudents = await UserService.getStudents();
    
    // Sort all cohort students stably by name
    allCohortStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

    // Filter by Mahad if selected
    let students = allCohortStudents;
    if (this.selectedMahad && this.selectedMahad !== 'all') {
      students = students.filter(s => s.mahadId === this.selectedMahad);
    }

    // Filter by search query if any
    const query = (this.searchQuery || '').trim().toLowerCase();
    if (query) {
      students = students.filter(s => {
        const nameMatch = (s.name || '').toLowerCase().includes(query);
        const mahadMatch = (s.mahadName || '').toLowerCase().includes(query);
        const emailMatch = (s.email || '').toLowerCase().includes(query);
        return nameMatch || mahadMatch || emailMatch;
      });
    }

    // Fetch records for the selected date
    const records = await AttendanceService.getAttendanceForDate(this.selectedDate);
    const recordsMap = new Map();
    this.currentRecordsCache.clear();
    records.forEach(r => {
      recordsMap.set(r.studentId, r);
      this.currentRecordsCache.set(r.studentId, r.status);
    });

    // Build unified student items list with their recorded status
    const studentItems = students.map(s => {
      const rec = recordsMap.get(s.id);
      return {
        student: s,
        status: rec ? rec.status : null,
        record: rec || null
      };
    });

    // Compute metrics
    const totalStudents = students.length;
    const presentCount = studentItems.filter(i => i.status === 'present').length;
    const excusedCount = studentItems.filter(i => i.status === 'excused').length;
    const absentCount = studentItems.filter(i => i.status === 'absent').length;
    const recordedTotal = presentCount + excusedCount + absentCount;
    const remainingCount = totalStudents - recordedTotal;
    const completionPct = totalStudents > 0 ? Math.round((recordedTotal / totalStudents) * 100) : 0;

    // Update KPI Card: المتبقي
    const remainingEl = document.getElementById('att-count-remaining');
    const progressBadge = document.getElementById('att-progress-badge');
    const progressBar = document.getElementById('att-completion-progress-bar');
    const recordedLabel = document.getElementById('att-recorded-label');
    const totalLabel = document.getElementById('att-total-label');
    const cardRemaining = document.getElementById('att-card-remaining');

    if (remainingEl) remainingEl.textContent = remainingCount;
    if (progressBadge) {
      progressBadge.textContent = `${completionPct}% منجز`;
      if (completionPct === 100) {
        progressBadge.className = 'text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900';
      } else {
        progressBadge.className = 'text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900';
      }
    }
    if (progressBar) progressBar.style.width = `${completionPct}%`;
    if (recordedLabel) recordedLabel.textContent = `${recordedTotal} مكتمل`;
    if (totalLabel) totalLabel.textContent = `${totalStudents} إجمالي`;

    // Highlight card if remaining filter is active
    const filterToggleHint = document.getElementById('att-filter-toggle-hint');
    if (cardRemaining) {
      if (this.statusFilter === 'unrecorded') {
        cardRemaining.classList.add('ring-3', 'ring-amber-500', 'bg-amber-100/60');
        if (filterToggleHint) filterToggleHint.textContent = '(إلغاء التصفية ✕)';
      } else {
        cardRemaining.classList.remove('ring-3', 'ring-amber-500', 'bg-amber-100/60');
        if (filterToggleHint) filterToggleHint.textContent = '(انقر للتصفية 🔍)';
      }
    }

    // Update Secondary Stats counts
    const countPresent = document.getElementById('att-count-present');
    if (countPresent) countPresent.textContent = presentCount;
    const countExcused = document.getElementById('att-count-excused');
    if (countExcused) countExcused.textContent = excusedCount;
    const countAbsent = document.getElementById('att-count-absent');
    if (countAbsent) countAbsent.textContent = absentCount;

    // Apply Status Filter to displayed items
    let displayedItems = studentItems;
    if (this.statusFilter === 'unrecorded') {
      displayedItems = studentItems.filter(i => i.status === null);
    }

    // Group stably by Mahad
    const mahadGroups = this.groupStudentsByMahad(displayedItems, mahaden);

    // Filter Banner if active
    let filterBannerHtml = '';
    if (this.statusFilter === 'unrecorded') {
      filterBannerHtml = `
        <div class="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-bold shadow-2xs">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse"></span>
            <span>عرض: <strong>الطلاب المتبقين فقط</strong> (${displayedItems.length} طالب)</span>
          </div>
          <button id="att-reset-filter-btn" class="px-3 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition-colors cursor-pointer text-xs font-semibold">
            عرض جميع الطلاب (إلغاء التصفية ✕)
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      ${filterBannerHtml}

      <!-- Rollcall List (Stable In-Place Ordering Grouped by Mahad) -->
      <section class="space-y-5">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">
              كشف الطلاب
            </h3>
            <span class="text-xs text-stone-500 font-medium">· انقر الحالة لرصدها، أو انقر الحالة المفعّلة للإلغاء</span>
          </div>

          ${query ? `
            <span class="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
              نتائج البحث: "${Utils.escapeHtml(query)}"
            </span>
          ` : ''}
        </div>

        ${displayedItems.length === 0 ? `
          <div class="p-8 text-center bg-white rounded-2xl border border-stone-200 text-stone-700 shadow-2xs">
            <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 font-bold text-lg">ℹ</div>
            <h4 class="font-bold text-base mb-1 text-slate-900">
              ${this.statusFilter === 'unrecorded' ? 'اكتمل رصد جميع الطلاب!' : 'لا توجد سجلات تطابق شروط التصفية'}
            </h4>
            <p class="text-xs text-stone-500">
              ${this.statusFilter !== 'all' ? 'يمكنك النقر على زر "عرض جميع الطلاب" بالأعلى لرؤية الكشف الكامل.' : 'جرّب البحث باسم آخر.'}
            </p>
          </div>
        ` : `
          <div class="space-y-6">
            ${mahadGroups.map(group => `
              <div class="mahad-attendance-group space-y-2.5">
                <!-- Section Header for Mahad -->
                <div class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-stone-100/90 border border-stone-200">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-900"></span>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900">${Utils.escapeHtml(group.mahad.name)}</h4>
                    ${group.mahad.neighborhood ? `<span class="text-[11px] text-stone-500 font-normal">(${group.mahad.neighborhood})</span>` : ''}
                  </div>
                  <span class="text-[11px] font-semibold text-stone-600 bg-white px-2.5 py-0.5 rounded-lg border border-stone-200">
                    ${group.students.length} طلاب
                  </span>
                </div>

                <!-- Stable In-Place Student Rows in this Mahad -->
                <div class="space-y-2 pr-1 sm:pr-2">
                  ${group.students.map(item => {
                    const st = item.student;
                    const status = item.status;
                    const isSelected = this.selectedStudentIds.has(st.id);

                    const isPresent = status === 'present';
                    const isExcused = status === 'excused';
                    const isAbsent = status === 'absent';

                    return `
                      <div class="rollcall-card card p-2.5 sm:p-3 rounded-xl border ${isSelected ? 'ring-2 ring-blue-600/40 bg-blue-50/50 border-blue-300' : (status ? 'bg-white border-stone-200/90' : 'bg-white border-stone-200/70 hover:border-stone-300')} transition-all flex items-center justify-between gap-3 shadow-2xs" data-student-id="${st.id}">
                        <!-- Student Name & Multi-select Checkbox (Fully Tappable) -->
                        <label class="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer select-none py-1">
                          <input type="checkbox" 
                                 class="att-student-checkbox w-4 h-4 rounded text-blue-900 focus:ring-blue-900/20 cursor-pointer shrink-0" 
                                 data-student-id="${st.id}" 
                                 ${isSelected ? 'checked' : ''} />

                          <span class="text-xs sm:text-sm font-bold text-slate-900 truncate" title="${Utils.escapeHtml(st.name)}">
                            ${Utils.escapeHtml(st.name)}
                          </span>
                        </label>

                        <!-- Segmented 3-Button Control (Clicking Active Button Cancels Record) -->
                        <div class="flex items-center gap-1.5 shrink-0 bg-stone-100/90 p-1 rounded-xl border border-stone-200/80">
                          <!-- Present Button (✓) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isPresent ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500 shadow-xs' : 'bg-white hover:bg-emerald-50 text-stone-500 hover:text-emerald-700 hover:border-emerald-300 border border-stone-200/70'}" 
                                  data-student-id="${st.id}" 
                                  data-status="present" 
                                  data-current-status="${status || 'none'}" 
                                  title="${isPresent ? 'حاضر (انقر للإلغاء)' : 'حاضر'}">
                            <svg class="w-5 h-5 ${isPresent ? 'text-white' : 'text-emerald-700'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Excused Button (⏱) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isExcused ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-400 shadow-xs' : 'bg-white hover:bg-amber-50 text-stone-500 hover:text-amber-700 hover:border-amber-300 border border-stone-200/70'}" 
                                  data-student-id="${st.id}" 
                                  data-status="excused" 
                                  data-current-status="${status || 'none'}" 
                                  title="${isExcused ? 'معتذر (انقر للإلغاء)' : 'معتذر'}">
                            <svg class="w-5 h-5 ${isExcused ? 'text-white' : 'text-amber-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Absent Button (✕) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${isAbsent ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-500 shadow-xs' : 'bg-white hover:bg-rose-50 text-stone-500 hover:text-rose-700 hover:border-rose-300 border border-stone-200/70'}" 
                                  data-student-id="${st.id}" 
                                  data-status="absent" 
                                  data-current-status="${status || 'none'}" 
                                  title="${isAbsent ? 'غائب (انقر للإلغاء)' : 'غائب'}">
                            <svg class="w-5 h-5 ${isAbsent ? 'text-white' : 'text-rose-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </section>
    `;

    // Hook reset filter button if visible
    const resetFilterBtn = container.querySelector('#att-reset-filter-btn');
    if (resetFilterBtn) {
      resetFilterBtn.addEventListener('click', () => {
        this.statusFilter = 'all';
        this.renderQueue();
      });
    }

    // Hook student checkboxes
    container.querySelectorAll('.att-student-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const sid = cb.dataset.studentId;
        if (e.target.checked) {
          this.selectedStudentIds.add(sid);
        } else {
          this.selectedStudentIds.delete(sid);
        }
        this.updateSelectionUI();
      });
    });

    this.updateSelectionUI();

    // Attach click listeners to status icon buttons with Instant 0ms Optimistic UI Updates
    container.querySelectorAll('.att-action-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const studentId = btn.dataset.studentId;
        const clickedStatus = btn.dataset.status;
        const currentStatus = btn.dataset.currentStatus;

        btn.classList.add('scale-90');
        setTimeout(() => btn.classList.remove('scale-90'), 150);

        const isCancel = currentStatus === clickedStatus;
        const targetStatus = isCancel ? null : clickedStatus;

        // 1. INSTANT 0ms OPTIMISTIC FEEDBACK
        this.applyOptimisticStudentStatus(studentId, targetStatus);

        let arabicStatus = 'حاضر';
        if (clickedStatus === 'excused') arabicStatus = 'معتذر';
        if (clickedStatus === 'absent') arabicStatus = 'غائب';

        if (isCancel) {
          Utils.showToast('تم إلغاء الرصد', 'info', 1000);
        } else {
          Utils.showToast(`${arabicStatus} ✓`, 'success', 1000);
        }

        // 2. ASYNC BACKGROUND PERSISTENCE
        try {
          if (isCancel) {
            await AttendanceService.removeAttendance(studentId, this.selectedDate);
          } else {
            await AttendanceService.recordAttendance(studentId, this.selectedDate, clickedStatus);
          }
        } catch (err) {
          // Revert on rare network/permission errors
          this.applyOptimisticStudentStatus(studentId, currentStatus === 'none' ? null : currentStatus);
          Utils.showToast(err.message || 'تعذر الحفظ', 'error');
        }
      });
    });
  }
};
