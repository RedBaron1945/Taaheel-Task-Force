/**
 * Storage Layer for Platform «مرحلة التأهيل»
 * Isolates all localStorage interactions so they can be seamlessly
 * replaced by Cloud Firestore SDK in the future without touching the UI.
 */

import { INITIAL_DATA } from './data.js';
import { getOfficialLogoDataUrl } from './logo.js';

const STORAGE_KEYS = {
  MAHADEN: 'taheel_mahaden_v5',
  USERS: 'taheel_users_v5',
  ASSIGNMENTS: 'taheel_assignments_v5',
  PROGRESS: 'taheel_progress_v5',
  ATTENDANCE: 'taheel_attendance_v5',
  CURRENT_USER_ID: 'taheel_session_user_v5',
  CUSTOM_LOGO: 'taheel_custom_logo_v3'
};

export const Storage = {
  /**
   * Initialize storage with seed data if not already present
   */
  init() {
    // Purge previous mock/demo storage keys
    const oldKeys = [
      'taheel_mahaden_v4', 'taheel_users_v4', 'taheel_assignments_v4',
      'taheel_progress_v4', 'taheel_attendance_v4', 'taheel_session_user_v4',
      'taheel_mahaden_v3', 'taheel_users_v3', 'taheel_assignments_v3',
      'taheel_progress_v3', 'taheel_attendance_v3', 'taheel_session_user_v3'
    ];
    oldKeys.forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {}
    });

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
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(INITIAL_DATA.progress));
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(INITIAL_DATA.attendance));
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
      if (!Array.isArray(localUsers) || localUsers.length === 0) {
        localUsers = INITIAL_DATA.users;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(localUsers));
        return localUsers;
      }
      // Merge INITIAL_DATA.users so all added students are present
      const map = new Map();
      INITIAL_DATA.users.forEach(u => map.set(u.id, u));
      localUsers.forEach(u => map.set(u.id, { ...map.get(u.id), ...u }));
      const merged = Array.from(map.values());
      if (merged.length !== localUsers.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(merged));
      }
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
      return data ? JSON.parse(data) : INITIAL_DATA.assignments;
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
      return data ? JSON.parse(data) : INITIAL_DATA.progress;
    } catch {
      return INITIAL_DATA.progress;
    }
  },

  saveProgress(progress) {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  },

  // ATTENDANCE
  getAttendance() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return data ? JSON.parse(data) : INITIAL_DATA.attendance;
    } catch {
      return INITIAL_DATA.attendance;
    }
  },

  saveAttendance(attendance) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendance));
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
