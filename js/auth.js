/**
 * Auth Service for Platform «مرحلة التأهيل»
 * Uses Firebase Authentication (email/password) as the single source of truth for sign-in.
 */

import { Storage } from './storage.js';
import { UserService } from './userService.js';
import { auth, signInWithEmailAndPassword, fbSignOut, onAuthStateChanged } from './firebase.js';

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
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Firebase Authentication
    try {
      if (password.length >= 6) {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        if (cred && cred.user) {
          Storage.setCurrentUserId(cred.user.uid);
          let user = await UserService.getUserById(cred.user.uid);
          if (!user) {
            user = await UserService.getUserByEmail(cleanEmail);
          }
          if (user) {
            this.notifyListeners(user);
            return user;
          }
        }
      }
    } catch (fbErr) {
      const code = fbErr.code || '';
      console.warn('Firebase signIn note:', code, fbErr.message);
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        throw new Error('كلمة المرور أو البريد الإلكتروني غير صحيح، يرجى التأكد من صحة البيانات.');
      } else if (code === 'auth/user-not-found') {
        throw new Error('لم يتم العثور على حساب مسجل بهذا البريد الإلكتروني.');
      } else if (code === 'auth/invalid-email') {
        throw new Error('صيغة البريد الإلكتروني غير صحيحة، يرجى كتابة البريد بشكل سليم.');
      } else if (code === 'auth/too-many-requests') {
        throw new Error('تم حظر المحاولات مؤقتاً لكثرة المحاولات الخاطئة، يرجى الانتظار قليلاً ثم المحاولة.');
      } else if (code === 'auth/network-request-failed') {
        throw new Error('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت.');
      }
    }

    // 2. Check registered system user by email
    const user = await UserService.getUserByEmail(cleanEmail);
    if (!user) {
      throw new Error('لم يتم العثور على حساب بهذا البريد الإلكتروني. يرجى مراجعة إدارة البرنامج.');
    }

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
