/**
 * Attendance Officer View Controller for Platform «مرحلة التأهيل»
 * Attendance takes place exclusively on Sundays and Tuesdays.
 * Refined UX:
 * - Grouped by Mahad as clean section headers (eliminates badge repetition)
 * - Compact segmented icon buttons (matching image.png)
 * - Sticky search and multi-select toolbar
 * - Prominent "Remaining to attend" primary KPI with compact outcome distribution
 * - Auto-targets nearest valid attendance day without exaggerated warnings
 */

import { UserService } from './userService.js';
import { AttendanceService } from './attendanceService.js';
import { Utils } from './utils.js';

export const AttendanceView = {
  selectedDate: null,
  selectedMahad: 'all',
  searchQuery: '',
  selectedStudentIds: new Set(),
  currentCalendarYear: null,
  currentCalendarMonth: null, // 0-indexed (0 = Jan, 11 = Dec)

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
                <span>نظام التحضير والتقويم الأسبوعي</span>
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

        <!-- Attendance Metrics Dashboard (Prioritizes "Remaining" as the primary action KPI) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5" id="att-counts-bar">
          <!-- Primary Highlighted Card: المتبقي للتحضير -->
          <div class="card p-4 rounded-2xl border-2 border-amber-300/80 bg-gradient-to-br from-white via-amber-50/30 to-amber-50/50 shadow-xs md:col-span-1 flex flex-col justify-between" id="att-card-remaining">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span class="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                <span>المتبقي للتحضير</span>
              </span>
              <span class="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white border border-amber-200 text-amber-900" id="att-progress-badge">—%</span>
            </div>

            <div class="my-2 flex items-baseline gap-2">
              <span class="text-3xl font-black font-mono tabular-nums text-slate-900" id="att-count-remaining">—</span>
              <span class="text-xs text-stone-500 font-medium" id="att-count-total-label">طالب متبقي</span>
            </div>

            <!-- Progress mini bar -->
            <div class="space-y-1">
              <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                <div id="att-completion-progress-bar" class="h-full bg-gradient-to-l from-emerald-500 to-blue-700 transition-all duration-300 rounded-full" style="width: 0%"></div>
              </div>
              <div class="flex items-center justify-between text-[10px] text-stone-500 font-mono">
                <span id="att-recorded-label">0 مسجل</span>
                <span id="att-total-label">54 إجمالي</span>
              </div>
            </div>
          </div>

          <!-- Secondary Compact Summary Bar: الحاضرون / المعتذرون / الغائبون -->
          <div class="card p-4 rounded-2xl border border-stone-200 bg-white shadow-xs md:col-span-2 flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between border-b border-stone-100 pb-2">
              <span class="text-xs font-bold text-slate-800">حالات الطلاب المرصودة اليوم</span>
              <span class="text-[11px] text-stone-400 font-mono">تتحدث النتائج مباشرة</span>
            </div>

            <div class="grid grid-cols-3 gap-2.5 text-center">
              <!-- Present -->
              <div class="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 transition-all">
                <div class="flex items-center justify-center gap-1 text-[11px] text-emerald-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-emerald-600"></span>
                  <span>حاضر</span>
                </div>
                <div class="text-2xl font-black text-emerald-700 font-mono tabular-nums" id="att-count-present">0</div>
              </div>

              <!-- Excused -->
              <div class="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/80 transition-all">
                <div class="flex items-center justify-center gap-1 text-[11px] text-amber-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>معتذر</span>
                </div>
                <div class="text-2xl font-black text-amber-700 font-mono tabular-nums" id="att-count-excused">0</div>
              </div>

              <!-- Absent -->
              <div class="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200/80 transition-all">
                <div class="flex items-center justify-center gap-1 text-[11px] text-rose-800 font-bold mb-1">
                  <span class="w-2 h-2 rounded-full bg-rose-600"></span>
                  <span>غائب</span>
                </div>
                <div class="text-2xl font-black text-rose-700 font-mono tabular-nums" id="att-count-absent">0</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Search & Multi-Select Controls Toolbar (Normal flow) -->
        <div class="card p-3.5 sm:p-4 rounded-2xl border border-stone-200 bg-white shadow-2xs space-y-2.5" id="att-controls-header">
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

          <!-- Multi-Select & Batch Toolbar (Visually Distinct with Clear Separation) -->
          <div class="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div class="flex items-center gap-2">
              <button id="att-select-all-btn" type="button" class="px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-xs font-semibold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs">
                <input type="checkbox" id="att-master-checkbox" class="rounded text-blue-900 focus:ring-blue-900/20 cursor-pointer pointer-events-none" />
                <span>تحديد الكل</span>
              </button>

              <button id="att-clear-selection-btn" type="button" class="px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-100 text-xs font-semibold text-stone-600 hover:text-stone-800 transition-all cursor-pointer ${this.selectedStudentIds.size === 0 ? 'hidden' : ''}">
                إلغاء التحديد (<span id="att-selected-count-badge">${this.selectedStudentIds.size}</span>)
              </button>
            </div>

            <!-- Legend for Segmented Buttons -->
            <div class="flex items-center gap-3 text-[11px] text-stone-500 font-medium">
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>حاضر (✓)</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>معتذر (⏱)</span>
              </span>
              <span class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                <span>غائب (✕)</span>
              </span>
            </div>
          </div>

          <!-- Bulk Actions Drawer (When Students Are Checked) -->
          <div id="att-bulk-actions-bar" class="${this.selectedStudentIds.size > 0 ? 'flex' : 'hidden'} items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-md animate-in fade-in duration-150 flex-wrap">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-300 font-bold font-mono text-xs">
                <span id="att-bulk-count">${this.selectedStudentIds.size}</span>
              </div>
              <span class="text-xs font-bold text-white">تطبيق حالة جماعية على المحددين:</span>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button id="bulk-btn-present" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs">
                <span>✓ تحضير (حاضر)</span>
              </button>
              <button id="bulk-btn-excused" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs">
                <span>⏱ تسجيل (معتذر)</span>
              </button>
              <button id="bulk-btn-absent" type="button" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs">
                <span>✕ تسجيل (غائب)</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Main Roll Call Content (Grouped by Mahad) -->
        <div id="att-rollcall-container" class="space-y-6">
          <!-- Populated by renderQueue -->
        </div>
      </div>

      <!-- Comprehensive Calendar Picker Modal -->
      <div id="attendance-calendar-modal" class="modal-overlay hidden" style="display: none;">
        <div class="modal-dialog max-w-lg w-full bg-white rounded-2xl border border-amber-400/40 shadow-2xl overflow-hidden p-0 animate-in fade-in zoom-in-95 duration-150">
          <div class="bg-gradient-to-l from-slate-950 via-blue-950 to-blue-900 text-white p-4 flex items-center justify-between border-b border-amber-500/30">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div>
                <h3 class="font-bold text-sm sm:text-base text-white">تقويم جلسات التحضير</h3>
                <p class="text-[11px] text-blue-200">اختر أي يوم أحد أو ثلاثاء خلال مرحلة التأهيل</p>
              </div>
            </div>
            
            <button id="cal-close-btn" type="button" class="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
            <button id="cal-prev-month-btn" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              <span>الشهر السابق</span>
            </button>

            <div class="flex items-center gap-1.5 font-bold text-sm text-slate-900">
              <span id="cal-month-label" class="text-blue-900">—</span>
              <span id="cal-year-label" class="font-mono text-amber-800">—</span>
            </div>

            <button id="cal-next-month-btn" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-xs font-bold text-slate-800 transition-colors cursor-pointer">
              <span>الشهر التالي</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
          </div>

          <div class="p-4" id="cal-grid-wrapper">
            <!-- Populated by renderCalendarGrid -->
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

    // Hook bulk attendance buttons
    const bindBulkBtn = (btnId, status, label) => {
      const btn = container.querySelector(btnId);
      if (btn) {
        btn.addEventListener('click', async () => {
          if (this.selectedStudentIds.size === 0) return;
          const ids = Array.from(this.selectedStudentIds);
          try {
            for (const sid of ids) {
              await AttendanceService.recordAttendance(sid, this.selectedDate, status);
            }
            Utils.showToast(`تم تحضير ${ids.length} طالب بحالة: ${label}`, 'success', 2000);
            this.selectedStudentIds.clear();
            await this.renderQueue();
          } catch (err) {
            Utils.showToast(err.message, 'error');
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
   * Update visual states of selection checkboxes and bulk actions bar
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
      const card = cb.closest('.rollcall-card') || cb.closest('.recorded-card');
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

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    let html = `
      <div class="grid grid-cols-7 gap-1 text-center mb-2">
        ${weekDays.map(name => {
          const isAttDay = name === 'الأحد' || name === 'الثلاثاء';
          return `
            <div class="py-1 text-xs font-bold ${isAttDay ? 'text-blue-900 bg-blue-50/70 rounded-md border border-blue-200/50' : 'text-stone-400'}">
              ${name}
            </div>
          `;
        }).join('')}
      </div>

      <div class="grid grid-cols-7 gap-1 text-center">
    `;

    for (let i = 0; i < firstDayIndex; i++) {
      html += `<div class="p-2 opacity-15 text-stone-300 text-xs"></div>`;
    }

    const todayIso = new Date().toISOString().split('T')[0];

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const dayDate = new Date(year, month, dayNum);
      const dayOfWeek = dayDate.getDay();
      const isSundayOrTuesday = dayOfWeek === 0 || dayOfWeek === 2;

      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(dayNum).padStart(2, '0');
      const iso = `${year}-${mStr}-${dStr}`;

      const isSelected = this.selectedDate === iso;
      const isToday = todayIso === iso;
      const hasRecords = recordedDatesSet.has(iso);

      if (isSundayOrTuesday) {
        let bgClasses = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300/70';
        if (isSelected) {
          bgClasses = 'bg-blue-900 text-white font-bold ring-2 ring-amber-400 border-blue-900 shadow-sm';
        }

        html += `
          <button type="button" 
                  class="cal-day-btn relative p-2 min-h-[46px] rounded-xl transition-all flex flex-col items-center justify-between cursor-pointer ${bgClasses}" 
                  data-date="${iso}">
            <div class="flex items-center justify-between w-full">
              <span class="text-xs font-bold font-mono ${isSelected ? 'text-amber-300' : 'text-blue-950'}">${dayNum}</span>
              ${isToday ? `<span class="w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-red-500'}" title="اليوم"></span>` : '<span></span>'}
            </div>

            <div class="flex items-center gap-1 w-full justify-center">
              ${hasRecords ? `
                <span class="text-[9px] font-bold px-1.5 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-emerald-200/90 text-emerald-900'}">
                  مُسجّل ✓
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
            <span class="text-xs font-mono">${dayNum}</span>
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
        // Fallback for custom or unknown mahad
        if (!mahadMap.has('other')) {
          mahadMap.set('other', {
            mahad: { id: 'other', name: st.mahadName || 'المحضن', neighborhood: '' },
            students: []
          });
        }
        mahadMap.get('other').students.push(item);
      }
    });

    // Return only groups that have students
    return Array.from(mahadMap.values()).filter(g => g.students.length > 0);
  },

  /**
   * Render student queues grouped cleanly by Mahad
   */
  async renderQueue() {
    const container = document.getElementById('att-rollcall-container');
    if (!container) return;

    const mahaden = await UserService.getMahaden();
    let students = await UserService.getStudents();
    if (this.selectedMahad && this.selectedMahad !== 'all') {
      students = students.filter(s => s.mahadId === this.selectedMahad);
    }

    const query = (this.searchQuery || '').trim().toLowerCase();
    if (query) {
      students = students.filter(s => {
        const nameMatch = (s.name || '').toLowerCase().includes(query);
        const mahadMatch = (s.mahadName || '').toLowerCase().includes(query);
        const emailMatch = (s.email || '').toLowerCase().includes(query);
        return nameMatch || mahadMatch || emailMatch;
      });
    }

    const queue = await AttendanceService.getDateRollCallQueue(this.selectedDate, students);
    const records = await AttendanceService.getAttendanceForDate(this.selectedDate);

    const studentIdsSet = new Set(students.map(s => s.id));
    const subsetRecords = records.filter(r => studentIdsSet.has(r.studentId));

    const presentCount = subsetRecords.filter(r => r.status === 'present').length;
    const excusedCount = subsetRecords.filter(r => r.status === 'excused').length;
    const absentCount = subsetRecords.filter(r => r.status === 'absent').length;
    const recordedTotal = subsetRecords.length;
    const totalStudents = students.length;
    const remainingCount = queue.unrecorded.length;

    const completionPct = totalStudents > 0 ? Math.round((recordedTotal / totalStudents) * 100) : 0;

    // Update KPI Card: המتبقي للتحضير
    const remainingEl = document.getElementById('att-count-remaining');
    const progressBadge = document.getElementById('att-progress-badge');
    const progressBar = document.getElementById('att-completion-progress-bar');
    const recordedLabel = document.getElementById('att-recorded-label');
    const totalLabel = document.getElementById('att-total-label');

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
    if (recordedLabel) recordedLabel.textContent = `${recordedTotal} تم رصدهم`;
    if (totalLabel) totalLabel.textContent = `${totalStudents} إجمالي`;

    // Update Secondary Stats
    const countPresent = document.getElementById('att-count-present');
    if (countPresent) countPresent.textContent = presentCount;
    const countExcused = document.getElementById('att-count-excused');
    if (countExcused) countExcused.textContent = excusedCount;
    const countAbsent = document.getElementById('att-count-absent');
    if (countAbsent) countAbsent.textContent = absentCount;

    // Date status indicator
    const dateStatusIndicator = document.getElementById('att-date-status-indicator');
    if (dateStatusIndicator) {
      if (remainingCount === 0 && totalStudents > 0) {
        dateStatusIndicator.innerHTML = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            مكتمل
          </span>
        `;
      } else if (recordedTotal > 0) {
        dateStatusIndicator.innerHTML = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            قيد التحضير
          </span>
        `;
      } else {
        dateStatusIndicator.innerHTML = `
          <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-300 shadow-2xs">
            <span class="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
            جلسة اليوم
          </span>
        `;
      }
    }

    const unrecordedGroups = this.groupStudentsByMahad(queue.unrecorded, mahaden);
    const recordedGroups = this.groupStudentsByMahad(queue.recorded, mahaden);

    container.innerHTML = `
      <!-- Unrecorded Students Section (Grouped by Mahad) -->
      <section class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <h3 class="text-base sm:text-lg font-bold text-slate-900">
              قائمة انتظار التحضير
            </h3>
            <span class="text-xs text-stone-500 font-medium">· انقر الرمز لرصد الحالة</span>
          </div>

          ${query ? `
            <span class="text-xs font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
              نتائج البحث: "${Utils.escapeHtml(query)}"
            </span>
          ` : ''}
        </div>

        ${queue.unrecorded.length === 0 ? `
          <div class="p-6 text-center bg-white rounded-2xl border border-stone-200 text-stone-700 shadow-2xs">
            <div class="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">✓</div>
            <h4 class="font-bold text-base mb-1 text-slate-900">
              ${query ? 'لا يوجد طلاب غير مسجلين يطابقون عبارة البحث' : 'اكتمل تحضير جميع الطلاب في هذه الجلسة بنجاح!'}
            </h4>
            <p class="text-xs text-stone-500">
              ${query ? 'جرّب البحث باسم آخر.' : 'تم تسجيل جميع الطلاب. تظهر سجلاتهم في قسم المرصودين أدناه.'}
            </p>
          </div>
        ` : `
          <div class="space-y-5">
            ${unrecordedGroups.map(group => `
              <div class="mahad-attendance-group space-y-2">
                <!-- Section Header for Mahad -->
                <div class="flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-100/90 border border-stone-200/90">
                  <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-blue-900"></span>
                    <h4 class="text-xs sm:text-sm font-bold text-slate-900">${Utils.escapeHtml(group.mahad.name)}</h4>
                    ${group.mahad.neighborhood ? `<span class="text-[11px] text-stone-500">(${group.mahad.neighborhood})</span>` : ''}
                  </div>
                  <span class="text-[11px] font-mono font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                    ${group.students.length} طلاب
                  </span>
                </div>

                <!-- Student Rows in this Mahad -->
                <div class="space-y-1.5 pr-1 sm:pr-2">
                  ${group.students.map(item => {
                    const st = item.student;
                    const isSelected = this.selectedStudentIds.has(st.id);

                    return `
                      <div class="rollcall-card card p-2.5 sm:p-3 rounded-xl border ${isSelected ? 'ring-2 ring-blue-600/40 bg-blue-50/50 border-blue-300' : 'border-stone-200/80 bg-white hover:border-stone-300'} transition-all flex items-center justify-between gap-3 shadow-2xs" data-student-id="${st.id}">
                        <!-- Student Name & Multi-select Checkbox -->
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                          <label class="flex items-center justify-center p-0.5 cursor-pointer">
                            <input type="checkbox" 
                                   class="att-student-checkbox w-4 h-4 rounded text-blue-900 focus:ring-blue-900/20 cursor-pointer" 
                                   data-student-id="${st.id}" 
                                   ${isSelected ? 'checked' : ''} />
                          </label>

                          <span class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            ${Utils.escapeHtml(st.name)}
                          </span>
                        </div>

                        <!-- Compact Segmented 3-Button Control (Matching image.png) -->
                        <div class="flex items-center gap-1.5 shrink-0 bg-stone-100/90 p-1 rounded-xl border border-stone-200/80">
                          <!-- Present Button (✓ Check in Circle) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 hover:border-emerald-300 border border-stone-200/70 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-90" 
                                  data-student-id="${st.id}" data-status="present" title="تسجيل حاضر">
                            <svg class="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Excused Button (⏱ Clock in Circle) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg bg-white hover:bg-amber-50 text-stone-600 hover:text-amber-700 hover:border-amber-300 border border-stone-200/70 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-90" 
                                  data-student-id="${st.id}" data-status="excused" title="تسجيل معتذر">
                            <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Absent Button (✕ X in Circle) -->
                          <button class="att-action-btn w-9 h-9 sm:w-10 sm:h-9 rounded-lg bg-white hover:bg-rose-50 text-stone-600 hover:text-rose-700 hover:border-rose-300 border border-stone-200/70 transition-all flex items-center justify-center cursor-pointer shadow-2xs active:scale-90" 
                                  data-student-id="${st.id}" data-status="absent" title="تسجيل غائب">
                            <svg class="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <!-- Recorded Students Section (Grouped by Mahad) -->
      ${queue.recorded.length > 0 ? `
        <section class="pt-5 border-t border-stone-200 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-sm sm:text-base font-bold text-slate-800">
              سجل الطلاب المرصودين (${queue.recorded.length})
            </h3>
            <span class="text-xs text-stone-400">انقر لتعديل حالة أي طالب مباشرة</span>
          </div>

          <div class="space-y-4">
            ${recordedGroups.map(group => `
              <div class="mahad-recorded-group space-y-2">
                <div class="flex items-center justify-between px-3 py-1.5 rounded-lg bg-stone-100 text-xs font-bold text-stone-700">
                  <span>${Utils.escapeHtml(group.mahad.name)}</span>
                  <span class="text-[11px] font-mono text-stone-500">${group.students.length} طلاب مسجلين</span>
                </div>

                <div class="space-y-1.5 pr-1 sm:pr-2">
                  ${group.students.map(item => {
                    const st = item.student;
                    const status = item.status;
                    const isSelected = this.selectedStudentIds.has(st.id);

                    return `
                      <div class="recorded-card card p-2.5 sm:p-3 rounded-xl border border-stone-200/80 ${isSelected ? 'ring-2 ring-blue-600/40 bg-blue-50/50' : 'bg-stone-50/60'} flex items-center justify-between gap-3 transition-all" data-student-id="${st.id}">
                        <div class="flex items-center gap-2.5 flex-1 min-w-0">
                          <label class="flex items-center justify-center p-0.5 cursor-pointer">
                            <input type="checkbox" 
                                   class="att-student-checkbox w-4 h-4 rounded text-blue-900 focus:ring-blue-900/20 cursor-pointer" 
                                   data-student-id="${st.id}" 
                                   ${isSelected ? 'checked' : ''} />
                          </label>

                          <span class="text-xs sm:text-sm font-bold text-slate-800 truncate">
                            ${Utils.escapeHtml(st.name)}
                          </span>
                        </div>

                        <!-- Compact Segmented Buttons with Active Selected Indicator -->
                        <div class="flex items-center gap-1.5 shrink-0 bg-stone-200/60 p-1 rounded-xl">
                          <!-- Present -->
                          <button class="att-action-btn w-8 h-8 sm:w-9 sm:h-8 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${status === 'present' ? 'bg-emerald-600 text-white font-bold ring-2 ring-emerald-500' : 'bg-white text-stone-400 hover:text-emerald-700'}" 
                                  data-student-id="${st.id}" data-status="present" title="حاضر">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Excused -->
                          <button class="att-action-btn w-8 h-8 sm:w-9 sm:h-8 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${status === 'excused' ? 'bg-amber-500 text-white font-bold ring-2 ring-amber-400' : 'bg-white text-stone-400 hover:text-amber-700'}" 
                                  data-student-id="${st.id}" data-status="excused" title="معتذر">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>

                          <!-- Absent -->
                          <button class="att-action-btn w-8 h-8 sm:w-9 sm:h-8 rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-2xs ${status === 'absent' ? 'bg-rose-600 text-white font-bold ring-2 ring-rose-500' : 'bg-white text-stone-400 hover:text-rose-700'}" 
                                  data-student-id="${st.id}" data-status="absent" title="غائب">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        </section>
      ` : ''}
    `;

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

    // Attach click listeners to status icon buttons
    container.querySelectorAll('.att-action-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const studentId = btn.dataset.studentId;
        const status = btn.dataset.status;

        btn.classList.add('scale-90');

        try {
          await AttendanceService.recordAttendance(studentId, this.selectedDate, status);
          
          let arabicStatus = 'حاضر';
          if (status === 'excused') arabicStatus = 'معتذر';
          if (status === 'absent') arabicStatus = 'غائب';

          Utils.showToast(`تم التسجيل: ${arabicStatus}`, 'success', 1000);

          const card = container.querySelector(`.rollcall-card[data-student-id="${studentId}"]`);
          if (card) {
            card.classList.add('opacity-40', 'translate-x-3');
            setTimeout(() => this.renderQueue(), 140);
          } else {
            this.renderQueue();
          }
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      });
    });
  }
};
