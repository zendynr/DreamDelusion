import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';
import { Thought } from '../types';

// Convert Thought to Firestore document format
function thoughtToFirestore(thought: Thought) {
  return {
    ...thought,
    timestamp: Timestamp.fromDate(new Date(thought.timestamp)),
  };
}

// Convert Firestore document to Thought
function firestoreToThought(docData: any, id: string): Thought {
  const timestamp = docData.timestamp?.toDate?.() || new Date(docData.timestamp);
  return {
    id,
    ...docData,
    timestamp: timestamp.toISOString(),
  };
}

// Load all thoughts for a user
export async function loadAllThoughts(userId: string): Promise<Thought[]> {
  try {
    const thoughtsRef = collection(db, 'users', userId, 'thoughts');
    const q = query(thoughtsRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map((doc) => 
      firestoreToThought(doc.data(), doc.id)
    );
  } catch (error) {
    console.error('Error loading thoughts:', error);
    throw error;
  }
}

// Save a thought (create or update)
export async function saveThought(thought: Thought, userId: string): Promise<void> {
  try {
    const thoughtRef = doc(db, 'users', userId, 'thoughts', thought.id);
    const firestoreData = thoughtToFirestore(thought);
    await setDoc(thoughtRef, firestoreData, { merge: true });
  } catch (error) {
    console.error('Error saving thought:', error);
    throw error;
  }
}

// Save multiple thoughts in a batch
export async function saveAllThoughts(thoughts: Thought[], userId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const thoughtsRef = collection(db, 'users', userId, 'thoughts');
    
    thoughts.forEach((thought) => {
      const thoughtRef = doc(thoughtsRef, thought.id);
      const firestoreData = thoughtToFirestore(thought);
      batch.set(thoughtRef, firestoreData, { merge: true });
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error saving thoughts:', error);
    throw error;
  }
}

// Delete a thought
export async function deleteThought(thoughtId: string, userId: string): Promise<void> {
  try {
    const thoughtRef = doc(db, 'users', userId, 'thoughts', thoughtId);
    await deleteDoc(thoughtRef);
  } catch (error) {
    console.error('Error deleting thought:', error);
    throw error;
  }
}

// Subscribe to real-time updates for a user's thoughts
export function subscribeToThoughts(
  userId: string,
  callback: (thoughts: Thought[]) => void
): () => void {
  const thoughtsRef = collection(db, 'users', userId, 'thoughts');
  const q = query(thoughtsRef, orderBy('timestamp', 'desc'));
  
  return onSnapshot(
    q,
    (querySnapshot) => {
      const thoughts = querySnapshot.docs.map((doc) =>
        firestoreToThought(doc.data(), doc.id)
      );
      callback(thoughts);
    },
    (error) => {
      console.error('Error in thoughts subscription:', error);
    }
  );
}

// Save user profile data
export async function saveUserProfile(
  userId: string,
  profileData: { name: string; email: string }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...profileData,
      updatedAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw error;
  }
}

// Get user profile data
export async function getUserProfile(userId: string): Promise<{ name: string; email: string } | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        name: data.name || '',
        email: data.email || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

