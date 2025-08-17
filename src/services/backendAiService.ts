// Backend AI Service: Production-ready integration with backend AI agentic system
// Replaces dummy transcription with real AI-powered book creation

// Interface definitions with comprehensive typing
export interface ProcessingSession {
  sessionId: string;
  status: 'processing' | 'completed' | 'failed' | 'pending' | 'initializing';
  currentStage: string;
  progressPercentage: number;
  currentTask: string;
  estimatedCompletion?: string;
  resultsPreview?: any;
  errors: (string | { timestamp: string; error: string; traceback?: string })[];
}

export interface ProcessingResults {
  chapters: Chapter[];
  followupQuestions: FollowupQuestion[];
  questionCategories: Record<string, FollowupQuestion[]>;
  storylines: Storyline[];
  graphSummary: GraphSummary;
  processingSummary: ProcessingSummary;
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  qualityScore?: number;
  themes?: string[];
  participants?: string[];
  temporalMarkers?: string[];
  wordCount: number;
  estimatedReadingTime: number;
}

export interface FollowupQuestion {
  id: string;
  category: string;
  question: string;
  context: string;
  priorityScore: number;
  reasoning: string;
  suggestedAnswers?: string[];
}

export interface Storyline {
  id: string;
  title: string;
  description: string;
  chapters: string[];
  temporalRange: {
    start: string;
    end: string;
  };
  confidence: number;
}

export interface GraphSummary {
  totalNodes: number;
  totalEdges: number;
  mainStorylines: number;
  temporalSpan: string;
  keyThemes: string[];
}

export interface ProcessingSummary {
  totalProcessingTime: string;
  audioFilesProcessed: number;
  transcriptionAccuracy: number;
  chaptersGenerated: number;
  wordsGenerated: number;
  aiAgentsUsed: string[];
}

// Custom error classes for better error handling
export class BackendAiServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'BackendAiServiceError';
  }
}

export class ProcessingTimeoutError extends BackendAiServiceError {
  constructor(sessionId: string) {
    super(`Processing timeout for session ${sessionId}`, 408);
    this.name = 'ProcessingTimeoutError';
  }
}

export class NetworkError extends BackendAiServiceError {
  constructor(message: string, statusCode?: number) {
    super(message, statusCode);
    this.name = 'NetworkError';
  }
}

// Configuration interface
interface ServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Main service class with production-ready features
class BackendAiService {
  private config: ServiceConfig;

  constructor(customConfig?: Partial<ServiceConfig>) {
    this.config = {
      baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
      timeout: 30000, // 30 seconds default timeout
      retryAttempts: 3,
      retryDelay: 1000,
      ...customConfig
    };
  }

  /**
   * Process audio files from Firebase Storage URLs through backend AI pipeline
   * Replaces claudeService.processChapterAudios() with real AI agentic system
   */
  async processAudioFromFirebase(
    audioUrls: string[], 
    chapterTitle: string, 
    chapterDescription: string,
    userPreferences: Record<string, any> = {}
  ): Promise<string> {
    if (!audioUrls.length) {
      throw new BackendAiServiceError('No audio URLs provided');
    }

    if (!chapterTitle.trim()) {
      throw new BackendAiServiceError('Chapter title is required');
    }

    if (!chapterDescription.trim()) {
      throw new BackendAiServiceError('Chapter description is required');
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/ai/process-from-firebase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrls,
          chapterTitle,
          chapterDescription,
          userPreferences
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new NetworkError(
          errorData.detail || `HTTP ${response.status}: Processing request failed`,
          response.status
        );
      }

      const data = await response.json();
      
      if (!data.sessionId) {
        throw new BackendAiServiceError('Invalid response: missing session ID');
      }

      console.log(`Started AI processing with session ID: ${data.sessionId}`);
      return data.sessionId;

    } catch (error) {
      if (error instanceof BackendAiServiceError) {
        throw error;
      }
      
      console.error('Failed to start audio processing:', error);
      throw new BackendAiServiceError(
        `Failed to start audio processing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Monitor processing progress using existing backend status endpoint
   * Enhanced with retry logic and proper error handling
   */
  async monitorProcessing(sessionId: string): Promise<ProcessingSession> {
    if (!sessionId.trim()) {
      throw new BackendAiServiceError('Session ID is required');
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/ai/status/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new BackendAiServiceError(`Session not found: ${sessionId}`, 404);
        }
        throw new NetworkError(`HTTP ${response.status}: Failed to get processing status`, response.status);
      }

      const statusData = await response.json();
      
      // Transform backend response to frontend interface with defaults
      const session: ProcessingSession = {
        sessionId,
        status: this.normalizeStatus(statusData.status || 'processing'),
        currentStage: statusData.current_stage || statusData.currentStage || 'Processing...',
        progressPercentage: Math.min(100, Math.max(0, statusData.progress_percentage || statusData.progressPercentage || 0)),
        currentTask: statusData.current_task || statusData.currentTask || 'Initializing...',
        estimatedCompletion: statusData.estimated_completion || statusData.estimatedCompletion,
        resultsPreview: statusData.results_preview || statusData.resultsPreview,
        errors: Array.isArray(statusData.errors) ? statusData.errors : []
      };

      return session;

    } catch (error) {
      if (error instanceof BackendAiServiceError) {
        throw error;
      }

      console.error('Failed to monitor processing:', error);
      throw new NetworkError(
        `Failed to monitor processing: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieve final processing results using existing backend results endpoint
   */
  async getResults(sessionId: string): Promise<ProcessingResults> {
    if (!sessionId.trim()) {
      throw new BackendAiServiceError('Session ID is required');
    }

    try {
      const response = await this.fetchWithRetry(`${this.config.baseUrl}/api/ai/results/${sessionId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new BackendAiServiceError(`Results not found for session: ${sessionId}`, 404);
        }
        throw new NetworkError(`HTTP ${response.status}: Failed to get processing results`, response.status);
      }

      const resultsData = await response.json();
      
      // Transform and validate backend results
      const results: ProcessingResults = {
        chapters: this.transformChapters(resultsData.chapters || []),
        followupQuestions: this.transformFollowupQuestions(resultsData.followup_questions || resultsData.followupQuestions || []),
        questionCategories: resultsData.question_categories || resultsData.questionCategories || {},
        storylines: this.transformStorylines(resultsData.storylines || []),
        graphSummary: this.transformGraphSummary(resultsData.graph_summary || resultsData.graphSummary || {}),
        processingSummary: this.transformProcessingSummary(resultsData.processing_summary || resultsData.processingSummary || {})
      };

      console.log(`Retrieved results for session ${sessionId}: ${results.chapters.length} chapters`);
      return results;

    } catch (error) {
      if (error instanceof BackendAiServiceError) {
        throw error;
      }

      console.error('Failed to get results:', error);
      throw new NetworkError(
        `Failed to retrieve processing results: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Enhanced polling utility with comprehensive error handling and timeout management
   */
  async pollUntilComplete(
    sessionId: string,
    onProgress?: (session: ProcessingSession) => void,
    pollInterval: number = 5000,
    maxDuration: number = 600000 // 10 minutes default
  ): Promise<ProcessingResults> {
    const startTime = Date.now();
    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 5;
    
    while (Date.now() - startTime < maxDuration) {
      try {
        const session = await this.monitorProcessing(sessionId);
        consecutiveErrors = 0; // Reset error counter on success
        
        if (onProgress) {
          onProgress(session);
        }

        if (session.status === 'completed') {
          console.log(`Processing completed for session ${sessionId}`);
          return await this.getResults(sessionId);
        }

        if (session.status === 'failed') {
          const errorMessage = session.errors.length > 0 
            ? session.errors.join(', ')
            : 'Processing failed without specific error details';
          throw new BackendAiServiceError(`Processing failed: ${errorMessage}`);
        }

        // Wait before next poll
        await this.delay(pollInterval);

      } catch (error) {
        consecutiveErrors++;
        
        console.error(`Polling attempt failed (${consecutiveErrors}/${maxConsecutiveErrors}):`, error);
        
        // If too many consecutive errors, give up
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new BackendAiServiceError(
            `Polling failed after ${maxConsecutiveErrors} consecutive errors. Last error: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          );
        }
        
        // Wait longer after errors
        await this.delay(pollInterval * 2);
      }
    }
    
    throw new ProcessingTimeoutError(sessionId);
  }

  // Helper methods

  private async fetchWithRetry(url: string, options?: RequestInit): Promise<Response> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown fetch error');
        
        if (attempt < this.config.retryAttempts) {
          console.warn(`Fetch attempt ${attempt} failed, retrying in ${this.config.retryDelay}ms:`, error);
          await this.delay(this.config.retryDelay * attempt); // Progressive backoff
        }
      }
    }
    
    throw new NetworkError(
      `Network request failed after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  private normalizeStatus(status: string): ProcessingSession['status'] {
    const normalizedStatus = status.toLowerCase();
    if (['completed', 'failed', 'pending', 'initializing'].includes(normalizedStatus)) {
      return normalizedStatus as ProcessingSession['status'];
    }
    return 'processing';
  }

  private transformChapters(chapters: any[]): Chapter[] {
    return chapters.map((chapter, index) => ({
      id: chapter.id || `chapter_${index}`,
      title: chapter.title || `Chapter ${index + 1}`,
      content: chapter.content || '',
      qualityScore: chapter.quality_score || chapter.qualityScore,
      themes: chapter.themes || [],
      participants: chapter.participants || [],
      temporalMarkers: chapter.temporal_markers || chapter.temporalMarkers || [],
      wordCount: chapter.word_count || chapter.wordCount || chapter.content?.split(' ').length || 0,
      estimatedReadingTime: chapter.estimated_reading_time || chapter.estimatedReadingTime || 
        Math.ceil((chapter.content?.split(' ').length || 0) / 200) // 200 words per minute
    }));
  }

  private transformFollowupQuestions(questions: any[]): FollowupQuestion[] {
    return questions.map((q, index) => ({
      id: q.id || `question_${index}`,
      category: q.category || 'General',
      question: q.question || '',
      context: q.context || '',
      priorityScore: q.priority_score || q.priorityScore || 0,
      reasoning: q.reasoning || '',
      suggestedAnswers: q.suggested_answers || q.suggestedAnswers
    }));
  }

  private transformStorylines(storylines: any[]): Storyline[] {
    return storylines.map((s, index) => ({
      id: s.id || `storyline_${index}`,
      title: s.title || `Storyline ${index + 1}`,
      description: s.description || '',
      chapters: s.chapters || [],
      temporalRange: s.temporal_range || s.temporalRange || { start: '', end: '' },
      confidence: s.confidence || 0
    }));
  }

  private transformGraphSummary(summary: any): GraphSummary {
    return {
      totalNodes: summary.total_nodes || summary.totalNodes || 0,
      totalEdges: summary.total_edges || summary.totalEdges || 0,
      mainStorylines: summary.main_storylines || summary.mainStorylines || 0,
      temporalSpan: summary.temporal_span || summary.temporalSpan || '',
      keyThemes: summary.key_themes || summary.keyThemes || []
    };
  }

  private transformProcessingSummary(summary: any): ProcessingSummary {
    return {
      totalProcessingTime: summary.total_processing_time || summary.totalProcessingTime || '',
      audioFilesProcessed: summary.audio_files_processed || summary.audioFilesProcessed || 0,
      transcriptionAccuracy: summary.transcription_accuracy || summary.transcriptionAccuracy || 0,
      chaptersGenerated: summary.chapters_generated || summary.chaptersGenerated || 0,
      wordsGenerated: summary.words_generated || summary.wordsGenerated || 0,
      aiAgentsUsed: summary.ai_agents_used || summary.aiAgentsUsed || []
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const backendAiService = new BackendAiService();
export default backendAiService;