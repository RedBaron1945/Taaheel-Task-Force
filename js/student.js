/**
 * Student View Controller for Platform «مرحلة التأهيل»
 * Renders student dashboard, assignment cards, interactive to-do list,
 * instant in-place optimistic recalculations, countdown timers, and celebration states.
 */

import { ProgressService } from './progressService.js';
import { Utils } from './utils.js';

/**
 * Curated motivational sayings, slogans, and poetic verses for students
 * - 'slogan': 3-line format (Dark -> Royal Blue -> Amber/Brown)
 * - 'verse': 2-line poetic couplet (صدر وعجز)
 * Normalization: Cleaned without tatweel/kashida
 */
const MOTIVATIONAL_QUOTES = [
  {
    type: 'slogan',
    lines: [
      { text: 'إذا لم تكن أسدا بالعزم ..', cls: 'text-slate-800 font-bold' },
      { text: 'غزالًا في السبق', cls: 'text-blue-950 font-extrabold my-0.5' },
      { text: 'فلا تتثعلب', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'أنا لها ..', cls: 'text-blue-950 font-extrabold' },
      { text: 'حتى أنالها', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'قوي التوكّل لا يُهزم ،', cls: 'text-slate-800 font-bold' },
      { text: 'و مُلح الدعاء', cls: 'text-blue-950 font-extrabold my-0.5' },
      { text: 'لا يُخذل', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'أما تفاهة السير ..', cls: 'text-blue-950 font-extrabold' },
      { text: 'فليست لك', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'فليس يجني ثمار الفوز يانعة ..', cls: 'text-slate-800 font-bold' },
      { text: 'من جنة العلم', cls: 'text-blue-950 font-extrabold my-0.5' },
      { text: 'إلا صادق الهمم', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'لن تنال الراحة', cls: 'text-blue-950 font-extrabold' },
      { text: 'بالراحة', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'slogan',
    lines: [
      { text: 'إنما النصر', cls: 'text-blue-950 font-extrabold' },
      { text: 'صبر ساعة', cls: 'text-amber-800 font-black' }
    ]
  },
  {
    type: 'verse',
    lines: [
      { text: 'سَنَظلُّ في جبل الرماة وخلفَنا', cls: 'text-slate-900 font-bold' },
      { text: 'صَوتُ النبيّ يهُزنا لا تبرحوا', cls: 'text-amber-800 font-black mt-1' }
    ]
  },
  {
    type: 'verse',
    lines: [
      { text: 'وذا الدِّينُ أَجدِر أنْ يَقُومَ بِهِ فَتًى', cls: 'text-slate-900 font-bold' },
      { text: 'أَمِينٌ لِأَعبَاءِ الأَمَانَةِ حَامِلُ', cls: 'text-amber-800 font-black mt-1' }
    ]
  },
  {
    type: 'verse',
    lines: [
      { text: 'ليست جُهودُ المرءِ تصنعُ مجدهُ', cls: 'text-slate-900 font-bold' },
      { text: 'إن لَم يكُن توفيقُهُ مِن خالِقه', cls: 'text-amber-800 font-black mt-1' }
    ]
  },
  {
    type: 'verse',
    lines: [
      { text: 'أنتَ الرّجاءُ وأنتَ ذُخرُ الأمّةِ', cls: 'text-slate-900 font-bold' },
      { text: 'وَبِكَ الثغورُ سَتَمتَلي في رِفعَةِ', cls: 'text-amber-800 font-black mt-1' }
    ]
  }
];

export const StudentView = {
  expandedAssignmentIds: new Set(), // Track which assignment dropdowns are currently open
  _countdownInterval: null,
  _lastAssignmentHandler: null,
  _quoteInterval: null,
  _currentQuoteIndex: 0,
  _isQuotePaused: false,
  _isQuoteAnimating: false,
  _quoteTouchStartX: 0,

  /**
   * Helper to compute remaining days / hours to assignment deadline
   */
  getRemainingDeadlineInfo(endDateStr) {
    if (!endDateStr) return null;
    const end = new Date(`${endDateStr}T23:59:59`).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) {
      return { isExpired: true, isUrgent: false, label: 'انتهت المهلة المحددة' };
    }

    const oneDayMs = 24 * 60 * 60 * 1000;
    if (diff < oneDayMs) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return {
        isExpired: false,
        isUrgent: true,
        hours,
        minutes,
        seconds,
        formattedTime,
        label: `متبقي ${hours} س و ${minutes} د (${formattedTime})`
      };
    }

    const days = Math.ceil(diff / oneDayMs);
    let daysWord = 'يوم';
    if (days === 1) daysWord = 'يوم واحد';
    else if (days === 2) daysWord = 'يومان';
    else if (days >= 3 && days <= 10) daysWord = `${days} أيام`;
    else daysWord = `${days} يوم`;

    return {
      isExpired: false,
      isUrgent: false,
      days,
      label: `متبقي ${daysWord}`
    };
  },

  /**
   * Render the student view into container
   */
  async render(container, student) {
    if (!container || !student) return;

    if (this._countdownInterval) {
      clearInterval(this._countdownInterval);
      this._countdownInterval = null;
    }
    if (this._quoteInterval) {
      clearInterval(this._quoteInterval);
      this._quoteInterval = null;
    }

    container.innerHTML = `
      <div class="space-y-5">
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
                  <span class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black text-amber-300 bg-amber-500/20 border border-amber-400/50 backdrop-blur-md shadow-xs">
                    <span class="text-amber-200 font-bold">محضن:</span>
                    <span class="text-white font-extrabold tracking-wide">${Utils.escapeHtml(student.mahadName)}</span>
                  </span>
                </div>
              ` : ''}

              <h2 class="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
                <span>مرحبًا، ${Utils.escapeHtml(student.name)}</span>
                <span class="text-amber-400 text-2xl animate-bounce">👋</span>
              </h2>
            </div>

            <!-- Subtle Vertical Line Linking Narrative & Overall Status -->
            <div class="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-amber-400/30 to-transparent mx-1"></div>
            
            <!-- Overall Progress Summary with Dynamic Circular Progress Ring -->
            <div id="student-hero-score" class="flex items-center gap-4 bg-white/10 hover:bg-white/[0.14] transition-all backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-amber-400/40 self-start md:self-auto shrink-0 shadow-lg shadow-black/10">
              <div class="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg class="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" class="text-blue-900/90 stroke-current" stroke-width="4.5" fill="transparent" />
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
                <div class="text-2xl sm:text-3xl font-extrabold text-amber-300 tabular-nums tracking-tight" id="student-hero-pct">—%</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Compact Section Header with Integrated Period & Deadline Badge -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-b border-stone-200 pb-3">
          <div class="flex items-center gap-2.5 flex-wrap">
            <h3 class="text-lg font-bold text-slate-900">خطة التكاليف المقررة</h3>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200/80 tabular-nums" id="student-assignments-count">—</span>
            
            <!-- Compact Integrated Deadline & Period Badge -->
            <div id="student-deadline-pill" class="inline-flex"></div>
          </div>
        </div>

        <!-- Assignments Container -->
        <div id="student-assignments-list" class="space-y-4">
          <div class="text-center py-12 text-slate-400">جارٍ تحميل التكاليف...</div>
        </div>

        <!-- Poetic Wisdom & Motivational Quotes Carousel at the Bottom of the Page -->
        <section id="student-quote-card" class="relative mt-8 mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50/70 via-stone-50 to-amber-50/70 border border-amber-300/40 p-5 sm:p-6 shadow-xs text-center select-none group" role="region" aria-label="مقولة تحفيزية">
          <div class="absolute inset-0 bg-[radial-gradient(#c4973b_1px,transparent_1px)] opacity-10 [background-size:16px_16px] pointer-events-none"></div>
          
          <div class="relative z-10 max-w-xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
            <!-- Previous Quote Button -->
            <button type="button" id="quote-prev-btn" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-amber-800 hover:bg-amber-100/70 active:scale-90 transition-all opacity-40 group-hover:opacity-100 focus:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 cursor-pointer shrink-0" aria-label="العبارة السابقة" title="العبارة السابقة">
              <svg class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <!-- Dynamic Quote Container with Smooth Fade Transition -->
            <div id="quote-content-wrapper" class="flex-1 min-w-0 transition-opacity duration-350 ease-in-out">
              <div class="flex items-center justify-center gap-2 mb-2 opacity-75">
                <span class="w-8 h-px bg-gradient-to-l from-amber-500 to-transparent"></span>
                <span class="text-amber-700 text-xs">✦</span>
                <span class="w-8 h-px bg-gradient-to-r from-amber-500 to-transparent"></span>
              </div>

              <blockquote id="quote-text-container" class="font-serif min-h-[4.75rem] flex flex-col items-center justify-center" style="font-family: var(--font-calligraphy), serif;">
                <!-- Populated dynamically -->
              </blockquote>

              <div class="flex items-center justify-center gap-2 mt-2 opacity-75">
                <span class="w-8 h-px bg-gradient-to-l from-amber-500 to-transparent"></span>
                <span class="text-amber-700 text-xs">✦</span>
                <span class="w-8 h-px bg-gradient-to-r from-amber-500 to-transparent"></span>
              </div>
            </div>

            <!-- Next Quote Button -->
            <button type="button" id="quote-next-btn" class="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-stone-400 hover:text-amber-800 hover:bg-amber-100/70 active:scale-90 transition-all opacity-40 group-hover:opacity-100 focus:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40 cursor-pointer shrink-0" aria-label="العبارة التالية" title="العبارة التالية">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <!-- Pagination Indicator Dots -->
          <div id="quote-dots-container" class="relative z-10 flex items-center justify-center gap-1.5 mt-3 pt-1" role="tablist" aria-label="مؤشرات العبارات">
            <!-- Populated dynamically -->
          </div>
        </section>
      </div>
    `;

    await this.refresh(student);
    this.initQuoteCarousel();
  },

  /**
   * Refresh stats and assignment cards
   */
  async refresh(student) {
    const stats = await ProgressService.getStudentOverallStats(student.id);

    // Update Hero with percentage and dynamic SVG Circular Progress Ring
    const heroPct = document.getElementById('student-hero-pct');
    const heroRing = document.getElementById('student-hero-ring');
    if (heroPct) heroPct.textContent = `${stats.overallPercentage}%`;
    if (heroRing) {
      const circumference = 138.2;
      const offset = circumference - (stats.overallPercentage / 100) * circumference;
      heroRing.style.strokeDashoffset = `${offset}`;
    }

    // Render assignments list
    this.renderAssignments(student, stats);
  },

  /**
   * Render assignment cards in a unified streamlined layout
   */
  async renderAssignments(student, preloadedStats = null) {
    const listEl = document.getElementById('student-assignments-list');
    const countEl = document.getElementById('student-assignments-count');
    const deadlinePillEl = document.getElementById('student-deadline-pill');
    if (!listEl) return;

    const stats = preloadedStats || await ProgressService.getStudentOverallStats(student.id);
    let items = [...stats.assignmentDetails];

    // Preserve original index & sort: incomplete first, completed at bottom
    const itemsWithIndex = items.map((item, originalIndex) => ({
      ...item,
      originalIndex
    }));

    itemsWithIndex.sort((a, b) => {
      const aDone = a.stats.isCompleted || a.stats.percentage >= 100;
      const bDone = b.stats.isCompleted || b.stats.percentage >= 100;
      if (!aDone && bDone) return -1;
      if (aDone && !bDone) return 1;
      return a.originalIndex - b.originalIndex;
    });

    items = itemsWithIndex;

    if (countEl) {
      countEl.textContent = `${items.length} تكليفات`;
    }

    // Unified Period & Countdown Compact Header Badge
    const allAsgs = items.map(d => d.assignment);
    const startDates = allAsgs.map(a => a.startDate).filter(Boolean).sort();
    const endDates = allAsgs.map(a => a.endDate).filter(Boolean).sort();
    const latestEndDate = endDates.length > 0 ? endDates[endDates.length - 1] : null;
    const firstStartDate = startDates.length > 0 ? startDates[0] : null;

    const updateDeadlinePill = () => {
      if (!deadlinePillEl || !latestEndDate) return;
      const deadlineInfo = this.getRemainingDeadlineInfo(latestEndDate);
      if (!deadlineInfo) return;

      const periodText = firstStartDate ? `${Utils.formatShortDate(firstStartDate)} – ${Utils.formatShortDate(latestEndDate)}` : '';

      if (deadlineInfo.isExpired) {
        deadlinePillEl.innerHTML = `
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-stone-100 text-stone-600 font-bold text-xs border border-stone-200 shadow-2xs tabular-nums">
            <span class="w-2 h-2 rounded-full bg-stone-400"></span>
            <span>${deadlineInfo.label}</span>
          </span>
        `;
      } else if (deadlineInfo.isUrgent) {
        // Less than 24 hours: Animated high-contrast 24h countdown
        deadlinePillEl.innerHTML = `
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 text-amber-950 border border-amber-300 shadow-2xs animate-pulse tabular-nums">
            <span class="w-2 h-2 rounded-full bg-amber-500"></span>
            ${periodText ? `<span class="text-stone-500 text-[11px] hidden md:inline font-normal">${periodText} ·</span>` : ''}
            <span class="text-xs font-black tracking-wide">${deadlineInfo.label}</span>
          </div>
        `;
      } else {
        // Standard remaining days with period
        deadlinePillEl.innerHTML = `
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-50 text-amber-950 border border-amber-200/90 shadow-2xs tabular-nums">
            <svg class="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            ${periodText ? `<span class="text-amber-900 text-xs font-semibold hidden md:inline">${periodText}</span><span class="text-amber-300 hidden md:inline">·</span>` : ''}
            <span class="text-xs font-black text-slate-900">${deadlineInfo.label}</span>
          </div>
        `;
      }
    };

    updateDeadlinePill();

    // Set up live ticking timer if deadline is within 24 hours
    if (this._countdownInterval) clearInterval(this._countdownInterval);
    if (latestEndDate) {
      const deadlineInfo = this.getRemainingDeadlineInfo(latestEndDate);
      if (deadlineInfo && deadlineInfo.isUrgent) {
        this._countdownInterval = setInterval(() => {
          updateDeadlinePill();
        }, 1000);
      }
    }

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          </div>
          <h4 class="text-base font-semibold text-slate-800 mb-1">لا توجد تكاليف مقررة حالياً</h4>
          <p class="text-xs text-slate-500">سيتم إدراج التكاليف الجديدة فور اعتمادها من قِبل الإدارة.</p>
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

      // External resource button positioned as a clear secondary action
      let sourceBtn = '';
      if (asg.sourceUrl) {
        sourceBtn = `
          <div class="pt-2">
            <a href="${Utils.escapeHtml(asg.sourceUrl)}" target="_blank" rel="noopener noreferrer" 
               class="inline-flex items-center gap-2 min-h-[44px] sm:min-h-[40px] px-3.5 py-2 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 active:scale-[0.98] rounded-xl transition-all border border-blue-200 hover:border-blue-300 shadow-2xs group cursor-pointer"
               title="فتح المصادر المرفقة في علامة تبويب جديدة">
              <span>فتح مصادر ومقررات التكليف</span>
              <svg class="w-4 h-4 text-blue-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        `;
      }

      const statusBadge = isDone
        ? `<span class="card-status-badge inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 shadow-2xs shrink-0">
            <span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
            <span>مكتمل بالكامل</span>
           </span>`
        : (s.isExpired
          ? `<span class="card-status-badge inline-flex items-center text-xs font-semibold text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200 shrink-0">
              منتهي الصلاحية
             </span>`
          : `<span class="card-status-badge inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200/90 shrink-0">
              <span class="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span>
              <span>قيد الإنجاز</span>
             </span>`);

      // Progress bar color: Green for done, Blue for in-progress
      const progressColor = isDone ? 'bg-emerald-600' : 'bg-blue-700';

      // Check if this assignment card's subtasks dropdown is open
      const isExpanded = this.expandedAssignmentIds.has(asg.id);

      return `
        <article class="assignment-card card rounded-2xl border transition-all duration-300 overflow-hidden ${
          isDone 
            ? 'border-emerald-200/80 bg-stone-50/50 shadow-2xs' 
            : (s.isExpired 
                ? 'border-stone-200 bg-stone-50/70' 
                : 'border-stone-200/90 bg-white shadow-xs hover:border-blue-300 hover:shadow-md')
        }" data-asg-id="${asg.id}">
          
          <div class="p-5 sm:p-6 space-y-4">
            
            <!-- Streamlined Header: Title + Status + Clean Step Count (No Redundancy) -->
            <div class="space-y-2.5">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2 flex-wrap">
                  ${statusBadge}
                  <h4 class="card-asg-title text-base sm:text-lg font-black tracking-tight ${isDone ? 'text-slate-800 line-through decoration-emerald-500/50' : 'text-slate-950'}">
                    ${Utils.escapeHtml(asg.title)}
                  </h4>
                </div>

                <!-- Single Clean Progress Step Counter with Native Typography -->
                <div class="text-xs font-bold text-slate-700 tabular-nums shrink-0">
                  <span class="card-step-counter ${isDone ? 'text-emerald-700' : 'text-blue-900'} font-extrabold">${s.completedCount} من ${s.totalSubtasks} خطوات</span>
                </div>
              </div>

              <!-- Thin Unified Progress Bar Directly Under Header -->
              <div class="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div class="card-progress-bar h-full rounded-full transition-all duration-500 ease-out ${progressColor}"
                     style="width: ${s.percentage}%"></div>
              </div>

              ${asg.description ? `
                <p class="text-xs sm:text-sm text-stone-600 leading-relaxed font-normal pt-1">
                  ${Utils.escapeHtml(asg.description)}
                </p>
              ` : ''}

              ${sourceBtn}
            </div>

            <!-- Single Clean Toggle Button with Rotating Chevron -->
            <button type="button" 
                    class="toggle-subtasks-btn w-full min-h-[48px] flex items-center justify-between px-4 py-2.5 rounded-xl bg-stone-50 hover:bg-stone-100/80 active:bg-stone-200/70 border border-stone-200/80 transition-all font-bold text-xs sm:text-sm text-slate-800 focus:outline-hidden group cursor-pointer"
                    data-asg-id="${asg.id}">
              <div class="flex items-center gap-2.5">
                <svg class="chevron-icon w-4 h-4 text-stone-500 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180 text-blue-900' : 'group-hover:text-slate-800'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 9l-7 7-7-7" />
                </svg>
                <span class="toggle-btn-label">${isExpanded ? 'إخفاء خطوات التكليف' : 'عرض خطوات التكليف'}</span>
              </div>
            </button>
          </div>

          <!-- Seamless Subtasks List with Thin Dividers and Zero Nested Border Clutter -->
          <div id="subtasks-container-${asg.id}" class="border-t border-stone-200/80 bg-stone-50/40 p-4 sm:p-6 transition-all duration-300 ${isExpanded ? '' : 'hidden'}">
            
            <!-- Friendly, Clear Tip -->
            <div class="flex items-center justify-between pb-3 text-xs text-stone-600 font-medium border-b border-stone-200/60 mb-2">
              <span>انقر على المربع لتسجيل إنجاز كل خطوة:</span>
              <span class="tip-step-counter text-[11px] text-stone-500 tabular-nums">${s.completedCount} / ${s.totalSubtasks}</span>
            </div>

            <!-- Unified List Divided by Subtle Hairlines -->
            <div class="divide-y divide-stone-200/70 bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
              ${subtasks.map((sub, idx) => {
                const isChecked = completed.includes(sub.id);
                const isNextStep = sub.id === nextImmediateSubtaskId;
                const disabledAttr = s.isExpired ? 'disabled' : '';

                // Step status styling: Green for done, Blue for current active next step, Stone for upcoming
                let rowBgClass = 'hover:bg-stone-50/80';
                if (isChecked) {
                  rowBgClass = 'bg-stone-50/60';
                } else if (isNextStep) {
                  rowBgClass = 'bg-blue-50/40 ring-1 ring-inset ring-blue-400/50';
                }

                return `
                  <label class="subtask-row flex items-center justify-between p-4 sm:p-4.5 transition-all duration-200 ${rowBgClass} ${s.isExpired ? 'cursor-not-allowed' : 'cursor-pointer'}">
                    
                    <div class="flex items-center gap-3.5 flex-1 min-w-0">
                      
                      <!-- Large 28-32px Checkbox with 48px Touch Target & Smooth SVG Feedback -->
                      <div class="relative flex items-center justify-center shrink-0 w-8 h-8">
                        <input type="checkbox" 
                               class="subtask-checkbox peer sr-only" 
                               data-asg-id="${asg.id}" 
                               data-sub-id="${sub.id}"
                               ${isChecked ? 'checked' : ''} 
                               ${disabledAttr}>
                        
                        <!-- Custom Tactile Checkbox Box: 28px min size -->
                        <div class="custom-check-box w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center shadow-2xs 
                                    ${isChecked 
                                      ? 'bg-emerald-600 border-emerald-600 text-white scale-105 shadow-sm shadow-emerald-600/20' 
                                      : (isNextStep 
                                          ? 'border-blue-600 bg-white hover:border-blue-700 hover:bg-blue-50/50' 
                                          : 'border-stone-300 bg-white hover:border-stone-400')}">
                          <svg class="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 ${isChecked ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>

                      <!-- Step Number Circle: Clean sequence indicator with native Arabic font -->
                      <div data-step-index="${idx + 1}" class="step-number-circle w-6 h-6 rounded-full flex items-center justify-center tabular-nums font-bold text-xs shrink-0 transition-colors ${
                        isChecked 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : (isNextStep 
                              ? 'bg-blue-100 text-blue-900 border border-blue-300' 
                              : 'bg-stone-100 text-stone-500')
                      }">
                        ${isChecked ? '✓' : (idx + 1)}
                      </div>

                      <!-- Step Title Text -->
                      <span class="step-title-text text-xs sm:text-sm ${isChecked ? 'line-through text-stone-500 font-medium' : (isNextStep ? 'text-blue-950 font-bold' : 'text-slate-900 font-medium')} leading-relaxed flex-1 min-w-0">
                        ${Utils.escapeHtml(sub.title)}
                      </span>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>

            <!-- Serene Celebration Card When 100% Completed -->
            <div class="card-celebration ${isDone ? '' : 'hidden'} mt-4 p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 flex items-center gap-3.5 text-emerald-950 shadow-2xs transition-all duration-300">
              <div class="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                ✓
              </div>
              <div class="space-y-0.5">
                <div class="text-sm font-black text-emerald-900">هنيئاً لك إتمام هذا التكليف بالكامل! 🎉</div>
                <div class="text-xs text-emerald-800/90 font-medium leading-relaxed">
                  بارك الله في همتك وعلمك ونفع بك ورزقك الإخلاص والقبول.
                </div>
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

        if (isCurrentlyOpen) {
          this.expandedAssignmentIds.delete(asgId);
          containerEl.classList.add('hidden');
          if (chevron) chevron.classList.remove('rotate-180', 'text-blue-900');
          if (label) label.textContent = 'عرض خطوات التكليف';
        } else {
          this.expandedAssignmentIds.add(asgId);
          containerEl.classList.remove('hidden');
          if (chevron) chevron.classList.add('rotate-180', 'text-blue-900');
          if (label) label.textContent = 'إخفاء خطوات التكليف';
        }
      });
    });

    // Attach checkbox event listeners with INSTANT OPTIMISTIC IN-PLACE UI UPDATES
    listEl.querySelectorAll('.subtask-checkbox').forEach(chk => {
      chk.addEventListener('change', async () => {
        const asgId = chk.dataset.asgId;
        const subId = chk.dataset.subId;
        const isChecked = chk.checked;
        const rowLabel = chk.closest('.subtask-row');
        const card = chk.closest('.assignment-card');

        // 1. Instant in-place Row DOM Update (0ms)
        if (rowLabel) {
          const customBox = rowLabel.querySelector('.custom-check-box');
          const checkSvg = customBox ? customBox.querySelector('svg') : null;
          const circle = rowLabel.querySelector('.step-number-circle');
          const titleSpan = rowLabel.querySelector('.step-title-text');

          if (isChecked) {
            rowLabel.classList.add('bg-stone-50/60');
            rowLabel.classList.remove('bg-blue-50/40', 'ring-1', 'ring-inset', 'ring-blue-400/50');
            if (customBox) {
              customBox.className = 'custom-check-box w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center shadow-2xs bg-emerald-600 border-emerald-600 text-white scale-105 shadow-sm shadow-emerald-600/20';
            }
            if (checkSvg) {
              checkSvg.classList.remove('scale-50', 'opacity-0');
              checkSvg.classList.add('scale-100', 'opacity-100');
            }
            if (circle) {
              circle.className = 'step-number-circle w-6 h-6 rounded-full flex items-center justify-center tabular-nums font-bold text-xs shrink-0 transition-colors bg-emerald-100 text-emerald-800';
              circle.textContent = '✓';
            }
            if (titleSpan) {
              titleSpan.classList.add('line-through', 'text-stone-500');
              titleSpan.classList.remove('text-slate-900', 'text-blue-950', 'font-bold');
            }
          } else {
            rowLabel.classList.remove('bg-stone-50/60');
            if (customBox) {
              customBox.className = 'custom-check-box w-7 h-7 sm:w-8 sm:h-8 rounded-lg border-2 transition-all duration-200 flex items-center justify-center shadow-2xs border-stone-300 bg-white hover:border-stone-400';
            }
            if (checkSvg) {
              checkSvg.classList.remove('scale-100', 'opacity-100');
              checkSvg.classList.add('scale-50', 'opacity-0');
            }
            if (circle) {
              circle.className = 'step-number-circle w-6 h-6 rounded-full flex items-center justify-center tabular-nums font-bold text-xs shrink-0 transition-colors bg-stone-100 text-stone-500';
              circle.textContent = circle.dataset.stepIndex || '1';
            }
            if (titleSpan) {
              titleSpan.classList.remove('line-through', 'text-stone-500');
              titleSpan.classList.add('text-slate-900', 'font-medium');
            }
          }
        }

        // 2. Instant in-place Card Progress Calculation (0ms)
        if (card) {
          const allCardCheckboxes = card.querySelectorAll('.subtask-checkbox');
          const checkedCardCheckboxes = card.querySelectorAll('.subtask-checkbox:checked');
          const totalSub = allCardCheckboxes.length;
          const doneSub = checkedCardCheckboxes.length;
          const percentage = totalSub > 0 ? Math.round((doneSub / totalSub) * 100) : 0;
          const isAllDone = totalSub > 0 && doneSub === totalSub;

          const counterText = card.querySelector('.card-step-counter');
          if (counterText) {
            counterText.textContent = `${doneSub} من ${totalSub} خطوات`;
            counterText.className = `card-step-counter ${isAllDone ? 'text-emerald-700' : 'text-blue-900'} font-extrabold`;
          }

          const tipCounter = card.querySelector('.tip-step-counter');
          if (tipCounter) tipCounter.textContent = `${doneSub} / ${totalSub}`;

          const bar = card.querySelector('.card-progress-bar');
          if (bar) {
            bar.style.width = `${percentage}%`;
            bar.className = `card-progress-bar h-full rounded-full transition-all duration-500 ease-out ${isAllDone ? 'bg-emerald-600' : 'bg-blue-700'}`;
          }

          const badgeWrapper = card.querySelector('.card-status-badge');
          if (badgeWrapper) {
            badgeWrapper.innerHTML = isAllDone
              ? `<span class="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span><span>مكتمل بالكامل</span>`
              : `<span class="w-2 h-2 rounded-full bg-amber-500 inline-block animate-pulse"></span><span>قيد الإنجاز</span>`;
            badgeWrapper.className = `card-status-badge inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border shadow-2xs shrink-0 ${isAllDone ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 'text-amber-800 bg-amber-50 border-amber-200/90'}`;
          }

          const cardTitle = card.querySelector('.card-asg-title');
          if (cardTitle) {
            if (isAllDone) {
              cardTitle.classList.add('line-through', 'decoration-emerald-500/50');
            } else {
              cardTitle.classList.remove('line-through', 'decoration-emerald-500/50');
            }
          }

          const celebCard = card.querySelector('.card-celebration');
          if (celebCard) {
            if (isAllDone) {
              celebCard.classList.remove('hidden');
            } else {
              celebCard.classList.add('hidden');
            }
          }
        }

        // 3. Instant in-place Overall Hero Progress Ring Update (0ms)
        const allCheckboxes = listEl.querySelectorAll('.subtask-checkbox');
        const allChecked = listEl.querySelectorAll('.subtask-checkbox:checked');
        const totalAll = allCheckboxes.length;
        const doneAll = allChecked.length;
        const overallPct = totalAll > 0 ? Math.round((doneAll / totalAll) * 100) : 0;

        const heroPct = document.getElementById('student-hero-pct');
        const heroRing = document.getElementById('student-hero-ring');
        if (heroPct) heroPct.textContent = `${overallPct}%`;
        if (heroRing) {
          const circumference = 138.2;
          const offset = circumference - (overallPct / 100) * circumference;
          heroRing.style.strokeDashoffset = `${offset}`;
        }

        // 4. Background Persistence with Silent Reliability
        try {
          await ProgressService.toggleSubtask(student.id, asgId, subId);
        } catch (err) {
          // Revert visual state on error
          chk.checked = !isChecked;
          Utils.showToast(err.message || 'حدث خطأ في حفظ الإنجاز', 'error');
        }
      });
    });
  },

  /**
   * Initialize motivational quotes carousel with rotation, swipe, and controls
   */
  initQuoteCarousel() {
    const card = document.getElementById('student-quote-card');
    const prevBtn = document.getElementById('quote-prev-btn');
    const nextBtn = document.getElementById('quote-next-btn');
    const textContainer = document.getElementById('quote-text-container');
    const dotsContainer = document.getElementById('quote-dots-container');
    if (!card || !textContainer) return;

    // Pick an initial quote different from the previous visit/login
    const total = MOTIVATIONAL_QUOTES.length;
    const lastStored = localStorage.getItem('taheel_last_quote_index');
    let chosenIndex = 0;
    if (lastStored !== null) {
      const last = parseInt(lastStored, 10);
      let candidate = Math.floor(Math.random() * total);
      if (candidate === last) {
        candidate = (candidate + 1) % total;
      }
      chosenIndex = candidate;
    } else {
      chosenIndex = Math.floor(Math.random() * total);
    }
    localStorage.setItem('taheel_last_quote_index', String(chosenIndex));
    this._currentQuoteIndex = chosenIndex;

    // Render initial content and dots
    this.renderQuoteContent(chosenIndex);
    this.renderQuoteDots(chosenIndex);

    // Navigation buttons
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.prevQuote();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.nextQuote();
      });
    }

    // Dots delegation
    if (dotsContainer) {
      dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.quote-dot');
        if (dot && dot.dataset.index !== undefined) {
          e.stopPropagation();
          const targetIdx = parseInt(dot.dataset.index, 10);
          if (targetIdx !== this._currentQuoteIndex) {
            this.goToQuote(targetIdx);
          }
        }
      });
    }

    // Pause on hover or focus
    card.addEventListener('mouseenter', () => { this._isQuotePaused = true; });
    card.addEventListener('mouseleave', () => { this._isQuotePaused = false; });
    card.addEventListener('focusin', () => { this._isQuotePaused = true; });
    card.addEventListener('focusout', () => { this._isQuotePaused = false; });

    // Touch swipe support on mobile devices
    card.addEventListener('touchstart', (e) => {
      this._isQuotePaused = true;
      if (e.touches && e.touches[0]) {
        this._quoteTouchStartX = e.touches[0].clientX;
      }
    }, { passive: true });

    card.addEventListener('touchend', (e) => {
      this._isQuotePaused = false;
      if (e.changedTouches && e.changedTouches[0]) {
        const deltaX = e.changedTouches[0].clientX - this._quoteTouchStartX;
        if (Math.abs(deltaX) > 40) {
          // RTL layout: swipe left goes to next quote, swipe right goes to previous
          if (deltaX < 0) {
            this.nextQuote();
          } else {
            this.prevQuote();
          }
        }
      }
    }, { passive: true });

    // Auto-rotation every 45 seconds if user does NOT prefer reduced motion
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      if (this._quoteInterval) clearInterval(this._quoteInterval);
      this._quoteInterval = setInterval(() => {
        if (!this._isQuotePaused) {
          this.nextQuote();
        }
      }, 45000);
    }
  },

  /**
   * Render quote content formatted appropriately for slogans (3 lines) or verses (2 lines)
   */
  renderQuoteContent(index) {
    const textContainer = document.getElementById('quote-text-container');
    if (!textContainer) return;
    const q = MOTIVATIONAL_QUOTES[index];
    if (!q) return;

    if (q.type === 'verse') {
      textContainer.className = 'font-serif text-sm sm:text-base md:text-lg font-bold leading-relaxed min-h-[4.75rem] flex flex-col items-center justify-center space-y-1';
      textContainer.innerHTML = q.lines.map(line => `
        <span class="block ${line.cls}">${Utils.escapeHtml(line.text)}</span>
      `).join('');
    } else {
      textContainer.className = 'font-serif text-base sm:text-lg md:text-xl font-bold leading-relaxed min-h-[4.75rem] flex flex-col items-center justify-center';
      textContainer.innerHTML = q.lines.map(line => `
        <span class="block ${line.cls}">${Utils.escapeHtml(line.text)}</span>
      `).join('');
    }
  },

  /**
   * Render pagination dots
   */
  renderQuoteDots(activeIndex) {
    const dotsContainer = document.getElementById('quote-dots-container');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = MOTIVATIONAL_QUOTES.map((_, i) => `
      <button type="button" class="quote-dot transition-all duration-300 rounded-full h-1.5 cursor-pointer ${
        i === activeIndex 
          ? 'w-5 bg-amber-700 shadow-2xs' 
          : 'w-1.5 bg-stone-300 hover:bg-amber-400'
      }" data-index="${i}" aria-label="العبارة ${i + 1}" role="tab" aria-selected="${i === activeIndex}">
      </button>
    `).join('');
  },

  /**
   * Update active status on existing dots
   */
  updateQuoteDots(activeIndex) {
    const dotsContainer = document.getElementById('quote-dots-container');
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.quote-dot');
    dots.forEach((dot, i) => {
      const isActive = i === activeIndex;
      dot.className = `quote-dot transition-all duration-300 rounded-full h-1.5 cursor-pointer ${
        isActive ? 'w-5 bg-amber-700 shadow-2xs' : 'w-1.5 bg-stone-300 hover:bg-amber-400'
      }`;
      dot.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  },

  /**
   * Transition to a specific quote with smooth fade effect
   */
  goToQuote(newIndex) {
    if (this._isQuoteAnimating) return;
    const wrapper = document.getElementById('quote-content-wrapper');
    if (!wrapper) {
      this._currentQuoteIndex = newIndex;
      this.renderQuoteContent(newIndex);
      this.updateQuoteDots(newIndex);
      return;
    }

    this._isQuoteAnimating = true;
    wrapper.style.opacity = '0';

    setTimeout(() => {
      this._currentQuoteIndex = newIndex;
      this.renderQuoteContent(newIndex);
      this.updateQuoteDots(newIndex);
      localStorage.setItem('taheel_last_quote_index', String(newIndex));
      wrapper.style.opacity = '1';
      setTimeout(() => {
        this._isQuoteAnimating = false;
      }, 350);
    }, 220);
  },

  /**
   * Advance to next quote
   */
  nextQuote() {
    const nextIdx = (this._currentQuoteIndex + 1) % MOTIVATIONAL_QUOTES.length;
    this.goToQuote(nextIdx);
  },

  /**
   * Go back to previous quote
   */
  prevQuote() {
    const total = MOTIVATIONAL_QUOTES.length;
    const prevIdx = (this._currentQuoteIndex - 1 + total) % total;
    this.goToQuote(prevIdx);
  }
};
