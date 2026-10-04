/**
 * Storage Layer for Platform «مرحلة التأهيل»
 * Isolates all localStorage interactions so they can be seamlessly
 * replaced by Cloud Firestore SDK in the future without touching the UI.
 */

import { INITIAL_DATA } from './data.js';
import { getOfficialLogoDataUrl } from './logo.js';

const STORAGE_KEYS = {
  MAHADEN: 'taheel_mahaden_v6',
  USERS: 'taheel_users_v6',
  ASSIGNMENTS: 'taheel_assignments_v6',
  PROGRESS: 'taheel_progress_v6',
  ATTENDANCE: 'taheel_attendance_v6',
  CURRENT_USER_ID: 'taheel_session_user_v6',
  CUSTOM_LOGO: 'taheel_custom_logo_v3'
};

export const Storage = {
  /**
   * Initialize storage with clean production state and purge all mock/test data
   */
  init() {
    // Aggressively purge all previous mock/demo storage keys from any previous versions
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('taheel_') && k !== STORAGE_KEYS.CUSTOM_LOGO && k !== 'taheel_custom_logo_v3') {
          if (!k.endsWith('_v6')) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      // Explicitly purge v5 and older attendance and progress
      ['taheel_attendance_v5', 'taheel_progress_v5', 'taheel_attendance_v4', 'taheel_progress_v4', 'taheel_attendance_v3', 'taheel_progress_v3', 'taheel_attendance', 'taheel_progress'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    } catch (_) {}

    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      this.resetToDefaults();
    }
  },

  /**
   * Reset all data back to the clean initial seed state
   */
  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.MAHADEN, JSON.stringify(INITIAL_DATA.mahaden));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_DATA.users));
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_DATA.assignments));
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify({}));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify([]));
    // Note: Do NOT set CURRENT_USER_ID here so the login screen is displayed on first load.
  },

  // MAHADEN
  getMahaden() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MAHADEN);
      return data ? JSON.parse(data) : INITIAL_DATA.mahaden;
    } catch {
      return INITIAL_DATA.mahaden;
    }
  },

  saveMahaden(mahaden) {
    localStorage.setItem(STORAGE_KEYS.MAHADEN, JSON.stringify(mahaden));
  },

  // USERS
  getUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      let localUsers = data ? JSON.parse(data) : [];
      const userMap = new Map();

      // 1. Always seed all initial 56 approved accounts (guarantees they can NEVER be missing)
      INITIAL_DATA.users.forEach(u => {
        if (u && u.id) userMap.set(u.id, u);
      });

      // 2. Merge any local additions or updates
      if (Array.isArray(localUsers)) {
        localUsers.forEach(u => {
          if (u && u.id) {
            userMap.set(u.id, { ...userMap.get(u.id), ...u });
          }
        });
      }

      const merged = Array.from(userMap.values());
      return merged;
    } catch {
      return INITIAL_DATA.users;
    }
  },

  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },

  addStudent(student) {
    const users = this.getUsers();
    const existingIndex = users.findIndex(u => u.id === student.id);
    if (existingIndex > -1) {
      users[existingIndex] = student;
    } else {
      users.push(student);
    }
    this.saveUsers(users);
  },

  // ASSIGNMENTS
  getAssignments() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      let localAsgs = data ? JSON.parse(data) : [];
      if (Array.isArray(localAsgs) && localAsgs.length > 0) {
        const isOldDemo = localAsgs.some(a => 
          a.id === 'asg_1_hifz' || 
          a.id === 'asg_2_asmaa' || 
          a.id === 'asg_3_tuhfa' || 
          a.id === 'asg_4_rooh' || 
          a.id === 'asg_5_kifah'
        );
        if (!isOldDemo) {
          return localAsgs;
        }
      }
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(INITIAL_DATA.assignments));
      return INITIAL_DATA.assignments;
    } catch {
      return INITIAL_DATA.assignments;
    }
  },

  saveAssignments(assignments) {
    localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
  },

  // PROGRESS
  getProgress() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  saveProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress || {}));
  },

  // ATTENDANCE
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveAttendance(attendance) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance || []));
  },

  // LOGO
  getCustomLogo() {
    try {
      const keys = [
        'taheel_custom_logo_v3',
        'taheel_custom_logo_v5',
        'taheel_custom_logo_v4',
        'taheel_custom_logo_v2',
        'taheel_custom_logo_v1',
        'taheel_custom_logo',
        'taheel_logo',
        'custom_logo',
        'app_logo'
      ];
      for (const k of keys) {
        const val = localStorage.getItem(k);
        if (val && typeof val === 'string' && val.length > 20) {
          if (k !== STORAGE_KEYS.CUSTOM_LOGO) {
            localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, val);
          }
          return val;
        }
      }
    } catch (_) {}
    return getOfficialLogoDataUrl();
  },

  saveCustomLogo(logoDataUrl) {
    if (logoDataUrl) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_LOGO, logoDataUrl);
      localStorage.setItem('taheel_custom_logo_v3', logoDataUrl);
      localStorage.setItem('taheel_custom_logo_v5', logoDataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CUSTOM_LOGO);
      localStorage.removeItem('taheel_custom_logo_v3');
      localStorage.removeItem('taheel_custom_logo_v5');
    }
    window.dispatchEvent(new CustomEvent('logo-updated', { detail: logoDataUrl }));
  },

  // SESSION
  getCurrentUserId() {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || null;
  },

  setCurrentUserId(userId) {
    if (userId) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
    }
  }
};
