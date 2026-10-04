/**
 * Attendance Service for Platform «مرحلة التأهيل»
 * Attendance takes place exclusively on Sundays and Tuesdays.
 * Synchronized with Cloud Firestore collection «attendance».
 */

import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  onSnapshot,
  writeBatch 
} from './firebase.js';

let attendanceUnsubscribe = null;

export const AttendanceService = {
  /**
   * Get all attendance records with direct Firestore synchronization.
   * Employs Fast-Timeout Race for slow internet: returns local cache in <= 1200ms
   * while continuing background synchronization.
   */
  async getAllAttendance() {
    const local = Storage.getAttendance() || [];

    const fetchRemote = async () => {
      const snapshot = await getDocs(collection(db, 'attendance'));
      const remoteRecords = [];
      snapshot.forEach(docSnap => {
        remoteRecords.push({ id: docSnap.id, ...docSnap.data() });
      });
      Storage.saveAttendance(remoteRecords);
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
   * Instant 0ms local mutation with background persistence
   */
  async removeAttendance(studentId, dateStr) {
    const all = Storage.getAttendance() || [];
    const filtered = all.filter(item => !(item.studentId === studentId && item.date === dateStr));
    Storage.saveAttendance(filtered);

    // Trigger local update event immediately
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { studentId, date: dateStr, status: 'unrecorded' } }));

    const recordId = `${studentId}_${dateStr}`;
    deleteDoc(doc(db, 'attendance', recordId)).catch(err => {
      console.warn('Firestore attendance delete background notice:', err);
    });

    return true;
  },

  /**
   * Clear all attendance records for a specific date across all devices
   */
  async clearAttendanceForDate(dateStr) {
    const all = Storage.getAttendance() || [];
    const filtered = all.filter(item => item.date !== dateStr);
    Storage.saveAttendance(filtered);

    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: { date: dateStr, action: 'cleared' } }));

    try {
      const snapshot = await getDocs(collection(db, 'attendance'));
      const batch = writeBatch(db);
      let batchCount = 0;
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.date === dateStr) {
          batch.delete(doc(db, 'attendance', docSnap.id));
          batchCount++;
        }
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
      throw new Error('التحضير متاح فقط لأيام الأحد والثلاثاء.');
    }

    if (!['present', 'excused', 'absent'].includes(status)) {
      throw new Error('حالة التحضير غير صالحة.');
    }

    const all = Storage.getAttendance() || [];
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

    // 1. Instant local storage save and UI update (0ms delay)
    Storage.saveAttendance(all);
    window.dispatchEvent(new CustomEvent('attendance-updated', { detail: record }));

    // 2. Queue write to Firestore in background without blocking caller
    setDoc(doc(db, 'attendance', recordId), record).catch(err => {
      console.warn('Firestore attendance write background notice:', err);
    });

    return record;
  },

  /**
   * Realtime listener for attendance updates across all clients
   */
  subscribeToAttendance(callback) {
    if (attendanceUnsubscribe) {
      attendanceUnsubscribe();
      attendanceUnsubscribe = null;
    }

    try {
      attendanceUnsubscribe = onSnapshot(collection(db, 'attendance'), (snapshot) => {
        const remoteRecords = [];
        snapshot.forEach(docSnap => {
          remoteRecords.push({ id: docSnap.id, ...docSnap.data() });
        });
        // Live authoritative sync
        Storage.saveAttendance(remoteRecords);
        if (callback) callback(remoteRecords);
      }, (err) => {
        console.warn('Realtime attendance listener warning:', err);
      });
    } catch (err) {
      console.warn('Failed to attach attendance onSnapshot listener:', err);
    }

    const handleLocalUpdate = () => {
      this.getAllAttendance().then(records => {
        if (callback) callback(records);
      });
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
