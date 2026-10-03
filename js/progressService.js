/**
 * Progress Service for Platform «مرحلة التأهيل»
 * Computes points, percentages, and handles student task completion.
 */

import { Storage } from './storage.js';
import { AssignmentService } from './assignmentService.js';
import { db, auth, collection, doc, setDoc, getDocs, onSnapshot } from './firebase.js';

export const ProgressService = {
  /**
   * Get all progress mappings: { [studentId]: { [assignmentId]: [subtaskId, ...] } }
   */
  async getAllProgress() {
    if (!auth.currentUser) {
      return Storage.getProgress() || {};
    }
    try {
      const snapshot = await getDocs(collection(db, 'progress'));
      const remoteProgress = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (data.studentId && data.assignmentId) {
          if (!remoteProgress[data.studentId]) remoteProgress[data.studentId] = {};
          remoteProgress[data.studentId][data.assignmentId] = data.completedSubtaskIds || [];
        }
      });
      Storage.saveProgress(remoteProgress);
      return remoteProgress;
    } catch (_) {
      return Storage.getProgress() || {};
    }
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

    // Save directly to Firestore
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
      console.warn('Firestore progress write notice:', err);
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
        unsubscribe = onSnapshot(collection(db, 'progress'), (snapshot) => {
          const remoteProgress = {};
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            if (data.studentId && data.assignmentId) {
              if (!remoteProgress[data.studentId]) remoteProgress[data.studentId] = {};
              remoteProgress[data.studentId][data.assignmentId] = data.completedSubtaskIds || [];
            }
          });
          Storage.saveProgress(remoteProgress);
          if (callback) callback(remoteProgress);
        }, () => {
          // Handled silently
        });
      } catch (_) {
        // Handled silently
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
   * Calculate assignment-level statistics for a given assignment and student's completed subtask IDs
   */
  getAssignmentStats(assignment, completedSubtaskIds = []) {
    if (!assignment) {
      return {
        earnedPoints: 0,
        totalPoints: 0,
        totalSubtasks: 0,
        completedCount: 0,
        percentage: 0,
        isCompleted: false,
        isNotStarted: true,
        isExpired: false
      };
    }

    const subtasks = assignment.subtasks || [];
    const completedList = Array.isArray(completedSubtaskIds) ? completedSubtaskIds : [];
    let earnedPoints = 0;
    let completedCount = 0;

    subtasks.forEach(st => {
      if (completedList.includes(st.id)) {
        earnedPoints += Number(st.points) || 0;
        completedCount++;
      }
    });

    const totalPoints = Number(assignment.points) || subtasks.reduce((sum, s) => sum + (Number(s.points) || 0), 0);
    const totalSubtasks = subtasks.length;
    const percentage = totalPoints > 0 
      ? Math.round((earnedPoints / totalPoints) * 100) 
      : (totalSubtasks > 0 ? Math.round((completedCount / totalSubtasks) * 100) : 0);
    const isCompleted = totalSubtasks > 0 && completedCount === totalSubtasks;
    const isNotStarted = completedCount === 0;
    const isExpired = AssignmentService.isExpired(assignment);

    return {
      earnedPoints,
      totalPoints,
      totalSubtasks,
      completedCount,
      percentage,
      isCompleted,
      isNotStarted,
      isExpired
    };
  },

  /**
   * Calculate summary statistics for a student
   */
  async calculateStudentStats(studentId, assignments = null) {
    const allAssignments = assignments || (await AssignmentService.getAllAssignments());
    const progress = await this.getAllProgress();
    const studentProgress = progress[studentId] || {};

    let totalEarnedPoints = 0;
    let totalMaxPoints = 0;
    let totalSubtasksAcrossAll = 0;
    let totalCompletedSubtasksAcrossAll = 0;
    let activeAssignmentsCount = 0;
    let completedAssignmentsCount = 0;
    let notStartedAssignmentsCount = 0;
    let expiredAssignmentsCount = 0;

    const assignmentDetails = [];

    for (const asg of allAssignments) {
      const isExpired = AssignmentService.isExpired(asg);
      const subtasks = asg.subtasks || [];
      const completedSubtaskIds = studentProgress[asg.id] || [];

      const stats = this.getAssignmentStats(asg, completedSubtaskIds);

      totalEarnedPoints += stats.earnedPoints;
      totalMaxPoints += stats.totalPoints;
      totalSubtasksAcrossAll += stats.totalSubtasks;
      totalCompletedSubtasksAcrossAll += stats.completedCount;

      if (asg.active !== false) {
        if (!isExpired) activeAssignmentsCount++;
        if (stats.isCompleted) completedAssignmentsCount++;
        else if (stats.isNotStarted) notStartedAssignmentsCount++;
      }

      if (isExpired) {
        expiredAssignmentsCount++;
      }

      assignmentDetails.push({
        assignment: asg,
        stats,
        earnedPoints: stats.earnedPoints,
        maxPoints: stats.totalPoints,
        percentage: stats.percentage,
        isCompleted: stats.isCompleted,
        isExpired: stats.isExpired,
        completedSubtaskIds,
        completedSubtasksCount: stats.completedCount,
        totalSubtasksCount: stats.totalSubtasks
      });
    }

    const overallPercentage = totalMaxPoints > 0 
      ? Math.round((totalEarnedPoints / totalMaxPoints) * 100) 
      : (totalSubtasksAcrossAll > 0 ? Math.round((totalCompletedSubtasksAcrossAll / totalSubtasksAcrossAll) * 100) : 0);

    return {
      totalEarnedPoints,
      totalMaxPoints: totalMaxPoints > 0 ? totalMaxPoints : 100,
      overallPercentage,
      totalSubtasksAcrossAll,
      totalCompletedSubtasksAcrossAll,
      activeAssignmentsCount,
      completedAssignmentsCount,
      notStartedAssignmentsCount,
      expiredAssignmentsCount,
      assignmentDetails
    };
  },

  /**
   * Alias for getStudentOverallStats
   */
  async getStudentOverallStats(studentId, assignments = null) {
    return this.calculateStudentStats(studentId, assignments);
  }
};
