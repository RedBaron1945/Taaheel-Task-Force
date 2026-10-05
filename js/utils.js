/**
 * Utilities for Platform «مرحلة التأهيل»
 */

export const Utils = {
  /**
   * Format ISO date string (YYYY-MM-DD) into readable Arabic format with standard digits
   */
  formatDateArabic(dateStr) {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
    } catch {
      return dateStr;
    }
  },

  /**
   * Format short date (day & month) with standard digits
   */
  formatShortDate(dateStr) {
    if (!dateStr) return '—';
    try {
      const [year, month, day] = dateStr.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('ar-SA-u-ca-gregory-nu-latn', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  },

  /**
   * Check if a date string is past (expired) compared to current date
   */
  isDatePast(endDateStr) {
    if (!endDateStr) return false;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const [y, m, d] = endDateStr.split('-').map(Number);
    const end = new Date(y, m - 1, d);
    end.setHours(23, 59, 59, 999);
    return end < now;
  },

  /**
   * Check if day is Sunday (0) or Tuesday (2)
   */
  isValidAttendanceDay(dateStr) {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day = date.getDay();
    return day === 0 || day === 2; // 0 = Sunday, 2 = Tuesday
  },

  /**
   * Get Arabic Month name
   */
  getArabicMonthName(monthIndex) {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    return months[monthIndex] || '';
  },

  /**
   * Generate list of past and upcoming Sunday and Tuesday dates around current date
   */
  getRecentSundaysAndTuesdays(count = 12) {
    const dates = [];
    const today = new Date();
    // Start search from 21 days ago up to 14 days ahead
    const cursor = new Date(today);
    cursor.setDate(cursor.getDate() - 21);

    while (dates.length < count) {
      const day = cursor.getDay();
      if (day === 0 || day === 2) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, '0');
        const d = String(cursor.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        const dayName = day === 0 ? 'الأحد' : 'الثلاثاء';
        dates.push({
          date: iso,
          label: `${dayName} (${d}/${m}/${y})`,
          isToday: cursor.toDateString() === today.toDateString()
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  },

  /**
   * Show a modern floating toast notification
   */
  showToast(message, type = 'info', duration = 3500) {
    if (!message) return;
    try {
      const containerId = 'app-toast-container';
      let container = document.getElementById(containerId);
      if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none w-full max-w-md px-4 pb-safe';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      let bgClasses = 'bg-slate-900 text-white border-slate-700 shadow-xl';
      let iconSvg = '<svg class="w-4 h-4 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';

      if (type === 'success') {
        bgClasses = 'bg-emerald-800 text-white border-emerald-600 shadow-xl shadow-emerald-950/20';
        iconSvg = '<svg class="w-4 h-4 text-emerald-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>';
      } else if (type === 'error') {
        bgClasses = 'bg-rose-800 text-white border-rose-600 shadow-xl shadow-rose-950/20';
        iconSvg = '<svg class="w-4 h-4 text-rose-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
      } else if (type === 'warning') {
        bgClasses = 'bg-amber-700 text-white border-amber-500 shadow-xl shadow-amber-950/20';
        iconSvg = '<svg class="w-4 h-4 text-amber-200 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
      }

      toast.className = `pointer-events-auto px-4 py-2.5 rounded-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-bold transition-all duration-300 transform translate-y-3 opacity-0 ${bgClasses}`;
      toast.innerHTML = `
        ${iconSvg}
        <span class="flex-1 leading-snug">${this.escapeHtml(message)}</span>
      `;

      container.appendChild(toast);

      // Trigger enter animation
      requestAnimationFrame(() => {
        toast.classList.remove('translate-y-3', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
      });

      // Auto dismiss
      setTimeout(() => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-3', 'opacity-0');
        setTimeout(() => toast.remove(), 350);
      }, duration);
    } catch (_) {}
  },

  /**
   * Show confirmation modal
   */
  confirm(message, title = 'تأكيد الإجراء') {
    return new Promise((resolve) => {
      const modal = document.getElementById('confirm-modal');
      const titleEl = document.getElementById('confirm-modal-title');
      const msgEl = document.getElementById('confirm-modal-msg');
      const okBtn = document.getElementById('confirm-modal-ok');
      const cancelBtn = document.getElementById('confirm-modal-cancel');

      if (!modal || !okBtn || !cancelBtn) {
        resolve(window.confirm(message));
        return;
      }

      titleEl.textContent = title;
      msgEl.textContent = message;
      modal.classList.remove('hidden');
      modal.style.display = 'flex';

      const handleOk = () => {
        cleanup();
        modal.classList.add('hidden');
        modal.style.display = 'none';
        resolve(true);
      };

      const handleCancel = () => {
        cleanup();
        modal.classList.add('hidden');
        modal.style.display = 'none';
        resolve(false);
      };

      const cleanup = () => {
        okBtn.removeEventListener('click', handleOk);
        cancelBtn.removeEventListener('click', handleCancel);
      };

      okBtn.addEventListener('click', handleOk);
      cancelBtn.addEventListener('click', handleCancel);
    });
  },

  /**
   * Escape HTML string
   */
  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
