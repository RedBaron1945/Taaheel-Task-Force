/**
 * Supervisor View Controller for Platform «مرحلة التأهيل»
 * Renders Supervisor Dashboard:
 * - Overall KPIs (students, average completion, attendance, absences, active/expired assignments)
 * - All students performance table & cards
 * - Student detail modal (breakdown of subtasks + attendance + absence dates)
 * - Most absent students list
 * - Low-progress students list (with customizable threshold)
 * - General student rankings leaderboard
 * - Full assignment CRUD manager (add, edit, delete, toggle active, subtask point distribution)
 */

import { Storage } from './storage.js';
import { UserService } from './userService.js';
import { AssignmentService } from './assignmentService.js';
import { ProgressService } from './progressService.js';
import { AttendanceService } from './attendanceService.js';
import { Utils } from './utils.js';

export const SupervisorView = {
  activeTab: 'leaderboard', // 'leaderboard' | 'mahaden_comparison' | 'follow_up' | 'manage_assignments'
  selectedMahadFilter: 'all', // 'all' or mahadId
  followUpSubFilter: 'all', // 'all' | 'absent' | 'low_progress'
  lowProgressThreshold: 20, // default 20%
  leaderboardSearchQuery: '',
  leaderboardSortColumn: 'points', // 'rank' | 'name' | 'mahad' | 'points' | 'progress' | 'attendance'
  leaderboardSortDirection: 'desc', // 'desc' | 'asc'
  editingAssignmentId: null,

  /**
   * Return distinct color badge classes for each Mahad
   */
  getMahadBadgeHtml(mahadId, mahadName) {
    if (!mahadName || mahadName === '—') {
      return '<span class="text-stone-300 font-normal">—</span>';
    }

    const name = String(mahadName).trim();
    let colorClass = 'bg-stone-50 text-stone-700 border-stone-200';

    if (name.includes('الأجاويد')) {
      colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-300/80';
    } else if (name.includes('الرغامة') && name.includes('تأسيس')) {
      colorClass = 'bg-indigo-50 text-indigo-900 border-indigo-300/80';
    } else if (name.includes('الرغامة') && name.includes('تكوين')) {
      colorClass = 'bg-teal-50 text-teal-900 border-teal-300/80';
    } else if (name.includes('النسيم') && name.includes('تأسيس')) {
      colorClass = 'bg-blue-50 text-blue-900 border-blue-300/80';
    } else if (name.includes('النسيم') && name.includes('تكوين')) {
      colorClass = 'bg-amber-50 text-amber-950 border-amber-300/80';
    } else if (name.includes('التيسير') && name.includes('تأسيس')) {
      colorClass = 'bg-cyan-50 text-cyan-950 border-cyan-300/80';
    } else if (name.includes('التيسير') && name.includes('تكوين')) {
      colorClass = 'bg-purple-50 text-purple-950 border-purple-300/80';
    } else if (name.includes('الفرقان')) {
      colorClass = 'bg-emerald-50 text-emerald-900 border-emerald-300/80';
    } else if (name.includes('نافع')) {
      colorClass = 'bg-blue-50 text-blue-900 border-blue-300/80';
    } else if (name.includes('الشاطبي')) {
      colorClass = 'bg-amber-50 text-amber-950 border-amber-300/80';
    }

    return `<span class="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${colorClass}">${Utils.escapeHtml(name)}</span>`;
  },

  /**
   * Render Supervisor interface into container
   */
  async render(container) {
    if (!container) return;

    const mahaden = await UserService.getMahaden();

    container.innerHTML = `
      <div class="space-y-6">
        <!-- Supervisor Top Header Banner -->
        <section class="card bg-gradient-to-l from-slate-950 via-slate-900 to-blue-950 text-white p-6 rounded-2xl shadow-md border border-amber-500/30 relative overflow-hidden">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                لوحة المتابعة العامة والإحصائيات
              </h2>
            </div>
            
            <div class="flex items-center gap-2 shrink-0">
              <button id="sup-btn-new-asg" type="button" class="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-600 rounded-xl transition-all shadow-sm flex items-center gap-2 border border-amber-400/40 cursor-pointer">
                <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                <span>+ إضافة تكليف جديد</span>
              </button>
            </div>
          </div>
        </section>

        <!-- Top Overall KPI Statistics -->
        <section class="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4" id="sup-kpi-grid">
          <div class="card p-4 rounded-xl border border-stone-200 bg-white">
            <div class="text-xs text-stone-500 mb-1">عدد المحاضن</div>
            <div class="text-2xl font-bold text-blue-900 tabular-nums" id="kpi-mahaden">${mahaden.length}</div>
            <div class="text-[11px] text-stone-400 mt-0.5">محاضن نشطة</div>
          </div>

          <div class="card p-4 rounded-xl border border-stone-200 bg-white">
            <div class="text-xs text-stone-500 mb-1">عدد الطلاب</div>
            <div class="text-2xl font-bold text-slate-900 tabular-nums" id="kpi-students">—</div>
            <div class="text-[11px] text-stone-400 mt-0.5">طالب مسجل</div>
          </div>

          <div class="card p-4 rounded-xl border border-stone-200 bg-white" id="kpi-card-progress">
            <div class="text-xs text-stone-500 mb-1">متوسط الإنجاز</div>
            <div class="text-2xl font-bold tabular-nums text-slate-900" id="kpi-avg-progress">—%</div>
            <div class="text-[11px] mt-0.5" id="kpi-avg-progress-sub"><span class="text-stone-400">معدل الدفعة ككل</span></div>
          </div>

          <div class="card p-4 rounded-xl border border-stone-200 bg-white" id="kpi-card-attendance">
            <div class="text-xs text-stone-500 mb-1">نسبة الحضور</div>
            <div class="text-2xl font-bold tabular-nums text-slate-900" id="kpi-attendance">—%</div>
            <div class="text-[11px] mt-0.5" id="kpi-attendance-sub"><span class="text-stone-400">حضور الأحد والثلاثاء</span></div>
          </div>

          <div class="card p-4 rounded-xl border border-stone-200 bg-white" id="kpi-card-absences">
            <div class="text-xs text-stone-500 mb-1">إجمالي الغياب</div>
            <div class="text-2xl font-bold tabular-nums text-slate-900" id="kpi-absences">—</div>
            <div class="text-[11px] text-stone-400 mt-0.5" id="kpi-absences-sub">أيام الغياب الكلية</div>
          </div>

          <div class="card p-4 rounded-xl border border-stone-200 bg-white" id="kpi-card-active-asg">
            <div class="text-xs text-stone-500 mb-1">التكاليف المقررة</div>
            <div class="text-2xl font-bold tabular-nums text-slate-900" id="kpi-active-asg">—</div>
            <div class="text-[11px] text-stone-400 mt-0.5" id="kpi-active-asg-sub">تكليفات نشطة</div>
          </div>
        </section>

        <!-- Navigation Tabs Bar for Supervisor (Grouped logically with distinct Action tab) -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-2 bg-stone-100/90 rounded-2xl border border-stone-200/80 overflow-x-auto shadow-2xs" id="sup-nav-tabs">
          <!-- Main Display Tabs: Ranking, Mahaden Comparison, Follow-up (Merged) -->
          <div class="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button data-tab="leaderboard" class="sup-nav-tab group px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${this.activeTab === 'leaderboard' ? 'active-tab bg-white text-blue-950 shadow-2xs' : 'text-stone-600 hover:text-slate-900 hover:bg-white/60'} whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
              <svg class="tab-icon w-4 h-4 ${this.activeTab === 'leaderboard' ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
              <span>الترتيب العام</span>
            </button>

            <button data-tab="mahaden_comparison" class="sup-nav-tab group px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${this.activeTab === 'mahaden_comparison' ? 'active-tab bg-white text-blue-950 shadow-2xs' : 'text-stone-600 hover:text-slate-900 hover:bg-white/60'} whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
              <svg class="tab-icon w-4 h-4 ${this.activeTab === 'mahaden_comparison' ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <span>مقارنة المحاضن (7)</span>
            </button>

            <button data-tab="follow_up" class="sup-nav-tab group px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${this.activeTab === 'follow_up' ? 'active-tab bg-white text-amber-950 shadow-2xs' : 'text-stone-600 hover:text-slate-900 hover:bg-white/60'} whitespace-nowrap flex items-center gap-1.5 cursor-pointer">
              <svg class="tab-icon w-4 h-4 ${this.activeTab === 'follow_up' ? 'text-amber-600' : 'text-stone-400 group-hover:text-stone-600'} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              <span>يحتاج متابعة</span>
              <span id="sup-follow-up-badge" class="text-[11px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300"></span>
            </button>
          </div>

          <!-- Dedicated Isolated Action Tab: Assignment Management (إجراء لا مجرد عرض) -->
          <div class="flex items-center gap-2 shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-stone-200">
            <button data-tab="manage_assignments" class="sup-nav-tab group px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${this.activeTab === 'manage_assignments' ? 'active-tab bg-blue-900 text-white shadow-xs' : 'bg-white hover:bg-blue-50 text-blue-950 border border-blue-200/90 shadow-2xs'} whitespace-nowrap flex items-center gap-2 cursor-pointer">
              <svg class="tab-icon w-4 h-4 ${this.activeTab === 'manage_assignments' ? 'text-amber-300' : 'text-blue-700 group-hover:text-blue-900'} transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>
              <span>إدارة التكاليف المقررة</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Content Body -->
        <div id="sup-content-body" class="min-h-[300px]">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;

    // Hook tab switches with unified icon highlighting
    const tabs = container.querySelectorAll('#sup-nav-tabs .sup-nav-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => {
          t.classList.remove('active-tab', 'bg-white', 'bg-blue-900', 'text-blue-950', 'text-white', 'text-amber-950', 'shadow-2xs', 'shadow-xs');
          if (t.dataset.tab === 'manage_assignments') {
            t.classList.add('bg-white', 'hover:bg-blue-50', 'text-blue-950', 'border', 'border-blue-200/90', 'shadow-2xs');
          } else {
            t.classList.add('text-stone-600', 'hover:text-slate-900', 'hover:bg-white/60');
          }
          const icon = t.querySelector('.tab-icon');
          if (icon) {
            icon.setAttribute('class', t.dataset.tab === 'manage_assignments' ? 'tab-icon w-4 h-4 text-blue-700 group-hover:text-blue-900 transition-colors' : 'tab-icon w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors');
          }
        });

        if (tab.dataset.tab === 'manage_assignments') {
          tab.classList.add('active-tab', 'bg-blue-900', 'text-white', 'shadow-xs');
          tab.classList.remove('bg-white', 'text-blue-950');
          const activeIcon = tab.querySelector('.tab-icon');
          if (activeIcon) activeIcon.setAttribute('class', 'tab-icon w-4 h-4 text-amber-300 transition-colors');
        } else {
          tab.classList.add('active-tab', 'bg-white', tab.dataset.tab === 'follow_up' ? 'text-amber-950' : 'text-blue-950', 'shadow-2xs');
          tab.classList.remove('text-stone-600', 'hover:bg-white/60');
          const activeIcon = tab.querySelector('.tab-icon');
          if (activeIcon) activeIcon.setAttribute('class', 'tab-icon w-4 h-4 text-amber-600 transition-colors');
        }

        this.activeTab = tab.dataset.tab;
        this.renderActiveSection();
      });
    });

    // Add new assignment trigger
    const newAsgBtn = container.querySelector('#sup-btn-new-asg');
    if (newAsgBtn) {
      newAsgBtn.addEventListener('click', () => {
        this.openAssignmentModal(null);
      });
    }

    await this.loadAll();
  },

  /**
   * Load summary stats and render current active section (High performance parallel pipeline)
   */
  async loadAll() {
    // 1. Fetch all raw datasets in one single concurrent batch
    const [students, assignments, attendanceRecords, allProgress, mahaden] = await Promise.all([
      UserService.getStudents(),
      AssignmentService.getAllAssignments(),
      AttendanceService.getAllAttendance(),
      ProgressService.getAllProgress(),
      UserService.getMahaden()
    ]);

    // 2. Pre-index attendance records by studentId in a hashmap for O(1) synchronous lookups
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
      if (!record.studentId) continue;
      let list = attendanceMap.get(record.studentId);
      if (!list) {
        list = [];
        attendanceMap.set(record.studentId, list);
      }
      list.push(record);
    }

    // 3. Compute overall stats for all students synchronously in-memory
    let totalProgressSum = 0;
    const studentAggregates = [];
    const mahadenMap = new Map(mahaden.map(m => [m.id, m.name]));

    for (const student of students) {
      if (!student) continue;

      // Ensure mahadName fallback
      if (!student.mahadName && student.mahadId && mahadenMap.has(student.mahadId)) {
        student.mahadName = mahadenMap.get(student.mahadId);
      }

      const studentProgress = (allProgress && allProgress[student.id]) ? allProgress[student.id] : {};

      // Calculate student assignment progress stats synchronously
      let totalEarnedPoints = 0;
      let totalMaxPoints = 0;
      let totalSubtasksAcrossAll = 0;
      let totalCompletedSubtasksAcrossAll = 0;
      let activeCount = 0;
      let completedCount = 0;
      let notStartedCount = 0;
      let expiredCount = 0;
      const assignmentDetails = [];

      for (const asg of assignments) {
        if (!asg) continue;
        const isExpired = AssignmentService.isExpired(asg);
        const completedSubtaskIds = studentProgress[asg.id] || [];
        const stats = ProgressService.getAssignmentStats(asg, completedSubtaskIds);

        totalEarnedPoints += (Number(stats.earnedPoints) || 0);
        totalMaxPoints += (Number(stats.totalPoints) || 0);
        totalSubtasksAcrossAll += (Number(stats.totalSubtasks) || 0);
        totalCompletedSubtasksAcrossAll += (Number(stats.completedCount) || 0);

        if (isExpired) {
          expiredCount++;
        } else {
          activeCount++;
        }

        if (stats.isCompleted) {
          completedCount++;
        } else if (stats.isNotStarted) {
          notStartedCount++;
        }

        assignmentDetails.push({
          assignment: asg,
          stats,
          completedSubtaskIds
        });
      }

      const overallPercentage = totalMaxPoints > 0
        ? Math.round((totalEarnedPoints / totalMaxPoints) * 100)
        : (totalSubtasksAcrossAll > 0 ? Math.round((totalCompletedSubtasksAcrossAll / totalSubtasksAcrossAll) * 100) : 0);

      const stats = {
        totalEarnedPoints,
        totalMaxPoints: totalMaxPoints || 100,
        overallPercentage: isNaN(overallPercentage) ? 0 : overallPercentage,
        activeCount,
        completedCount,
        notStartedCount,
        expiredCount,
        assignmentDetails
      };

      // Calculate attendance summary synchronously
      const studentAttRecords = attendanceMap.get(student.id) || [];
      let presentCount = 0;
      let excusedCount = 0;
      let absentCount = 0;
      const absenceDates = [];
      let lastAttendanceDate = null;

      for (const record of studentAttRecords) {
        if (!record) continue;
        if (record.status === 'present') {
          presentCount++;
          if (!lastAttendanceDate || record.date > lastAttendanceDate) {
            lastAttendanceDate = record.date;
          }
        } else if (record.status === 'excused') {
          excusedCount++;
        } else if (record.status === 'absent') {
          absentCount++;
          absenceDates.push(record.date);
        }
      }

      const att = {
        presentCount,
        excusedCount,
        absentCount,
        absenceDates: absenceDates.sort((a, b) => b.localeCompare(a)),
        lastAttendanceDate,
        totalSessions: studentAttRecords.length
      };

      totalProgressSum += stats.overallPercentage;
      studentAggregates.push({
        student,
        stats,
        attendance: att
      });
    }

    const avgProgress = students.length > 0 ? Math.round(totalProgressSum / students.length) : 0;
    const totalPresent = attendanceRecords.filter(r => r.status === 'present').length;
    const totalAbsent = attendanceRecords.filter(r => r.status === 'absent').length;
    const activeAsgCount = assignments.filter(a => a.active && !AssignmentService.isExpired(a)).length;
    const expiredAsgCount = assignments.filter(a => AssignmentService.isExpired(a)).length;

    // Attendance rate (Calculated only on recorded sessions)
    const totalSessions = totalPresent + totalAbsent;
    const attendanceRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0;

    // Mahaden statistics aggregation
    const mahadenStats = mahaden.map(mahad => {
      const mahadStudents = studentAggregates.filter(item => item.student.mahadId === mahad.id);
      const studentCount = mahadStudents.length;

      let mahadTotalPct = 0;
      let mahadTotalPresent = 0;
      let mahadTotalAbsent = 0;
      let mahadTotalExcused = 0;

      mahadStudents.forEach(item => {
        mahadTotalPct += item.stats.overallPercentage;
        mahadTotalPresent += item.attendance.presentCount;
        mahadTotalAbsent += item.attendance.absentCount;
        mahadTotalExcused += item.attendance.excusedCount;
      });

      const avgMahadProgress = studentCount > 0 ? Math.round(mahadTotalPct / studentCount) : 0;
      const totalAttSessions = mahadTotalPresent + mahadTotalAbsent;
      const attRate = totalAttSessions > 0 ? Math.round((mahadTotalPresent / totalAttSessions) * 100) : 0;

      return {
        mahad,
        studentCount,
        students: mahadStudents,
        avgProgress: avgProgress ? avgMahadProgress : 0,
        totalPresent: mahadTotalPresent,
        totalAbsent: mahadTotalAbsent,
        totalExcused: mahadTotalExcused,
        attendanceRate: attRate
      };
    });

    // Fill KPI DOM with semantic severity coloring
    const kpiMahaden = document.getElementById('kpi-mahaden');
    if (kpiMahaden) kpiMahaden.textContent = mahaden.length;
    
    const kpiStudents = document.getElementById('kpi-students');
    if (kpiStudents) kpiStudents.textContent = students.length;

    // 1. Average progress with neutral initial state and calm severity rules
    const avgProgEl = document.getElementById('kpi-avg-progress');
    const avgProgSub = document.getElementById('kpi-avg-progress-sub');
    if (avgProgEl) {
      if (avgProgress === 0) {
        avgProgEl.textContent = '—';
        avgProgEl.className = 'text-2xl font-bold text-stone-500 font-mono tabular-nums';
        if (avgProgSub) avgProgSub.innerHTML = '<span class="text-stone-400">بانتظار بدء الرصد</span>';
      } else {
        avgProgEl.textContent = `${avgProgress}%`;
        if (avgProgress >= 75) {
          avgProgEl.className = 'text-2xl font-bold text-emerald-700 font-mono tabular-nums';
          if (avgProgSub) avgProgSub.innerHTML = '<span class="text-emerald-700 font-bold">معدل جيد ومتقدم</span>';
        } else if (avgProgress >= 50) {
          avgProgEl.className = 'text-2xl font-bold text-blue-900 font-mono tabular-nums';
          if (avgProgSub) avgProgSub.innerHTML = '<span class="text-blue-900 font-bold">متوسط الإنجاز</span>';
        } else {
          avgProgEl.className = 'text-2xl font-bold text-amber-700 font-mono tabular-nums';
          if (avgProgSub) avgProgSub.innerHTML = '<span class="text-amber-700 font-bold">بحاجة لمتابعة ودعم</span>';
        }
      }
    }

    // 2. Attendance rate with severity rules
    const attEl = document.getElementById('kpi-attendance');
    const attSub = document.getElementById('kpi-attendance-sub');
    if (attEl) {
      if (totalSessions === 0) {
        attEl.textContent = '—';
        attEl.className = 'text-2xl font-bold text-stone-500 font-mono tabular-nums';
        if (attSub) attSub.innerHTML = '<span class="text-stone-400">بانتظار رصد الجلسات</span>';
      } else {
        attEl.textContent = `${attendanceRate}%`;
        if (attendanceRate >= 80) {
          attEl.className = 'text-2xl font-bold text-emerald-700 font-mono tabular-nums';
          if (attSub) attSub.innerHTML = '<span class="text-emerald-700 font-semibold">حضور ممتاز ومنتظم</span>';
        } else if (attendanceRate >= 65) {
          attEl.className = 'text-2xl font-bold text-teal-700 font-mono tabular-nums';
          if (attSub) attSub.innerHTML = '<span class="text-stone-500 font-medium">معدل حضور مستقر</span>';
        } else {
          attEl.className = 'text-2xl font-bold text-red-600 font-mono tabular-nums';
          if (attSub) attSub.innerHTML = '<span class="text-red-700 font-bold">تراجع ملحوظ بالحضور</span>';
        }
      }
    }

    // 3. Absences
    const absEl = document.getElementById('kpi-absences');
    const absSub = document.getElementById('kpi-absences-sub');
    if (absEl) {
      absEl.textContent = totalAbsent;
      if (totalAbsent === 0) {
        absEl.className = 'text-2xl font-bold text-stone-700 font-mono tabular-nums';
        if (absSub) absSub.innerHTML = '<span class="text-emerald-700 font-medium">لا يوجد أي غياب مسجل</span>';
      } else {
        absEl.className = 'text-2xl font-bold text-red-600 font-mono tabular-nums';
        if (absSub) absSub.innerHTML = `<span class="text-red-700 font-bold">${totalAbsent} يوم غياب مسجل</span>`;
      }
    }

    // 4. Active assignments count
    const asgEl = document.getElementById('kpi-active-asg');
    const asgSub = document.getElementById('kpi-active-asg-sub');
    if (asgEl) {
      asgEl.textContent = activeAsgCount;
      if (activeAsgCount === 0) {
        asgEl.className = 'text-2xl font-bold text-amber-600 font-mono tabular-nums';
        if (asgSub) asgSub.innerHTML = '<span class="text-amber-700 font-bold">جميع التكاليف معطلة!</span>';
      } else {
        asgEl.className = 'text-2xl font-bold text-blue-900 font-mono tabular-nums';
        if (asgSub) asgSub.innerHTML = `<span class="text-stone-500">${activeAsgCount} تكليفات نشطة</span>`;
      }
    }

    this.cachedAggregates = studentAggregates;
    this.cachedAssignments = assignments;
    this.cachedMahadenStats = mahadenStats;
    this.cachedMahaden = mahaden;

    await this.renderActiveSection();
  },

  /**
   * Render the view based on current active tab
   */
  async renderActiveSection() {
    const content = document.getElementById('sup-content-body');
    if (!content) return;

    // Synchronize tab buttons active styles
    const tabs = document.querySelectorAll('#sup-nav-tabs .sup-nav-tab');
    tabs.forEach(t => {
      const isCurrent = t.dataset.tab === this.activeTab;
      t.classList.remove('active-tab', 'bg-white', 'bg-blue-900', 'text-blue-950', 'text-white', 'text-amber-950', 'shadow-2xs', 'shadow-xs');
      if (t.dataset.tab === 'manage_assignments') {
        if (isCurrent) {
          t.classList.add('active-tab', 'bg-blue-900', 'text-white', 'shadow-xs');
        } else {
          t.classList.add('bg-white', 'hover:bg-blue-50', 'text-blue-950', 'border', 'border-blue-200/90', 'shadow-2xs');
        }
      } else {
        if (isCurrent) {
          t.classList.add('active-tab', 'bg-white', t.dataset.tab === 'follow_up' ? 'text-amber-950' : 'text-blue-950', 'shadow-2xs');
        } else {
          t.classList.add('text-stone-600', 'hover:text-slate-900', 'hover:bg-white/60');
        }
      }
    });

    if (this.activeTab === 'leaderboard' || this.activeTab === 'students') {
      this.renderLeaderboard(content);
    } else if (this.activeTab === 'mahaden_comparison') {
      this.renderMahadenComparison(content);
    } else if (this.activeTab === 'follow_up' || this.activeTab === 'absentees' || this.activeTab === 'low_progress') {
      this.renderFollowUp(content);
    } else if (this.activeTab === 'manage_assignments') {
      this.renderManageAssignments(content);
    }
  },

  /**
   * 0. Mahaden Comparison & Benchmarking Section (Individual Mahaden Only)
   */
  renderMahadenComparison(content) {
    const stats = this.cachedMahadenStats || [];
    
    // Sort by avgProgress descending to identify ranking
    const sortedStats = [...stats].sort((a, b) => b.avgProgress - a.avgProgress);

    content.innerHTML = `
      <div class="space-y-6">
        <!-- 7 Mahaden Visual Benchmark Cards Grid -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-base font-bold text-slate-900">ترتيب ومؤشرات المحاضن</h4>
            <span class="text-xs text-stone-500 font-medium">مرتبة تنازليًا حسب معدل الإنجاز</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="mahaden-cards-container">
            ${sortedStats.map((item, idx) => {
              const m = item.mahad;
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              let rankBadge = `<span class="w-7 h-7 rounded-full bg-stone-100 text-stone-700 text-xs font-bold inline-flex items-center justify-center">${idx + 1}</span>`;
              if (isFirst) {
                rankBadge = `<span class="text-xl inline-flex items-center justify-center select-none" title="المركز الأول">🥇</span>`;
              } else if (isSecond) {
                rankBadge = `<span class="text-xl inline-flex items-center justify-center select-none" title="المركز الثاني">🥈</span>`;
              } else if (isThird) {
                rankBadge = `<span class="text-xl inline-flex items-center justify-center select-none" title="المركز الثالث">🥉</span>`;
              }

              return `
                <div class="mahad-card card p-5 rounded-2xl border ${isFirst ? 'border-amber-300 ring-2 ring-amber-400/20 bg-white' : 'border-stone-200 bg-white'} shadow-xs hover:shadow-md transition-all flex flex-col justify-between" data-mahad-id="${m.id}">
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h5 class="font-bold text-base text-slate-900 leading-tight">${Utils.escapeHtml(m.name)}</h5>
                        <span class="text-xs text-stone-500 mt-0.5 inline-block">حي ${m.neighborhood}</span>
                      </div>
                      <div class="shrink-0">
                        ${rankBadge}
                      </div>
                    </div>

                    <!-- Progress bar -->
                    <div class="space-y-1.5 mb-3.5 bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div class="flex items-center justify-between text-xs">
                        <span class="text-stone-600 font-medium">معدل الإنجاز</span>
                        <span class="font-bold text-blue-900 tabular-nums text-sm">${item.avgProgress}%</span>
                      </div>
                      <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                        <div class="h-full rounded-full ${item.avgProgress >= 70 ? 'bg-emerald-600' : (item.avgProgress >= 50 ? 'bg-blue-600' : 'bg-amber-500')}" style="width: ${item.avgProgress}%"></div>
                      </div>
                    </div>

                    <!-- Stats mini grid -->
                    <div class="grid grid-cols-3 gap-1.5 text-center text-xs py-2 border-t border-stone-100 mb-2">
                      <div class="p-1.5 rounded-lg bg-stone-50">
                        <div class="text-[10px] text-stone-500">الطلاب</div>
                        <div class="font-bold text-slate-800 tabular-nums">${item.studentCount}</div>
                      </div>
                      <div class="p-1.5 rounded-lg bg-emerald-50/70">
                        <div class="text-[10px] text-emerald-700">نسبة الحضور</div>
                        <div class="font-bold text-emerald-800 tabular-nums">${item.attendanceRate}%</div>
                      </div>
                      <div class="p-1.5 rounded-lg bg-red-50/70">
                        <div class="text-[10px] text-red-700">إجمالي الغياب</div>
                        <div class="font-bold text-red-700 tabular-nums">${item.totalAbsent}</div>
                      </div>
                    </div>
                  </div>

                  <!-- Quick Action to filter students by this mahad -->
                  <button class="filter-mahad-students-btn w-full mt-2 py-2 px-3 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200 flex items-center justify-center gap-1.5 cursor-pointer" data-mahad-id="${m.id}" data-mahad-name="${m.name}">
                    <span>عرض طلاب المحضن (${item.studentCount})</span>
                    <svg class="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Comparative Breakdown Table -->
        <div class="card p-5 rounded-2xl border border-stone-200 bg-white space-y-3">
          <div class="flex items-center justify-between">
            <h4 class="text-base font-bold text-slate-900">جدول المقارنة المباشر</h4>
            <span class="text-xs text-stone-400">محدث وفق آخر التكاليف والحضور</span>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-right text-xs sm:text-sm">
              <thead>
                <tr class="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                  <th class="py-3 px-3">الترتيب</th>
                  <th class="py-3 px-3">اسم المحضن</th>
                  <th class="py-3 px-3">الحي</th>
                  <th class="py-3 px-3 text-center">الطلاب</th>
                  <th class="py-3 px-3">معدل الإنجاز</th>
                  <th class="py-3 px-3">نسبة الحضور</th>
                  <th class="py-3 px-3 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-stone-100">
                ${sortedStats.map((item, idx) => {
                  const m = item.mahad;
                  return `
                    <tr class="hover:bg-stone-50/80 transition-colors">
                      <td class="py-3 px-3 font-bold text-center">
                        ${idx === 0 ? '<span class="text-lg select-none">🥇</span>' : (idx === 1 ? '<span class="text-lg select-none">🥈</span>' : (idx === 2 ? '<span class="text-lg select-none">🥉</span>' : `<span class="font-mono text-stone-600">${idx + 1}</span>`))}
                      </td>
                      <td class="py-3 px-3 font-bold text-slate-900">${Utils.escapeHtml(m.name)}</td>
                      <td class="py-3 px-3 text-stone-500">${m.neighborhood}</td>
                      <td class="py-3 px-3 text-center font-mono font-bold">${item.studentCount}</td>
                      <td class="py-3 px-3">
                        <div class="flex items-center gap-2">
                          <div class="w-16 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                            <div class="h-full bg-blue-700 rounded-full" style="width: ${item.avgProgress}%"></div>
                          </div>
                          <span class="font-mono font-bold text-xs text-blue-900">${item.avgProgress}%</span>
                        </div>
                      </td>
                      <td class="py-3 px-3 font-mono font-semibold text-emerald-800">${item.attendanceRate}%</td>
                      <td class="py-3 px-3 text-center">
                        <button class="filter-mahad-students-btn px-2.5 py-1 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer" data-mahad-id="${m.id}" data-mahad-name="${m.name}">
                          عرض الطلاب
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Quick filter button to switch to leaderboard tab with that mahad selected
    content.querySelectorAll('.filter-mahad-students-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedMahadFilter = btn.dataset.mahadId;
        // Switch tab to leaderboard
        const tabs = document.querySelectorAll('#sup-nav-tabs .sup-nav-tab');
        tabs.forEach(t => {
          if (t.dataset.tab === 'leaderboard') {
            t.classList.add('active-tab', 'bg-white', 'text-blue-950', 'shadow-2xs');
            t.classList.remove('text-stone-600');
          } else {
            t.classList.remove('active-tab', 'bg-white', 'text-blue-950', 'shadow-2xs');
            t.classList.add('text-stone-600');
          }
        });
        this.activeTab = 'leaderboard';
        this.renderActiveSection();
      });
    });
  },

  /**
   * 1. Students List & Details Table/Cards with Mahad Filter
   */
  renderStudentsList(content) {
    const allItems = this.cachedAggregates || [];
    const mahaden = this.cachedMahaden || [];

    // Filter items based on selectedMahadFilter
    const items = this.selectedMahadFilter === 'all' 
      ? allItems 
      : allItems.filter(item => item.student.mahadId === this.selectedMahadFilter);

    const currentMahad = mahaden.find(m => m.id === this.selectedMahadFilter);

    content.innerHTML = `
      <div class="space-y-4">
        <!-- Header & Mahad Filter Dropdown -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-slate-900">سجل الطلاب التفصيلي</h3>
            <p class="text-xs text-stone-500">انقر على أي طالب لعرض بطاقة الإنجاز الكاملة وسجل الحضور والغياب.</p>
          </div>
          
          <div class="flex flex-wrap items-center gap-2.5">
            <div class="flex items-center gap-1.5">
              <label for="student-mahad-filter" class="text-xs font-semibold text-stone-600 whitespace-nowrap">المحضن:</label>
              <select id="student-mahad-filter" class="text-xs sm:text-sm font-semibold text-blue-950 bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500/20 focus:outline-hidden cursor-pointer">
                <option value="all" ${this.selectedMahadFilter === 'all' ? 'selected' : ''}>جميع المحاضن (${allItems.length} طالب)</option>
                ${mahaden.map(m => {
                  const count = allItems.filter(it => it.student.mahadId === m.id).length;
                  return `
                    <option value="${m.id}" ${this.selectedMahadFilter === m.id ? 'selected' : ''}>
                      ${m.name} (${count} طلاب)
                    </option>
                  `;
                }).join('')}
              </select>
            </div>

            <button type="button" id="btn-add-new-student" class="px-3.5 py-2 text-xs sm:text-sm font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>+ إضافة طالب جديد</span>
            </button>
          </div>
        </div>

        ${currentMahad ? `
          <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs font-medium">
            <span>تصفية نشطة: طلاب محضن <strong>${currentMahad.name}</strong> (${items.length} طلاب)</span>
            <button id="clear-mahad-filter-btn" class="text-blue-700 hover:text-blue-950 font-bold underline cursor-pointer">عرض جميع المحاضن</button>
          </div>
        ` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          ${items.length === 0 ? `
            <div class="col-span-full py-12 text-center bg-stone-50 rounded-2xl border border-stone-200 p-6 space-y-3">
              <div class="w-12 h-12 mx-auto rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
              </div>
              <p class="text-slate-700 font-bold text-sm">لا يوجد طلاب مسجلون حالياً في هذا المحضن.</p>
              <button type="button" class="btn-trigger-add-student px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                + إضافة طالب جديد الآن
              </button>
            </div>
          ` : items.map(item => {
            const st = item.student;
            const s = item.stats;
            const att = item.attendance;

            let statusTag = '';
            if (s.overallPercentage >= 80) {
              statusTag = '<span class="text-[11px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">متميز</span>';
            } else if (s.overallPercentage < 50) {
              statusTag = '<span class="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">يحتاج متابعة</span>';
            } else {
              statusTag = '<span class="text-[11px] font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">متقدم</span>';
            }

            return `
              <div class="card p-5 rounded-2xl border border-stone-200 bg-white hover:border-blue-400 hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer student-card-trigger" data-student-id="${st.id}">
                <div>
                  <div class="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h4 class="text-sm sm:text-base font-bold text-slate-900">${Utils.escapeHtml(st.name)}</h4>
                      <div class="flex items-center gap-1.5 mt-0.5">
                        <span class="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
                          ${st.mahadName || 'غير محدد'}
                        </span>
                      </div>
                    </div>
                    ${statusTag}
                  </div>

                  <!-- Progress metrics -->
                  <div class="space-y-1.5 mb-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-stone-600">النقاط المحققة</span>
                      <span class="font-bold text-slate-900 tabular-nums">${s.totalEarnedPoints} / ${s.totalMaxPoints}</span>
                    </div>
                    <div class="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div class="h-full rounded-full bg-blue-700 transition-all" style="width: ${s.overallPercentage}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-[11px] text-stone-500 pt-0.5">
                      <span>نسبة الإنجاز:</span>
                      <span class="font-bold text-blue-900 tabular-nums">${s.overallPercentage}%</span>
                    </div>
                  </div>

                  <!-- Attendance summary counts -->
                  <div class="grid grid-cols-3 gap-1.5 text-center text-xs py-2 border-t border-stone-100">
                    <div class="p-1 rounded-lg bg-emerald-50/60">
                      <div class="text-[10px] text-emerald-700">حضور</div>
                      <div class="font-bold text-emerald-800 tabular-nums">${att.presentCount}</div>
                    </div>
                    <div class="p-1 rounded-lg bg-amber-50/60">
                      <div class="text-[10px] text-amber-700">اعتذار</div>
                      <div class="font-bold text-amber-800 tabular-nums">${att.excusedCount}</div>
                    </div>
                    <div class="p-1 rounded-lg bg-red-50/60">
                      <div class="text-[10px] text-red-700">غياب</div>
                      <div class="font-bold text-red-700 tabular-nums">${att.absentCount}</div>
                    </div>
                  </div>
                </div>

                <div class="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span class="text-stone-400">آخر حضور: ${att.lastAttendanceDate ? Utils.formatShortDate(att.lastAttendanceDate) : '—'}</span>
                  <span class="text-blue-800 font-semibold flex items-center gap-1 hover:underline">
                    <span>التفاصيل</span>
                    <svg class="w-3.5 h-3.5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                  </span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Hook mahad filter dropdown
    const filterSelect = content.querySelector('#student-mahad-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedMahadFilter = e.target.value;
        this.renderStudentsList(content);
      });
    }

    // Hook Add Student Buttons
    content.querySelector('#btn-add-new-student')?.addEventListener('click', () => {
      this.openAddStudentModal();
    });
    content.querySelectorAll('.btn-trigger-add-student').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openAddStudentModal();
      });
    });

    // Hook clear filter btn
    const clearBtn = content.querySelector('#clear-mahad-filter-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.selectedMahadFilter = 'all';
        this.renderStudentsList(content);
      });
    }

    // Attach student card click to open detail modal
    content.querySelectorAll('.student-card-trigger').forEach(card => {
      card.addEventListener('click', () => {
        const studentId = card.dataset.studentId;
        this.openStudentDetailModal(studentId);
      });
    });
  },

  /**
   * 2. Leaderboard Section (الترتيب العام المعتمد)
   */
  renderLeaderboard(content) {
    const allItems = [...(this.cachedAggregates || [])];
    const mahaden = this.cachedMahaden || [];

    // Verify selectedMahadFilter is valid
    if (this.selectedMahadFilter && this.selectedMahadFilter !== 'all') {
      const exists = mahaden.some(m => m.id === this.selectedMahadFilter);
      if (!exists) {
        this.selectedMahadFilter = 'all';
      }
    }

    // 1. Filter by selected Mahad if any
    let items = (this.selectedMahadFilter && this.selectedMahadFilter !== 'all')
      ? allItems.filter(item => item?.student?.mahadId === this.selectedMahadFilter)
      : allItems;

    // 2. Filter by Search Query if any
    const query = (this.leaderboardSearchQuery || '').trim().toLowerCase();
    if (query) {
      items = items.filter(item => {
        const name = String(item?.student?.name || '').toLowerCase();
        const mahadName = String(item?.student?.mahadName || '').toLowerCase();
        return name.includes(query) || mahadName.includes(query);
      });
    }

    // 3. Ranked permanently by total earned points out of 100 descending, with stable fallback
    items.sort((a, b) => {
      const ptsA = Number(a?.stats?.totalEarnedPoints) || 0;
      const ptsB = Number(b?.stats?.totalEarnedPoints) || 0;
      if (ptsB !== ptsA) {
        return ptsB - ptsA;
      }
      const pctA = Number(a?.stats?.overallPercentage) || 0;
      const pctB = Number(b?.stats?.overallPercentage) || 0;
      if (pctB !== pctA) {
        return pctB - pctA;
      }
      return String(a?.student?.name || '').localeCompare(String(b?.student?.name || ''), 'ar');
    });

    const isFiltered = (this.selectedMahadFilter && this.selectedMahadFilter !== 'all') || Boolean(this.leaderboardSearchQuery);

    content.innerHTML = `
      <div class="card p-5 sm:p-6 rounded-2xl border border-stone-200 bg-white space-y-4 shadow-2xs">
        <!-- Unified Single-Row Header Toolbar -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <!-- Right Side: Title + Tooltip + Search Input + Mahad Filter -->
          <div class="flex flex-wrap items-center gap-3">
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5 whitespace-nowrap">
                <span>الترتيب العام</span>
                <span class="text-xs font-normal text-stone-500 tabular-nums">(${items.length} طالب)</span>
              </h3>

              <!-- Info Tooltip (i) -->
              <div class="relative group cursor-help inline-flex items-center shrink-0">
                <span class="w-4.5 h-4.5 rounded-full bg-stone-100 text-stone-500 hover:text-blue-900 text-[11px] font-bold inline-flex items-center justify-center border border-stone-200 transition-colors">ℹ</span>
                <div class="absolute top-full right-0 mt-1.5 hidden group-hover:block w-64 p-2.5 bg-slate-900 text-white text-[11px] font-normal rounded-xl shadow-xl z-30 leading-relaxed pointer-events-none">
                  يُحتسب الترتيب بناءً على مجموع نقاط التكاليف المحققة من 100 مع إحصائيات الحضور والغياب والاعتذار.
                </div>
              </div>
            </div>

            <!-- Instant Search Input by Name -->
            <div class="relative w-44 sm:w-56">
              <input id="leaderboard-search-input" type="text" placeholder="بحث بالاسم..." value="${Utils.escapeHtml(this.leaderboardSearchQuery || '')}" class="w-full pl-3 pr-8 py-1.5 text-base sm:text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-700 transition-colors placeholder:text-stone-400">
              <svg class="w-3.5 h-3.5 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>

            <!-- Mahad Filter Selector -->
            <div class="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 shadow-2xs">
              <label for="leaderboard-mahad-filter" class="text-xs font-semibold text-stone-600 shrink-0">المحضن:</label>
              <select id="leaderboard-mahad-filter" class="bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden cursor-pointer">
                <option value="all" ${this.selectedMahadFilter === 'all' ? 'selected' : ''}>كافة المحاضن (الكل)</option>
                ${mahaden.map(m => `
                  <option value="${m.id}" ${this.selectedMahadFilter === m.id ? 'selected' : ''}>${Utils.escapeHtml(m.name)}</option>
                `).join('')}
              </select>
            </div>

            ${isFiltered ? `
              <button id="btn-leaderboard-clear-filter" type="button" class="text-xs text-blue-700 hover:text-blue-950 font-bold underline cursor-pointer px-1">
                إلغاء التصفية
              </button>
            ` : ''}
          </div>
          
          <!-- Left Side: Action Buttons (Export PDF & Add Student) -->
          <div class="flex items-center gap-2 self-start lg:self-auto shrink-0">
            <!-- Export PDF Button -->
            <button id="btn-leaderboard-export-pdf" type="button" class="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-blue-950 font-bold text-xs flex items-center gap-1.5 transition-all border border-stone-200/90 hover:border-blue-300 shadow-2xs cursor-pointer" title="تصدير كشف الترتيب العام المعتمد بصيغة PDF رسمية معتمدة">
              <svg class="w-3.5 h-3.5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <span>تصدير PDF</span>
            </button>

            <!-- Add Student Button -->
            <button id="btn-leaderboard-add-student" class="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>إضافة طالب</span>
            </button>
          </div>
        </div>

        <!-- Mobile Student Cards Layout (Max-width 767px) -->
        <div class="leaderboard-mobile-view space-y-2.5">
          ${items.length === 0 ? `
            <div class="py-10 px-4 text-center bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
              <div class="text-stone-500 text-sm font-semibold">
                ${this.leaderboardSearchQuery ? `لا توجد نتائج تطابق البحث «${Utils.escapeHtml(this.leaderboardSearchQuery)}»` : 'لا يوجد طلاب مسجلون في هذا المحضن حتى الآن.'}
              </div>
              ${isFiltered ? `
                <button type="button" class="btn-clear-filter-inline px-3.5 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer">
                  عرض كافة الطلاب
                </button>
              ` : ''}
            </div>
          ` : items.map((item, index) => {
            const st = item.student || {};
            const s = item.stats || { totalEarnedPoints: 0, overallPercentage: 0 };
            const att = item.attendance || { presentCount: 0, absentCount: 0, excusedCount: 0 };

            // Only show medals when students actually have points earned
            let rankBadge = `${index + 1}`;
            if (s.totalEarnedPoints > 0) {
              if (index === 0) rankBadge = '🥇';
              else if (index === 1) rankBadge = '🥈';
              else if (index === 2) rankBadge = '🥉';
            }

            const pointsText = s.totalEarnedPoints > 0 ? `${s.totalEarnedPoints} / 100` : '—';
            const progressText = s.overallPercentage > 0 ? `${s.overallPercentage}%` : '—';

            const presText = att.presentCount > 0 ? att.presentCount : '—';
            const absText = att.absentCount > 0 ? att.absentCount : '—';
            const excText = att.excusedCount > 0 ? att.excusedCount : '—';

            return `
              <div class="student-modal-btn p-3.5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:border-blue-300 active:bg-blue-50/50 transition-all cursor-pointer space-y-2 select-none min-h-[64px]" data-student-id="${st.id}">
                <!-- Line 1: Rank, Full Name, Mahad Capsule -->
                <div class="flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2 min-w-0 flex-1">
                    <span class="w-6 h-6 rounded-full bg-stone-100 text-stone-700 text-xs font-bold inline-flex items-center justify-center shrink-0 tabular-nums">
                      ${rankBadge}
                    </span>
                    <h4 class="text-sm font-bold text-slate-900 leading-snug break-words">
                      ${Utils.escapeHtml(st.name || 'طالب')}
                    </h4>
                  </div>
                  <div class="shrink-0">
                    ${this.getMahadBadgeHtml(st.mahadId, st.mahadName)}
                  </div>
                </div>

                <!-- Line 2: The Two Key Metrics (Points & Progress) -->
                <div class="flex items-center justify-between text-xs pt-1.5 border-t border-stone-100">
                  <div class="flex items-center gap-1.5">
                    <span class="text-stone-500 text-[11px]">النقاط:</span>
                    <strong class="${s.totalEarnedPoints > 0 ? 'text-blue-950 font-black' : 'text-stone-300 font-normal'} tabular-nums text-xs">${pointsText}</strong>
                  </div>

                  <div class="flex items-center gap-1.5">
                    <span class="text-stone-500 text-[11px]">الإنجاز:</span>
                    ${s.overallPercentage > 0 ? `
                      <div class="flex items-center gap-1.5">
                        <div class="w-10 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                          <div class="h-full bg-blue-700 rounded-full" style="width: ${s.overallPercentage}%"></div>
                        </div>
                        <strong class="text-blue-950 font-black tabular-nums text-xs">${progressText}</strong>
                      </div>
                    ` : `<strong class="text-stone-300 font-normal text-xs">—</strong>`}
                  </div>
                </div>

                <!-- Line 3: Compact Combined Attendance in Single Line with Chevron -->
                <div class="flex items-center justify-between text-[11px] text-stone-600 pt-1.5 border-t border-stone-50">
                  <div class="flex items-center gap-1 tabular-nums">
                    <span>حضور <strong class="${att.presentCount > 0 ? 'text-emerald-700 font-bold' : 'text-stone-400 font-normal'}">${presText}</strong></span>
                    <span class="text-stone-300">·</span>
                    <span>غياب <strong class="${att.absentCount > 0 ? 'text-red-600 font-bold' : 'text-stone-400 font-normal'}">${absText}</strong></span>
                    <span class="text-stone-300">·</span>
                    <span>عذر <strong class="${att.excusedCount > 0 ? 'text-amber-700 font-bold' : 'text-stone-400 font-normal'}">${excText}</strong></span>
                  </div>

                  <svg class="w-3.5 h-3.5 text-stone-400 rotate-180 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Desktop Table Layout (Min-width 768px) -->
        <div class="leaderboard-desktop-view overflow-x-auto">
          <table class="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr class="border-b border-stone-200 text-stone-600 font-bold bg-stone-50/80">
                <th class="py-3 px-3 rounded-r-xl">#</th>
                <th class="py-3 px-3.5 min-w-[170px]">اسم الطالب</th>
                <th class="py-3 px-3">المحضن</th>
                <th class="py-3 px-3">النقاط</th>
                <th class="py-3 px-3">نسبة الإنجاز</th>
                <th class="py-3 px-3 text-center">سجل الحضور</th>
                <th class="py-3 px-3 rounded-l-xl text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              ${items.length === 0 ? `
                <tr>
                  <td colspan="7" class="py-10 text-center bg-stone-50 rounded-xl space-y-2">
                    <div class="text-stone-500 text-sm font-semibold">
                      ${this.leaderboardSearchQuery ? `لا توجد نتائج تطابق البحث «${Utils.escapeHtml(this.leaderboardSearchQuery)}»` : 'لا يوجد طلاب مسجلون في هذا المحضن حتى الآن.'}
                    </div>
                    ${isFiltered ? `
                      <button type="button" class="btn-clear-filter-inline px-3.5 py-1.5 bg-blue-900 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer mt-2">
                        عرض كافة الطلاب
                      </button>
                    ` : ''}
                  </td>
                </tr>
              ` : items.map((item, index) => {
                const st = item.student || {};
                const s = item.stats || { totalEarnedPoints: 0, overallPercentage: 0 };
                const att = item.attendance || { presentCount: 0, absentCount: 0, excusedCount: 0 };

                let rankBadge = `<span class="font-bold text-stone-600">${index + 1}</span>`;
                if (s.totalEarnedPoints > 0) {
                  if (index === 0) rankBadge = `<span class="text-lg inline-flex items-center justify-center select-none" title="المركز الأول">🥇</span>`;
                  else if (index === 1) rankBadge = `<span class="text-lg inline-flex items-center justify-center select-none" title="المركز الثاني">🥈</span>`;
                  else if (index === 2) rankBadge = `<span class="text-lg inline-flex items-center justify-center select-none" title="المركز الثالث">🥉</span>`;
                }

                // Zero suppression for points
                const pointsDisplay = s.totalEarnedPoints > 0 
                  ? `<span class="font-bold text-blue-950 tabular-nums">${s.totalEarnedPoints}</span> <span class="text-[10px] text-stone-400 font-normal">/100</span>` 
                  : `<span class="text-stone-300 font-normal select-none">—</span>`;

                // Zero suppression for progress
                const progressDisplay = s.overallPercentage > 0
                  ? `<div class="flex items-center gap-2">
                      <div class="w-14 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div class="h-full bg-blue-700 rounded-full" style="width: ${s.overallPercentage}%"></div>
                      </div>
                      <span class="tabular-nums text-xs text-blue-950 font-bold">${s.overallPercentage}%</span>
                    </div>`
                  : `<span class="text-stone-300 font-normal select-none">—</span>`;

                // Compact Combined Attendance (حاضر · غائب · معتذر) with zero suppression
                const hasAnyAttendance = att.presentCount > 0 || att.absentCount > 0 || att.excusedCount > 0;
                const attendanceDisplay = !hasAnyAttendance
                  ? `<span class="text-stone-300 font-normal select-none">—</span>`
                  : `<div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-50 border border-stone-200/80 text-xs tabular-nums" title="حاضر: ${att.presentCount} · غائب: ${att.absentCount} · معتذر: ${att.excusedCount}">
                      <span class="${att.presentCount > 0 ? 'font-bold text-emerald-800' : 'text-stone-300'}" title="حاضر">${att.presentCount > 0 ? `${att.presentCount} <span class="text-[10px] font-normal text-emerald-600">ح</span>` : '—'}</span>
                      <span class="text-stone-300">·</span>
                      <span class="${att.absentCount > 0 ? 'font-bold text-red-700' : 'text-stone-300'}" title="غائب">${att.absentCount > 0 ? `${att.absentCount} <span class="text-[10px] font-normal text-red-500">غ</span>` : '—'}</span>
                      <span class="text-stone-300">·</span>
                      <span class="${att.excusedCount > 0 ? 'font-bold text-amber-800' : 'text-stone-300'}" title="معتذر">${att.excusedCount > 0 ? `${att.excusedCount} <span class="text-[10px] font-normal text-amber-600">ع</span>` : '—'}</span>
                    </div>`;

                return `
                  <tr class="hover:bg-stone-50/70 transition-colors">
                    <td class="py-3 px-3">${rankBadge}</td>
                    <td class="py-3 px-3.5 font-bold text-slate-900 whitespace-nowrap" title="${Utils.escapeHtml(st.name || 'طالب')}">
                      ${Utils.escapeHtml(st.name || 'طالب')}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      ${this.getMahadBadgeHtml(st.mahadId, st.mahadName)}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      ${pointsDisplay}
                    </td>
                    <td class="py-3 px-3 whitespace-nowrap">
                      ${progressDisplay}
                    </td>
                    <!-- Combined Attendance Column (حاضر · غائب · معتذر) -->
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      ${attendanceDisplay}
                    </td>
                    <!-- Action -->
                    <td class="py-3 px-3 text-center whitespace-nowrap">
                      <button class="p-1.5 px-2.5 text-xs font-semibold text-blue-950 bg-blue-50/80 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 student-modal-btn cursor-pointer inline-flex items-center gap-1 shadow-2xs" data-student-id="${st.id}" title="عرض ملف وتفاصيل الطالب">
                        <svg class="w-3.5 h-3.5 text-blue-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                        <span class="text-[11px] font-bold">الملف</span>
                      </button>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Hook search input with debounce / immediate filter
    const searchInput = content.querySelector('#leaderboard-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.leaderboardSearchQuery = e.target.value;
        this.renderLeaderboard(content);
        // keep focus in input and cursor at end
        const freshInput = content.querySelector('#leaderboard-search-input');
        if (freshInput) {
          freshInput.focus();
          freshInput.setSelectionRange(freshInput.value.length, freshInput.value.length);
        }
      });
    }

    // Hook mahad filter dropdown
    const filterSelect = content.querySelector('#leaderboard-mahad-filter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.selectedMahadFilter = e.target.value;
        this.renderLeaderboard(content);
      });
    }

    // Hook clear filter buttons
    const clearFilterAction = () => {
      this.selectedMahadFilter = 'all';
      this.leaderboardSearchQuery = '';
      this.renderLeaderboard(content);
    };

    content.querySelector('#btn-leaderboard-clear-filter')?.addEventListener('click', clearFilterAction);
    content.querySelectorAll('.btn-clear-filter-inline').forEach(btn => {
      btn.addEventListener('click', clearFilterAction);
    });

    // Hook Export PDF button
    content.querySelector('#btn-leaderboard-export-pdf')?.addEventListener('click', () => {
      this.openLeaderboardPdfModal(items);
    });

    // Hook add student button
    content.querySelector('#btn-leaderboard-add-student')?.addEventListener('click', () => {
      this.openAddStudentModal();
    });

    // Hook student detail modal
    content.querySelectorAll('.student-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openStudentDetailModal(btn.dataset.studentId);
      });
    });
  },

  /**
   * Generate Full Official Printable HTML Report for Leaderboard
   */
  generateLeaderboardReportHtml(items, isStandaloneDocument = false) {
    const customLogo = Storage.getCustomLogo();
    const today = new Date();
    const dateFormatted = today.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Current filter name
    let filterLabel = 'كافة المحاضن (الكل)';
    if (this.selectedMahadFilter && this.selectedMahadFilter !== 'all') {
      const m = (this.cachedMahaden || []).find(x => x.id === this.selectedMahadFilter);
      if (m) filterLabel = `محضن: ${m.name}`;
    }

    // Stats calculations with strict accuracy
    const totalStudents = items.length;
    const totalPoints = items.reduce((sum, it) => sum + (it.stats.totalEarnedPoints || 0), 0);
    const hasCohortProgress = totalPoints > 0;
    const avgPoints = (hasCohortProgress && totalStudents > 0) ? (totalPoints / totalStudents).toFixed(1) : 0;
    
    const totalPct = items.reduce((sum, it) => sum + (it.stats.overallPercentage || 0), 0);
    const avgPct = (hasCohortProgress && totalStudents > 0) ? Math.round(totalPct / totalStudents) : 0;
    
    const totalPresent = items.reduce((sum, it) => sum + (it.attendance.presentCount || 0), 0);
    const totalAbsent = items.reduce((sum, it) => sum + (it.attendance.absentCount || 0), 0);
    const totalSessions = totalPresent + totalAbsent;
    const hasCohortAttendance = totalSessions > 0;
    const attRate = hasCohortAttendance ? Math.round((totalPresent / totalSessions) * 100) : null;

    // Count students with no activity recorded yet
    const unstartedCount = items.filter(it => (it.stats.totalEarnedPoints || 0) === 0 && (it.attendance.presentCount || 0) === 0).length;

    // Group items by Mahad when all mahaden are selected
    const mahadGroups = new Map();
    items.forEach(it => {
      const mName = it.student.mahadName || 'غير محدد';
      if (!mahadGroups.has(mName)) {
        mahadGroups.set(mName, []);
      }
      mahadGroups.get(mName).push(it);
    });

    // Logo markup
    let logoHtml = '';
    if (customLogo) {
      logoHtml = `<img src="${customLogo}" alt="شعار مرحلة التأهيل" style="max-height: 64px; max-width: 150px; object-fit: contain; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.08));" />`;
    } else {
      logoHtml = `
        <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #1e3a8a, #0f172a); color: #fbbf24; border: 2px solid #f59e0b; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <svg style="width: 26px; height: 26px; color: #fcd34d;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
          <span style="font-size: 7px; font-weight: 800; color: #fef3c7; margin-top: 1px;">مرحلة التأهيل</span>
        </div>
      `;
    }

    const reportContentHtml = `
      <div style="direction: rtl; font-family: 'Cairo', 'Amiri', system-ui, -apple-system, sans-serif; color: #0f172a; line-height: 1.5; padding: 10px;">
        
        <!-- Document Header (Hierarchical & Clean) -->
        <div style="border-bottom: 2px solid #b45309; padding-bottom: 14px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
            <!-- Right: Program Emblem -->
            <div style="text-align: right; line-height: 1.3;">
              <div style="font-size: 15px; font-weight: 900; color: #1e3a8a;">مشروع مرحلة التأهيل</div>
              <div style="font-size: 11px; font-weight: bold; color: #92400e; margin-top: 1px;">دفعة التأهيل 48</div>
            </div>

            <!-- Center: Logo -->
            <div style="display: flex; align-items: center; justify-content: center;">
              ${logoHtml}
            </div>

            <!-- Left: Metadata -->
            <div style="text-align: left; line-height: 1.4; font-size: 11px;">
              <div><span style="color: #64748b;">التاريخ:</span> <strong style="font-family: monospace; color: #0f172a;">${dateFormatted}</strong></div>
              <div><span style="color: #64748b;">النطاق:</span> <strong style="color: #1e3a8a;">${filterLabel}</strong></div>
            </div>
          </div>

          <!-- Document Main Title -->
          <div style="text-align: center; margin-top: 12px;">
            <h1 style="font-size: 19px; font-weight: 900; color: #0f172a; margin: 0; letter-spacing: -0.3px;">
              كشف الترتيب العام لطلاب مرحلة التأهيل
            </h1>
            <div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
              <span>دفعة التأهيل 48</span>
              <span>•</span>
              <span>تاريخ التقرير: ${dateFormatted}</span>
              <span>•</span>
              <span>تصفية: ${filterLabel}</span>
            </div>
          </div>
        </div>

        <!-- Executive Metrics Summary Strip (Accurate & Contextual) -->
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
          <!-- Card 1: Total Students -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 6px;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">إجمالي الطلاب</div>
            <div style="font-size: 17px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 2px;">${totalStudents} طالب</div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">مسجلين في الكشف</div>
          </div>

          <!-- Card 2: Average Points -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 6px;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">متوسط النقاط</div>
            <div style="font-size: 17px; font-weight: 900; color: ${hasCohortProgress ? '#1e3a8a' : '#64748b'}; font-family: monospace; margin-top: 2px;">
              ${hasCohortProgress ? `${avgPoints} نقطة` : '—'}
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">من 100 نقطة مقررة</div>
          </div>

          <!-- Card 3: Average Progress -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 6px;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">متوسط نسبة الإنجاز</div>
            <div style="font-size: 17px; font-weight: 900; color: ${hasCohortProgress ? '#0284c7' : '#64748b'}; font-family: monospace; margin-top: 2px;">
              ${hasCohortProgress ? `${avgPct}%` : '—'}
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${hasCohortProgress ? 'المحقق للدفعة' : 'بانتظار بدء الرصد'}</div>
          </div>

          <!-- Card 4: Attendance Rate (Accurate logic: No false 100%) -->
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 6px;">
            <div style="font-size: 10px; color: #64748b; font-weight: bold;">نسبة الحضور العامة</div>
            <div style="font-size: 17px; font-weight: 900; color: ${hasCohortAttendance ? (attRate >= 80 ? '#059669' : '#b45309') : '#64748b'}; font-family: monospace; margin-top: 2px;">
              ${hasCohortAttendance ? `${attRate}%` : '—'}
            </div>
            <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">${hasCohortAttendance ? `من إجمالي ${totalSessions} جلسة` : 'لم تُرصد جلسات بعد'}</div>
          </div>
        </div>

        <!-- Official Rankings Table -->
        <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; text-align: right; margin-bottom: 20px;">
          <thead>
            <tr style="background-color: #1e3a8a; color: #ffffff; font-weight: 800; font-size: 10.5px;">
              <th style="padding: 7px 8px; border: 1px solid #1e3a8a; text-align: center; width: 34px;">#</th>
              <th style="padding: 7px 10px; border: 1px solid #1e3a8a;">اسم الطالب</th>
              <th style="padding: 7px 8px; border: 1px solid #1e3a8a;">المحضن</th>
              <th style="padding: 7px 8px; border: 1px solid #1e3a8a; text-align: center;">النقاط (من 100)</th>
              <th style="padding: 7px 8px; border: 1px solid #1e3a8a; text-align: center;">نسبة الإنجاز</th>
              <th style="padding: 7px 6px; border: 1px solid #1e3a8a; text-align: center;">الحضور</th>
              <th style="padding: 7px 6px; border: 1px solid #1e3a8a; text-align: center;">الغياب</th>
              <th style="padding: 7px 6px; border: 1px solid #1e3a8a; text-align: center;">الاعتذار</th>
              <th style="padding: 7px 8px; border: 1px solid #1e3a8a; text-align: center;">الحالة والتقدير</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => {
              const st = item.student;
              const s = item.stats;
              const att = item.attendance;
              const isEven = idx % 2 === 0;

              // Medals only when actual points have been earned
              let rankBadge = `<span style="font-family: monospace; font-weight: bold; color: #475569;">${idx + 1}</span>`;
              if (hasCohortProgress && s.totalEarnedPoints > 0) {
                if (idx === 0) rankBadge = `<span style="font-size: 13px;">🥇</span>`;
                else if (idx === 1) rankBadge = `<span style="font-size: 13px;">🥈</span>`;
                else if (idx === 2) rankBadge = `<span style="font-size: 13px;">🥉</span>`;
              }

              // Honest evaluation tag without alarming red when grading hasn't started
              let evalText = 'بانتظار الرصد';
              let evalBg = '#f1f5f9';
              let evalColor = '#64748b';
              let evalBorder = '#cbd5e1';

              if (s.totalEarnedPoints > 0 || att.presentCount > 0) {
                if (s.overallPercentage >= 85) {
                  evalText = 'متميز (أ)';
                  evalBg = '#ecfdf5';
                  evalColor = '#065f46';
                  evalBorder = '#a7f3d0';
                } else if (s.overallPercentage >= 70) {
                  evalText = 'جيد جداً (ب)';
                  evalBg = '#f0fdf4';
                  evalColor = '#15803d';
                  evalBorder = '#bbf7d0';
                } else if (s.overallPercentage >= 50) {
                  evalText = 'متقدم (ج)';
                  evalBg = '#eff6ff';
                  evalColor = '#1d4ed8';
                  evalBorder = '#bfdbfe';
                } else {
                  evalText = 'يحتاج متابعة';
                  evalBg = '#fffbe2';
                  evalColor = '#92400e';
                  evalBorder = '#fde68a';
                }
              }

              return `
                <tr style="background-color: ${isEven ? '#ffffff' : '#f8fafc'}; border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">${rankBadge}</td>
                  <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${Utils.escapeHtml(st.name)}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; color: #475569; font-size: 10px;">${st.mahadName || '—'}</td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: 800; color: ${s.totalEarnedPoints > 0 ? '#1e3a8a' : '#94a3b8'};">
                    ${s.totalEarnedPoints > 0 ? `${s.totalEarnedPoints} نقطة` : '—'}
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: bold; color: ${s.overallPercentage > 0 ? '#0369a1' : '#94a3b8'};">
                    ${s.overallPercentage > 0 ? `${s.overallPercentage}%` : '—'}
                  </td>
                  <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: ${att.presentCount > 0 ? '#059669' : '#94a3b8'}; font-weight: 700;">
                    ${att.presentCount > 0 ? att.presentCount : '—'}
                  </td>
                  <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: ${att.absentCount > 0 ? '#b91c1c' : '#94a3b8'}; font-weight: 700;">
                    ${att.absentCount > 0 ? att.absentCount : '—'}
                  </td>
                  <td style="padding: 6px 6px; border: 1px solid #e2e8f0; text-align: center; font-family: monospace; color: ${att.excusedCount > 0 ? '#b45309' : '#94a3b8'}; font-weight: 700;">
                    ${att.excusedCount > 0 ? att.excusedCount : '—'}
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #e2e8f0; text-align: center;">
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: ${evalBg}; color: ${evalColor}; border: 1px solid ${evalBorder};">
                      ${evalText}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <!-- Uncompleted Items Summary Section (قسم البنود الناقصة / غير المنجزة) -->
        <div style="margin-top: 20px; padding: 14px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; page-break-inside: avoid;">
          <div style="font-size: 12px; font-weight: 800; color: #1e3a8a; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">📋</span>
            <span>ملخص البنود الحالية التي بانتظار الاستكمال والتفعيل</span>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; font-size: 10.5px; color: #334155; margin-bottom: 8px;">
            <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b;">عدد الطلاب بدون بيانات مرصودة:</span>
              <strong style="color: #0f172a; font-family: monospace; font-size: 11px;"> ${unstartedCount} من ${totalStudents} طالب</strong>
            </div>
            <div style="background: #ffffff; padding: 8px 10px; border-radius: 8px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b;">حالة جلسات التحضير:</span>
              <strong style="color: #0f172a;"> ${hasCohortAttendance ? `${totalSessions} جلسة مرصودة` : 'لم تبدأ جلسات التحضير بعد'}</strong>
            </div>
          </div>

          <div style="font-size: 10px; color: #475569; background: #ffffff; padding: 8px 10px; border-radius: 8px; border-right: 3px solid #0284c7; font-weight: 600;">
            💡 <strong>توصية إجرائية:</strong> يُرجى استكمال رصد إنجاز التكاليف وتسجيل جلسات الحضور المتبقية قبل اعتماد هذا التقرير كنسخة نهائية رسمية.
          </div>
        </div>

        <!-- Official Signatures & Footer Block -->
        <div style="margin-top: 24px; pt-12; border-top: 1px solid #e2e8f0; page-break-inside: avoid;">
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); text-align: center; font-size: 10.5px; color: #334155; padding-top: 12px; margin-bottom: 12px;">
            <div>
              <div style="font-weight: 700; color: #0f172a;">إعداد وتدقيق</div>
              <div style="color: #64748b; margin-top: 16px;">توقيع المشرف</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #0f172a;">اعتماد الإدارة</div>
              <div style="color: #64748b; margin-top: 16px;">ختم برنامج التأهيل</div>
            </div>
            <div>
              <div style="font-weight: 700; color: #0f172a;">تاريخ الاعتماد</div>
              <div style="color: #64748b; margin-top: 16px; font-family: monospace;">${dateFormatted}</div>
            </div>
          </div>

          <div style="text-align: center; font-size: 9.5px; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 8px; font-style: italic;">
            «إياك والتلون.. فإن دين الله واحد» — برنامج مرحلة التأهيل (الدفعة 48)
          </div>
        </div>

      </div>
    `;

    if (!isStandaloneDocument) {
      return reportContentHtml;
    }

    // Return complete standalone printable HTML document for the iframe
    return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>كشف_الترتيب_العام_مرحلة_التأهيل_الدفعة_48</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Amiri:wght@700&display=swap');
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff;
      color: #0f172a;
      direction: rtl;
      font-family: 'Cairo', 'Amiri', system-ui, -apple-system, sans-serif;
      padding: 12mm 10mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    thead {
      display: table-header-group;
    }
    tr {
      page-break-inside: avoid;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  ${reportContentHtml}
</body>
</html>`;
  },

  /**
   * Open Modal to preview the official PDF document
   */
  openLeaderboardPdfModal(items) {
    const modal = document.getElementById('leaderboard-pdf-modal');
    const paper = document.getElementById('leaderboard-pdf-paper');
    const closeBtn = document.getElementById('leaderboard-pdf-close');
    const printBtn = document.getElementById('btn-print-pdf-document');
    if (!modal || !paper) return;

    // Render official report preview
    paper.innerHTML = this.generateLeaderboardReportHtml(items, false);

    // Show modal
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Hook print / export
    if (printBtn) {
      printBtn.onclick = () => {
        this.printPdfDocument(items);
      };
    }

    // Hook close
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      };
    }
  },

  /**
   * Print / Save to PDF using high-resolution native print architecture
   */
  printPdfDocument(items) {
    const modal = document.getElementById('leaderboard-pdf-modal');
    const paper = document.getElementById('leaderboard-pdf-paper');
    if (!modal || !paper) return;

    // Ensure content is fresh
    paper.innerHTML = this.generateLeaderboardReportHtml(items, false);
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    // Set document title so exported PDF default filename is accurate
    const origTitle = document.title;
    document.title = 'كشف_الترتيب_العام_مرحلة_التأهيل_الدفعة_48';

    Utils.showToast('جاري فتح نافذة الطباعة والحفظ كـ PDF...', 'info');

    // Trigger print
    setTimeout(() => {
      try {
        window.print();
      } catch (err) {
        console.error('Print error:', err);
      } finally {
        setTimeout(() => {
          document.title = origTitle;
        }, 1500);
      }
    }, 200);
  },

  /**
   * 3. Combined Follow-Up Section (يحتاج متابعة)
   * Merges absentees and genuinely low-progress students into an actionable supervision dashboard.
   */
  renderFollowUp(content) {
    const allAggregates = this.cachedAggregates || [];
    const threshold = this.lowProgressThreshold;
    const subFilter = this.followUpSubFilter || 'all'; // 'all' | 'absent' | 'low_progress'

    // Check if the cohort has recorded activity (zero != failure when cohort hasn't started yet)
    const hasCohortProgress = allAggregates.some(item => item.stats.totalEarnedPoints > 0);

    const absentStudents = allAggregates.filter(item => item.attendance.absentCount > 0);
    const lowProgressStudents = hasCohortProgress 
      ? allAggregates.filter(item => item.stats.overallPercentage < threshold)
      : [];

    // Combine unique students needing genuine follow-up
    const followUpMap = new Map();
    allAggregates.forEach(item => {
      const isAbsent = item.attendance.absentCount > 0;
      const isLowProg = hasCohortProgress && (item.stats.overallPercentage < threshold);
      if (isAbsent || isLowProg) {
        followUpMap.set(item.student.id, {
          ...item,
          isAbsent,
          isLowProg,
          riskScore: (item.attendance.absentCount * 25) + (100 - item.stats.overallPercentage)
        });
      }
    });

    const allFollowUpList = Array.from(followUpMap.values());
    allFollowUpList.sort((a, b) => b.riskScore - a.riskScore);

    let displayItems = [];
    if (subFilter === 'absent') {
      displayItems = absentStudents.sort((a, b) => b.attendance.absentCount - a.attendance.absentCount);
    } else if (subFilter === 'low_progress') {
      displayItems = lowProgressStudents.sort((a, b) => a.stats.overallPercentage - b.stats.overallPercentage);
    } else {
      displayItems = allFollowUpList;
    }

    // Update tab badge count if element exists
    const badgeEl = document.getElementById('sup-follow-up-badge');
    if (badgeEl) {
      if (allFollowUpList.length > 0) {
        badgeEl.textContent = `${allFollowUpList.length}`;
        badgeEl.style.display = 'inline-block';
      } else {
        badgeEl.style.display = 'none';
      }
    }

    content.innerHTML = `
      <div class="card p-5 sm:p-6 rounded-2xl border border-stone-200 bg-white space-y-5">
        <!-- Section Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-100">
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="text-base sm:text-lg font-bold text-slate-900">سجل الطلاب المحتاجين للمتابعة</h3>
              ${allFollowUpList.length > 0 ? `
                <span class="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full shadow-2xs">
                  ${allFollowUpList.length} ${allFollowUpList.length === 1 ? 'حالة تحتاج متابعة' : 'حالات تحتاج متابعة'}
                </span>
              ` : `
                <span class="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full shadow-2xs flex items-center gap-1">
                  <span>✓</span>
                  <span>لا توجد حالات حرجة</span>
                </span>
              `}
            </div>
            <p class="text-xs text-stone-500 mt-1">حصر مركزي فوري للطلاب المسجل بحقهم أيام غياب أو المنخفضين في معدل إنجاز التكاليف.</p>
          </div>

          <!-- Threshold Setting Selector -->
          <div class="flex items-center gap-2 self-start md:self-auto bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
            <span class="text-xs text-stone-600 font-semibold">معيار تدني الإنجاز:</span>
            <select id="sup-follow-up-threshold" class="text-xs font-bold text-slate-900 bg-white border border-stone-200 rounded-lg px-2 py-1 focus:ring-blue-900 focus:outline-hidden cursor-pointer">
              <option value="20" ${threshold === 20 ? 'selected' : ''}>أقل من 20%</option>
              <option value="30" ${threshold === 30 ? 'selected' : ''}>أقل من 30%</option>
              <option value="40" ${threshold === 40 ? 'selected' : ''}>أقل من 40%</option>
              <option value="50" ${threshold === 50 ? 'selected' : ''}>أقل من 50%</option>
              <option value="60" ${threshold === 60 ? 'selected' : ''}>أقل من 60%</option>
            </select>
          </div>
        </div>

        <!-- 3 Interactive Clickable Filter Cards (تغني عن التبويبات المكررة) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <!-- Filter Card 1: All Follow-Up Cases -->
          <div data-filter="all" class="follow-filter-card p-4 rounded-2xl border transition-all cursor-pointer select-none ${subFilter === 'all' ? 'bg-blue-50/80 border-blue-900 shadow-xs ring-2 ring-blue-900/10' : 'bg-stone-50/80 hover:bg-white border-stone-200 hover:border-blue-300 shadow-2xs'}">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold ${subFilter === 'all' ? 'text-blue-950' : 'text-stone-600'}">إجمالي حالات المتابعة</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${subFilter === 'all' ? 'bg-blue-900 text-white' : 'bg-stone-200 text-stone-700'}">الكل</span>
            </div>
            <div class="text-2xl font-black text-slate-900 tabular-nums mt-2">${allFollowUpList.length}</div>
            <div class="text-[11px] text-stone-500 mt-0.5">طالب يحتاج متابعة أو توثيق</div>
          </div>

          <!-- Filter Card 2: Absentees -->
          <div data-filter="absent" class="follow-filter-card p-4 rounded-2xl border transition-all cursor-pointer select-none ${subFilter === 'absent' ? 'bg-red-50/80 border-red-600 shadow-xs ring-2 ring-red-600/10' : 'bg-stone-50/80 hover:bg-white border-stone-200 hover:border-red-300 shadow-2xs'}">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold ${subFilter === 'absent' ? 'text-red-950' : 'text-stone-600'}">تنبيهات الغياب</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${subFilter === 'absent' ? 'bg-red-600 text-white' : 'bg-stone-200 text-stone-700'}">غياب</span>
            </div>
            <div class="text-2xl font-black ${absentStudents.length > 0 ? 'text-red-600' : 'text-slate-900'} tabular-nums mt-2">${absentStudents.length}</div>
            <div class="text-[11px] text-stone-500 mt-0.5">طالب سُجل بحقهم غياب</div>
          </div>

          <!-- Filter Card 3: Low Progress -->
          <div data-filter="low_progress" class="follow-filter-card p-4 rounded-2xl border transition-all cursor-pointer select-none ${subFilter === 'low_progress' ? 'bg-amber-50/80 border-amber-600 shadow-xs ring-2 ring-amber-600/10' : 'bg-stone-50/80 hover:bg-white border-stone-200 hover:border-amber-300 shadow-2xs'}">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold ${subFilter === 'low_progress' ? 'text-amber-950' : 'text-stone-600'}">انخفاض الإنجاز (&lt;${threshold}%)</span>
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-md ${subFilter === 'low_progress' ? 'bg-amber-600 text-white' : 'bg-stone-200 text-stone-700'}">إنجاز</span>
            </div>
            <div class="text-2xl font-black text-slate-900 tabular-nums mt-2">${lowProgressStudents.length}</div>
            <div class="text-[11px] text-stone-500 mt-0.5">${hasCohortProgress ? 'طالب بحاجة لخطة دعم' : 'بانتظار رصد المهام'}</div>
          </div>
        </div>

        <!-- Students List -->
        ${displayItems.length === 0 ? `
          <div class="text-center py-12 px-4 bg-stone-50/80 rounded-2xl border border-stone-200 text-slate-800 space-y-2">
            <div class="w-12 h-12 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-bold shadow-2xs">✓</div>
            <h4 class="text-sm sm:text-base font-bold text-slate-900">سجل ممتاز: لا توجد أي حالات تنطبق عليها هذه الشروط</h4>
            <p class="text-xs text-stone-500 max-w-md mx-auto">جميع الطلاب منتظمون ومستوفون لمعدلات الحضور والإنجاز المحددة.</p>
          </div>
        ` : `
          <div class="divide-y divide-stone-100">
            ${displayItems.map(item => {
              const st = item.student;
              const att = item.attendance;
              const s = item.stats;
              const hasAbsence = att.absentCount > 0;
              const isLowProg = hasCohortProgress && (s.overallPercentage < threshold);

              return `
                <div class="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-stone-50/60 p-2.5 rounded-2xl transition-colors">
                  <!-- Zone 1: Student Identity, Mahad, and Reason Badges -->
                  <div class="space-y-1 flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h4 class="text-sm sm:text-base font-bold text-slate-900">${Utils.escapeHtml(st.name)}</h4>
                      ${this.getMahadBadgeHtml(st.mahadId, st.mahadName)}
                      
                      <!-- Reason Badges with Calm Severity -->
                      ${hasAbsence ? `
                        <span class="inline-flex items-center gap-1 text-[11px] font-bold ${att.absentCount >= 2 ? 'text-red-700 bg-red-50 border border-red-200' : 'text-amber-800 bg-amber-50 border border-amber-200'} px-2 py-0.5 rounded-md">
                          <span>غياب: ${att.absentCount} ${att.absentCount === 1 ? 'يوم' : 'أيام'}</span>
                        </span>
                      ` : ''}

                      ${isLowProg ? `
                        <span class="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <span>إنجاز: ${s.overallPercentage}%</span>
                        </span>
                      ` : ''}
                    </div>

                    <!-- Clean Metrics Line -->
                    <div class="flex items-center gap-3 text-xs text-stone-500 flex-wrap pt-0.5">
                      <span>النقاط: <strong class="text-slate-900 font-bold">${s.totalEarnedPoints > 0 ? s.totalEarnedPoints : '—'}</strong> / 100</span>
                      <span>·</span>
                      <span>حضور: <strong class="text-slate-800 font-semibold">${att.presentCount}</strong></span>
                      <span>·</span>
                      <span>غياب: <strong class="${att.absentCount > 0 ? 'text-red-600 font-bold' : 'text-slate-800'}">${att.absentCount}</strong></span>
                      <span>·</span>
                      <span>عذر: <strong class="text-slate-800">${att.excusedCount}</strong></span>
                    </div>
                  </div>

                  <!-- Zone 2: Prominent Action Button -->
                  <div class="flex items-center gap-2 shrink-0 self-start md:self-auto">
                    <button type="button" class="student-modal-btn min-h-[38px] px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 active:scale-[0.98] rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5 border border-blue-950/20" data-student-id="${st.id}">
                      <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      <span>الملف والتفاصيل</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;

    // Hook threshold select
    const select = content.querySelector('#sup-follow-up-threshold');
    if (select) {
      select.addEventListener('change', (e) => {
        this.lowProgressThreshold = Number(e.target.value);
        this.renderFollowUp(content);
      });
    }

    // Hook interactive filter cards
    content.querySelectorAll('.follow-filter-card').forEach(card => {
      card.addEventListener('click', () => {
        this.followUpSubFilter = card.dataset.filter;
        this.renderFollowUp(content);
      });
    });

    // Hook student detail modal
    content.querySelectorAll('.student-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openStudentDetailModal(btn.dataset.studentId);
      });
    });
  },

  /**
   * 5. Assignment Management Section
   */
  renderManageAssignments(content) {
    const assignments = this.cachedAssignments || [];
    const hasAnyActive = assignments.some(a => a.active && !AssignmentService.isExpired(a));
    const totalPoints = assignments.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
    const isBalanced100 = totalPoints === 100;

    const unifiedStartDate = assignments.length > 0 ? (assignments[0].startDate || '2026-09-01') : '2026-09-01';
    const unifiedEndDate = assignments.length > 0 ? (assignments[0].endDate || '2026-10-30') : '2026-10-30';

    content.innerHTML = `
      <div class="card p-5 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2 flex-wrap mb-1">
              <h3 class="text-base sm:text-lg font-bold text-slate-900">إدارة التكاليف المقررة</h3>
              ${isBalanced100 
                ? '<span class="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span><span>100 / 100 نقطة (مكتمل)</span></span>'
                : `<span class="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs"><span class="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span><span>${totalPoints} / 100 نقطة</span></span>`
              }
            </div>
            <p class="text-xs text-slate-500">نظام توحيد المواعيد وتوزيع الـ 100 نقطة على المقررات بالتساوي أو بالتخصيص، وإدارة المهام.</p>
          </div>

          <div class="flex items-center gap-2 flex-wrap self-start md:self-auto shrink-0">
            <button id="asg-auto-dist-btn" type="button" class="px-3 py-2 text-xs font-bold text-blue-950 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer" title="توزيع الـ 100 نقطة بالتساوي تلقائياً على جميع التكاليف">
              <span>⚡ توزيع 100 بالتساوي</span>
            </button>
            <button id="asg-custom-dist-btn" type="button" class="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer" title="تخصيص وتوزيع درجات كل مقرر يدوياً">
              <svg class="w-3.5 h-3.5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              <span>تخصيص النقاط</span>
            </button>
            <button id="asg-add-new-btn" type="button" class="px-3.5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-950 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              <span>+ إضافة تكليف</span>
            </button>
          </div>
        </div>

        <!-- Unified Cohort Schedule Card (الموعد الموحد لجميع التكاليف) -->
        <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/5 via-amber-500/5 to-blue-900/5 border border-blue-900/15 shadow-2xs space-y-3.5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-blue-700 animate-pulse"></span>
              <h4 class="text-sm sm:text-base font-black text-slate-900">الموعد الزمني الموحد لكافة التكاليف</h4>
            </div>
            
            <button id="btn-apply-unified-dates" type="button" class="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0">
              <svg class="w-3.5 h-3.5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              <span>تطبيق الموعد الموحّد</span>
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/80">
            <div class="space-y-1">
              <label for="unified-asg-start" class="block text-xs font-bold text-slate-800">
                <span>تاريخ بدء التكاليف الموحّد</span>
              </label>
              <input type="date" id="unified-asg-start" value="${unifiedStartDate}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-hidden font-bold text-slate-900 shadow-2xs">
            </div>

            <div class="space-y-1">
              <label for="unified-asg-end" class="block text-xs font-bold text-slate-800">
                <span>تاريخ انتهاء التكاليف (الموعد النهائي الموحّد)</span>
              </label>
              <input type="date" id="unified-asg-end" value="${unifiedEndDate}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl bg-white border border-slate-300 focus:ring-2 focus:ring-blue-900 focus:outline-hidden font-bold text-slate-900 shadow-2xs">
            </div>
          </div>
        </div>

        <!-- Alert banner if total points is not 100 -->
        ${!isBalanced100 && assignments.length > 0 ? `
          <div class="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>إجمالي نقاط التكاليف الحالية هو <strong>${totalPoints} نقطة</strong> (المطلوب: 100 نقطة). يمكنك ضبطها تلقائياً بالتساوي.</span>
            </div>
            <button type="button" id="asg-fix-dist-btn" class="px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200/90 hover:bg-amber-300 rounded-lg shrink-0 cursor-pointer self-start sm:self-auto transition-colors">
              ⚡ ضبط 100 بالتساوي الآن
            </button>
          </div>
        ` : ''}

        <!-- Prominent alert banner if all assignments are disabled -->
        ${!hasAnyActive && assignments.length > 0 ? `
          <div class="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs">
            <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <div class="space-y-0.5">
              <div class="text-xs sm:text-sm font-bold text-amber-950">تنبيه إداري: لا يوجد أي تكليف نشط حالياً للطلاب!</div>
              <div class="text-xs text-amber-800 leading-relaxed">جميع التكاليف في حالة (مُعطّل) ومحجوبة عن الطلاب في خطتهم. اضغط زر «تفعيل» أمام التكليف المطلوب ليظهر للطلاب في لوحاتهم.</div>
            </div>
          </div>
        ` : ''}

        <div class="space-y-3">
          ${assignments.map(asg => {
            const isExpired = AssignmentService.isExpired(asg);
            const totalSubtaskPoints = (asg.subtasks || []).reduce((sum, s) => sum + (Number(s.points) || 0), 0);
            const isPointsBalanced = totalSubtaskPoints === Number(asg.points);

            return `
              <div class="p-4 rounded-xl border ${asg.active ? 'border-slate-200 bg-white' : 'border-amber-200/60 bg-amber-50/20'} flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div class="space-y-1">
                  <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-sm sm:text-base font-bold text-slate-900">${Utils.escapeHtml(asg.title)}</h4>
                    ${asg.active ? '<span class="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">مفعّل للطلاب</span>' : '<span class="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md">مُعطّل (محجوب)</span>'}
                    ${isExpired ? '<span class="text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">منتهي</span>' : ''}
                    ${!isPointsBalanced ? '<span class="text-[10px] font-medium text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">نقاط المهام غير مطابقة</span>' : ''}
                  </div>
                  <div class="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                    <span class="inline-flex items-center gap-1 text-slate-700 font-medium">
                      <span>الفترة:</span>
                      <strong class="text-blue-950 font-bold">${Utils.formatShortDate(asg.startDate)} ← ${Utils.formatShortDate(asg.endDate)}</strong>
                    </span>
                    <span>·</span>
                    <span class="font-mono font-semibold text-slate-800">${asg.points} نقطة (${(asg.subtasks || []).length} مهام)</span>
                  </div>
                </div>

                <!-- Actions: Safe actions on the right in RTL, then divider, then dangerous delete button isolated -->
                <div class="flex items-center gap-2 shrink-0 self-start md:self-auto">
                  <button class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors asg-edit-btn cursor-pointer" data-id="${asg.id}">
                    تعديل
                  </button>
                  <button class="px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${asg.active ? 'text-slate-600 hover:text-slate-900 border-slate-200 bg-slate-50' : 'text-emerald-800 border-emerald-300 bg-emerald-50 hover:bg-emerald-100'} asg-toggle-active-btn" data-id="${asg.id}">
                    ${asg.active ? 'تعطيل' : 'تفعيل'}
                  </button>
                  <span class="w-px h-4 bg-slate-200 mx-0.5 hidden sm:inline-block"></span>
                  <button class="px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 rounded-lg transition-colors asg-delete-btn cursor-pointer" data-id="${asg.id}">
                    حذف
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Hook Unified Dates Apply Button
    content.querySelector('#btn-apply-unified-dates')?.addEventListener('click', async () => {
      const start = content.querySelector('#unified-asg-start')?.value;
      const end = content.querySelector('#unified-asg-end')?.value;
      if (!start || !end) {
        Utils.showToast('يرجى تحديد تاريخي البداية والنهاية', 'error');
        return;
      }
      if (start > end) {
        Utils.showToast('تاريخ البداية يجب أن يكون قبل تاريخ النهاية', 'error');
        return;
      }
      try {
        await AssignmentService.updateUnifiedDates(start, end);
        Utils.showToast('تم توحيد مواعيد البدء والانتهاء لجميع التكاليف بنجاح ✓', 'success');
        await this.loadAll();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });

    // 1-Click Auto Distribute 100 Points Evenly
    const autoDistHandler = async () => {
      try {
        await AssignmentService.distribute100PointsEvenly();
        Utils.showToast('تم توزيع الـ 100 نقطة بالتساوي على جميع التكاليف وتحديث المهام الفرعية', 'success');
        await this.loadAll();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    };

    content.querySelector('#asg-auto-dist-btn')?.addEventListener('click', autoDistHandler);
    content.querySelector('#asg-fix-dist-btn')?.addEventListener('click', autoDistHandler);

    // Custom Distribution Modal Trigger
    content.querySelector('#asg-custom-dist-btn')?.addEventListener('click', () => {
      this.openPointsDistributionModal();
    });

    const addBtn = content.querySelector('#asg-add-new-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => this.openAssignmentModal(null));
    }

    content.querySelectorAll('.asg-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => this.openAssignmentModal(btn.dataset.id));
    });

    content.querySelectorAll('.asg-toggle-active-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await AssignmentService.toggleActive(btn.dataset.id);
          Utils.showToast('تم تحديث حالة التكليف', 'success');
          await this.loadAll();
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      });
    });

    content.querySelectorAll('.asg-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await Utils.confirm('هل أنت متأكد من حذف هذا التكليف؟ سيتم إعادة توزيع الـ 100 نقطة بالتساوي على باقي التكاليف تلقائياً.', 'حذف التكليف');
        if (ok) {
          try {
            await AssignmentService.deleteAssignment(btn.dataset.id, true);
            Utils.showToast('تم حذف التكليف وإعادة توزيع الـ 100 نقطة بالتساوي', 'success');
            await this.loadAll();
          } catch (err) {
            Utils.showToast(err.message, 'error');
          }
        }
      });
    });
  },

  /**
   * Open 100 Points Custom Distribution Modal
   */
  async openPointsDistributionModal() {
    const modal = document.getElementById('asg-points-dist-modal');
    const body = document.getElementById('asg-points-dist-body');
    const closeBtn = document.getElementById('asg-points-dist-close');
    if (!modal || !body) return;

    const assignments = await AssignmentService.getAllAssignments();
    if (assignments.length === 0) {
      Utils.showToast('لا توجد تكاليف مقررة حالياً لتوزيع النقاط عليها', 'info');
      return;
    }

    // Working local copy of points
    let items = assignments.map(a => ({
      id: a.id,
      title: a.title,
      points: Number(a.points) || 0,
      subtasksCount: (a.subtasks || []).length
    }));

    const render = () => {
      const currentSum = items.reduce((sum, item) => sum + item.points, 0);
      const isExactly100 = currentSum === 100;
      const diff = 100 - currentSum;

      body.innerHTML = `
        <div class="space-y-4">
          <!-- Live Status Summary Header -->
          <div class="p-3.5 rounded-2xl border transition-all ${
            isExactly100 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
              : (currentSum > 100 ? 'bg-red-50 border-red-200 text-red-950' : 'bg-amber-50 border-amber-200 text-amber-950')
          } shadow-2xs">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="text-xs font-semibold opacity-75">إجمالي النقاط الموزعة</div>
                <div class="text-2xl font-black font-mono tabular-nums tracking-tight mt-0.5">
                  ${currentSum} <span class="text-sm font-normal">/ 100 نقطة</span>
                </div>
              </div>

              <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <button type="button" id="modal-dist-auto-btn" class="px-3 py-1.5 text-xs font-bold text-blue-950 bg-white hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer">
                  <span>⚡ توزيع بالتساوي (Auto)</span>
                </button>
              </div>
            </div>

            <!-- Balance Status Hint -->
            <div class="mt-2 pt-2 border-t border-black/5 text-xs flex items-center gap-1.5 font-medium">
              ${isExactly100 ? `
                <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                <span class="text-emerald-800">ممتاز! المجموع يطابق الـ 100 نقطة تماماً ويمكنك الحفظ مباشرة.</span>
              ` : (currentSum < 100 ? `
                <svg class="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span class="text-amber-800">متبقي <strong>${diff} نقطة</strong> لتكتمل الـ 100 نقطة.</span>
              ` : `
                <svg class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                <span class="text-red-800">المجموع يتجاوز الـ 100 بمقدار <strong>${Math.abs(diff)} نقطة</strong>. يرجى خفض النقاط.</span>
              `)}
            </div>
          </div>

          <!-- Assignments Inputs List -->
          <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            ${items.map((item, idx) => `
              <div class="p-3.5 rounded-xl border border-stone-200/90 bg-white hover:border-blue-200 transition-colors flex items-center justify-between gap-3 shadow-2xs">
                <div class="space-y-0.5 min-w-0">
                  <div class="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    ${idx + 1}. ${Utils.escapeHtml(item.title)}
                  </div>
                  <div class="text-[11px] text-slate-500">
                    تتوزع على ${item.subtasksCount} مهام فرعية
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button type="button" class="btn-step-minus w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-base flex items-center justify-center cursor-pointer select-none" data-index="${idx}">
                    -
                  </button>
                  <div class="relative">
                    <input type="number" min="0" max="100" class="asg-dist-input w-16 p-1.5 text-center text-sm font-black font-mono rounded-lg border border-stone-300 focus:ring-2 focus:ring-blue-900 focus:outline-hidden" value="${item.points}" data-index="${idx}">
                  </div>
                  <button type="button" class="btn-step-plus w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-base flex items-center justify-center cursor-pointer select-none" data-index="${idx}">
                    +
                  </button>
                  <span class="text-xs text-slate-600 font-medium min-w-[28px]">نقطة</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Action Buttons -->
          <div class="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <button type="button" id="modal-dist-cancel-btn" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">
              إلغاء
            </button>

            <button type="button" id="modal-dist-save-btn" class="px-5 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer ${
              isExactly100 ? 'bg-blue-900 hover:bg-blue-950' : 'bg-slate-400 opacity-60 cursor-not-allowed'
            }" ${!isExactly100 ? 'disabled' : ''}>
              <span>اعتماد وحفظ توزيع النقاط</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
          </div>
        </div>
      `;

      // Wire Auto Distribute button inside modal
      body.querySelector('#modal-dist-auto-btn')?.addEventListener('click', () => {
        const count = items.length;
        if (count === 0) return;
        const base = Math.floor(100 / count);
        const rem = 100 % count;
        items.forEach((item, idx) => {
          item.points = base + (idx < rem ? 1 : 0);
        });
        render();
      });

      // Wire Minus and Plus buttons
      body.querySelectorAll('.btn-step-minus').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          if (items[idx].points > 0) {
            items[idx].points -= 1;
            render();
          }
        });
      });

      body.querySelectorAll('.btn-step-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = Number(btn.dataset.index);
          if (items[idx].points < 100) {
            items[idx].points += 1;
            render();
          }
        });
      });

      // Wire direct input
      body.querySelectorAll('.asg-dist-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = Number(e.target.dataset.index);
          const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
          items[idx].points = val;
          render();
        });
      });

      // Wire Cancel button
      body.querySelector('#modal-dist-cancel-btn')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      });

      // Wire Save button
      body.querySelector('#modal-dist-save-btn')?.addEventListener('click', async () => {
        const sum = items.reduce((s, it) => s + it.points, 0);
        if (sum !== 100) {
          Utils.showToast(`المجموع الحالي (${sum}) لا يساوي 100 نقطة. يرجى ضبطه ليكون 100 تماماً`, 'warning');
          return;
        }

        try {
          await AssignmentService.applyCustomPointsDistribution(items.map(it => ({ id: it.id, points: it.points })));
          Utils.showToast('تم اعتماد وتحديث توزيع الـ 100 نقطة بنجاح، وتوزيع نقاط المهام الفرعية بالتطابق', 'success');
          modal.classList.add('hidden');
          modal.style.display = 'none';
          await this.loadAll();
        } catch (err) {
          Utils.showToast(err.message, 'error');
        }
      });
    };

    render();

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      };
    }
  },

  /**
   * Open Student Detail Modal
   */
  async openStudentDetailModal(studentId) {
    const student = await UserService.getUserById(studentId);
    if (!student) return;

    const stats = await ProgressService.getStudentOverallStats(studentId);
    const att = await AttendanceService.getStudentSummary(studentId);

    const modal = document.getElementById('student-detail-modal');
    const modalContent = document.getElementById('student-detail-content');
    if (!modal || !modalContent) return;

    modalContent.innerHTML = `
      <div class="space-y-5">
        <!-- Student Header -->
        <div class="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-lg font-bold text-slate-900">${Utils.escapeHtml(student.name)}</h3>
              <span class="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                ${student.mahadName || 'مرحلة التأهيل'}
              </span>
            </div>
            <div class="text-xs text-slate-500">${Utils.escapeHtml(student.email)}</div>
          </div>
          <div class="text-left">
            <div class="text-xs text-slate-500">إجمالي النقاط</div>
            <div class="text-xl font-bold font-mono text-emerald-800 tabular-nums">${stats.totalEarnedPoints} / ${stats.totalMaxPoints}</div>
          </div>
        </div>

        <!-- Attendance Record Section -->
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">سجل الحضور والغياب (الأحد والثلاثاء)</h4>
          <div class="grid grid-cols-3 gap-2 text-center text-xs">
            <div class="p-2 rounded-lg bg-emerald-100/60 text-emerald-900">
              <div class="text-[11px]">حضور</div>
              <div class="text-base font-bold font-mono">${att.presentCount}</div>
            </div>
            <div class="p-2 rounded-lg bg-amber-100/60 text-amber-900">
              <div class="text-[11px]">اعتذار</div>
              <div class="text-base font-bold font-mono">${att.excusedCount}</div>
            </div>
            <div class="p-2 rounded-lg bg-red-100/60 text-red-900">
              <div class="text-[11px]">غياب</div>
              <div class="text-base font-bold font-mono">${att.absentCount}</div>
            </div>
          </div>

          <!-- Absence Dates List -->
          <div>
            <div class="text-xs font-semibold text-slate-600 mb-1">تواريخ الغياب المسجلة:</div>
            ${att.absenceDates.length === 0 ? `
              <div class="text-xs text-emerald-700">لا يوجد أي تسجيل غياب لهذا الطالب (سجل ممتاز).</div>
            ` : `
              <div class="flex flex-wrap gap-1.5">
                ${att.absenceDates.map(dateStr => `
                  <span class="inline-flex items-center text-xs font-mono font-medium text-red-800 bg-red-100/80 px-2 py-0.5 rounded-md">
                    ${Utils.formatDateArabic(dateStr)}
                  </span>
                `).join('')}
              </div>
            `}
          </div>
        </div>

        <!-- Assignments Breakdown -->
        <div class="space-y-3">
          <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider">تفاصيل إنجاز التكاليف (${stats.assignmentDetails.length})</h4>
          <div class="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            ${stats.assignmentDetails.map(item => {
              const asg = item.assignment;
              const s = item.stats;
              const completed = item.completedSubtaskIds;

              return `
                <div class="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <div class="flex items-center justify-between text-xs mb-1.5">
                    <span class="font-bold text-slate-900">${Utils.escapeHtml(asg.title)}</span>
                    <span class="font-mono tabular-nums font-semibold ${s.percentage === 100 ? 'text-teal-700' : 'text-slate-700'}">
                      ${s.earnedPoints} / ${s.totalPoints} نقطة (${s.percentage}%)
                    </span>
                  </div>

                  <!-- Subtasks mini checklist -->
                  <div class="space-y-1 pt-1.5 border-t border-slate-100">
                    ${(asg.subtasks || []).map(sub => {
                      const isDone = completed.includes(sub.id);
                      return `
                        <div class="flex items-center justify-between text-xs py-0.5">
                          <span class="flex items-center gap-1.5 ${isDone ? 'text-slate-800' : 'text-slate-400'}">
                            <span>${isDone ? '✓' : '○'}</span>
                            <span class="${isDone ? 'font-medium' : ''}">${Utils.escapeHtml(sub.title)}</span>
                          </span>
                          <span class="font-mono text-[11px] ${isDone ? 'text-emerald-700 font-semibold' : 'text-slate-400'}">
                            ${sub.points} نقطة
                          </span>
                        </div>
                      `;
                    }).join('')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('student-detail-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      };
    }
  },

  /**
   * Open Assignment Create / Edit Modal
   */
  async openAssignmentModal(assignmentId = null) {
    this.editingAssignmentId = assignmentId;
    const modal = document.getElementById('asg-form-modal');
    const titleEl = document.getElementById('asg-form-title');
    if (!modal) return;

    const unified = await AssignmentService.getUnifiedDates();

    let asg = {
      title: '',
      description: '',
      sourceType: 'none',
      sourceUrl: '',
      startDate: unified.startDate,
      endDate: unified.endDate,
      points: 20,
      active: true,
      subtasks: [
        { id: 'sub_1', title: 'المهمة الأولى', points: 10 },
        { id: 'sub_2', title: 'المهمة الثانية', points: 10 }
      ]
    };

    if (assignmentId) {
      const found = await AssignmentService.getAssignmentById(assignmentId);
      if (found) asg = JSON.parse(JSON.stringify(found));
      titleEl.textContent = 'تعديل التكليف';
    } else {
      titleEl.textContent = 'إضافة تكليف جديد';
    }

    this.currentFormData = asg;
    this.renderAssignmentModalForm();
    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const closeBtn = document.getElementById('asg-form-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        modal.classList.add('hidden');
        modal.style.display = 'none';
      };
    }
  },

  /**
   * Render internal form inside assignment modal
   */
  renderAssignmentModalForm() {
    const body = document.getElementById('asg-form-body');
    if (!body) return;

    const asg = this.currentFormData;

    body.innerHTML = `
      <form id="asg-editor-form" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">اسم التكليف *</label>
          <input type="text" id="asg-input-title" required value="${Utils.escapeHtml(asg.title)}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-emerald-500 focus:outline-hidden" placeholder="مثال: مختصر الأسماء والصفات">
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1">وصف التكليف</label>
          <textarea id="asg-input-desc" rows="2" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-emerald-500 focus:outline-hidden" placeholder="وصف موجز">${Utils.escapeHtml(asg.description || '')}</textarea>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>رابط المصدر</span>
            <span class="text-[11px] text-slate-500 font-normal">اختياري</span>
          </label>
          <input type="url" id="asg-input-source-url" value="${Utils.escapeHtml(asg.sourceUrl || '')}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-blue-900 focus:border-blue-900 focus:outline-hidden" placeholder="https://... (رابط المادة، Drive، أو يوتيوب)">
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              <span>تاريخ البداية *</span>
              <span class="text-[10px] text-blue-800 font-bold bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">موحّد</span>
            </label>
            <input type="date" id="asg-input-start" required value="${asg.startDate}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-blue-900 focus:outline-hidden font-bold">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">
              <span>تاريخ النهاية *</span>
              <span class="text-[10px] text-blue-800 font-bold bg-blue-50 border border-blue-200 px-1 py-0.2 rounded">موحّد</span>
            </label>
            <input type="date" id="asg-input-end" required value="${asg.endDate}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-blue-900 focus:outline-hidden font-bold">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">إجمالي النقاط *</label>
            <input type="number" id="asg-input-points" min="1" max="100" required value="${asg.points}" class="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-slate-300 focus:ring-emerald-500 focus:outline-hidden font-bold">
          </div>
        </div>

        <!-- Subtasks Builder with clear breathing room and distinct action buttons -->
        <div class="pt-3 border-t border-slate-200">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs font-bold text-slate-900">قائمة المهام الفرعية للتكليف</span>
                <span class="text-[11px] font-mono px-2 py-0.5 rounded-md" id="subtasks-points-sum-label"></span>
              </div>
              <p class="text-[11px] text-slate-500 mt-0.5">حدد خطوات الإنجاز ووزع النقاط عليها بالتساوي أو حسب الوزن</p>
            </div>
            <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button type="button" id="btn-auto-distribute" class="px-3 py-1.5 text-xs font-bold text-blue-950 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs">
                <span>⚡ توزيع النقاط بالتساوي</span>
              </button>
              <button type="button" id="btn-add-subtask" class="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer shadow-2xs">
                + مهمة
              </button>
            </div>
          </div>

          <div id="subtasks-list-container" class="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            <!-- Subtask items -->
          </div>
        </div>

        <!-- Active Toggle Switch with authentic visual indicator -->
        <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
          <div>
            <div class="text-xs font-bold text-slate-900">نشر التكليف وإتاحته للطلاب</div>
            <div class="text-[11px] text-slate-500 mt-0.5" id="asg-active-desc">
              ${asg.active ? 'التكليف نشط ويظهر مباشرة في خطة الطلاب' : 'التكليف في وضع الإيقاف ومحجوب عن الطلاب'}
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" id="asg-input-active" class="sr-only peer" ${asg.active ? 'checked' : ''}>
            <div class="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900 shadow-2xs"></div>
          </label>
        </div>

        ${!this.editingAssignmentId ? `
          <!-- 100 Points Auto-Rebalance Option for New Assignment -->
          <div class="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200/90 flex items-center justify-between gap-3">
            <div>
              <div class="text-xs font-bold text-blue-950">موازنة الـ 100 نقطة الشاملة تلقائياً</div>
              <div class="text-[11px] text-blue-800/80 mt-0.5">
                توزيع الـ 100 نقطة بالتساوي على جميع التكاليف المقررة بما فيها هذا التكليف
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input type="checkbox" id="asg-input-auto-distribute" class="sr-only peer" checked>
              <div class="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900 shadow-2xs"></div>
            </label>
          </div>
        ` : ''}

        <!-- Submit Button -->
        <div class="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
          <button type="button" id="asg-form-cancel-btn" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">إلغاء</button>
          <button type="submit" class="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-xl shadow-xs cursor-pointer">حفظ التكليف</button>
        </div>
      </form>
    `;

    this.renderSubtaskRows();

    // Attach active toggle switch description update
    const activeToggle = body.querySelector('#asg-input-active');
    const activeDesc = body.querySelector('#asg-active-desc');
    if (activeToggle && activeDesc) {
      activeToggle.addEventListener('change', (e) => {
        activeDesc.textContent = e.target.checked 
          ? 'التكليف نشط ويظهر مباشرة في خطة الطلاب' 
          : 'التكليف في وضع الإيقاف ومحجوب عن الطلاب';
      });
    }

    // Attach events
    const cancelBtn = body.querySelector('#asg-form-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        const modal = document.getElementById('asg-form-modal');
        modal.classList.add('hidden');
        modal.style.display = 'none';
      });
    }

    const addSubtaskBtn = body.querySelector('#btn-add-subtask');
    if (addSubtaskBtn) {
      addSubtaskBtn.addEventListener('click', () => {
        const count = this.currentFormData.subtasks.length + 1;
        this.currentFormData.subtasks.push({
          id: `sub_${Date.now()}_${count}`,
          title: `المهمة ${count}`,
          points: 1
        });
        this.renderSubtaskRows();
      });
    }

    const autoDistributeBtn = body.querySelector('#btn-auto-distribute');
    if (autoDistributeBtn) {
      autoDistributeBtn.addEventListener('click', () => {
        const total = Number(document.getElementById('asg-input-points').value) || 20;
        const count = this.currentFormData.subtasks.length;
        if (count === 0) return;

        const base = Math.floor(total / count);
        const remainder = total % count;

        this.currentFormData.subtasks.forEach((st, idx) => {
          st.points = base + (idx < remainder ? 1 : 0);
        });

        this.renderSubtaskRows();
      });
    }

    // Form submit
    const form = body.querySelector('#asg-editor-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const title = document.getElementById('asg-input-title').value.trim();
        const description = document.getElementById('asg-input-desc').value.trim();
        const sourceUrl = (document.getElementById('asg-input-source-url')?.value || '').trim();
        const sourceType = sourceUrl ? 'link' : 'none';
        const startDate = document.getElementById('asg-input-start').value;
        const endDate = document.getElementById('asg-input-end').value;
        const points = Number(document.getElementById('asg-input-points').value);
        const active = document.getElementById('asg-input-active').checked;

        if (this.currentFormData.subtasks.length === 0) {
          throw new Error('يجب إضافة مهمة فرعية واحدة على الأقل للتكليف.');
        }

        const sumSubtaskPoints = this.currentFormData.subtasks.reduce((sum, s) => sum + Number(s.points || 0), 0);
        if (sumSubtaskPoints !== points) {
          throw new Error(`مجموع نقاط المهام (${sumSubtaskPoints}) لا يتطابق مع إجمالي نقاط التكليف (${points}). اضغط "توزيع النقاط بالتساوي" أو عدلها يدويًا.`);
        }

        const payload = {
          title,
          description,
          sourceType,
          sourceUrl,
          startDate,
          endDate,
          points,
          active,
          subtasks: this.currentFormData.subtasks
        };

        if (this.editingAssignmentId) {
          await AssignmentService.updateAssignment(this.editingAssignmentId, payload);
          Utils.showToast('تم تحديث التكليف بنجاح', 'success');
        } else {
          const autoDistribute = document.getElementById('asg-input-auto-distribute')?.checked ?? true;
          await AssignmentService.createAssignment(payload, autoDistribute);
          Utils.showToast(autoDistribute 
            ? 'تمت إضافة التكليف وتوزيع الـ 100 نقطة بالتساوي تلقائياً' 
            : 'تمت إضافة التكليف بنجاح', 'success');
        }

        const formModal = document.getElementById('asg-form-modal');
        if (formModal) {
          formModal.classList.add('hidden');
          formModal.style.display = 'none';
        }
        await this.loadAll();
      } catch (err) {
        Utils.showToast(err.message, 'error');
      }
    });
  },

  renderSubtaskRows() {
    const container = document.getElementById('subtasks-list-container');
    const label = document.getElementById('subtasks-points-sum-label');
    if (!container) return;

    const subtasks = this.currentFormData.subtasks;
    const totalPointsInput = document.getElementById('asg-input-points');
    const targetPoints = totalPointsInput ? Number(totalPointsInput.value) : 20;

    const currentSum = subtasks.reduce((sum, s) => sum + Number(s.points || 0), 0);
    if (label) {
      label.textContent = `(المجموع: ${currentSum} من ${targetPoints} نقطة)`;
      label.className = `text-[11px] font-mono ${currentSum === targetPoints ? 'text-emerald-700' : 'text-red-600 font-bold'}`;
    }

    container.innerHTML = subtasks.map((st, idx) => `
      <div class="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
        <span class="text-xs text-slate-400 font-mono w-5">${idx + 1}.</span>
        <input type="text" class="subtask-title-input flex-1 text-xs p-1.5 rounded-md border border-slate-300 focus:outline-hidden" value="${Utils.escapeHtml(st.title)}" data-index="${idx}" placeholder="عنوان المهمة" required>
        <div class="flex items-center gap-1">
          <input type="number" min="1" max="100" class="subtask-points-input w-16 text-xs p-1.5 rounded-md border border-slate-300 font-mono text-center focus:outline-hidden" value="${st.points}" data-index="${idx}" required>
          <span class="text-[11px] text-slate-500">نقطة</span>
        </div>
        <button type="button" class="subtask-remove-btn text-slate-400 hover:text-red-600 p-1 text-sm" data-index="${idx}">&times;</button>
      </div>
    `).join('');

    // Attach listeners
    container.querySelectorAll('.subtask-title-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.dataset.index);
        subtasks[idx].title = e.target.value;
      });
    });

    container.querySelectorAll('.subtask-points-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = Number(e.target.dataset.index);
        subtasks[idx].points = Number(e.target.value) || 0;
        const currentSum = subtasks.reduce((sum, s) => sum + Number(s.points || 0), 0);
        if (label) {
          label.textContent = `(المجموع: ${currentSum} من ${targetPoints} نقطة)`;
          label.className = `text-[11px] font-mono ${currentSum === targetPoints ? 'text-emerald-700' : 'text-red-600 font-bold'}`;
        }
      });
    });

    container.querySelectorAll('.subtask-remove-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = Number(e.target.dataset.index);
        subtasks.splice(idx, 1);
        this.renderSubtaskRows();
      });
    });
  },

  /**
   * Modal to add a new student directly into Firestore and Storage
   */
  async openAddStudentModal() {
    let modal = document.getElementById('add-student-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'add-student-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs transition-opacity';
      document.body.appendChild(modal);
    }

    const mahaden = await UserService.getMahaden();

    modal.innerHTML = `
      <div class="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 text-slate-900 animate-in fade-in zoom-in-95 duration-200">
        <div class="flex items-center justify-between pb-3 border-b border-stone-100">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold">
              <svg class="w-5 h-5 text-blue-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
            </div>
            <div>
              <h3 class="text-base sm:text-lg font-bold text-slate-900">إضافة طالب جديد</h3>
              <p class="text-[11px] text-stone-500">سيظهر فوراً لمسؤول التحضير وفي غرفة القيادة</p>
            </div>
          </div>
          <button type="button" id="close-add-student-modal" class="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer">
            ✕
          </button>
        </div>

        <form id="add-student-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">اسم الطالب الكامل *</label>
            <input type="text" id="new-student-name" required placeholder="مثال: عبد الله بن محمد القحطاني" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:outline-hidden">
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">المحضن التعليمي *</label>
            <select id="new-student-mahad" required class="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:outline-hidden bg-white">
              ${mahaden.map(m => `
                <option value="${m.id}" data-name="${m.name}" ${m.id === this.selectedMahadFilter ? 'selected' : ''}>
                  ${m.name} (${m.track} - ${m.neighborhood})
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1">معرّف الطالب أو UID بالفايربيز (اختياري)</label>
            <input type="text" id="new-student-id-email" placeholder="اتركه فارغاً للتوليد التلقائي أو ضع UID للطالب" class="w-full text-xs sm:text-sm p-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-700 focus:outline-hidden font-mono text-xs">
            <span class="text-[10px] text-stone-400 mt-1 block">إذا كان للطالب حساب UID بالفايربيز ضعه هنا لربط الدخول مباشرة.</span>
          </div>

          <div class="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button type="button" id="cancel-add-student" class="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 font-semibold text-xs cursor-pointer">
              إلغاء
            </button>
            <button type="submit" id="submit-add-student-btn" class="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer">
              <span>تأكيد الإضافة والحفظ</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
            </button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.style.display = 'flex';

    const closeModal = () => {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    };

    modal.querySelector('#close-add-student-modal')?.addEventListener('click', closeModal);
    modal.querySelector('#cancel-add-student')?.addEventListener('click', closeModal);

    const form = modal.querySelector('#add-student-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = modal.querySelector('#new-student-name').value.trim();
      const mahadSelect = modal.querySelector('#new-student-mahad');
      const mahadId = mahadSelect.value;
      const mahadName = mahadSelect.options[mahadSelect.selectedIndex]?.dataset.name || mahaden.find(m => m.id === mahadId)?.name || '';
      const customInput = modal.querySelector('#new-student-id-email').value.trim();

      let studentId = undefined;
      let email = undefined;
      if (customInput) {
        if (customInput.includes('@')) {
          email = customInput;
        } else {
          studentId = customInput;
        }
      }

      const submitBtn = modal.querySelector('#submit-add-student-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'جارٍ الحفظ...';

      try {
        await UserService.addStudent({
          id: studentId,
          name,
          mahadId,
          mahadName,
          email
        });
        Utils.showToast(`تمت إضافة الطالب «${name}» بنجاح ويظهر فوراً في التحضير وغرفة القيادة`, 'success');
        closeModal();
        await this.loadAll();
      } catch (err) {
        Utils.showToast(err.message || 'حدث خطأ أثناء إضافة الطالب', 'error');
        submitBtn.disabled = false;
        submitBtn.textContent = 'تأكيد الإضافة والحفظ';
      }
    });
  }
};
