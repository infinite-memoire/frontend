import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  orderBy, 
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';

// Updated interfaces to match your naming convention
export interface Recording {
  id: string;
  title: string;
  duration: number; // in seconds
  date: string;
  chapterId: string;
  audioUrl?: string;
}

export interface Chapter {
  id: string;
  title: string;
  description: string;
  topics: string[];
  recordings: Recording[];
  createdAt: string;
}

// Chapter CRUD operations - users/{userId}/chapters
export const chaptersService = {
  // Get all chapters for a user
  getChapters: async (userId: string): Promise<Chapter[]> => {
    console.log('🔍 Getting chapters for user:', userId);
    try {
      const chaptersRef = collection(db, 'users', userId, 'chapters');
      const q = query(chaptersRef, orderBy('createdAt', 'desc'));
      console.log('📚 Querying chapters collection...');
      const snapshot = await getDocs(q);
      console.log('✅ Query successful, found documents:', snapshot.docs.length);
    
    const chapters: Chapter[] = [];
    
    for (const chapterDoc of snapshot.docs) {
      const chapterData = chapterDoc.data();
      
      // Get recordings for this chapter (subcollection)
      const recordingsRef = collection(db, 'users', userId, 'chapters', chapterDoc.id, 'recordings');
      const recordingsSnapshot = await getDocs(recordingsRef);
      
      const recordings: Recording[] = recordingsSnapshot.docs.map(recordingDoc => ({
        id: recordingDoc.id,
        ...recordingDoc.data(),
        chapterId: chapterDoc.id
      })) as Recording[];
      
      chapters.push({
        id: chapterDoc.id,
        ...chapterData,
        recordings
      } as Chapter);
    }
    
      console.log('📊 Processed chapters:', chapters.length);
      return chapters;
    } catch (error) {
      console.error('❌ Error getting chapters:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  },

  // Add a new chapter
  addChapter: async (userId: string, chapter: Omit<Chapter, 'id' | 'recordings'>): Promise<string> => {
    const chaptersRef = collection(db, 'users', userId, 'chapters');
    const docRef = await addDoc(chaptersRef, {
      ...chapter,
      createdAt: Timestamp.now().toDate().toISOString()
    });
    return docRef.id;
  },

  // Update a chapter
  updateChapter: async (userId: string, chapterId: string, updates: Partial<Chapter>): Promise<void> => {
    const chapterRef = doc(db, 'users', userId, 'chapters', chapterId);
    await updateDoc(chapterRef, updates);
  },

  // Delete a chapter (and all its recordings)
  deleteChapter: async (userId: string, chapterId: string): Promise<void> => {
    const chapterRef = doc(db, 'users', userId, 'chapters', chapterId);
    await deleteDoc(chapterRef);
  },

  // Listen to real-time changes
  listenToChapters: (userId: string, callback: (chapters: Chapter[]) => void) => {
    console.log('🔄 Setting up real-time listener for user:', userId);
    try {
      const chaptersRef = collection(db, 'users', userId, 'chapters');
      const q = query(chaptersRef, orderBy('createdAt', 'desc'));
      
      return onSnapshot(q, async (snapshot) => {
        console.log('📡 Real-time update received, documents:', snapshot.docs.length);
      const chapters: Chapter[] = [];
      
      for (const chapterDoc of snapshot.docs) {
        const chapterData = chapterDoc.data();
        
        // Get recordings for this chapter
        const recordingsRef = collection(db, 'users', userId, 'chapters', chapterDoc.id, 'recordings');
        const recordingsSnapshot = await getDocs(recordingsRef);
        
        const recordings: Recording[] = recordingsSnapshot.docs.map(recordingDoc => ({
          id: recordingDoc.id,
          ...recordingDoc.data(),
          chapterId: chapterDoc.id
        })) as Recording[];
        
        chapters.push({
          id: chapterDoc.id,
          ...chapterData,
          recordings
        } as Chapter);
      }
      
        callback(chapters);
      }, (error) => {
        console.error('❌ Error in chapters listener:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
      });
    } catch (error) {
      console.error('❌ Error setting up chapters listener:', error);
      throw error;
    }
  }
};

// Recording CRUD operations - users/{userId}/chapters/{chapterId}/recordings
export const recordingsService = {
  // Add a new recording to a chapter
  addRecording: async (userId: string, chapterId: string, recording: Omit<Recording, 'id' | 'chapterId'>): Promise<string> => {
    const recordingsRef = collection(db, 'users', userId, 'chapters', chapterId, 'recordings');
    const docRef = await addDoc(recordingsRef, {
      ...recording,
      chapterId,
      date: new Date().toISOString()
    });
    return docRef.id;
  },

  // Upload audio file and add recording
  uploadRecordingWithAudio: async (
    userId: string, 
    chapterId: string, 
    audioBlob: Blob, 
    recording: Omit<Recording, 'id' | 'chapterId' | 'audioUrl'>
  ): Promise<string> => {
    console.log('🎤 Starting audio upload for user:', userId);
    console.log('📁 Chapter ID:', chapterId);
    console.log('🗂️ Audio blob size:', audioBlob.size, 'bytes');
    
    try {
      // Upload audio file to Firebase Storage
      const fileName = `${Date.now()}.aac`; // Changed to .aac extension for AAC format
      const storagePath = `users/${userId}/chapters/${chapterId}/recordings/${fileName}`;
      console.log('📤 Uploading to path:', storagePath);
      
      const audioRef = ref(storage, storagePath);
      console.log('🔗 Storage reference created');
      
      const snapshot = await uploadBytes(audioRef, audioBlob);
      console.log('✅ Upload successful, getting download URL...');
      const audioUrl = await getDownloadURL(snapshot.ref);
      console.log('🔗 Download URL obtained:', audioUrl.substring(0, 50) + '...');
      
      // Add recording metadata to Firestore
      console.log('💾 Saving recording metadata to Firestore...');
      const recordingId = await recordingsService.addRecording(userId, chapterId, {
        ...recording,
        audioUrl
      });
      console.log('✅ Recording saved with ID:', recordingId);
      
      return recordingId;
    } catch (error) {
      console.error('❌ Error uploading recording:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      throw error;
    }
  },

  // Get all recordings for a chapter
  getRecordings: async (userId: string, chapterId: string): Promise<Recording[]> => {
    const recordingsRef = collection(db, 'users', userId, 'chapters', chapterId, 'recordings');
    const q = query(recordingsRef, orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      chapterId
    })) as Recording[];
  },

  // Update a recording
  updateRecording: async (userId: string, chapterId: string, recordingId: string, updates: Partial<Recording>): Promise<void> => {
    const recordingRef = doc(db, 'users', userId, 'chapters', chapterId, 'recordings', recordingId);
    await updateDoc(recordingRef, updates);
  },

  // Delete a recording
  deleteRecording: async (userId: string, chapterId: string, recordingId: string): Promise<void> => {
    const recordingRef = doc(db, 'users', userId, 'chapters', chapterId, 'recordings', recordingId);
    await deleteDoc(recordingRef);
  }
};