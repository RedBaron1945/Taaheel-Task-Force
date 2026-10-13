/**
 * Storage Layer for Platform «مرحلة التأهيل»
 * Isolates all localStorage interactions so they can be seamlessly
 * replaced by Cloud Firestore SDK in the future without touching the UI.
 */

import { INITIAL_DATA } from './data.js';
import { getOfficialLogoDataUrl } from './logo.js';

const STORAGE_KEYS = {
  MAHADEN: 'taheel_mahaden_v8',
  USERS: 'taheel_users_v8',
  ASSIGNMENTS: 'taheel_assignments_v8',
  PROGRESS: 'taheel_progress_v8',
  ATTENDANCE: 'taheel_attendance_v8',
  CURRENT_USER_ID: 'taheel_session_user_v8',
  CUSTOM_LOGO: 'taheel_custom_logo_v3'
};

export const DELETED_STUDENT_UIDS = [
  'sFtURW5zOSPu68halRL3u6IoZB03', // أبو بكر موسى عيسى مالا
  'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1', // علي أبوبكر أبوبكر تيجاني
  '91yuoylr8nX2bOkwGkgRkjctfFl2', // خليل إبراهيم جابر
  '2il7BvfDzhebZOUxUG1og0pxlS53'  // باوزير القديم
];

export const isDeletedStudent = (u) => {
  if (!u) return false;
  const id = typeof u === 'string' ? u : (u.id || u.uid || '');
  if (DELETED_STUDENT_UIDS.includes(id)) return true;
  if (id === '2il7BvfDzhebZOUxUG1og0pxlS53') return true;
  if (typeof u === 'object') {
    const name = String(u.name || '');
    const email = String(u.email || '');
    if (name.includes('مالا') || name.includes('تيجاني') || name.includes('خليل إبراهيم')) return true;
    if (email.includes('sFtURW5zOSPu68halRL3u6IoZB03') || email.includes('odhZaV2Uq9VxqHQbbxAq2ZS94Ls1') || email.includes('91yuoylr8nX2bOkwGkgRkjctfFl2')) return true;
    
    // Ensure Abdulrahman Bawazir has strictly ONE record: the new one (8GqPbLceefR8mfVBLzKPCMGmIUj2)
    const norm = name.replace(/\s+/g, '');
    if ((norm === 'عبدالرحمنباوزير' || norm.includes('باوزير') || email.toLowerCase().includes('bawazir') || email.includes('2il7bvfdzhebzouxug1og0pxls53')) && id !== '8GqPbLceefR8mfVBLzKPCMGmIUj2') {
      return true;
    }
  }
  return false;
};

export const Storage = {
  /**
   * Initialize storage with clean production state and purge all mock/test data
   */
  init() {
    // Aggressively purge all previous storage keys from prior versions (v6, v7, etc.)
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('taheel_') && k !== STORAGE_KEYS.CUSTOM_LOGO && k !== 'taheel_custom_logo_v3') {
          // Never purge student welcome notice acknowledgments or migration flags
          if (k.startsWith('taheel_welcome_ack_') || k.startsWith('taheel_legacy_') || k.startsWith('taheel_migrated_')) {
            continue;
          }
          if (!k.endsWith('_v8')) {
            keysToRemove.push(k);
          }
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
      // Explicitly purge v7 and older attendance & users to ensure 100% clean sync with live Firestore
      ['taheel_attendance_v7', 'taheel_users_v7', 'taheel_users_v6', 'taheel_attendance_v6', 'taheel_attendance_v5', 'taheel_progress_v6', 'taheel_progress_v5', 'taheel_attendance', 'taheel_progress'].forEach(k => {
        try { localStorage.removeItem(k); } catch (_) {}
      });

      // Strip obsolete avatar field from cached local users & purge deprecated UIDs
      const OLD_BAWAZEER_UID = '2il7BvfDzhebZOUxUG1og0pxlS53';
      const NEW_BAWAZEER_UID = '8GqPbLceefR8mfVBLzKPCMGmIUj2';

      const usersRaw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (usersRaw) {
        let users = JSON.parse(usersRaw);
        let changed = false;

        // Purge deleted/deprecated UIDs if present & ensure Bawazir is unique with NEW_BAWAZEER_UID
        if (Array.isArray(users)) {
          const initialLen = users.length;
          let bawazirFound = false;
          users = users.filter(u => {
            if (!u || !u.id) return false;
            if (isDeletedStudent(u) || DELETED_STUDENT_UIDS.includes(u.id)) return false;
            const norm = (u.name || '').replace(/\s+/g, '');
            if (norm === 'عبدالرحمنباوزير' || (u.name && u.name.includes('باوزير'))) {
              if (u.id === NEW_BAWAZEER_UID && !bawazirFound) {
                bawazirFound = true;
                return true;
              }
              return false; // drop duplicate or old records
            }
            return true;
          });
          if (users.length !== initialLen) {
            changed = true;
          }
        }

        // Ensure new UID exists in cached array
        const newSeed = INITIAL_DATA.users.find(u => u.id === NEW_BAWAZEER_UID);
        if (newSeed && !users.some(u => u.id === NEW_BAWAZEER_UID)) {
          users.push(newSeed);
          changed = true;
        }

        users.forEach(u => {
          if (u.avatar !== undefined) {
            delete u.avatar;
            changed = true;
          }
        });
        if (changed) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }

      // Purge student progress if stored under deleted UIDs or migrate old Bawazeer UID
      const progressRaw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
      if (progressRaw) {
        try {
          const prog = JSON.parse(progressRaw);
          let progChanged = false;
          DELETED_STUDENT_UIDS.forEach(delId => {
            if (prog[delId]) {
              delete prog[delId];
              progChanged = true;
            }
          });
          if (prog[OLD_BAWAZEER_UID]) {
            prog[NEW_BAWAZEER_UID] = { ...(prog[NEW_BAWAZEER_UID] || {}), ...prog[OLD_BAWAZEER_UID] };
            delete prog[OLD_BAWAZEER_UID];
            progChanged = true;
          }
          if (progChanged) localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(prog));
        } catch (_) {}
      }

      // Purge student attendance if stored under deleted UIDs or migrate old Bawazeer UID
      const attendanceRaw = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      if (attendanceRaw) {
        try {
          const att = JSON.parse(attendanceRaw);
          let attChanged = false;
          const filteredAtt = att.filter(item => {
            if (!item) return false;
            if (DELETED_STUDENT_UIDS.includes(item.studentId)) {
              attChanged = true;
              return false;
            }
            if (item.studentId === OLD_BAWAZEER_UID) {
              item.studentId = NEW_BAWAZEER_UID;
              if (item.id && item.id.includes(OLD_BAWAZEER_UID)) {
                item.id = item.id.replace(OLD_BAWAZEER_UID, NEW_BAWAZEER_UID);
              }
              attChanged = true;
            }
            // One-time legacy migration for historical error where 2026-10-08 session was initially tagged as 2026-10-15
            const legacyMigrated = localStorage.getItem('taheel_legacy_oct15_migrated_v8');
            if (!legacyMigrated && item.date === '2026-10-15') {
              item.date = '2026-10-08';
              if (item.id && item.id.includes('2026-10-15')) {
                item.id = item.id.replace('2026-10-15', '2026-10-08');
              }
              attChanged = true;
            }
            return true;
          });
          if (!localStorage.getItem('taheel_legacy_oct15_migrated_v8')) {
            localStorage.setItem('taheel_legacy_oct15_migrated_v8', 'true');
          }
          if (attChanged) localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(filteredAtt));
        } catch (_) {}
      } else {
        if (!localStorage.getItem('taheel_legacy_oct15_migrated_v8')) {
          localStorage.setItem('taheel_legacy_oct15_migrated_v8', 'true');
        }
      }

      // Purge active session if currently logged in with a deleted UID
      const activeCurrentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
      if (activeCurrentId === OLD_BAWAZEER_UID) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, NEW_BAWAZEER_UID);
      } else if (DELETED_STUDENT_UIDS.includes(activeCurrentId)) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
      }

      // Clean welcome notice acknowledgments for deleted students
      DELETED_STUDENT_UIDS.forEach(delId => {
        localStorage.removeItem('taheel_welcome_ack_' + delId);
      });
      if (localStorage.getItem('taheel_welcome_ack_' + OLD_BAWAZEER_UID)) {
        localStorage.setItem('taheel_welcome_ack_' + NEW_BAWAZEER_UID, 'true');
        localStorage.removeItem('taheel_welcome_ack_' + OLD_BAWAZEER_UID);
      }
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
        if (u && u.id && !isDeletedStudent(u)) userMap.set(u.id, u);
      });

      // 2. Merge any local additions or updates
      if (Array.isArray(localUsers)) {
        localUsers.forEach(u => {
          if (u && u.id && !isDeletedStudent(u)) {
            userMap.set(u.id, { ...userMap.get(u.id), ...u });
          }
        });
      }
      DELETED_STUDENT_UIDS.forEach(delId => userMap.delete(delId));
      for (const [id, u] of userMap.entries()) {
        if (isDeletedStudent(u)) userMap.delete(id);
      }

      // Guarantee Abdulrahman Bawazir has strictly ONE record: NEW_BAWAZEER_UID
      let bawazirKept = false;
      for (const [id, u] of userMap.entries()) {
        const norm = (u.name || '').replace(/\s+/g, '');
        if (norm === 'عبدالرحمنباوزير' || (u.name && u.name.includes('باوزير'))) {
          if (id === '8GqPbLceefR8mfVBLzKPCMGmIUj2' && !bawazirKept) {
            bawazirKept = true;
          } else {
            userMap.delete(id);
          }
        }
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

  updateUser(userId, partial) {
    if (!userId || !partial) return;
    try {
      const users = this.getUsers();
      const cleanId = String(userId).trim().toLowerCase();
      const existingIndex = users.findIndex(u => 
        (u.id && u.id.toLowerCase() === cleanId) || 
        (u.email && u.email.toLowerCase() === cleanId)
      );
      if (existingIndex > -1) {
        users[existingIndex] = { ...users[existingIndex], ...partial };
        this.saveUsers(users);
      }
    } catch (_) {}
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
