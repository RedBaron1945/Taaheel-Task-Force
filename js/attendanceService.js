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
  getDocs, 
  query, 
  where, 
  onSnapshot 
} from './firebase.js';

let attendanceUnsubscribe = null;

export const AttendanceService = {
  /**
   * Get all attendance records with Firestore synchronization
   */
  async getAllAttendance() {
    if (auth.currentUser) {
      try {
        const isStudent = auth.currentUser.uid === 'StOwdFf48idvoduZET5ZUbkbMul2' || 
          (Storage.getUsers().find(u => u.id === auth.currentUser.uid)?.role === 'student');
        
        let q;
        if (isStudent) {
          q = query(collection(db, 'attendance'), where('studentId', '==', auth.currentUser.uid));
        } else {
          q = collection(db, 'attendance');
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remoteRecords = [];
          snapshot.forEach(docSnap => {
            remoteRecords.push({ id: docSnap.id, ...docSnap.data() });
          });
          Storage.saveAttendance(remoteRecords);
          return remoteRecords;
        }
      } catch (err) {
        console.warn('Firestore attendance fetch warning, using local cache:', err);
      }
    }
    return Storage.getAttendance();
  },

  /**
   * Get attendance for a specific date (YYYY-MM-DD)
   */
  async getAttendanceForDate(dateStr) {
    const all = await this.getAllAttendance();
    return all.filter(item => item.date === dateStr);
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
      recordedBy: auth.currentUser?.uid || recordedBy,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex > -1) {
      all[existingIndex] = record;
    } else {
      all.push(record);
    }

    Storage.saveAttendance(all);

    // Save to Firestore
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'attendance', recordId), record);
      } catch (err) {
        console.warn('Firestore attendance write warning:', err);
      }
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
        const isStudent = Storage.getUsers().find(u => u.id === auth.currentUser.uid)?.role === 'student';
        const q = isStudent 
          ? query(collection(db, 'attendance'), where('studentId', '==', auth.currentUser.uid))
          : collection(db, 'attendance');

        attendanceUnsubscribe = onSnapshot(q, (snapshot) => {
          const records = [];
          snapshot.forEach(docSnap => {
            records.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (records.length > 0) {
            Storage.saveAttendance(records);
            if (callback) callback(records);
          }
        }, (err) => {
          console.warn('Attendance snapshot listener warning:', err);
        });
      } catch (err) {
        console.warn('Failed to attach attendance snapshot listener:', err);
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
  },

  /**
   * Get attendance summary for a specific student across all dates
   */
  async getStudentSummary(studentId) {
    const all = await this.getAllAttendance();
    const studentRecords = all.filter(r => r.studentId === studentId);

    let presentCount = 0;
    let excusedCount = 0;
    let absentCount = 0;
    const absenceDates = [];
    let lastAttendanceDate = null;

    // Sort records chronologically
    studentRecords.sort((a, b) => a.date.localeCompare(b.date));

    for (const record of studentRecords) {
      if (record.status === 'present') {
        presentCount++;
        lastAttendanceDate = record.date;
      } else if (record.status === 'excused') {
        excusedCount++;
      } else if (record.status === 'absent') {
        absentCount++;
        absenceDates.push(record.date);
      }
    }

    return {
      presentCount,
      excusedCount,
      absentCount,
      absenceDates: absenceDates.reverse(), // most recent first
      lastAttendanceDate,
      totalSessions: studentRecords.length
    };
  },

  /**
   * Get roll-call queue for a specific date:
   * Splits students into unrecorded (top queue) and recorded (bottom queue)
   */
  async getDateRollCallQueue(dateStr, students) {
    const records = await this.getAttendanceForDate(dateStr);
    const recordMap = new Map();
    records.forEach(r => recordMap.set(r.studentId, r.status));

    const unrecorded = [];
    const recorded = [];

    for (const student of students) {
      const status = recordMap.get(student.id);
      if (status) {
        recorded.push({ student, status });
      } else {
        unrecorded.push({ student, status: null });
      }
    }

    return {
      unrecorded,
      recorded,
      totalStudents: students.length,
      recordedCount: recorded.length
    };
  }
};
