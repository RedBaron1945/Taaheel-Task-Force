/**
 * Progress Service for Platform «مرحلة التأهيل»
 * Computes points, percentages, and handles student task completion.
 */

import { Storage } from './storage.js';
import { AssignmentService } from './assignmentService.js';
import { db, auth, collection, doc, setDoc, getDocs, query, where } from './firebase.js';

export const ProgressService = {
  /**
   * Get all progress mappings: { [studentId]: { [assignmentId]: [subtaskId, ...] } }
   */
  async getAllProgress() {
    if (auth.currentUser) {
      try {
        const isStudent = Storage.getUsers().find(u => u.id === auth.currentUser.uid)?.role === 'student';
        let q;
        if (isStudent) {
          q = query(collection(db, 'progress'), where('studentId', '==', auth.currentUser.uid));
        } else {
          q = collection(db, 'progress');
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const remoteProgress = Storage.getProgress();
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.studentId && data.assignmentId) {
              if (!remoteProgress[data.studentId]) remoteProgress[data.studentId] = {};
              remoteProgress[data.studentId][data.assignmentId] = data.completedSubtaskIds || [];
            }
          });
          Storage.saveProgress(remoteProgress);
          return remoteProgress;
        }
      } catch (err) {
        console.warn('Firestore progress fetch warning:', err);
      }
    }
    return Storage.getProgress();
  },

  /**
   * Get completed subtask IDs for a student on a specific assignment
   */
  async getStudentAssignmentCompleted(studentId, assignmentId) {
    const all = await this.getAllProgress();
    const studentData = all[studentId] || {};
    return studentData[assignmentId] || [];
  },

  /**
   * Toggle a subtask's completion status for a student.
   * Throws an error if the assignment is expired.
   */
  async toggleSubtask(studentId, assignmentId, subtaskId) {
    const assignment = await AssignmentService.getAssignmentById(assignmentId);
    if (!assignment) throw new Error('التكليف غير موجود');

    if (AssignmentService.isExpired(assignment)) {
      throw new Error('عذراً، انتهى وقت تسليم هذا التكليف وأصبح للقراءة فقط.');
    }

    const all = await this.getAllProgress();
    if (!all[studentId]) all[studentId] = {};
    if (!all[studentId][assignmentId]) all[studentId][assignmentId] = [];

    const list = all[studentId][assignmentId];
    const index = list.indexOf(subtaskId);

    if (index > -1) {
      list.splice(index, 1);
    } else {
      list.push(subtaskId);
    }

    Storage.saveProgress(all);

    // Save to Firestore
    if (auth.currentUser) {
      try {
        const progressDocId = `${studentId}_${assignmentId}`;
        await setDoc(doc(db, 'progress', progressDocId), {
          id: progressDocId,
          studentId,
          assignmentId,
          completedSubtaskIds: list,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore progress write warning:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('progress-updated', { detail: { studentId, assignmentId, list } }));
    return list;
  },

  /**
   * Real-time subscription to progress changes in Firestore
   */
  subscribeToProgress(callback) {
    let unsubscribe = null;
    if (auth.currentUser) {
      try {
        const isStudent = Storage.getUsers().find(u => u.id === auth.currentUser.uid)?.role === 'student';
        const q = isStudent
          ? query(collection(db, 'progress'), where('studentId', '==', auth.currentUser.uid))
          : collection(db, 'progress');

        unsubscribe = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const remoteProgress = Storage.getProgress();
            snapshot.forEach(docSnap => {
              const data = docSnap.data();
              if (data.studentId && data.assignmentId) {
                if (!remoteProgress[data.studentId]) remoteProgress[data.studentId] = {};
                remoteProgress[data.studentId][data.assignmentId] = data.completedSubtaskIds || [];
              }
            });
            Storage.saveProgress(remoteProgress);
            if (callback) callback(remoteProgress);
          }
        }, (err) => {
          console.warn('Progress snapshot listener notice:', err);
        });
      } catch (err) {
        console.warn('Failed to attach progress snapshot listener:', err);
      }
    }

    const handleLocalUpdate = () => {
      this.getAllProgress().then(progress => {
        if (callback) callback(progress);
      });
    };
    window.addEventListener('progress-updated', handleLocalUpdate);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('progress-updated', handleLocalUpdate);
    };
  },

  /**
   * Calculate detailed stats for an individual assignment for a student
   */
  getAssignmentStats(assignment, completedSubtaskIds = []) {
    const subtasks = assignment.subtasks || [];
    const totalSubtasks = subtasks.length;
    let earnedPoints = 0;
    let completedCount = 0;

    for (const sub of subtasks) {
      if (completedSubtaskIds.includes(sub.id)) {
        earnedPoints += (Number(sub.points) || 0);
        completedCount++;
      }
    }

    const totalPoints = Number(assignment.points) || 0;
    const percentage = totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0;
    const isCompleted = totalSubtasks > 0 && completedCount === totalSubtasks;
    const isNotStarted = completedCount === 0;
    const isExpired = AssignmentService.isExpired(assignment);

    return {
      earnedPoints,
      totalPoints,
      completedCount,
      totalSubtasks,
      percentage,
      isCompleted,
      isNotStarted,
      isExpired
    };
  },

  /**
   * Calculate overall stats for a student across all active system assignments
   */
  async getStudentOverallStats(studentId) {
    const assignments = await AssignmentService.getAllAssignments();
    const allProgress = await this.getAllProgress();
    const studentProgress = allProgress[studentId] || {};

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
      const isExpired = AssignmentService.isExpired(asg);
      const completedSubtaskIds = studentProgress[asg.id] || [];
      const stats = this.getAssignmentStats(asg, completedSubtaskIds);

      // Only count active assignments or all assignments in total max points
      totalEarnedPoints += stats.earnedPoints;
      totalMaxPoints += stats.totalPoints;
      totalSubtasksAcrossAll += stats.totalSubtasks;
      totalCompletedSubtasksAcrossAll += stats.completedCount;

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

    return {
      totalEarnedPoints,
      totalMaxPoints: totalMaxPoints || 100,
      overallPercentage,
      activeCount,
      completedCount,
      notStartedCount,
      expiredCount,
      assignmentDetails
    };
  }
};
