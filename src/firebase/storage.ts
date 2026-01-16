import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

/**
 * Upload an audio file to Firebase Storage
 * @param file - The audio file (Blob or File)
 * @param userId - The user ID
 * @param thoughtId - The thought ID
 * @returns The download URL of the uploaded file
 */
export async function uploadAudioFile(
  file: Blob | File,
  userId: string,
  thoughtId: string
): Promise<string> {
  try {
    const fileName = `audio_${thoughtId}_${Date.now()}.webm`;
    const storageRef = ref(storage, `users/${userId}/thoughts/${thoughtId}/${fileName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading audio file:', error);
    throw error;
  }
}

/**
 * Upload a video file to Firebase Storage
 * @param file - The video file (Blob or File)
 * @param userId - The user ID
 * @param thoughtId - The thought ID
 * @returns The download URL of the uploaded file
 */
export async function uploadVideoFile(
  file: Blob | File,
  userId: string,
  thoughtId: string
): Promise<string> {
  try {
    const fileName = `video_${thoughtId}_${Date.now()}.webm`;
    const storageRef = ref(storage, `users/${userId}/thoughts/${thoughtId}/${fileName}`);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading video file:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 * @param url - The download URL of the file to delete
 */
export async function deleteStorageFile(url: string): Promise<void> {
  try {
    // Extract the path from the URL
    const urlObj = new URL(url);
    const path = decodeURIComponent(urlObj.pathname.split('/o/')[1]?.split('?')[0] || '');
    if (!path) {
      throw new Error('Invalid storage URL');
    }
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting storage file:', error);
    throw error;
  }
}

/**
 * Delete all files associated with a thought
 * @param userId - The user ID
 * @param thoughtId - The thought ID
 */
export async function deleteThoughtFiles(
  userId: string,
  thoughtId: string
): Promise<void> {
  try {
    const folderRef = ref(storage, `users/${userId}/thoughts/${thoughtId}`);
    // Note: Firebase Storage doesn't support folder deletion directly
    // We need to delete files individually if we track them
    // For now, this is a placeholder - files will be deleted when the thought is deleted
    // if we track the URLs in the thought document
  } catch (error) {
    console.error('Error deleting thought files:', error);
    throw error;
  }
}
