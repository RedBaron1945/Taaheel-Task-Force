/**
 * User Service for Platform «مرحلة التأهيل»
 * Manages user queries, roles, profiles, and Firestore synchronization.
 */

import { Storage } from './storage.js';
import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  handleFirestoreError, 
  OperationType 
} from './firebase.js';
import { INITIAL_DATA } from './data.js';

let studentUnsubscribe = null;

export const UserService = {
  /**
   * Get all defined Mahaden (centers)
   */
  async getMahaden() {
    return Storage.getMahaden();
  },

  /**
   * Get all users with Firestore integration and cache fallback
   */
  async getAllUsers() {
    const localUsers = Storage.getUsers();
    const mergedMap = new Map();
    INITIAL_DATA.users.forEach(u => mergedMap.set(u.id, u));
    localUsers.forEach(u => mergedMap.set(u.id, { ...mergedMap.get(u.id), ...u }));

    if (auth.currentUser) {
      try {
        const isOfficer = auth.currentUser.uid === 'TnCoR9ZTSibHTvIt15VPeQHfGFy1';
        let q;
        if (isOfficer) {
          q = query(collection(db, 'users'), where('role', '==', 'student'));
        } else {
          q = collection(db, 'users');
        }

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          snapshot.forEach(docSnap => {
            const remoteUser = { id: docSnap.id, ...docSnap.data() };
            const existing = mergedMap.get(remoteUser.id) || {};
            mergedMap.set(remoteUser.id, { ...existing, ...remoteUser });
          });
        }
      } catch (err) {
        console.warn('Firestore users fetch warning:', err);
      }
    }

    const merged = Array.from(mergedMap.values());
    Storage.saveUsers(merged);
    const isOfficer = auth.currentUser?.uid === 'TnCoR9ZTSibHTvIt15VPeQHfGFy1';
    return isOfficer ? merged.filter(u => u.role === 'student') : merged;
  },

  /**
   * Get all students (role === 'student')
   * Synchronized directly with Firestore, always preserving all registered students
   */
  async getStudents(mahadId = null) {
    const localUsers = Storage.getUsers();
    const studentsMap = new Map();

    // 1. Seed base student accounts
    INITIAL_DATA.users.filter(u => u.role === 'student').forEach(u => {
      studentsMap.set(u.id, u);
    });

    // 2. Merge local storage students
    localUsers.filter(u => u.role === 'student').forEach(u => {
      const existing = studentsMap.get(u.id) || {};
      studentsMap.set(u.id, { ...existing, ...u });
    });

    // 3. Merge remote Firestore students
    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          snapshot.forEach(docSnap => {
            const remoteStudent = { id: docSnap.id, ...docSnap.data() };
            const existing = studentsMap.get(remoteStudent.id) || {};
            studentsMap.set(remoteStudent.id, { ...existing, ...remoteStudent });
          });
        }
      } catch (err) {
        console.warn('Firestore students fetch warning:', err);
      }
    }

    const mahaden = Storage.getMahaden();
    const mahadenMap = new Map(mahaden.map(m => [m.id, m.name]));

    let students = Array.from(studentsMap.values()).map(st => {
      // Ensure mahadName is always populated
      if (!st.mahadName && st.mahadId && mahadenMap.has(st.mahadId)) {
        st.mahadName = mahadenMap.get(st.mahadId);
      }
      return st;
    });

    // Save back to local storage
    const nonStudents = localUsers.filter(u => u.role !== 'student');
    Storage.saveUsers([...nonStudents, ...students]);

    if (mahadId && mahadId !== 'all') {
      students = students.filter(s => s.mahadId === mahadId);
    }
    return students;
  },

  /**
   * Add a new student into the system
   * Saves to Firestore & Storage and notifies active views
   */
  async addStudent(studentData) {
    const student = {
      id: studentData.id || ('st_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
      name: studentData.name.trim(),
      role: 'student',
      mahadId: studentData.mahadId,
      mahadName: studentData.mahadName || '',
      email: studentData.email ? studentData.email.trim() : `${studentData.id || 'student'}@taaheeltaskforce.com`,
      avatar: studentData.name.trim().substring(0, 2),
      createdAt: new Date().toISOString()
    };

    // Save locally
    Storage.addStudent(student);

    // Save to Cloud Firestore if connected
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'users', student.id), student);
      } catch (err) {
        console.warn('Firestore student save warning:', err);
      }
    }

    // Trigger update event
    window.dispatchEvent(new CustomEvent('students-updated', { detail: student }));
    return student;
  },

  /**
   * Listen to student changes in real-time via Firestore snapshot
   */
  subscribeToStudents(callback) {
    if (studentUnsubscribe) {
      studentUnsubscribe();
      studentUnsubscribe = null;
    }

    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        studentUnsubscribe = onSnapshot(q, (snapshot) => {
          const students = [];
          snapshot.forEach(docSnap => {
            students.push({ id: docSnap.id, ...docSnap.data() });
          });
          if (students.length > 0) {
            const allUsers = Storage.getUsers();
            const nonStudents = allUsers.filter(u => u.role !== 'student');
            Storage.saveUsers([...nonStudents, ...students]);
            if (callback) callback(students);
          }
        }, () => {
          // Handled silently
        });
      } catch (_) {
        // Handled silently
      }
    }

    // Also listen to internal window events
    const handleLocalUpdate = () => {
      this.getStudents().then(st => {
        if (callback) callback(st);
      });
    };
    window.addEventListener('students-updated', handleLocalUpdate);

    return () => {
      if (studentUnsubscribe) studentUnsubscribe();
      window.removeEventListener('students-updated', handleLocalUpdate);
    };
  },

  /**
   * Get a single user by ID
   */
  async getUserById(id) {
    if (auth.currentUser) {
      try {
        const docSnap = await getDoc(doc(db, 'users', id));
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        }
      } catch (_) {}
    }
    const users = Storage.getUsers();
    return users.find(u => u.id === id) || null;
  },

  /**
   * Find user by email (case-insensitive)
   */
  async getUserByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          return { id: docSnap.id, ...docSnap.data() };
        }
      } catch (_) {}
    }
    const users = Storage.getUsers();
    return users.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
  },

  /**
   * Seed Initial System Users into Firestore if supervisor or authenticated user is active
   */
  async seedInitialFirestoreData() {
    if (!auth.currentUser) return;
    try {
      const promises = INITIAL_DATA.users.map(u => {
        const ref = doc(db, 'users', u.id);
        return setDoc(ref, u, { merge: true });
      });
      await Promise.all(promises);
    } catch (_) {
      // Handled silently
    }
  }
};
