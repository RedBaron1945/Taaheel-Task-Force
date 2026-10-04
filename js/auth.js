/**
 * Auth Service for Platform «مرحلة التأهيل»
 * Uses Firebase Authentication (email/password) as the single source of truth for sign-in.
 */

import { Storage } from './storage.js';
import { UserService } from './userService.js';
import { 
  auth, 
  signInWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged,
  db,
  doc,
  getDoc
} from './firebase.js';

let authStateListeners = [];
let firebaseAuthInitialized = false;

export const Auth = {
  /**
   * Initialize and subscribe to auth state changes
   */
  onAuthStateChanged(listener) {
    authStateListeners.push(listener);

    // Attach native Firebase Auth listener if not attached yet
    if (!firebaseAuthInitialized) {
      firebaseAuthInitialized = true;
      onAuthStateChanged(auth, async (fbUser) => {
        if (fbUser) {
          Storage.setCurrentUserId(fbUser.uid);
          let user = await UserService.getUserById(fbUser.uid);
          if (!user) {
            user = await UserService.getUserByEmail(fbUser.email);
          }
          this.notifyListeners(user);
        } else {
          // If no Firebase Auth user, check simulated local session
          const currentId = Storage.getCurrentUserId();
          if (currentId) {
            const user = await UserService.getUserById(currentId);
            this.notifyListeners(user);
          } else {
            this.notifyListeners(null);
          }
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
      let user = await UserService.getUserById(auth.currentUser.uid);
      if (user) return user;
    }
    const currentId = Storage.getCurrentUserId();
    if (!currentId) return null;
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

    // 1. Direct Firebase Authentication (authenticates the email registered in Firebase console)
    if (cleanEmail.includes('@') && password.length >= 6) {
      try {
        const cred = await signInWithEmailAndPassword(auth, rawInput, password);
        if (cred && cred.user) {
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
          if (user) {
            user.email = cred.user.email || user.email;
            Storage.setCurrentUserId(user.id);
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
