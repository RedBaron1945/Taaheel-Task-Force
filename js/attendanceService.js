/**
 * Attendance Service for Platform «مرحلة التأهيل»
 * Attendance takes place exclusively on Sundays and Tuesdays.
 * Synchronized with Cloud Firestore collection «attendance».
 */

import { Storage, DELETED_STUDENT_UIDS, isDeletedStudent } from './storage.js';
import { Utils } from './utils.js';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  query,
  where,
  onSnapshot,
  writeBatch,
  auth
} from './firebase.js';

async function ensureAuthReady() {
  if (auth && typeof auth.authStateReady === 'function') {
    try {
      await auth.authStateReady();
    } catch (_) {}
  }
}

let attendanceUnsubscribe = null;
let autoSyncInterval = null;
let isSyncing = false;
let syncState = {
  status: 'synced',
  lastSyncTime: new Date().toISOString(),
  count: 0,
  error: null
};

export const AttendanceService = {
  /**
   * Get current sync status
   */
  getSyncState() {
    return { ...syncState };
  },

  /**
   * Run cloud sync
   * @param {boolean} silent - If true, performs background sync silently without flickering UI
   */
  async syncNow(silent = true) {
    if (isSyncing) {
      return { success: true, count: syncState.count };
    }

    isSyncing = true;
    if (!silent) {
      syncState.status = 'syncing';
      window.dispatchEvent(new CustomEvent('attendance-sync-status', { detail: { ...syncState } }));
    }

    try {
      const records = await this.getAllAttendance();
      syncState = {
        status: 'synced',
        lastSyncTime: new Date().toISOString(),
        count: records.length,
        error: null
      };
      window.dispatchEvent(new CustomEvent('attendance-sync-status', { detail: { ...syncState } }));
      return { success: true, count: records.length };
    } catch (err) {
      syncState = {
        status: 'error',
        lastSyncTime: new Date().toISOString(),
        count: (Storage.getAttendance() || []).length,
        error: err.message || 'خطأ في الاتصال'
      };
      window.dispatchEvent(new CustomEvent('attendance-sync-status', { detail: { ...syncState } }));
      return { success: false, error: err.message || 'خطأ في الاتصال بالسحابة' };
    } finally {
      isSyncing = false;
    }
  },

  /**
   * Start auto periodic background sync (10 seconds default, completely silent)
   */
  startAutoSync(intervalMs = 10000) {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }

    autoSyncInterval = setInterval(async () => {
      if (!isSyncing) {
        try {
          await this.syncNow(true);
        } catch (err) {
          console.warn('Auto silent sync notice:', err);
        }
      }
    }, intervalMs);
  },

  /**
   * Stop auto periodic sync
   */
  stopAutoSync() {
    if (autoSyncInterval) {
      clearInterval(autoSyncInterval);
      autoSyncInterval = null;
    }
  },

  /**
   * Get all attendance records with direct Firestore synchronization.
   * Employs Fast-Timeout Race for slow internet: returns local cache in <= 1200ms
   * while continuing background synchronization.
   */
  async getAllAttendance() {
    const local = (Storage.getAttendance() || []).filter(r => !isDeletedStudent(r.studentId));

    const fetchRemote = async () => {
      const snapshot = await getDocs(collection(db, 'attendance'));
      const remoteRecords = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        const id = docSnap.id;
        const studentId = data.studentId || (id ? id.split('_')[0] : '');
        if (isDeletedStudent(studentId) || DELETED_STUDENT_UIDS.includes(studentId)) {
          return; // Skip deleted students
        }
        remoteRecords.push({ id, ...data });
      });

      // Live Firestore is the source of truth. Synchronize local cache with remote records.
      Storage.saveAttendance(remoteRecords);
      window.dispatchEvent(new CustomEvent('attendance-updated', { 
        detail: { action: 'cloud-synced', count: remoteRecords.length } 
      }));
      return remoteRecords;
    };

    const timeout = new Promise((resolve) => setTimeout(() => resolve(local), 1200));

    try {
      return await Promise.race([fetchRemote(), timeout]);
    } catch (err) {
      console.warn('Firestore attendance fetch warning, using local cache:', err);
      return local;
    }
  },

  /**
   * Get attendance for a specific date (YYYY-MM-DD)
   */
  async getAttendanceForDate(dateStr) {
    const all = await this.getAllAttendance();
    return all.filter(item => item.date === dateStr);
  },

  /**
   * Remove/cancel attendance record for a student on a specific date (revert to unrecorded)
   * Instant 0ms local mutation with cloud persistence
   */
  async removeAttendance(studentId, dateStr) {
    await ensureAuthReady();
    const all = Storage.getAttendance() || [];
    const filtered = all.filter(item => !(item.studentId === studentId && item.date === dateStr));
    Storage.saveAttendance(filtered);

    // Trigger local update event immediately
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { studentId, date: dateStr, status: 'unrecorded' } }));

    const recordId = `${studentId}_${dateStr}`;
    try {
      await deleteDoc(doc(db, 'attendance', recordId));
    } catch (err) {
      console.error('Firestore attendance delete error:', err);
      throw err;
    }

    return true;
  },

  /**
   * Batch remove/cancel attendance for multiple students on a specific date
   * Single atomic Firestore writeBatch + instant local storage synchronization
   */
  async batchRemoveAttendance(studentIds, dateStr) {
    if (!studentIds || studentIds.length === 0) return true;
    await ensureAuthReady();

    const idSet = new Set(studentIds);
    const all = Storage.getAttendance() || [];
    const filtered = all.filter(item => !(idSet.has(item.studentId) && item.date === dateStr));
    Storage.saveAttendance(filtered);

    // Trigger local update event immediately
    window.dispatchEvent(new CustomEvent('attendance-updated', { 
      detail: { date: dateStr, action: 'batch-cleared', count: studentIds.length } 
    }));

    try {
      const batch = writeBatch(db);
      studentIds.forEach(sid => {
        const recordId = `${sid}_${dateStr}`;
        batch.delete(doc(db, 'attendance', recordId));
      });
      await batch.commit();
    } catch (err) {
      console.error('Firestore batch delete error:', err);
      throw err;
    }

    return true;
  },

  /**
   * Batch record or update attendance for multiple students on a date
   * Single atomic Firestore writeBatch + instant local storage synchronization
   */
  async batchRecordAttendance(studentIds, dateStr, status, recordedBy = 'TnCoR9ZTSibHTvIt15VPeQHfGFy1') {
    if (!studentIds || studentIds.length === 0) return [];
    if (!Utils.isValidAttendanceDay(dateStr)) {
      throw new Error('التحضير متاح لأيام الأحد والثلاثاء، وجلسات «الخميسية».');
    }

    if (!['present', 'excused', 'absent'].includes(status)) {
      throw new Error('حالة التحضير غير صالحة.');
    }

    await ensureAuthReady();
    const effectiveRecordedBy = auth?.currentUser?.uid || recordedBy;

    const all = Storage.getAttendance() || [];
    const recordMap = new Map();
    all.forEach(item => {
      const key = item.id || `${item.studentId}_${item.date}`;
      recordMap.set(key, item);
    });

    const now = new Date().toISOString();
    const batch = writeBatch(db);
    const updatedRecords = [];

    studentIds.forEach(sid => {
      if (isDeletedStudent(sid)) return;
      const recordId = `${sid}_${dateStr}`;
      const rec = {
        id: recordId,
        studentId: sid,
        date: dateStr,
        status,
        recordedBy: effectiveRecordedBy,
        updatedAt: now
      };
      recordMap.set(recordId, rec);
      updatedRecords.push(rec);
      batch.set(doc(db, 'attendance', recordId), rec);
    });

    // 1. Instant local storage save and UI update
    Storage.saveAttendance(Array.from(recordMap.values()));
    window.dispatchEvent(new CustomEvent('attendance-updated', { 
      detail: { date: dateStr, action: 'batch-recorded', count: updatedRecords.length, status } 
    }));

    // 2. Atomic Cloud Firestore writeBatch
    try {
      await batch.commit();
    } catch (err) {
      console.error('Firestore batch record error:', err);
      throw err;
    }

    return updatedRecords;
  },

  /**
   * Clear all attendance records for a specific date across all devices
   */
  async clearAttendanceForDate(dateStr) {
    await ensureAuthReady();
    const all = Storage.getAttendance() || [];
    const filtered = all.filter(item => item.date !== dateStr);
    Storage.saveAttendance(filtered);

    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: dateStr, action: 'cleared' } }));

    try {
      const q = query(collection(db, 'attendance'), where('date', '==', dateStr));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      let batchCount = 0;
      snapshot.forEach(docSnap => {
        batch.delete(doc(db, 'attendance', docSnap.id));
        batchCount++;
      });
      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Firestore batch delete for date background notice:', err);
    }

    return true;
  },

  /**
   * Record or update attendance for a student on a date
   * Instant 0ms local execution with background Firestore queuing
   */
  async recordAttendance(studentId, dateStr, status, recordedBy = 'TnCoR9ZTSibHTvIt15VPeQHfGFy1') {
    if (!Utils.isValidAttendanceDay(dateStr)) {
      throw new Error('التحضير متاح لأيام الأحد والثلاثاء، وجلسات «الخميسية».');
    }

    if (!['present', 'excused', 'absent'].includes(status)) {
      throw new Error('حالة التحضير غير صالحة.');
    }

    await ensureAuthReady();
    const effectiveRecordedBy = auth?.currentUser?.uid || recordedBy;

    const all = Storage.getAttendance() || [];
    const existingIndex = all.findIndex(item => item.studentId === studentId && item.date === dateStr);
    const recordId = `${studentId}_${dateStr}`;

    const record = {
      id: recordId,
      studentId,
      date: dateStr,
      status,
      recordedBy: effectiveRecordedBy,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      all[existingIndex] = record;
    } else {
      all.push(record);
    }

    // 1. Instant local storage save and UI update (0ms delay)
    Storage.saveAttendance(all);
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: record }));

    // 2. Persist to Cloud Firestore
    try {
      await setDoc(doc(db, 'attendance', recordId), record);
    } catch (err) {
      console.error('Firestore attendance write error:', err);
      throw err;
    }

    return record;
  },

  /**
   * Get attendance summary statistics and absence dates for a specific student
   */
  async getStudentSummary(studentId) {
    const all = await this.getAllAttendance();
    const studentRecords = all.filter(item => item.studentId === studentId);

    let presentCount = 0;
    let excusedCount = 0;
    let absentCount = 0;
    const absenceDates = [];
    const excusedDates = [];
    const presentDates = [];

    studentRecords.forEach(r => {
      if (r.status === 'present') {
        presentCount++;
        presentDates.push(r.date);
      } else if (r.status === 'excused') {
        excusedCount++;
        excusedDates.push(r.date);
      } else if (r.status === 'absent') {
        absentCount++;
        absenceDates.push(r.date);
      }
    });

    absenceDates.sort().reverse();
    excusedDates.sort().reverse();
    presentDates.sort().reverse();

    const totalRecorded = presentCount + excusedCount + absentCount;
    const attendanceRate = totalRecorded > 0 
      ? Math.round((presentCount / totalRecorded) * 100) 
      : 100;

    return {
      studentId,
      totalRecorded,
      presentCount,
      excusedCount,
      absentCount,
      absenceDates,
      excusedDates,
      presentDates,
      attendanceRate
    };
  },

  /**
   * Realtime listener for attendance updates across all clients
   */
  subscribeToAttendance(callback) {
    if (attendanceUnsubscribe) {
      attendanceUnsubscribe();
      attendanceUnsubscribe = null;
    }

    let lastDataHash = '';

    try {
      attendanceUnsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const remoteRecords = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const studentId = data.studentId || (docSnap.id ? docSnap.id.split('_')[0] : '');
          if (isDeletedStudent(studentId) || DELETED_STUDENT_UIDS.includes(studentId)) return;
          remoteRecords.push({ id: docSnap.id, ...data });
        });
        
        const newHash = JSON.stringify(remoteRecords.map(r => `${r.id}:${r.status}`));
        if (newHash !== lastDataHash) {
          lastDataHash = newHash;
          Storage.saveAttendance(remoteRecords);
          if (callback) callback(remoteRecords);
        }
      }, (err) => {
        console.warn('Realtime attendance listener notice:', err);
      });
    } catch (err) {
      console.warn('Failed to attach attendance onSnapshot listener:', err);
    }

    const handleLocalUpdate = () => {
      const records = Storage.getAttendance() || [];
      const newHash = JSON.stringify(records.map(r => `${r.id}:${r.status}`));
      if (newHash !== lastDataHash) {
        lastDataHash = newHash;
        if (callback) callback(records);
      }
    };
    window.addEventListener('attendance-updated', handleLocalUpdate);

    return () => {
      if (attendanceUnsubscribe) {
        attendanceUnsubscribe();
        attendanceUnsubscribe = null;
      }
      window.removeEventListener('attendance-updated', handleLocalUpdate);
    };
  }
};
