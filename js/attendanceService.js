/**
 * Attendance Service for Platform «مرحلة التأهيل»
 * Attendance takes place exclusively on Sundays and Tuesdays.
 * Synchronized with Cloud Firestore collection «attendance».
 */

import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { 
  db, 
  auth,
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  onSnapshot 
} from './firebase.js';

let attendanceUnsubscribe = null;

export const AttendanceService = {
  /**
   * Get all attendance records with direct Firestore synchronization and smart cache merging
   */
  async getAllAttendance() {
    const local = Storage.getAttendance() || [];
    if (!auth.currentUser) {
      return local;
    }
    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      const remoteRecords = [];
      snapshot.forEach(docSnap => {
        remoteRecords.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Smart merge: never wipe local records with an empty snapshot
      const recordMap = new Map();
      local.forEach(r => { if (r && r.id) recordMap.set(r.id, r); });
      remoteRecords.forEach(r => { if (r && r.id) recordMap.set(r.id, r); });

      const merged = Array.from(recordMap.values());
      Storage.saveAttendance(merged);
      return merged;
    } catch (_) {
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
   */
  async removeAttendance(studentId, dateStr) {
    const all = Storage.getAttendance();
    const filtered = all.filter(item => !(item.studentId === studentId && item.date === dateStr));
    Storage.saveAttendance(filtered);

    const recordId = `${studentId}_${dateStr}`;
    try {
      await deleteDoc(doc(db, 'attendance', recordId));
    } catch (err) {
      console.warn('Firestore attendance delete notice:', err);
    }

    // Trigger local update event
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { studentId, date: dateStr, status: 'unrecorded' } }));
    return true;
  },

  /**
   * Record or update attendance for a student on a date
   */
  async recordAttendance(studentId, dateStr, status, recordedBy = 'TnCoR9ZTSibHTvIt15VPeQHfGFy1') {
    if (!Utils.isValidAttendanceDay(dateStr)) {
      throw new Error('التحضير متاح فقط لأيام الأحد والثلاثاء.');
    }

    if (!['present', 'excused', 'absent'].includes(status)) {
      throw new Error('حالة التحضير غير صالحة.');
    }

    const all = Storage.getAttendance();
    const existingIndex = all.findIndex(item => item.studentId === studentId && item.date === dateStr);
    const recordId = `${studentId}_${dateStr}`;

    const record = {
      id: recordId,
      studentId,
      date: dateStr,
      status,
      recordedBy,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      all[existingIndex] = record;
    } else {
      all.push(record);
    }

    Storage.saveAttendance(all);

    // Save directly to Firestore
    try {
      await setDoc(doc(db, 'attendance', recordId), record);
    } catch (err) {
      console.warn('Firestore attendance write notice:', err);
    }

    // Trigger local event
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: record }));
    return record;
  },

  /**
   * Realtime listener for attendance updates
   */
  subscribeToAttendance(callback) {
    if (attendanceUnsubscribe) {
      attendanceUnsubscribe();
      attendanceUnsubscribe = null;
    }

    if (auth.currentUser) {
      try {
        attendanceUnsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
          const remoteRecords = [];
          snapshot.forEach(docSnap => {
            remoteRecords.push({ id: docSnap.id, ...docSnap.data() });
          });
          const local = Storage.getAttendance() || [];
          const recordMap = new Map();
          local.forEach(r => { if (r && r.id) recordMap.set(r.id, r); });
          remoteRecords.forEach(r => { if (r && r.id) recordMap.set(r.id, r); });
          const merged = Array.from(recordMap.values());
          Storage.saveAttendance(merged);
          if (callback) callback(merged);
        }, () => {
          // Handled silently
        });
      } catch (_) {
        // Handled silently
      }
    }

    const handleLocalUpdate = () => {
      this.getAllAttendance().then(records => {
        if (callback) callback(records);
      });
    };
    window.addEventListener('attendance-updated', handleLocalUpdate);

    return () => {
      if (attendanceUnsubscribe) attendanceUnsubscribe();
      window.removeEventListener('attendance-updated', handleLocalUpdate);
    };
  }
};
