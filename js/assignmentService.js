/**
 * Assignment Service for Platform «مرحلة التأهيل»
 * Manages assignments and their subtasks with full Cloud Firestore real-time synchronization.
 */

import { Storage } from './storage.js';
import { Utils } from './utils.js';
import { INITIAL_DATA } from './data.js';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from './firebase.js';

let assignmentsUnsubscribe = null;

export const AssignmentService = {
  /**
   * Get all assignments with Cloud Firestore synchronization
   */
  async getAllAssignments() {
    try {
      const snapshot = await getDocs(collection(db, 'assignments'));
      if (!snapshot.empty) {
        const remoteAssignments = [];
        snapshot.forEach(docSnap => {
          remoteAssignments.push({ id: docSnap.id, ...docSnap.data() });
        });

        // Sort assignments deterministically
        remoteAssignments.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
        Storage.saveAssignments(remoteAssignments);
        return remoteAssignments;
      } else if (auth.currentUser) {
        // If Firestore is empty and user is logged in, seed the initial assignments
        const current = Storage.getAssignments();
        if (current && current.length > 0) {
          this.syncAssignmentsToFirestore(current);
          return current;
        }
      }
    } catch (_) {
      // Fallback cleanly to local storage without console warnings
    }
    return Storage.getAssignments();
  },

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id) {
    const assignments = await this.getAllAssignments();
    return assignments.find(a => a.id === id) || null;
  },

  /**
   * Get only active assignments (active !== false)
   */
  async getActiveAssignments() {
    const assignments = await this.getAllAssignments();
    return assignments.filter(a => a.active !== false);
  },

  /**
   * Check if assignment is expired based on endDate
   */
  isExpired(assignment) {
    if (!assignment || !assignment.endDate) return false;
    return Utils.isDatePast(assignment.endDate);
  },

  /**
   * Get the unified schedule dates across assignments
   */
  async getUnifiedDates() {
    const assignments = await this.getAllAssignments();
    if (assignments.length > 0) {
      // Use unified dates from the assignments
      const startDate = assignments[0].startDate || '2026-09-01';
      const endDate = assignments[0].endDate || '2026-10-30';
      return { startDate, endDate };
    }
    return {
      startDate: '2026-09-01',
      endDate: '2026-10-30'
    };
  },

  /**
   * Update and unify the start and end dates across all system assignments
   */
  async updateUnifiedDates(startDate, endDate) {
    if (!startDate || !endDate) {
      throw new Error('يرجى تحديد تاريخي البداية والنهاية.');
    }
    if (startDate > endDate) {
      throw new Error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية.');
    }

    const assignments = await this.getAllAssignments();
    assignments.forEach(asg => {
      asg.startDate = startDate;
      asg.endDate = endDate;
    });

    Storage.saveAssignments(assignments);
    await this.syncAssignmentsToFirestore(assignments);

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return { startDate, endDate, updatedCount: assignments.length };
  },

  /**
   * Distribute a total amount of points evenly among subtasks of an assignment
   */
  distributeSubtaskPoints(subtasks, totalPoints) {
    if (!subtasks || subtasks.length === 0) return [];
    const count = subtasks.length;
    const base = Math.floor(totalPoints / count);
    const remainder = totalPoints % count;

    return subtasks.map((st, idx) => ({
      ...st,
      points: base + (idx < remainder ? 1 : 0)
    }));
  },

  /**
   * Calculate total points across all assignments (normally 100)
   */
  async getTotalPoints() {
    const assignments = await this.getAllAssignments();
    return assignments.reduce((sum, a) => sum + (Number(a.points) || 0), 0);
  },

  /**
   * Helper to write an array of assignments to Firestore in parallel
   */
  async syncAssignmentsToFirestore(assignments) {
    if (!auth.currentUser || !assignments || assignments.length === 0) return;
    try {
      const promises = assignments.map(asg => {
        return setDoc(doc(db, 'assignments', asg.id), {
          ...asg,
          updatedAt: new Date().toISOString()
        });
      });
      await Promise.all(promises);
    } catch (err) {
      console.warn('Firestore assignments batch sync notice:', err);
    }
  },

  /**
   * Distribute 100 points evenly across all assignments and update their subtasks
   */
  async distribute100PointsEvenly() {
    const assignments = await this.getAllAssignments();
    if (assignments.length === 0) return assignments;

    const count = assignments.length;
    const base = Math.floor(100 / count);
    const remainder = 100 % count;

    assignments.forEach((asg, idx) => {
      const assignedPoints = base + (idx < remainder ? 1 : 0);
      asg.points = assignedPoints;
      if (asg.subtasks && asg.subtasks.length > 0) {
        asg.subtasks = this.distributeSubtaskPoints(asg.subtasks, assignedPoints);
      }
    });

    Storage.saveAssignments(assignments);
    await this.syncAssignmentsToFirestore(assignments);

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return assignments;
  },

  /**
   * Custom distribute points across assignments
   * @param {Array<{id: string, points: number}>} distribution
   */
  async applyCustomPointsDistribution(distribution) {
    const assignments = await this.getAllAssignments();
    const map = new Map(distribution.map(d => [d.id, Math.max(0, Number(d.points) || 0)]));

    assignments.forEach(asg => {
      if (map.has(asg.id)) {
        const assignedPoints = map.get(asg.id);
        asg.points = assignedPoints;
        if (asg.subtasks && asg.subtasks.length > 0) {
          asg.subtasks = this.distributeSubtaskPoints(asg.subtasks, assignedPoints);
        }
      }
    });

    Storage.saveAssignments(assignments);
    await this.syncAssignmentsToFirestore(assignments);

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return assignments;
  },

  /**
   * Create a new assignment (auto-distributes 100 points across assignments by default)
   */
  async createAssignment(data, autoDistribute = true) {
    const assignments = await this.getAllAssignments();
    const newId = 'asg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const unified = await this.getUnifiedDates();

    const subtasks = (data.subtasks || []).map((st, idx) => ({
      id: st.id || `sub_${newId}_${idx + 1}`,
      title: st.title.trim(),
      points: Number(st.points) || 0
    }));

    const newAssignment = {
      id: newId,
      title: data.title.trim(),
      description: (data.description || '').trim(),
      sourceType: data.sourceType || (data.sourceUrl ? 'link' : 'none'),
      sourceUrl: (data.sourceUrl || '').trim(),
      startDate: data.startDate || unified.startDate,
      endDate: data.endDate || unified.endDate,
      points: Number(data.points) || subtasks.reduce((sum, s) => sum + s.points, 0),
      active: data.active !== false,
      subtasks
    };

    assignments.push(newAssignment);
    Storage.saveAssignments(assignments);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'assignments', newId), {
          ...newAssignment,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore assignment create notice:', err);
      }
    }

    if (autoDistribute) {
      await this.distribute100PointsEvenly();
      const updated = (await this.getAllAssignments()).find(a => a.id === newId) || newAssignment;
      window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
      return updated;
    }

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return newAssignment;
  },

  /**
   * Update an existing assignment
   */
  async updateAssignment(id, data) {
    const assignments = await this.getAllAssignments();
    const index = assignments.findIndex(a => a.id === id);
    if (index === -1) throw new Error('التكليف غير موجود');

    const subtasks = (data.subtasks || []).map((st, idx) => ({
      id: st.id || `sub_${id}_${idx + 1}`,
      title: st.title.trim(),
      points: Number(st.points) || 0
    }));

    assignments[index] = {
      ...assignments[index],
      title: data.title.trim(),
      description: (data.description || '').trim(),
      sourceType: data.sourceType || (data.sourceUrl ? 'link' : 'none'),
      sourceUrl: (data.sourceUrl || '').trim(),
      startDate: data.startDate,
      endDate: data.endDate,
      points: Number(data.points) || subtasks.reduce((sum, s) => sum + s.points, 0),
      active: data.active !== false,
      subtasks
    };

    Storage.saveAssignments(assignments);

    // Save to Firestore
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'assignments', id), {
          ...assignments[index],
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore assignment update notice:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return assignments[index];
  },

  /**
   * Delete assignment by ID (auto-distributes 100 points across remaining assignments)
   */
  async deleteAssignment(id, autoDistribute = true) {
    let assignments = await this.getAllAssignments();
    assignments = assignments.filter(a => a.id !== id);
    Storage.saveAssignments(assignments);

    // Delete from Firestore
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(db, 'assignments', id));
      } catch (err) {
        console.warn('Firestore assignment delete notice:', err);
      }
    }

    if (autoDistribute && assignments.length > 0) {
      await this.distribute100PointsEvenly();
    } else {
      window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    }
    return true;
  },

  /**
   * Toggle Active / Inactive
   */
  async toggleActive(id) {
    const assignments = await this.getAllAssignments();
    const assignment = assignments.find(a => a.id === id);
    if (!assignment) throw new Error('التكليف غير موجود');
    assignment.active = !assignment.active;
    Storage.saveAssignments(assignments);

    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'assignments', id), {
          ...assignment,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {
        console.warn('Firestore toggleActive notice:', err);
      }
    }

    window.dispatchEvent(new CustomEvent('assignments-updated', { detail: assignments }));
    return assignment.active;
  },

  /**
   * Real-time subscription to assignments collection
   */
  subscribeToAssignments(callback) {
    if (assignmentsUnsubscribe) {
      assignmentsUnsubscribe();
      assignmentsUnsubscribe = null;
    }

    try {
      assignmentsUnsubscribe = onSnapshot(collection(db, 'assignments'), (snapshot) => {
        if (!snapshot.empty) {
          const records = [];
          snapshot.forEach(docSnap => {
            records.push({ id: docSnap.id, ...docSnap.data() });
          });
          records.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
          Storage.saveAssignments(records);
          if (callback) callback(records);
        }
      }, () => {
        // Fallback silently to local cache without console noise
      });
    } catch (_) {
      // Handled silently
    }

    const handleLocalUpdate = () => {
      this.getAllAssignments().then(records => {
        if (callback) callback(records);
      });
    };
    window.addEventListener('assignments-updated', handleLocalUpdate);

    return () => {
      if (assignmentsUnsubscribe) assignmentsUnsubscribe();
      window.removeEventListener('assignments-updated', handleLocalUpdate);
    };
  },

  /**
   * Seed Initial System Assignments into Firestore if empty
   */
  async seedInitialFirestoreData() {
    if (!auth.currentUser) return;
    try {
      const snap = await getDocs(collection(db, 'assignments'));
      if (snap.empty) {
        const local = Storage.getAssignments() || INITIAL_DATA.assignments;
        await this.syncAssignmentsToFirestore(local);
      }
    } catch (_) {
      // Handled silently
    }
  }
};
