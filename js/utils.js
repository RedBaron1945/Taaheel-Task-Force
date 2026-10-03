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
   * Show a toast message (Disabled per user request)
   */
  showToast(message, type = 'info', duration = 3000) {
    // Top-of-page notifications disabled
    return;
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
