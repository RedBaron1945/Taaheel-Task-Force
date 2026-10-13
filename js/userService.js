/**
 * User Service for Platform «مرحلة التأهيل»
 * Manages user queries, roles, profiles, and Firestore synchronization.
 */

import { Storage, DELETED_STUDENT_UIDS, isDeletedStudent } from './storage.js';
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
  OperationType,
  writeBatch,
  deleteField,
  deleteDoc 
} from './firebase.js';
import { INITIAL_DATA } from './data.js';

const OLD_BAWAZEER_UID = '2il7BvfDzhebZOUxUG1og0pxlS53';
const NEW_BAWAZEER_UID = '8GqPbLceefR8mfVBLzKPCMGmIUj2';

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
          if (docSnap.id === OLD_BAWAZEER_UID || DELETED_STUDENT_UIDS.includes(docSnap.id)) return; // Discard deleted/deprecated UIDs
          const remoteUser = { id: docSnap.id, ...docSnap.data() };
          const existing = mergedMap.get(remoteUser.id) || {};
          mergedMap.set(remoteUser.id, { ...existing, ...remoteUser });
        });
      }
    } catch (err) {
      console.warn('Firestore users fetch warning:', err);
    }

    // Guarantee old and deleted UIDs are completely purged
    mergedMap.delete(OLD_BAWAZEER_UID);
    DELETED_STUDENT_UIDS.forEach(delId => mergedMap.delete(delId));
    for (const [id, u] of mergedMap.entries()) {
      if (isDeletedStudent(u)) mergedMap.delete(id);
    }

    // Guarantee Abdulrahman Bawazir has strictly ONE record: NEW_BAWAZEER_UID
    let bawazirKept = false;
    for (const [id, u] of mergedMap.entries()) {
      const norm = (u.name || '').replace(/\s+/g, '');
      if (norm === 'عبدالرحمنباوزير' || (u.name && u.name.includes('باوزير'))) {
        if (id === NEW_BAWAZEER_UID && !bawazirKept) {
          bawazirKept = true;
        } else {
          mergedMap.delete(id);
        }
      }
    }

    const merged = Array.from(mergedMap.values());
    Storage.saveUsers(merged);

    // Trigger cleanup and migration in Firestore in background if authenticated
    this.purgeDeletedStudentsFromFirestore().catch(() => {});
    this.syncStudentUidMigration().catch(() => {});

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
      if (!isDeletedStudent(u)) {
        studentsMap.set(u.id, u);
      }
    });

    // 2. Merge local storage students
    localUsers.filter(u => u.role === 'student').forEach(u => {
      if (u.id === OLD_BAWAZEER_UID || isDeletedStudent(u)) return;
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
            if (docSnap.id === OLD_BAWAZEER_UID || isDeletedStudent(docSnap.id)) return;
            const remoteStudent = { id: docSnap.id, ...docSnap.data() };
            if (isDeletedStudent(remoteStudent)) return;
            const existing = studentsMap.get(remoteStudent.id) || {};
            studentsMap.set(remoteStudent.id, { ...existing, ...remoteStudent });
          });
        }
      } catch (err) {
        console.warn('Firestore students fetch warning:', err);
      }
    }

    // Guarantee old and deleted UIDs are purged from students map
    studentsMap.delete(OLD_BAWAZEER_UID);
    for (const [id, st] of studentsMap.entries()) {
      if (isDeletedStudent(st) || DELETED_STUDENT_UIDS.includes(id)) {
        studentsMap.delete(id);
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

    // Deduplicate students by name and ensure Abdulrahman Bawazir has strictly ONE record (NEW_BAWAZEER_UID)
    const seenNames = new Set();
    const cleanStudents = [];
    for (const st of students) {
      if (!st || !st.id) continue;
      if (isDeletedStudent(st) || DELETED_STUDENT_UIDS.includes(st.id) || st.id === OLD_BAWAZEER_UID) continue;
      const norm = (st.name || '').replace(/\s+/g, '');
      if (norm === 'عبدالرحمنباوزير' || (st.name && st.name.includes('باوزير'))) {
        if (st.id === NEW_BAWAZEER_UID && !seenNames.has('bawazir')) {
          seenNames.add('bawazir');
          cleanStudents.push(st);
        }
        continue;
      }
      if (seenNames.has(norm)) {
        continue;
      }
      seenNames.add(norm);
      cleanStudents.push(st);
    }
    students = cleanStudents;

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

    let lastStudentsHash = '';

    if (auth.currentUser) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'student'));
        studentUnsubscribe = onSnapshot(q, (snapshot) => {
          const students = [];
          snapshot.forEach(docSnap => {
            if (docSnap.id === OLD_BAWAZEER_UID || isDeletedStudent(docSnap.id)) return;
            const data = docSnap.data();
            if (isDeletedStudent(data)) return;
            students.push({ id: docSnap.id, ...data });
          });
          if (students.length > 0) {
            const allUsers = Storage.getUsers();
            const userMap = new Map();
            // Seed all official initial users
            INITIAL_DATA.users.forEach(u => {
              if (!isDeletedStudent(u)) userMap.set(u.id, u);
            });
            // Keep local users
            allUsers.forEach(u => {
              if (!isDeletedStudent(u)) userMap.set(u.id, { ...userMap.get(u.id), ...u });
            });
            // Merge remote snapshot students
            students.forEach(st => {
              if (!isDeletedStudent(st)) userMap.set(st.id, { ...userMap.get(st.id), ...st });
            });
            userMap.delete(OLD_BAWAZEER_UID);
            for (const [id, u] of userMap.entries()) {
              if (isDeletedStudent(u) || DELETED_STUDENT_UIDS.includes(id)) userMap.delete(id);
            }

            // Guarantee Abdulrahman Bawazir has strictly ONE record: NEW_BAWAZEER_UID
            let bawazirKept = false;
            for (const [id, u] of userMap.entries()) {
              const norm = (u.name || '').replace(/\s+/g, '');
              if (norm === 'عبدالرحمنباوزير' || (u.name && u.name.includes('باوزير'))) {
                if (id === NEW_BAWAZEER_UID && !bawazirKept) {
                  bawazirKept = true;
                } else {
                  userMap.delete(id);
                }
              }
            }

            const merged = Array.from(userMap.values());
            const studentList = merged.filter(u => u.role === 'student');
            const newHash = JSON.stringify(studentList.map(s => `${s.id}:${s.name}:${s.mahadId}`));

            if (newHash !== lastStudentsHash) {
              lastStudentsHash = newHash;
              Storage.saveUsers(merged);
              if (callback) callback(studentList);
            }
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
      const allUsers = Storage.getUsers();
      const studentList = allUsers.filter(u => u.role === 'student');
      const newHash = JSON.stringify(studentList.map(s => `${s.id}:${s.name}:${s.mahadId}`));
      if (newHash !== lastStudentsHash) {
        lastStudentsHash = newHash;
        if (callback) callback(studentList);
      }
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
      if (u && u.id && u.id !== OLD_BAWAZEER_UID && !isDeletedStudent(u)) userMap.set(u.id, u);
    });
    // 2. Storage Users
    try {
      const stored = Storage.getUsers();
      if (Array.isArray(stored)) {
        stored.forEach(u => {
          if (u && u.id && u.id !== OLD_BAWAZEER_UID && !isDeletedStudent(u)) userMap.set(u.id, { ...userMap.get(u.id), ...u });
        });
      }
    } catch (_) {}
    userMap.delete(OLD_BAWAZEER_UID);
    for (const [id, u] of userMap.entries()) {
      if (isDeletedStudent(u) || DELETED_STUDENT_UIDS.includes(id)) userMap.delete(id);
    }

    // Guarantee Abdulrahman Bawazir has strictly ONE record: NEW_BAWAZEER_UID
    let bawazirKeptLocal = false;
    for (const [id, u] of userMap.entries()) {
      const norm = (u.name || '').replace(/\s+/g, '');
      if (norm === 'عبدالرحمنباوزير' || (u.name && u.name.includes('باوزير'))) {
        if (id === NEW_BAWAZEER_UID && !bawazirKeptLocal) {
          bawazirKeptLocal = true;
        } else {
          userMap.delete(id);
        }
      }
    }

    // 3. Guarantee welcome notice acknowledgment is attached if flag exists in localStorage
    userMap.forEach((u, key) => {
      if (!u.hasAcknowledgedWelcomeNotice) {
        const byId = localStorage.getItem('taheel_welcome_ack_' + u.id) === 'true';
        const byEmail = u.email ? localStorage.getItem('taheel_welcome_ack_' + u.email.toLowerCase()) === 'true' : false;
        if (byId || byEmail) {
          u.hasAcknowledgedWelcomeNotice = true;
        }
      }
    });

    return Array.from(userMap.values());
  },

  /**
   * Get a single user by ID
   */
  async getUserById(id) {
    if (!id) return null;
    let cleanId = String(id).trim();
    if (DELETED_STUDENT_UIDS.includes(cleanId) || cleanId === OLD_BAWAZEER_UID) {
      if (cleanId === OLD_BAWAZEER_UID) {
        cleanId = NEW_BAWAZEER_UID;
      } else {
        return null;
      }
    }

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

    // Block deleted students immediately
    if (DELETED_STUDENT_UIDS.some(delId => {
      const lower = delId.toLowerCase();
      return clean === lower || prefix === lower || clean.startsWith(lower + '@');
    })) {
      return null;
    }

    // 1. Supervisor check (by UID, prefix, or official email)
    if (prefix === 'o83e55hquyajvh3ji4fjltobyg63' || prefix === 'supervisor' || clean === 'admin@taaheel.sa' || clean === 'supervisor@taaheeltaskforce.com') {
      return INITIAL_DATA.users.find(u => u.id === 'O83e55HQuyajVh3Ji4FJltobyg63') || null;
    }
    // 2. Attendance check (by UID, prefix, or official email)
    if (prefix === 'tncor9ztsibhtvit15vpeqhfgfy1' || prefix === 'attendance' || clean === 'attendance@taaheeltaskforce.com') {
      return INITIAL_DATA.users.find(u => u.id === 'TnCoR9ZTSibHTvIt15VPeQHfGFy1') || null;
    }

    // 2b. Migrated student UID check (Abdulrahman Bawazeer)
    if (prefix === OLD_BAWAZEER_UID.toLowerCase() || prefix === NEW_BAWAZEER_UID.toLowerCase() || clean === `${OLD_BAWAZEER_UID.toLowerCase()}@taaheeltaskforce.com` || clean === `${NEW_BAWAZEER_UID.toLowerCase()}@taaheeltaskforce.com`) {
      return INITIAL_DATA.users.find(u => u.id === NEW_BAWAZEER_UID) || null;
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
   * Purge obsolete avatar field from all user documents in Firestore
   */
  async purgeAvatarFromFirestore() {
    try {
      const snap = await getDocs(collection(db, 'users'));
      if (snap.empty) return;
      const batch = writeBatch(db);
      let count = 0;
      snap.forEach(d => {
        if (d.data().avatar !== undefined) {
          batch.update(doc(db, 'users', d.id), { avatar: deleteField() });
          count++;
        }
      });
      if (count > 0) {
        await batch.commit();
      }
    } catch (_) {
      // Handled silently
    }
  },

  /**
   * Mark student first-time welcome pledge as acknowledged
   */
  async markWelcomeAcknowledged(studentId) {
    if (!studentId) return;
    try {
      // 1. Save to local storage user record
      Storage.updateUser(studentId, { hasAcknowledgedWelcomeNotice: true });

      // 2. Save directly to dedicated persistent key by ID
      localStorage.setItem('taheel_welcome_ack_' + studentId, 'true');

      // 3. Find user and save by email too
      const all = this.getAllLocalUsers();
      const u = all.find(x => x.id === studentId || (x.email && x.email.toLowerCase() === String(studentId).toLowerCase()));
      if (u && u.email) {
        localStorage.setItem('taheel_welcome_ack_' + u.email.toLowerCase(), 'true');
      }

      // 4. Save to Cloud Firestore
      const userRef = doc(db, 'users', studentId);
      await setDoc(userRef, { hasAcknowledgedWelcomeNotice: true }, { merge: true });
    } catch (e) {
      console.warn('Welcome notice ack sync notice:', e);
    }
  },

  /**
   * Permanently purge deleted student documents and attendance records from Firestore
   */
  async purgeDeletedStudentsFromFirestore() {
    try {
      for (const delId of DELETED_STUDENT_UIDS) {
        try {
          await deleteDoc(doc(db, 'users', delId));
        } catch (_) {}
      }
      const knownAttendanceKeys = [
        '91yuoylr8nX2bOkwGkgRkjctfFl2_2026-10-04',
        '91yuoylr8nX2bOkwGkgRkjctfFl2_2026-10-08',
        '91yuoylr8nX2bOkwGkgRkjctfFl2_2026-10-11',
        '91yuoylr8nX2bOkwGkgRkjctfFl2_2026-10-15',
        'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1_2026-10-04',
        'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1_2026-10-11',
        'odhZaV2Uq9VxqHQbbxAq2ZS94Ls1_2026-10-15',
        'sFtURW5zOSPu68halRL3u6IoZB03_2026-10-04',
        'sFtURW5zOSPu68halRL3u6IoZB03_2026-10-11',
        'sFtURW5zOSPu68halRL3u6IoZB03_2026-10-15'
      ];
      for (const attId of knownAttendanceKeys) {
        try {
          await deleteDoc(doc(db, 'attendance', attId));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Purge deleted students notice:', e);
    }
  },

  /**
   * Migrate and sync Abdulrahman Bawazeer new UID into Firestore and purge old UID
   */
  async syncStudentUidMigration() {
    if (!auth.currentUser) return;
    try {
      const student = INITIAL_DATA.users.find(u => u.id === NEW_BAWAZEER_UID);
      if (!student) return;

      const isSupervisor = auth.currentUser.uid === 'O83e55HQuyajVh3Ji4FJltobyg63';
      const isSelf = auth.currentUser.uid === NEW_BAWAZEER_UID;

      // 1. Ensure new student doc is registered in Firestore
      if (isSupervisor || isSelf) {
        await setDoc(doc(db, 'users', NEW_BAWAZEER_UID), student, { merge: true });
      }

      // 2. If supervisor, delete the obsolete doc from Firestore
      if (isSupervisor) {
        try {
          await deleteDoc(doc(db, 'users', OLD_BAWAZEER_UID));
        } catch (_) {}
      }
    } catch (e) {
      console.warn('Migration sync notice:', e);
    }
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
      await this.purgeAvatarFromFirestore();
    } catch (_) {
      // Handled silently
    }
  }
};
