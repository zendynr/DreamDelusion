import { loadAllThoughtsFromLocalStorage } from '../dataStorage';
import { saveAllThoughts as saveToFirestore } from './db';

const MIGRATION_KEY = 'dreamdelusion:firebase_migrated';

// Check if migration has already been completed
export function hasMigratedToFirebase(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'true';
  } catch (e) {
    return false;
  }
}

// Mark migration as completed
function markMigrationComplete() {
  try {
    localStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.error('Error marking migration complete:', e);
  }
}

// Migrate thoughts from localStorage to Firestore
export async function migrateThoughtsToFirebase(userId: string): Promise<{
  success: boolean;
  migratedCount: number;
  error?: string;
}> {
  try {
    // Check if already migrated
    if (hasMigratedToFirebase()) {
      return { success: true, migratedCount: 0 };
    }

    // Load thoughts from localStorage
    const localThoughts = loadAllThoughtsFromLocalStorage();

    if (localThoughts.length === 0) {
      // No data to migrate, mark as complete
      markMigrationComplete();
      return { success: true, migratedCount: 0 };
    }

    // Save to Firestore
    await saveToFirestore(localThoughts, userId);

    // Mark migration as complete
    markMigrationComplete();

    // Optionally clear localStorage after successful migration
    // Uncomment the following lines if you want to clear localStorage after migration:
    // try {
    //   localStorage.removeItem('dreamdelusion:thoughts');
    // } catch (e) {
    //   console.warn('Could not clear localStorage after migration:', e);
    // }

    return { success: true, migratedCount: localThoughts.length };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      migratedCount: 0,
      error: error.message || 'Failed to migrate data',
    };
  }
}

