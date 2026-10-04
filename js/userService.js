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

    try {
      const snapshot = await getDocs(collection(db, 'users'));
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
            const userMap = new Map();
            // Seed all official initial users
            INITIAL_DATA.users.forEach(u => userMap.set(u.id, u));
            // Keep local users
            allUsers.forEach(u => userMap.set(u.id, { ...userMap.get(u.id), ...u }));
            // Merge remote snapshot students
            students.forEach(st => userMap.set(st.id, { ...userMap.get(st.id), ...st }));

            const merged = Array.from(userMap.values());
            Storage.saveUsers(merged);
            if (callback) callback(merged.filter(u => u.role === 'student'));
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
   * Helper to get all local users guaranteed to contain all initial seeds
   */
  getAllLocalUsers() {
    const userMap = new Map();
    // 1. Initial Data Users
    INITIAL_DATA.users.forEach(u => {
      if (u && u.id) userMap.set(u.id, u);
    });
    // 2. Storage Users
    try {
      const stored = Storage.getUsers();
      if (Array.isArray(stored)) {
        stored.forEach(u => {
          if (u && u.id) userMap.set(u.id, { ...userMap.get(u.id), ...u });
        });
      }
    } catch (_) {}
    return Array.from(userMap.values());
  },

  /**
   * Get a single user by ID
   */
  async getUserById(id) {
    if (!id) return null;
    const cleanId = String(id).trim();

    // 1. Check local users
    const allUsers = this.getAllLocalUsers();
    let user = allUsers.find(u => u.id === cleanId || u.id.toLowerCase() === cleanId.toLowerCase());
    if (user) return user;

    // 2. Check Firestore
    try {
      const docSnap = await getDoc(doc(db, 'users', cleanId));
      if (docSnap.exists()) {
        const remoteUser = { id: docSnap.id, ...docSnap.data() };
        Storage.addStudent(remoteUser);
        return remoteUser;
      }
    } catch (_) {}

    return null;
  },

  /**
   * Find user by email or UID: checks INITIAL_DATA.users, Storage, and Cloud Firestore
   */
  async getUserByEmail(input) {
    if (!input) return null;
    const raw = String(input).trim();
    const clean = raw.toLowerCase();
    const prefix = clean.split('@')[0].trim();

    // 1. Supervisor check (by UID, prefix, or official email)
    if (prefix === 'o83e55hquyajvh3ji4fjltobyg63' || prefix === 'supervisor' || clean === 'admin@taaheel.sa' || clean === 'supervisor@taaheeltaskforce.com') {
      return INITIAL_DATA.users.find(u => u.id === 'O83e55HQuyajVh3Ji4FJltobyg63') || null;
    }
    // 2. Attendance check (by UID, prefix, or official email)
    if (prefix === 'tncor9ztsibhtvit15vpeqhfgfy1' || prefix === 'attendance' || clean === 'attendance@taaheeltaskforce.com') {
      return INITIAL_DATA.users.find(u => u.id === 'TnCoR9ZTSibHTvIt15VPeQHfGFy1') || null;
    }

    // 3. Search in INITIAL_DATA.users
    let user = INITIAL_DATA.users.find(u => {
      const uId = (u.id || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPrefix = uEmail.split('@')[0].toLowerCase();
      const aliases = Array.isArray(u.aliases) ? u.aliases.map(a => a.toLowerCase()) : [];
      return (
        uId === clean ||
        uId === prefix ||
        uEmail === clean ||
        uPrefix === clean ||
        uPrefix === prefix ||
        aliases.includes(clean) ||
        aliases.includes(prefix)
      );
    });
    if (user) return user;

    // 4. Search in Storage
    const allUsers = this.getAllLocalUsers();
    user = allUsers.find(u => {
      const uId = (u.id || '').toLowerCase();
      const uEmail = (u.email || '').toLowerCase();
      const uPrefix = uEmail.split('@')[0].toLowerCase();
      const aliases = Array.isArray(u.aliases) ? u.aliases.map(a => a.toLowerCase()) : [];
      return (
        uId === clean ||
        uId === prefix ||
        uEmail === clean ||
        uPrefix === clean ||
        uPrefix === prefix ||
        aliases.includes(clean) ||
        aliases.includes(prefix)
      );
    });
    if (user) return user;

    // 5. Search Cloud Firestore if present
    try {
      const docSnap = await getDoc(doc(db, 'users', raw));
      if (docSnap.exists()) {
        const remoteUser = { id: docSnap.id, ...docSnap.data() };
        Storage.addStudent(remoteUser);
        return remoteUser;
      }
      const q1 = query(collection(db, 'users'), where('email', '==', clean));
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        const remoteUser = { id: snap1.docs[0].id, ...snap1.docs[0].data() };
        Storage.addStudent(remoteUser);
        return remoteUser;
      }
      const q2 = query(collection(db, 'users'), where('aliases', 'array-contains', clean));
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const remoteUser = { id: snap2.docs[0].id, ...snap2.docs[0].data() };
        Storage.addStudent(remoteUser);
        return remoteUser;
      }
      // Scan all docs in Firestore users collection
      const allDocsSnap = await getDocs(collection(db, 'users'));
      for (const d of allDocsSnap.docs) {
        const data = d.data();
        const dId = d.id.toLowerCase();
        const dEmail = (data.email || '').toLowerCase();
        const dAliases = Array.isArray(data.aliases) ? data.aliases.map(a => a.toLowerCase()) : [];
        if (dId === clean || dId === prefix || dEmail === clean || dAliases.includes(clean) || dAliases.includes(prefix)) {
          const remoteUser = { id: d.id, ...data };
          Storage.addStudent(remoteUser);
          return remoteUser;
        }
      }
    } catch (_) {}

    return null;
  },

  /**
   * Seed Initial System Users into Firestore
   */
  async seedInitialFirestoreData() {
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
