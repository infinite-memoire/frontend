import { chaptersService } from './firestore';

export const exportService = {
  // Export all user recordings
  exportAllRecordings: async (userId: string): Promise<void> => {
    try {
      console.log('📦 Starting export for user:', userId);
      
      // Get all user chapters with recordings
      const chapters = await chaptersService.getChapters(userId);
      
      // Collect all recordings with audio URLs
      const allRecordings = chapters.flatMap(chapter => 
        chapter.recordings.filter(recording => recording.audioUrl)
      );
      
      if (allRecordings.length === 0) {
        throw new Error('No recordings found to export');
      }
      
      console.log(`📊 Found ${allRecordings.length} recordings to export`);
      
      // Download each recording
      for (const recording of allRecordings) {
        if (recording.audioUrl) {
          try {
            const response = await fetch(recording.audioUrl);
            const blob = await response.blob();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            // Generate filename with chapter and recording info
            const chapterTitle = chapters.find(c => c.id === recording.chapterId)?.title || 'Unknown';
            const fileName = `${chapterTitle}_${recording.title}_${recording.date.split('T')[0]}.webm`;
            link.download = fileName.replace(/[^a-z0-9_\-\.]/gi, '_'); // Clean filename
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ Downloaded:', fileName);
            
            // Small delay between downloads to avoid overwhelming the browser
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Failed to download recording: ${recording.title}`, error);
          }
        }
      }
      
      console.log('🎉 Export completed successfully');
    } catch (error) {
      console.error('❌ Error during export:', error);
      throw error;
    }
  },

  // Get export statistics
  getExportStats: async (userId: string) => {
    try {
      const chapters = await chaptersService.getChapters(userId);
      const allRecordings = chapters.flatMap(chapter => chapter.recordings);
      const recordingsWithAudio = allRecordings.filter(recording => recording.audioUrl);
      
      const totalDuration = allRecordings.reduce((sum, recording) => sum + recording.duration, 0);
      
      return {
        totalChapters: chapters.length,
        totalRecordings: allRecordings.length,
        recordingsWithAudio: recordingsWithAudio.length,
        totalDurationMinutes: Math.round(totalDuration / 60),
      };
    } catch (error) {
      console.error('❌ Error getting export stats:', error);
      throw error;
    }
  }
};