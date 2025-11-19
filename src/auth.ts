import { User } from './types';

const USERS_KEY = 'dreamdelusion:users';
const CURRENT_USER_KEY = 'dreamdelusion:currentUser';

// Simple in-memory storage for demo (in production, this would be a backend API)
let usersCache: User[] | null = null;

// Load users from localStorage
function loadUsers(): User[] {
  if (usersCache) return usersCache;
  try {
    const stored = localStorage.getItem(USERS_KEY);
    if (stored) {
      usersCache = JSON.parse(stored);
      return usersCache || [];
    }
  } catch (e) {
    console.error('Error loading users:', e);
  }
  return [];
}

// Save users to localStorage
function saveUsers(users: User[]) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    usersCache = users;
  } catch (e) {
    console.error('Error saving users:', e);
  }
}

// Get current user
export function getCurrentUser(): User | null {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (stored) {
      const userId = JSON.parse(stored);
      const users = loadUsers();
      return users.find(u => u.id === userId) || null;
    }
  } catch (e) {
    console.error('Error getting current user:', e);
  }
  return null;
}

// Set current user
export function setCurrentUser(user: User | null) {
  try {
    if (user) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user.id));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  } catch (e) {
    console.error('Error setting current user:', e);
  }
}

// Sign up
export function signUp(email: string, password: string, name: string): { success: boolean; error?: string; user?: User } {
  const users = loadUsers();
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: 'Invalid email format' };
  }
  
  // Check if user already exists
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return { success: false, error: 'Email already registered' };
  }
  
  // Validate password
  if (password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters' };
  }
  
  // Validate name
  if (name.trim().length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' };
  }
  
  // Create new user (in production, password would be hashed)
  const newUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: email.toLowerCase().trim(),
    name: name.trim(),
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  
  return { success: true, user: newUser };
}

// Sign in
export function signIn(email: string, password: string): { success: boolean; error?: string; user?: User } {
  const users = loadUsers();
  
  // Find user by email
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return { success: false, error: 'Invalid email or password' };
  }
  
  // In a real app, we'd verify the password hash here
  // For demo purposes, we'll just check if password is provided
  if (!password || password.length === 0) {
    return { success: false, error: 'Password required' };
  }
  
  setCurrentUser(user);
  return { success: true, user };
}

// Sign out
export function signOut() {
  setCurrentUser(null);
}

// Update user profile
export function updateUser(userId: string, updates: Partial<Pick<User, 'name' | 'email'>>): { success: boolean; error?: string; user?: User } {
  const users = loadUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return { success: false, error: 'User not found' };
  }
  
  // Validate email if provided
  if (updates.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(updates.email)) {
      return { success: false, error: 'Invalid email format' };
    }
    
    // Check if email is already taken by another user
    if (users.some(u => u.id !== userId && u.email.toLowerCase() === updates.email!.toLowerCase())) {
      return { success: false, error: 'Email already in use' };
    }
  }
  
  // Validate name if provided
  if (updates.name && updates.name.trim().length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' };
  }
  
  // Update user
  users[userIndex] = {
    ...users[userIndex],
    ...(updates.email && { email: updates.email.toLowerCase().trim() }),
    ...(updates.name && { name: updates.name.trim() })
  };
  
  saveUsers(users);
  const updatedUser = users[userIndex];
  
  // Update current user if it's the same user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    setCurrentUser(updatedUser);
  }
  
  return { success: true, user: updatedUser };
}

// Delete user account
export function deleteUser(userId: string): { success: boolean; error?: string } {
  const users = loadUsers();
  const filteredUsers = users.filter(u => u.id !== userId);
  
  if (filteredUsers.length === users.length) {
    return { success: false, error: 'User not found' };
  }
  
  saveUsers(filteredUsers);
  
  // Sign out if deleting current user
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    signOut();
  }
  
  return { success: true };
}

