import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
} from 'firebase/auth';
import { auth } from './config';
import { saveUserProfile, getUserProfile } from './db';
import { User } from '../types';

// Convert Firebase User to app User type
function firebaseUserToAppUser(firebaseUser: FirebaseUser, name?: string): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: name || firebaseUser.displayName || '',
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
  };
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { success: false, error: 'Invalid email format' };
    }

    // Validate password
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Validate name
    if (name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' };
    }

    // Create user with Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Update display name
    await updateProfile(firebaseUser, { displayName: name });

    // Save user profile to Firestore
    await saveUserProfile(firebaseUser.uid, {
      name: name.trim(),
      email: email.toLowerCase().trim(),
    });

    const appUser = firebaseUserToAppUser(firebaseUser, name);
    return { success: true, user: appUser };
  } catch (error: any) {
    console.error('Sign up error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email already registered' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email format' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, error: 'Password is too weak' };
    }
    
    return { success: false, error: error.message || 'Failed to sign up' };
  }
}

// Sign in with email and password
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    // Get user profile from Firestore
    const profile = await getUserProfile(firebaseUser.uid);
    const appUser = firebaseUserToAppUser(
      firebaseUser,
      profile?.name || firebaseUser.displayName || undefined
    );

    return { success: true, user: appUser };
  } catch (error: any) {
    console.error('Sign in error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      return { success: false, error: 'Invalid email or password' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email format' };
    } else if (error.code === 'auth/user-disabled') {
      return { success: false, error: 'This account has been disabled' };
    }
    
    return { success: false, error: error.message || 'Failed to sign in' };
  }
}

// Sign out
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    return null;
  }

  try {
    // Get user profile from Firestore
    const profile = await getUserProfile(firebaseUser.uid);
    return firebaseUserToAppUser(
      firebaseUser,
      profile?.name || firebaseUser.displayName || undefined
    );
  } catch (error) {
    console.error('Error getting current user:', error);
    // Fallback to basic user info if Firestore lookup fails
    return firebaseUserToAppUser(firebaseUser);
  }
}

// Update user profile
export async function updateUserProfile(
  name: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate name
    if (name.trim().length < 2) {
      return { success: false, error: 'Name must be at least 2 characters' };
    }

    // Update display name in Firebase Auth
    await updateProfile(firebaseUser, { displayName: name.trim() });

    // Update profile in Firestore
    await saveUserProfile(firebaseUser.uid, {
      name: name.trim(),
      email: firebaseUser.email || '',
    });

    const appUser = firebaseUserToAppUser(firebaseUser, name);
    return { success: true, user: appUser };
  } catch (error: any) {
    console.error('Update profile error:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

// Update user password
export async function updateUserPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser || !firebaseUser.email) {
      return { success: false, error: 'Not authenticated' };
    }

    // Validate new password
    if (newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(
      firebaseUser.email,
      currentPassword
    );
    await reauthenticateWithCredential(firebaseUser, credential);

    // Update password
    await updatePassword(firebaseUser, newPassword);

    return { success: true };
  } catch (error: any) {
    console.error('Update password error:', error);
    
    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Current password is incorrect' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, error: 'New password is too weak' };
    }
    
    return { success: false, error: error.message || 'Failed to update password' };
  }
}

// Delete user account
export async function deleteUserAccount(
  password?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      return { success: false, error: 'Not authenticated' };
    }

    // If password provided, re-authenticate first
    if (password && firebaseUser.email) {
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        password
      );
      await reauthenticateWithCredential(firebaseUser, credential);
    }

    // Delete user from Firebase Auth (this will also trigger Firestore rules cleanup if configured)
    await firebaseDeleteUser(firebaseUser);

    return { success: true };
  } catch (error: any) {
    console.error('Delete account error:', error);
    
    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Password is incorrect' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, error: 'Please sign in again before deleting your account' };
    }
    
    return { success: false, error: error.message || 'Failed to delete account' };
  }
}

// Sign in with Google
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const firebaseUser = userCredential.user;

    // Check if user profile exists in Firestore, if not create it
    let profile = await getUserProfile(firebaseUser.uid);
    if (!profile) {
      // Save user profile to Firestore
      await saveUserProfile(firebaseUser.uid, {
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
      });
      profile = await getUserProfile(firebaseUser.uid);
    }

    const appUser = firebaseUserToAppUser(
      firebaseUser,
      profile?.name || firebaseUser.displayName || undefined
    );

    return { success: true, user: appUser };
  } catch (error: any) {
    console.error('Google sign in error:', error);
    
    // Handle Firebase Auth errors
    if (error.code === 'auth/popup-closed-by-user') {
      return { success: false, error: 'Sign in cancelled' };
    } else if (error.code === 'auth/popup-blocked') {
      return { success: false, error: 'Popup blocked. Please allow popups for this site.' };
    }
    
    return { success: false, error: error.message || 'Failed to sign in with Google' };
  }
}

// Sign in anonymously
export async function signInAnonymouslyUser(): Promise<{ success: boolean; error?: string; user?: User }> {
  try {
    const userCredential = await signInAnonymously(auth);
    const firebaseUser = userCredential.user;

    // Generate a display name for anonymous users
    const anonymousName = `Guest ${firebaseUser.uid.substring(0, 6)}`;

    // Save user profile to Firestore
    await saveUserProfile(firebaseUser.uid, {
      name: anonymousName,
      email: '', // Anonymous users don't have email
    });

    const appUser = firebaseUserToAppUser(firebaseUser, anonymousName);
    return { success: true, user: appUser };
  } catch (error: any) {
    console.error('Anonymous sign in error:', error);
    
    return { success: false, error: error.message || 'Failed to sign in anonymously' };
  }
}

// Subscribe to auth state changes
export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        const appUser = firebaseUserToAppUser(
          firebaseUser,
          profile?.name || firebaseUser.displayName || undefined
        );
        callback(appUser);
      } catch (error) {
        console.error('Error getting user profile in auth state change:', error);
        callback(firebaseUserToAppUser(firebaseUser));
      }
    } else {
      callback(null);
    }
  });
}

