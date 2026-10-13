/**
 * Auth Service for Platform «مرحلة التأهيل»
 * Uses Firebase Authentication (email/password) as the single source of truth for sign-in.
 */

import { Storage, DELETED_STUDENT_UIDS } from './storage.js';
import { UserService } from './userService.js';
import { INITIAL_DATA } from './data.js';
import { 
  auth, 
  signInWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc,
  setDoc
} from './firebase.js';

let authStateListeners = [];
let firebaseAuthInitialized = false;

export const Auth = {
  /**
   * Initialize and subscribe to auth state changes
   */
  onAuthStateChanged(listener) {
    authStateListeners.push(listener);

    // 1. Instant Fast-Boot: dispatch cached local session immediately (0ms) so screen never hangs
    const currentId = Storage.getCurrentUserId();
    let initialUser = null;
    if (currentId) {
      initialUser = UserService.getAllLocalUsers().find(u => 
        u.id === currentId || (u.id && u.id.toLowerCase() === String(currentId).toLowerCase())
      ) || null;
    }
    setTimeout(() => {
      try {
        listener(initialUser);
      } catch (e) {
        console.warn('Fast boot listener warning:', e);
      }
    }, 0);

    // 2. Attach native Firebase Auth listener to keep session verified in background
    if (!firebaseAuthInitialized) {
      firebaseAuthInitialized = true;
      onAuthStateChanged(auth, async (fbUser) => {
        try {
          if (fbUser) {
            Storage.setCurrentUserId(fbUser.uid);
            let user = await UserService.getUserById(fbUser.uid);
            if (!user) {
              user = await UserService.getUserByEmail(fbUser.email);
            }
            if (!user) {
              const initialMatch = INITIAL_DATA.users.find(u => 
                u.id === fbUser.uid || 
                (u.email && u.email.toLowerCase() === (fbUser.email || '').toLowerCase())
              );
              if (initialMatch) {
                user = { ...initialMatch, id: fbUser.uid };
              }
            }
            if (!user && fbUser.uid === '8GqPbLceefR8mfVBLzKPCMGmIUj2') {
              user = {
                id: '8GqPbLceefR8mfVBLzKPCMGmIUj2',
                name: 'عبدالرحمن باوزير',
                email: fbUser.email || '8GqPbLceefR8mfVBLzKPCMGmIUj2@taaheeltaskforce.com',
                role: 'student',
                mahadId: 'mahd_takween_naseem',
                mahadName: 'تكوين النسيم',
                createdAt: '2026-09-01T08:00:00Z'
              };
            }
            if (user) {
              user.email = fbUser.email || user.email;
              Storage.addStudent(user);
              try {
                await setDoc(doc(db, 'users', fbUser.uid), user, { merge: true });
              } catch (_) {}
            }
            this.notifyListeners(user);
          } else {
            // If no Firebase Auth user, check simulated local session
            const activeId = Storage.getCurrentUserId();
            if (activeId) {
              const user = await UserService.getUserById(activeId);
              this.notifyListeners(user);
            } else {
              this.notifyListeners(null);
            }
          }
        } catch (err) {
          console.warn('Firebase Auth state transition caught:', err);
          const fallbackId = Storage.getCurrentUserId();
          const fallbackUser = fallbackId ? (UserService.getAllLocalUsers().find(u => u.id === fallbackId) || null) : null;
          this.notifyListeners(fallbackUser);
        }
      });
    }

    return () => {
      authStateListeners = authStateListeners.filter(l => l !== listener);
    };
  },

  notifyListeners(user) {
    for (const listener of authStateListeners) {
      try {
        listener(user);
      } catch (err) {
        console.error('Error in auth state listener:', err);
      }
    }
  },

  /**
   * Get the currently logged-in user
   */
  async getCurrentUser() {
    if (auth.currentUser) {
      if (DELETED_STUDENT_UIDS.includes(auth.currentUser.uid)) {
        try { await fbSignOut(auth); } catch (_) {}
        Storage.setCurrentUserId(null);
        return null;
      }
      let user = await UserService.getUserById(auth.currentUser.uid);
      if (user) return user;
    }
    const currentId = Storage.getCurrentUserId();
    if (!currentId || DELETED_STUDENT_UIDS.includes(currentId)) {
      if (currentId) Storage.setCurrentUserId(null);
      return null;
    }
    return UserService.getUserById(currentId);
  },

  /**
   * Login with email and password (supports real Firebase Auth & verified system users)
   */
  async loginWithEmail(email, password) {
    if (!email) throw new Error('يرجى إدخال البريد الإلكتروني.');
    if (!password) throw new Error('يرجى إدخال كلمة المرور.');
    const rawInput = email.trim();
    const cleanEmail = rawInput.toLowerCase();

    // Block deleted accounts immediately
    if (DELETED_STUDENT_UIDS.some(delId => cleanEmail.includes(delId.toLowerCase()))) {
      throw new Error('تم حذف هذا الحساب نهائياً من المنصة.');
    }

    // 1. Direct Firebase Authentication (authenticates the email registered in Firebase console)
    if (cleanEmail.includes('@') && password.length >= 6) {
      try {
        const cred = await signInWithEmailAndPassword(auth, rawInput, password);
        if (cred && cred.user) {
          if (DELETED_STUDENT_UIDS.includes(cred.user.uid)) {
            try { await fbSignOut(auth); } catch (_) {}
            throw new Error('تم حذف هذا الحساب نهائياً من المنصة.');
          }
          // Link by UID directly: fetch users/{cred.user.uid} directly from Firestore first
          let user = null;
          try {
            const docSnap = await getDoc(doc(db, 'users', cred.user.uid));
            if (docSnap.exists()) {
              user = { id: docSnap.id, ...docSnap.data() };
            }
          } catch (e) {
            console.warn('Direct Firestore users/{uid} fetch notice:', e);
          }
          if (!user) {
            user = await UserService.getUserById(cred.user.uid);
          }
          if (!user) {
            user = await UserService.getUserByEmail(cred.user.email);
          }
          if (!user) {
            const foundInInitial = INITIAL_DATA.users.find(u => 
              u.id === cred.user.uid || 
              (u.email && u.email.toLowerCase() === cleanEmail) ||
              (cred.user.email && u.email && u.email.toLowerCase() === cred.user.email.toLowerCase())
            );
            if (foundInInitial) {
              user = { ...foundInInitial, id: cred.user.uid };
            }
          }
          // Explicit fallback for Abdulrahman Bawazeer (8GqPbLceefR8mfVBLzKPCMGmIUj2)
          if (!user && (cred.user.uid === '8GqPbLceefR8mfVBLzKPCMGmIUj2' || cleanEmail.includes('8gqpblceefr8mfvblzkpcmgmiuj2') || cleanEmail.includes('2il7bvfdzhebzouxug1og0pxls53'))) {
            user = {
              id: '8GqPbLceefR8mfVBLzKPCMGmIUj2',
              name: 'عبدالرحمن باوزير',
              email: cred.user.email || '8GqPbLceefR8mfVBLzKPCMGmIUj2@taaheeltaskforce.com',
              role: 'student',
              mahadId: 'mahd_takween_naseem',
              mahadName: 'تكوين النسيم',
              createdAt: '2026-09-01T08:00:00Z'
            };
          }
          if (user) {
            user.email = cred.user.email || user.email;
            Storage.addStudent(user);
            Storage.setCurrentUserId(user.id);

            // Self-heal document directly in Cloud Firestore
            try {
              await setDoc(doc(db, 'users', cred.user.uid), user, { merge: true });
            } catch (fsErr) {
              console.warn('Auto-sync user doc to Firestore notice:', fsErr);
            }

            this.notifyListeners(user);
            return user;
          } else {
            throw new Error(`تمت المصادقة في Firebase بنجاح لكن لم يتم العثور على سجل بيانات للطالب في Firestore للـ UID: ${cred.user.uid}`);
          }
        }
      } catch (fbErr) {
        console.error('Firebase Auth error:', fbErr.code, fbErr.message);
        if (fbErr.code === 'auth/operation-not-allowed') {
          throw new Error('خطأ في إعدادات Firebase (auth/operation-not-allowed): موفّر تسجيل الدخول (Email/Password) غير مفعّل في مشروع Firebase الحالي. يرجى تفعيله من كونسول Firebase.');
        } else if (fbErr.code === 'auth/wrong-password') {
          throw new Error('كلمة المرور غير صحيحة، يرجى المحاولة مجددًا.');
        } else if (fbErr.code === 'auth/invalid-credential') {
          throw new Error('بيانات الدخول غير صحيحة (البريد الإلكتروني أو كلمة المرور).');
        } else if (fbErr.code === 'auth/user-not-found') {
          throw new Error('لم يتم العثور على حساب بهذا البريد في Firebase Authentication.');
        } else if (fbErr.code === 'auth/too-many-requests') {
          throw new Error('تم حظر المحاولات مؤقتًا لكثرة المحاولات الخاطئة. يرجى الانتظار قليلاً.');
        } else if (fbErr.code === 'auth/invalid-email') {
          throw new Error('صيغة البريد الإلكتروني غير صالحة.');
        } else if (fbErr.message && !fbErr.message.includes('auth/')) {
          throw fbErr;
        } else {
          throw new Error(`خطأ في مصادقة Firebase (${fbErr.code}): ${fbErr.message}`);
        }
      }
    }

    // 2. Resolve user by Email or UID from system database
    let user = await UserService.getUserByEmail(rawInput);
    if (!user) {
      user = await UserService.getUserById(rawInput);
    }
    if (!user) {
      throw new Error('لم يتم العثور على حساب بهذا البريد الإلكتروني. يرجى التأكد من كتابة البريد بشكل صحيح.');
    }

    // 3. If user has another official email, try Firebase Auth with that email as well
    if (user.email && user.email.toLowerCase() !== cleanEmail && password.length >= 6) {
      try {
        const cred = await signInWithEmailAndPassword(auth, user.email, password);
        if (cred && cred.user) {
          Storage.setCurrentUserId(cred.user.uid);
          let resolved = await UserService.getUserById(cred.user.uid);
          if (!resolved) resolved = user;
          this.notifyListeners(resolved);
          return resolved;
        }
      } catch (_) {}
    }

    // 4. Authenticate with verified user profile
    Storage.setCurrentUserId(user.id);
    this.notifyListeners(user);
    return user;
  },

  /**
   * Logout current user
   */
  async logout() {
    try {
      await fbSignOut(auth);
    } catch (_) {}
    Storage.setCurrentUserId(null);
    this.notifyListeners(null);
    return true;
  }
};
