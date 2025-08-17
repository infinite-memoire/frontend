// UI Components: Production-ready progress monitoring and results display
// Based on implementation artifacts with proper imports and integrations

import React, { useState, useEffect, useRef } from 'react';
import { backendAiService, ProcessingSession, ProcessingResults, Chapter, FollowupQuestion, Storyline } from '../services/backendAiService';

// Progress Dialog Component for monitoring AI pipeline stages
interface ProcessingProgressDialogProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (results: ProcessingResults) => void;
  onError: (error: string) => void;
}

export const ProcessingProgressDialog: React.FC<ProcessingProgressDialogProps> = ({
  sessionId,
  isOpen,
  onClose,
  onComplete,
  onError
}) => {
  const [progress, setProgress] = useState<ProcessingSession | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !sessionId || isPolling || pollingRef.current) return;

    setIsPolling(true);
    pollingRef.current = true;
    
    const pollProgress = async () => {
      try {
        console.log(`Starting progress monitoring for session: ${sessionId}`);
        
        // Use the backendAiService polling utility with proper error handling
        const results = await backendAiService.pollUntilComplete(
          sessionId,
          (session: ProcessingSession) => {
            setProgress(session);
            console.log(`Progress update: ${session.progressPercentage}% - ${session.currentStage}`);
          },
          5000, // 5 second intervals as requested
          600000 // 10 minute timeout for book creation
        );
        
        console.log(`Processing completed for session: ${sessionId}`);
        setIsPolling(false);
        pollingRef.current = false;
        onComplete(results);
        
      } catch (error) {
        console.error(`Processing failed for session ${sessionId}:`, error);
        setIsPolling(false);
        pollingRef.current = false;
        onError(error instanceof Error ? error.message : 'Processing failed');
      }
    };

    pollProgress();

    // Cleanup function to prevent memory leaks
    return () => {
      setIsPolling(false);
      pollingRef.current = false;
    };
  }, [sessionId, isOpen]); // Removed isPolling and callback dependencies to prevent restart loops

  // Handle dialog close with proper cleanup
  const handleClose = () => {
    if (!isPolling) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Creating Your Book</h3>
            <button
              onClick={handleClose}
              className={`text-gray-400 hover:text-gray-600 transition-colors ${
                isPolling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              }`}
              disabled={isPolling}
              aria-label="Close dialog"
            >
              ✕
            </button>
          </div>

          {progress ? (
            <div className="space-y-4">
              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, progress.progressPercentage))}%` }}
                />
              </div>
              
              {/* Progress Text */}
              <div className="flex justify-between text-sm text-gray-600">
                <span className="font-medium">{progress.progressPercentage}%</span>
                {progress.estimatedCompletion && (
                  <span>ETA: {formatTime(progress.estimatedCompletion)}</span>
                )}
              </div>

              {/* Current Stage */}
              <div className="text-center space-y-2">
                <div className="font-medium text-gray-900 text-base">
                  {progress.currentStage}
                </div>
                <div className="text-sm text-gray-600">
                  {progress.currentTask}
                </div>
              </div>

              {/* AI Pipeline Stages Indicator */}
              <div className="grid grid-cols-4 gap-2 text-xs text-center mt-6">
                <div className={`p-2 rounded transition-colors ${
                  progress.currentStage.toLowerCase().includes('transcrib') 
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium">Transcription</div>
                  <div className="text-xs mt-1">Audio → Text</div>
                </div>
                <div className={`p-2 rounded transition-colors ${
                  progress.currentStage.toLowerCase().includes('chunk') || 
                  progress.currentStage.toLowerCase().includes('analyz')
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium">Analysis</div>
                  <div className="text-xs mt-1">Semantic Chunking</div>
                </div>
                <div className={`p-2 rounded transition-colors ${
                  progress.currentStage.toLowerCase().includes('graph') || 
                  progress.currentStage.toLowerCase().includes('storyline')
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium">Storyline</div>
                  <div className="text-xs mt-1">Graph Building</div>
                </div>
                <div className={`p-2 rounded transition-colors ${
                  progress.currentStage.toLowerCase().includes('generat') || 
                  progress.currentStage.toLowerCase().includes('writ')
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <div className="font-medium">Writing</div>
                  <div className="text-xs mt-1">Multi-Agent Generation</div>
                </div>
              </div>

              {/* Error Display */}
              {progress?.errors && progress.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 text-sm font-medium">Processing Issues:</p>
                  <ul className="text-red-700 text-sm mt-2 space-y-1">
                    {progress.errors.map((error, index) => (
                      <li key={index} className="flex flex-col space-y-1">
                        <div className="flex items-start">
                          <span className="text-red-500 mr-2">•</span>
                          <span>
                            {typeof error === 'string' 
                              ? error 
                              : error?.error || error?.traceback || JSON.stringify(error)
                            }
                          </span>
                        </div>
                        {typeof error === 'object' && error?.timestamp && (
                          <div className="text-xs text-red-500 ml-4">
                            {new Date(error.timestamp).toLocaleTimeString()}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4 font-medium">Initializing AI processing...</p>
              <p className="text-gray-500 text-sm mt-2">Connecting to backend AI agentic system</p>
            </div>
          )}

          {/* Status indicator */}
          <div className="text-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              progress?.status === 'processing' ? 'bg-blue-100 text-blue-800' :
              progress?.status === 'completed' ? 'bg-green-100 text-green-800' :
              progress?.status === 'failed' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {progress?.status === 'processing' && (
                <>
                  <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                  Processing
                </>
              )}
              {progress?.status === 'completed' && 'Completed'}
              {progress?.status === 'failed' && 'Failed'}
              {(!progress || progress?.status === 'pending') && 'Initializing'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Chapter Results Component
interface EnhancedChapterResultsProps {
  results: ProcessingResults;
  sessionId?: string;
}

export const EnhancedChapterResults: React.FC<EnhancedChapterResultsProps> = ({
  results,
  sessionId
}) => {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [showFollowupQuestions, setShowFollowupQuestions] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['chapters']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Processing Summary */}
      {results.processingSummary && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900">
              Book Creation Complete ✨
            </h3>
            <button
              onClick={() => toggleSection('summary')}
              className="text-blue-700 hover:text-blue-900 text-sm font-medium"
            >
              {expandedSections.has('summary') ? 'Hide' : 'Show'} Details
            </button>
          </div>
          
          {expandedSections.has('summary') && (
            <ProcessingSummaryCard summary={results.processingSummary} />
          )}
        </div>
      )}

      {/* Generated Chapters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900">Generated Chapters</h3>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{results.chapters.length} chapters</span>
            <span>•</span>
            <span>{results.chapters.reduce((total, chapter) => total + chapter.wordCount, 0).toLocaleString()} words</span>
            <span>•</span>
            <span>{Math.ceil(results.chapters.reduce((total, chapter) => total + chapter.estimatedReadingTime, 0))} min read</span>
          </div>
        </div>

        <div className="grid gap-4">
          {results.chapters.map((chapter, index) => (
            <ChapterCard
              key={chapter.id || index}
              chapter={chapter}
              onSelect={() => setSelectedChapter(selectedChapter?.id === chapter.id ? null : chapter)}
              isSelected={selectedChapter?.id === chapter.id}
            />
          ))}
        </div>
      </div>

      {/* Follow-up Questions Section */}
      {results.followupQuestions.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-yellow-900">
              Improve Your Story 💡
            </h3>
            <button
              onClick={() => setShowFollowupQuestions(!showFollowupQuestions)}
              className="text-yellow-800 hover:text-yellow-900 text-sm font-medium"
            >
              {showFollowupQuestions ? 'Hide' : 'Show'} Questions ({results.followupQuestions.length})
            </button>
          </div>
          
          {showFollowupQuestions && sessionId && (
            <FollowupQuestionsSection
              questions={results.followupQuestions}
              categories={results.questionCategories}
              sessionId={sessionId}
            />
          )}
        </div>
      )}

      {/* Storyline Graph Overview */}
      {results.storylines.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-green-900">
              Story Timeline 📈
            </h3>
            <button
              onClick={() => toggleSection('storylines')}
              className="text-green-800 hover:text-green-900 text-sm font-medium"
            >
              {expandedSections.has('storylines') ? 'Hide' : 'Show'} Timeline
            </button>
          </div>
          
          {expandedSections.has('storylines') && (
            <StorylineOverview storylines={results.storylines} graphSummary={results.graphSummary} />
          )}
        </div>
      )}
    </div>
  );
};

// Chapter Card Component with enhanced features
interface ChapterCardProps {
  chapter: Chapter;
  onSelect: () => void;
  isSelected: boolean;
}

const ChapterCard: React.FC<ChapterCardProps> = ({ chapter, onSelect, isSelected }) => (
  <div
    className={`border rounded-lg p-6 cursor-pointer transition-all duration-200 ${
      isSelected 
        ? 'border-blue-500 bg-blue-50 shadow-md' 
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}
    onClick={onSelect}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <h4 className="font-semibold text-gray-900 text-lg mb-2">{chapter.title}</h4>
        
        {/* Quality Score */}
        {chapter.qualityScore && (
          <div className="flex items-center mb-3">
            <span className="text-sm text-gray-600 mr-2">Quality:</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-lg ${star <= chapter.qualityScore! ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </span>
              ))}
              <span className="text-sm text-gray-600 ml-2">
                ({chapter.qualityScore}/5)
              </span>
            </div>
          </div>
        )}

        {/* Themes */}
        {chapter.themes && chapter.themes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {chapter.themes.map((theme, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
              >
                {theme}
              </span>
            ))}
          </div>
        )}

        {/* Participants */}
        {chapter.participants && chapter.participants.length > 0 && (
          <div className="text-sm text-gray-600 mb-3">
            <span className="font-medium">People:</span> {chapter.participants.join(', ')}
          </div>
        )}
      </div>

      <div className="text-right text-sm text-gray-500 ml-4">
        <div>{chapter.wordCount.toLocaleString()} words</div>
        <div>{chapter.estimatedReadingTime} min read</div>
      </div>
    </div>

    {/* Chapter Content Preview */}
    {isSelected && (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 max-h-64 overflow-y-auto">
            {chapter.content.length > 500 ? (
              <>
                {chapter.content.substring(0, 500)}
                <span className="text-gray-500">... ({(chapter.content.length - 500).toLocaleString()} more characters)</span>
              </>
            ) : (
              chapter.content
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

// Supporting Components

const ProcessingSummaryCard: React.FC<{ summary: any }> = ({ summary }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-900">{summary.chaptersGenerated || 0}</div>
      <div className="text-blue-700">Chapters</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-900">{(summary.wordsGenerated || 0).toLocaleString()}</div>
      <div className="text-blue-700">Words</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-900">{summary.audioFilesProcessed || 0}</div>
      <div className="text-blue-700">Audio Files</div>
    </div>
    <div className="text-center">
      <div className="text-2xl font-bold text-blue-900">{summary.totalProcessingTime || 'N/A'}</div>
      <div className="text-blue-700">Processing Time</div>
    </div>
  </div>
);

const FollowupQuestionsSection: React.FC<{
  questions: FollowupQuestion[];
  categories: Record<string, FollowupQuestion[]>;
  sessionId: string;
}> = ({ questions, categories, sessionId }) => {
  const priorityQuestions = questions
    .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <p className="text-sm text-yellow-800">
        These AI-generated questions can help improve your story's detail and coherence.
      </p>
      
      {priorityQuestions.map((question) => (
        <div key={question.id} className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{question.question}</p>
              <p className="text-xs text-gray-600 mt-1">{question.context}</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full ml-2">
              {question.category}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const StorylineOverview: React.FC<{ 
  storylines: Storyline[]; 
  graphSummary: any;
}> = ({ storylines, graphSummary }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-900">{storylines.length}</div>
        <div className="text-green-700">Storylines</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-900">{graphSummary.totalNodes || 0}</div>
        <div className="text-green-700">Story Nodes</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-900">{graphSummary.totalEdges || 0}</div>
        <div className="text-green-700">Connections</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-900">{graphSummary.keyThemes?.length || 0}</div>
        <div className="text-green-700">Key Themes</div>
      </div>
    </div>
  </div>
);

// Utility functions
const formatTime = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins <= 0) return 'Any moment';
    if (diffMins === 1) return '1 minute';
    if (diffMins < 60) return `${diffMins} minutes`;
    
    const hours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;
    if (hours === 1 && remainingMins === 0) return '1 hour';
    if (remainingMins === 0) return `${hours} hours`;
    return `${hours}h ${remainingMins}m`;
  } catch {
    return 'Calculating...';
  }
};

export default {
  ProcessingProgressDialog,
  EnhancedChapterResults
};