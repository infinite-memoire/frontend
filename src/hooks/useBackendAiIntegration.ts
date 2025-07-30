// Custom hook for integrating backend AI service with ChaptersPage
// Provides state management and processing logic for real AI integration

import { useState, useCallback } from 'react';
import { backendAiService, ProcessingResults, ProcessingSession, BackendAiServiceError } from '../services/backendAiService';

// Integration interface for ChaptersPage.tsx
export interface BackendAiIntegrationHooks {
  // Replace existing audio processing method
  handleProcessAudiosWithBackend: (chapter: any) => Promise<void>;
  
  // State management for progress monitoring
  processingState: {
    currentSessionId: string | null;
    showProgressDialog: boolean;
    processingResults: ProcessingResults | null;
    processingError: string | null;
    isProcessing: boolean;
  };
  
  // State setters (use these in existing ChaptersPage component)
  setCurrentSessionId: (id: string | null) => void;
  setShowProgressDialog: (show: boolean) => void;
  setProcessingResults: (results: ProcessingResults | null) => void;
  setProcessingError: (error: string | null) => void;
  setIsProcessing: (processing: boolean) => void;
}

// Custom hook for ChaptersPage integration
export const useBackendAiIntegration = (): BackendAiIntegrationHooks => {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const [processingResults, setProcessingResults] = useState<ProcessingResults | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessAudiosWithBackend = useCallback(async (chapter: any) => {
    // Validation
    if (!chapter?.recordings?.length) {
      setProcessingError('No audio recordings found in chapter');
      return;
    }

    if (!chapter.title?.trim()) {
      setProcessingError('Chapter title is required');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingError(null);
      setProcessingResults(null);

      // Extract audio URLs from chapter recordings
      const audioUrls = chapter.recordings
        .map((recording: any) => recording.audioUrl)
        .filter((url: string) => url && url.trim());

      if (!audioUrls.length) {
        throw new Error('No valid audio URLs found in recordings');
      }

      console.log(`Processing ${audioUrls.length} audio files for chapter: ${chapter.title}`);

      // Start backend AI processing (replaces claudeService.processChapterAudios)
      const sessionId = await backendAiService.processAudioFromFirebase(
        audioUrls,
        chapter.title,
        chapter.description || `Chapter: ${chapter.title}`,
        {
          // Optional user preferences
          generateFollowupQuestions: true,
          includeQualityScores: true,
          createStorylineGraph: true
        }
      );

      // Set up progress monitoring
      setCurrentSessionId(sessionId);
      setShowProgressDialog(true);

      // The polling will be handled by the ProcessingProgressDialog component
      // This method completes here and the dialog handles the rest

    } catch (error) {
      setIsProcessing(false);
      setShowProgressDialog(false);
      
      let errorMessage = 'Audio processing failed';
      
      if (error instanceof BackendAiServiceError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setProcessingError(errorMessage);
      console.error('Audio processing failed:', error);
    }
  }, []);

  return {
    handleProcessAudiosWithBackend,
    processingState: {
      currentSessionId,
      showProgressDialog,
      processingResults,
      processingError,
      isProcessing
    },
    setCurrentSessionId,
    setShowProgressDialog,
    setProcessingResults,
    setProcessingError,
    setIsProcessing
  };
};