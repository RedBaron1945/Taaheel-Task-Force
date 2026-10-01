/**
 * Student View Controller for Platform «مرحلة التأهيل»
 * Renders student dashboard, assignment cards, interactive to-do list,
 * instant recalculation of points, and read-only expired states.
 */

import { ProgressService } from './progressService.js';
import { Utils } from './utils.js';

export const StudentView = {
  activeFilter: 'all', // 'all' | 'active' | 'completed' | 'expired'
  expandedAssignmentIds: new Set(), // Track which assignment dropdowns are currently open

  /**
   * Render the student view into container
   */
  async render(container, student) {
    if (!container || !student) return;

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Student Hero Banner with Islamic Geometric Trim & Royal Blue -->
        <section class="card bg-gradient-to-l from-slate-950 via-blue-950 to-blue-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl shadow-blue-950/20 border border-amber-400/35 relative overflow-hidden transition-all">
          <!-- Subtle Islamic Geometric Pattern Backdrop -->
          <div class="absolute inset-0 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] opacity-[0.07] [background-size:20px_20px] pointer-events-none"></div>
          <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div class="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div class="space-y-2 flex-1 min-w-0">
              ${student.mahadName ? `
                <div>
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-amber-200 bg-amber-950/70 border border-amber-500/40 backdrop-blur-md">
                    <span>محضن:</span>
                    <span class="text-white">${Utils.escapeHtml(student.mahadName)}</span>
                  </span>
                </div>
              ` : ''}

              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>مرحبًا، ${Utils.escapeHtml(student.name)}</span>
                <span class="text-amber-400 text-2xl animate-bounce">👋</span>
              </h2>

              <p class="text-xs sm:text-sm text-blue-200/90 max-w-xl font-medium leading-relaxed">
                مرحباً بك في لوحة متابعة إنجازك القرآني والعلمي. تتبع تكاليفك المقررة وأتمم خطواتها تباعاً.
              </p>
            </div>

            <!-- Subtle Vertical Line Linking Narrative & Overall Status -->
            <div class="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-amber-400/30 to-transparent mx-1"></div>
            
            <!-- Overall Progress Summary with Real SVG Circular Progress Ring -->
            <div id="student-hero-score" class="flex items-center gap-4 bg-white/10 hover:bg-white/[0.14] transition-all backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-amber-400/40 self-start md:self-auto shrink-0 shadow-lg shadow-black/10">
              <!-- Circular Progress Ring that dynamically fills by % -->
              <div class="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <!-- Background Track -->
                  <circle cx="28" cy="28" r="22" class="text-blue-900/90 stroke-current" stroke-width="4.5" fill="transparent" />
                  <!-- Dynamic Progress Arc (circumference ~ 138.2) -->
                  <circle id="student-hero-ring" cx="28" cy="28" r="22" class="text-amber-400 stroke-current transition-all duration-700 ease-out" stroke-width="4.5" stroke-linecap="round" fill="transparent" stroke-dasharray="138.2" stroke-dashoffset="138.2" />
                </svg>
                <div class="absolute inset-0 flex items-center justify-center text-amber-300">
                  <svg class="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>

              <div class="text-right">
                <div class="text-xs text-amber-200/90 font-medium">نسبة الإنجاز العامة</div>
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-300 font-mono tabular-nums tracking-tight" id="student-hero-pct">—%</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Compact Filter Bar -->
        <section class="grid grid-cols-3 gap-2 sm:gap-3" id="student-stats-grid">
          <!-- Populated by renderStatsGrid -->
        </section>

        <!-- Section Header for Assignments -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-b border-slate-200 pb-3">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h3 class="text-lg font-bold text-slate-900">خطة التكاليف المقررة</h3>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200/80" id="student-assignments-count">—</span>
            <div id="filter-reset-wrapper" class="hidden">
              <button type="button" id="reset-filter-btn" class="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-xl border border-blue-200 transition-colors cursor-pointer">
                <span>إلغاء التصفية (عرض الكل)</span>
                <span class="text-blue-500 font-bold">✕</span>
              </button>
            </div>
          </div>
          <div class="text-xs text-stone-600 hidden sm:block">
            <span>تظهر التكاليف غير المكتملة أولاً، وتنتقل التكاليف المكتملة تلقائياً للأسفل</span>
          </div>
        </div>

        <!-- Assignments Container -->
        <div id="student-assignments-list" class="space-y-4">
          <div class="text-center py-12 text-slate-400">جارٍ تحميل التكاليف...</div>
        </div>

        <!-- Poetic Wisdom Quote Card at the Bottom of the Page -->
        <section class="relative mt-8 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/70 via-stone-50 to-amber-50/70 border border-amber-300/40 p-5 sm:p-6 shadow-xs text-center">
          <div class="absolute inset-0 bg-[radial-gradient(#c4973b_1px,transparent_1px)] opacity-10 [background-size:16px_16px] pointer-events-none"></div>
          
          <div class="relative z-10 max-w-xl mx-auto flex flex-col items-center justify-center">
            <!-- Ornamental Subtle Motif -->
            <div class="flex items-center gap-2 mb-2 opacity-75">
              <span class="w-8 h-px bg-gradient-to-l from-amber-500 to-transparent"></span>
              <span class="text-amber-700 text-xs">✦</span>
              <span class="w-8 h-px bg-gradient-to-r from-amber-500 to-transparent"></span>
            </div>

            <!-- The Poetic Words with Amiri Calligraphic Font -->
            <blockquote class="text-base sm:text-lg md:text-xl font-bold text-slate-800 leading-relaxed font-serif" style="font-family: var(--font-calligraphy), serif;">
              <span class="block">إذا لم تكن أسداً في العزم</span>
              <span class="block text-blue-950 font-extrabold my-0.5">غزالاً في السبق</span>
              <span class="block text-amber-800 font-black">فلا تتثعلب..</span>
            </blockquote>

            <div class="flex items-center gap-2 mt-2 opacity-75">
              <span class="w-8 h-px bg-gradient-to-l from-amber-500 to-transparent"></span>
              <span class="text-amber-700 text-xs">✦</span>
              <span class="w-8 h-px bg-gradient-to-r from-amber-500 to-transparent"></span>
            </div>
          </div>
        </section>
      </div>
    `;

    await this.refresh(student);
  },

  /**
   * Refresh stats and assignment cards
   */
  async refresh(student) {
    const stats = await ProgressService.getStudentOverallStats(student.id);

    // Update Hero with percentage and dynamic SVG Circular Progress Ring
    const heroPoints = document.getElementById('student-hero-points');
    const heroPct = document.getElementById('student-hero-pct');
    const heroRing = document.getElementById('student-hero-ring');
    if (heroPoints) heroPoints.textContent = `${stats.totalEarnedPoints} / ${stats.totalMaxPoints}`;
    if (heroPct) heroPct.textContent = `${stats.overallPercentage}%`;
    if (heroRing) {
      const circumference = 138.2;
      const offset = circumference - (stats.overallPercentage / 100) * circumference;
      heroRing.style.strokeDashoffset = `${offset}`;
    }

    // Render interactive filterable metric cards
    this.renderStatsGrid(student, stats);

    // Render assignments according to current filter
    this.renderAssignments(student, stats);
  },

  /**
   * Render interactive compact filter bar
   */
  renderStatsGrid(student, stats) {
    const statsGrid = document.getElementById('student-stats-grid');
    if (!statsGrid) return;

    const totalCount = stats.totalAssignments || (stats.assignmentDetails ? stats.assignmentDetails.length : 0);
    const activeFilter = this.activeFilter; // 'all' | 'active' | 'completed'

    statsGrid.innerHTML = `
      <!-- Filter: All -->
      <button type="button" 
              id="stat-filter-all"
              class="flex items-center justify-between px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-right group ${
                activeFilter === 'all'
                  ? 'bg-blue-950 text-white border-blue-900 shadow-xs ring-2 ring-blue-900/20'
                  : 'bg-white text-stone-700 border-stone-200/90 hover:border-blue-300 hover:bg-stone-50'
              }"
              title="عرض جميع التكاليف">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full ${activeFilter === 'all' ? 'bg-amber-400' : 'bg-stone-400'} shrink-0"></span>
          <span class="text-xs font-bold truncate">الكل</span>
        </div>
        <span class="text-xs font-mono font-black tabular-nums px-2 py-0.5 rounded-lg shrink-0 ${
          activeFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-slate-800'
        }">${totalCount}</span>
      </button>

      <!-- Filter: Active -->
      <button type="button" 
              id="stat-filter-active"
              class="flex items-center justify-between px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-right group ${
                activeFilter === 'active'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-700/20'
                  : 'bg-white text-stone-700 border-stone-200/90 hover:border-emerald-300 hover:bg-stone-50'
              }"
              title="عرض التكاليف النشطة فقط">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full ${activeFilter === 'active' ? 'bg-white animate-pulse' : 'bg-emerald-500'} shrink-0"></span>
          <span class="text-xs font-bold truncate">النشطة</span>
        </div>
        <span class="text-xs font-mono font-black tabular-nums px-2 py-0.5 rounded-lg shrink-0 ${
          activeFilter === 'active' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-800'
        }">${stats.activeCount}</span>
      </button>

      <!-- Filter: Completed -->
      <button type="button" 
              id="stat-filter-completed"
              class="flex items-center justify-between px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl border transition-all duration-200 cursor-pointer text-right group ${
                activeFilter === 'completed'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-xs ring-2 ring-teal-700/20'
                  : 'bg-white text-stone-700 border-stone-200/90 hover:border-teal-300 hover:bg-stone-50'
              }"
              title="عرض التكاليف المكتملة فقط">
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="w-2 h-2 rounded-full ${activeFilter === 'completed' ? 'bg-white' : 'bg-teal-500'} shrink-0"></span>
          <span class="text-xs font-bold truncate">المكتملة</span>
        </div>
        <span class="text-xs font-mono font-black tabular-nums px-2 py-0.5 rounded-lg shrink-0 ${
          activeFilter === 'completed' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-800'
        }">${stats.completedCount}</span>
      </button>
    `;

    // Attach click listeners to filter buttons
    document.getElementById('stat-filter-all')?.addEventListener('click', () => {
      this.activeFilter = 'all';
      this.renderStatsGrid(student, stats);
      this.renderAssignments(student, stats);
    });

    document.getElementById('stat-filter-active')?.addEventListener('click', () => {
      this.activeFilter = this.activeFilter === 'active' ? 'all' : 'active';
      this.renderStatsGrid(student, stats);
      this.renderAssignments(student, stats);
    });

    document.getElementById('stat-filter-completed')?.addEventListener('click', () => {
      this.activeFilter = this.activeFilter === 'completed' ? 'all' : 'completed';
      this.renderStatsGrid(student, stats);
      this.renderAssignments(student, stats);
    });
  },

  /**
   * Render assignment cards according to active filter
   */
  async renderAssignments(student, preloadedStats = null) {
    const listEl = document.getElementById('student-assignments-list');
    const countEl = document.getElementById('student-assignments-count');
    if (!listEl) return;

    const stats = preloadedStats || await ProgressService.getStudentOverallStats(student.id);
    let items = [...stats.assignmentDetails];

    // Filter items based on activeFilter
    if (this.activeFilter === 'active') {
      items = items.filter(item => !(item.stats.isCompleted || item.stats.percentage >= 100));
    } else if (this.activeFilter === 'completed') {
      items = items.filter(item => (item.stats.isCompleted || item.stats.percentage >= 100));
    }

    // Toggle reset filter button visibility
    const resetWrapper = document.getElementById('filter-reset-wrapper');
    if (resetWrapper) {
      if (this.activeFilter !== 'all') {
        resetWrapper.classList.remove('hidden');
        const resetBtn = document.getElementById('reset-filter-btn');
        if (resetBtn) {
          resetBtn.onclick = () => {
            this.activeFilter = 'all';
            this.renderStatsGrid(student, stats);
            this.renderAssignments(student, stats);
          };
        }
      } else {
        resetWrapper.classList.add('hidden');
      }
    }

    // Preserve the original administrative order of assignments by assigning each item its initial index
    const itemsWithIndex = items.map((item, originalIndex) => ({
      ...item,
      originalIndex
    }));

    // Sorting rule:
    // - Incomplete assignments (percentage < 100%) remain in their exact original order in the top section
    // - Completed assignments (percentage === 100%) automatically drop to the bottom section (preserving their order among each other)
    itemsWithIndex.sort((a, b) => {
      const aDone = a.stats.isCompleted || a.stats.percentage >= 100;
      const bDone = b.stats.isCompleted || b.stats.percentage >= 100;

      // If one is completed (100%) and the other is not:
      // The non-completed one stays at the top (-1), completed drops to the bottom (+1)
      if (!aDone && bDone) return -1;
      if (aDone && !bDone) return 1;

      // When both are incomplete OR both are completed:
      // Keep their exact original defined order (do NOT shuffle by percentage or other factors)
      return a.originalIndex - b.originalIndex;
    });

    items = itemsWithIndex;

    if (countEl) {
      if (this.activeFilter === 'active') {
        countEl.textContent = `${items.length} تكليف نشط`;
      } else if (this.activeFilter === 'completed') {
        countEl.textContent = `${items.length} تكليف مكتمل`;
      } else {
        countEl.textContent = `${items.length} تكليف`;
      }
    }

    if (items.length === 0) {
      const emptyMsg = this.activeFilter === 'active' 
        ? 'لا توجد تكاليف نشطة حالياً، جميع التكاليف مكتملة!' 
        : (this.activeFilter === 'completed' 
            ? 'لا توجد تكاليف مكتملة حتى الآن، ابدأ بإنجاز مهامك أولاً بأول.' 
            : 'لا توجد تكاليف مقررة حالياً');

      listEl.innerHTML = `
        <div class="empty-state text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h4 class="text-base font-semibold text-slate-800 mb-1">${emptyMsg}</h4>
          ${this.activeFilter !== 'all' ? `
            <button type="button" class="mt-3 text-xs font-bold text-blue-900 bg-white hover:bg-blue-50 px-3.5 py-1.5 rounded-xl border border-blue-200 shadow-2xs cursor-pointer" onclick="document.getElementById('reset-filter-btn')?.click()">
              إلغاء التصفية وعرض كل التكاليف
            </button>
          ` : '<p class="text-xs text-slate-500">سيتم إدراج التكاليف الجديدة فور اعتمادها من قِبل الإدارة.</p>'}
        </div>
      `;
      return;
    }

    listEl.innerHTML = items.map(item => {
      const asg = item.assignment;
      const s = item.stats;
      const completed = item.completedSubtaskIds || [];
      const isDone = s.isCompleted || s.percentage >= 100;
      const subtasks = asg.subtasks || [];

      // Find the first incomplete subtask index to highlight as the next immediate milestone
      let nextImmediateSubtaskId = null;
      if (!isDone && !s.isExpired) {
        const nextSub = subtasks.find(sub => !completed.includes(sub.id));
        if (nextSub) nextImmediateSubtaskId = nextSub.id;
      }

      // External resource button with prominent external-link visual cue
      let sourceBtn = '';
      if (asg.sourceUrl) {
        sourceBtn = `
          <a href="${Utils.escapeHtml(asg.sourceUrl)}" target="_blank" rel="noopener noreferrer" 
             class="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100/90 rounded-xl transition-all border border-blue-200/90 hover:border-blue-300 shadow-2xs group shrink-0"
             title="فتح المصادر المرفقة في علامة تبويب جديدة">
            <span>فتح مصادر التكليف</span>
            <svg class="w-3.5 h-3.5 text-blue-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        `;
      }

      const statusBadge = isDone
        ? `<span class="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs">
            <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span>مكتمل بالكامل</span>
           </span>`
        : (s.isExpired
          ? `<span class="inline-flex items-center text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
              منتهي الصلاحية
             </span>`
          : `<span class="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/90">
              <span class="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              <span>جارٍ العمل</span>
             </span>`);

      // Color gradient transitions for progress bar based on percentage
      let progressColor = 'bg-blue-700';
      if (s.percentage >= 100) {
        progressColor = 'bg-gradient-to-r from-emerald-600 to-teal-500';
      } else if (s.percentage >= 70) {
        progressColor = 'bg-gradient-to-r from-teal-600 to-emerald-500';
      } else if (s.percentage >= 40) {
        progressColor = 'bg-gradient-to-r from-blue-700 to-teal-600';
      } else {
        progressColor = 'bg-gradient-to-r from-blue-900 to-blue-700';
      }

      // Determine accent color for next-step border based on current progress ramp
      let nextStepBorderClass = 'border-teal-500 ring-2 ring-teal-500/20';
      if (s.percentage >= 70) {
        nextStepBorderClass = 'border-emerald-500 ring-2 ring-emerald-500/20';
      } else if (s.percentage >= 40) {
        nextStepBorderClass = 'border-teal-500 ring-2 ring-teal-500/20';
      } else {
        nextStepBorderClass = 'border-blue-600 ring-2 ring-blue-600/20';
      }

      // Check if this assignment card's subtasks dropdown is open
      const isExpanded = this.expandedAssignmentIds.has(asg.id);

      return `
        <article class="assignment-card card rounded-2xl border transition-all duration-300 overflow-hidden ${
          isDone 
            ? 'border-emerald-200/80 bg-stone-50/60 shadow-2xs' 
            : (s.isExpired 
                ? 'border-stone-200 bg-stone-50/70' 
                : 'border-stone-200/90 bg-white shadow-xs hover:border-blue-300 hover:shadow-md')
        }" data-asg-id="${asg.id}">
          
          <div class="p-5 sm:p-6 space-y-4">
            <!-- Header: Natural RTL reading flow: Status badge & Title on the right, Counter & Links on the left -->
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-3 border-b border-stone-100">
              
              <!-- Primary Right Block (RTL First): Status Badge stacked immediately above Title & Description -->
              <div class="space-y-2 flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  ${statusBadge}
                </div>

                <h4 class="text-lg sm:text-xl font-black tracking-tight ${isDone ? 'text-slate-800 line-through decoration-emerald-500/50' : 'text-slate-950'}">
                  ${Utils.escapeHtml(asg.title)}
                </h4>

                ${asg.description ? `
                  <p class="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal max-w-3xl">
                    ${Utils.escapeHtml(asg.description)}
                  </p>
                ` : ''}
              </div>

              <!-- Secondary Left Block: Source link & Complementary Task Counter -->
              <div class="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap sm:flex-nowrap">
                ${sourceBtn}
                
                <div class="flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isDone ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-stone-50 text-slate-800 border-stone-200'} shadow-2xs">
                  <span class="w-1.5 h-1.5 rounded-full ${isDone ? 'bg-emerald-500' : 'bg-blue-600'}"></span>
                  <span class="text-xs font-bold font-mono tabular-nums">
                    ${s.completedCount} / ${s.totalSubtasks} مهام
                  </span>
                </div>
              </div>
            </div>

            <!-- Responsive Metadata Chips Grid (2x2 on mobile, flex row on desktop) -->
            <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 text-xs">
              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-stone-700">
                <svg class="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                <span class="text-stone-500 text-[11px]">البداية:</span>
                <span class="font-semibold text-slate-900 font-mono">${Utils.formatShortDate(asg.startDate)}</span>
              </div>

              <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-stone-700">
                <svg class="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span class="text-stone-500 text-[11px]">النهاية:</span>
                <span class="font-semibold ${s.isExpired ? 'text-red-700 font-bold' : 'text-slate-900'} font-mono">${Utils.formatShortDate(asg.endDate)}</span>
              </div>

              <div class="col-span-2 sm:col-span-1 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-50 border border-stone-200/80 text-stone-700">
                <svg class="w-3.5 h-3.5 text-stone-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                ${isDone ? `
                  <span class="text-stone-500 text-[11px]">إجمالي المهام:</span>
                  <span class="font-bold text-slate-900 font-mono">${s.totalSubtasks} مهام</span>
                ` : `
                  <span class="text-stone-500 text-[11px]">المهام:</span>
                  <span class="font-bold text-slate-900 font-mono">${s.completedCount} من ${s.totalSubtasks} مكتملة</span>
                `}
              </div>
            </div>

            <!-- Single Authoritative Progress Bar with Emotional Hue Ramp -->
            <div class="space-y-2 p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/70">
              <div class="flex items-center justify-between text-xs">
                <span class="font-bold ${isDone ? 'text-emerald-800' : 'text-slate-700'} flex items-center gap-1.5">
                  ${isDone 
                    ? `<span>مكتمل</span>` 
                    : (s.isExpired 
                      ? `<span class="text-stone-500">التكليف منتهي</span>` 
                      : `<span>المتبقي للإتمام: <strong class="text-slate-900 font-bold font-mono">${s.totalSubtasks - s.completedCount}</strong> مهام</span>`)}
                </span>

                <span class="font-mono font-black text-sm tabular-nums ${isDone ? 'text-emerald-700' : (s.percentage >= 70 ? 'text-teal-700' : 'text-blue-900')}">
                  ${s.percentage}%
                </span>
              </div>

              <div class="w-full bg-stone-200/70 rounded-full h-3.5 overflow-hidden p-0.5">
                <div class="h-full rounded-full transition-all duration-500 ease-out ${progressColor}"
                     style="width: ${s.percentage}%"></div>
              </div>
            </div>

            <!-- Collapsible Dropdown Trigger Button with Smooth Chevron Transition -->
            <button type="button" 
                    class="toggle-subtasks-btn w-full flex items-center justify-between p-3 rounded-xl border border-stone-200/90 hover:border-stone-300 hover:bg-stone-50 transition-all font-semibold text-xs sm:text-sm text-slate-800 focus:outline-hidden group cursor-pointer"
                    data-asg-id="${asg.id}">
              <div class="flex items-center gap-2.5">
                <svg class="chevron-icon w-4 h-4 text-stone-500 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180 text-blue-900' : 'group-hover:text-slate-800'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
                </svg>
                <span class="toggle-btn-label font-bold text-slate-900">${isExpanded ? 'إخفاء المهام الفرعية' : 'عرض المهام الفرعية'}</span>
                <span class="text-[11px] font-normal text-stone-500 font-mono">(${s.completedCount} من ${s.totalSubtasks})</span>
              </div>
              
              <span class="toggle-btn-hint text-[11px] font-bold text-blue-900 bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-200/60">
                ${isExpanded ? 'طي' : 'عرض'}
              </span>
            </button>
          </div>

          <!-- Collapsible Dropdown Content Container -->
          <div id="subtasks-container-${asg.id}" class="border-t border-stone-200/70 bg-stone-50/50 p-5 sm:p-6 transition-all duration-300 ${isExpanded ? '' : 'hidden'}">
            <div class="space-y-3">
              <div class="flex items-center justify-between pb-1 text-xs">
                <span class="font-bold text-slate-700">
                  ${isDone 
                    ? 'كافة الخطوات مكتملة بنجاح' 
                    : `الخطوات المتبقية (${s.totalSubtasks - s.completedCount} خطوات):`}
                </span>
                <span class="text-[11px] text-stone-500">انقر على المربع لتسجيل إنجاز المهمة</span>
              </div>

              <div class="grid grid-cols-1 gap-3">
                ${subtasks.map((sub, idx) => {
                  const isChecked = completed.includes(sub.id);
                  const isNextStep = sub.id === nextImmediateSubtaskId;
                  const disabledAttr = s.isExpired ? 'disabled' : '';

                  // Visual contrast rules adhering to WCAG AA:
                  // - Completed: soft warm background (bg-stone-100/80), border-stone-200, text-stone-600 (#57534e on #f5f5f4 has contrast > 5:1, well above WCAG AA 4.5:1 requirement)
                  // - Incomplete: crisp pure white background, distinct border, text-slate-950 font-bold
                  // - Next Immediate Step: unified accent border matching the progress ramp
                  // - Padding: generous vertical padding (py-3.5 sm:py-4) for comfortable touch targets on mobile
                  return `
                    <label class="subtask-row flex items-center justify-between px-4 py-3.5 sm:py-4 rounded-xl border transition-all duration-200 
                                  ${isChecked 
                                    ? 'bg-stone-100/80 border-stone-200/80' 
                                    : (isNextStep 
                                        ? `bg-white ${nextStepBorderClass} shadow-xs` 
                                        : 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-2xs')} 
                                  ${s.isExpired ? 'cursor-not-allowed' : 'cursor-pointer'}">
                      
                      <!-- RTL First: Checkbox followed directly by title with integrated step number -->
                      <div class="flex items-center gap-3.5 flex-1 min-w-0">
                        <div class="relative flex items-center justify-center shrink-0">
                          <input type="checkbox" 
                                 class="subtask-checkbox w-5 h-5 rounded-md border-stone-300 text-blue-900 focus:ring-blue-900/30 cursor-pointer disabled:cursor-not-allowed transition-all" 
                                 data-asg-id="${asg.id}" 
                                 data-sub-id="${sub.id}"
                                 ${isChecked ? 'checked' : ''} 
                                 ${disabledAttr}>
                        </div>

                        <!-- Integrated title with subtle step numbering prefix: single focus line -->
                        <div class="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                          <span class="text-xs font-mono font-semibold ${isChecked ? 'text-stone-500' : 'text-stone-400'} shrink-0">
                            #${idx + 1}
                          </span>

                          <span class="text-xs sm:text-sm ${isChecked ? 'line-through text-stone-600 font-medium' : 'text-slate-950 font-bold'} leading-relaxed">
                            ${Utils.escapeHtml(sub.title)}
                          </span>

                          ${isNextStep ? `
                            <span class="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md shrink-0 mr-auto">
                              <span class="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
                              <span>المهمة التالية المطلوبة</span>
                            </span>
                          ` : ''}
                        </div>
                      </div>
                    </label>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach Collapsible Dropdown toggle listeners with smooth DOM animation
    listEl.querySelectorAll('.toggle-subtasks-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const asgId = btn.dataset.asgId;
        const containerEl = document.getElementById(`subtasks-container-${asgId}`);
        if (!containerEl) return;

        const isCurrentlyOpen = this.expandedAssignmentIds.has(asgId);
        const chevron = btn.querySelector('.chevron-icon');
        const label = btn.querySelector('.toggle-btn-label');
        const hint = btn.querySelector('.toggle-btn-hint');

        if (isCurrentlyOpen) {
          this.expandedAssignmentIds.delete(asgId);
          containerEl.classList.add('hidden');
          if (chevron) chevron.classList.remove('rotate-180', 'text-blue-900');
          if (label) label.textContent = 'عرض المهام الفرعية';
          if (hint) hint.textContent = 'عرض';
        } else {
          this.expandedAssignmentIds.add(asgId);
          containerEl.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180', 'text-blue-900');
          if (label) label.textContent = 'إخفاء المهام الفرعية';
          if (hint) hint.textContent = 'طي';
        }
      });
    });

    // Attach checkbox event listeners
    listEl.querySelectorAll('.subtask-checkbox').forEach(chk => {
      chk.addEventListener('change', async (e) => {
        const asgId = chk.dataset.asgId;
        const subId = chk.dataset.subId;
        try {
          await ProgressService.toggleSubtask(student.id, asgId, subId);
          Utils.showToast('تم تحديث حالة المهمة بنجاح', 'success', 1500);
          await this.refresh(student);
        } catch (err) {
          e.preventDefault();
          chk.checked = !chk.checked;
          Utils.showToast(err.message || 'حدث خطأ في تحديث المهمة', 'error');
        }
      });
    });
  }
};
