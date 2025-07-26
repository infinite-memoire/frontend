import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';

// Service pour gérer différents types d'uploads
export const uploadService = {
  // Upload d'avatar de profil
  uploadAvatar: async (userId: string, file: File): Promise<string> => {
    try {
      console.log('📤 Uploading avatar for user:', userId);
      const fileExtension = file.name.split('.').pop();
      const fileName = `avatar_${Date.now()}.${fileExtension}`;
      const storagePath = `users/${userId}/profile/avatar/${fileName}`;
      
      const avatarRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Avatar uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      throw error;
    }
  },

  // Upload de cover/images pour les chapitres
  uploadChapterCover: async (userId: string, chapterId: string, file: File): Promise<string> => {
    try {
      console.log('📤 Uploading chapter cover for user:', userId, 'chapter:', chapterId);
      const fileExtension = file.name.split('.').pop();
      const fileName = `cover_${Date.now()}.${fileExtension}`;
      const storagePath = `users/${userId}/chapters/${chapterId}/covers/${fileName}`;
      
      const coverRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(coverRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Chapter cover uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading chapter cover:', error);
      throw error;
    }
  },

  // Upload d'assets généraux
  uploadAsset: async (userId: string, file: File, category: string = 'general'): Promise<string> => {
    try {
      console.log('📤 Uploading asset for user:', userId, 'category:', category);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${category}_${Date.now()}.${fileExtension}`;
      const storagePath = `users/${userId}/assets/${category}/${fileName}`;
      
      const assetRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(assetRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Asset uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading asset:', error);
      throw error;
    }
  },

  // Upload pour les publications marketplace (futures)
  uploadMarketplaceAsset: async (userId: string, storyId: string, file: File, type: 'cover' | 'preview'): Promise<string> => {
    try {
      console.log('📤 Uploading marketplace asset for user:', userId, 'story:', storyId, 'type:', type);
      const fileExtension = file.name.split('.').pop();
      const fileName = `${type}_${Date.now()}.${fileExtension}`;
      const storagePath = `users/${userId}/marketplace/${storyId}/${type}/${fileName}`;
      
      const assetRef = ref(storage, storagePath);
      const snapshot = await uploadBytes(assetRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Marketplace asset uploaded successfully');
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading marketplace asset:', error);
      throw error;
    }
  }
};