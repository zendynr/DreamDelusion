// Re-export Firebase auth functions for backward compatibility
// This allows existing components to continue using the same API
export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateUserProfile as updateUser,
  deleteUserAccount as deleteUser,
  onAuthStateChange,
  signInWithGoogle,
  signInAnonymouslyUser as signInAnonymously,
} from './firebase/auth';

// Legacy function for backward compatibility (no longer needed but kept for migration)
export function setCurrentUser(_user: any) {
  // No-op: Firebase Auth manages current user state
  console.warn('setCurrentUser is deprecated. Firebase Auth manages user state automatically.');
}

