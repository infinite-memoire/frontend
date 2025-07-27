import { useState, useRef, useEffect, useMemo } from 'react';
import { Mic, MicOff, Pause, Play, Square, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { chaptersService, recordingsService, Chapter } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';

interface RecordingPageProps {
  onRecordingStateChange: (isRecording: boolean) => void;
}

const RecordingPage = ({ onRecordingStateChange }: RecordingPageProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string>('');
  const [hasRecording, setHasRecording] = useState(false);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [saving, setSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  // Load user's chapters
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = chaptersService.listenToChapters(currentUser.uid, (chaptersData) => {
      setChapters(chaptersData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Clear previous recording chunks
      recordedChunksRef.current = [];
      
      // Setup MediaRecorder with AAC format
      let mediaRecorder;
      
      // Try different AAC formats in order of preference
      const aacFormats = [
        'audio/aac',                    // Pure AAC format
        'audio/mp4; codecs=mp4a.40.2',  // AAC in MP4 container
        'audio/webm; codecs=opus',      // Opus in WebM (fallback)
        'audio/webm'                    // Basic WebM (final fallback)
      ];
      
      let selectedFormat = null;
      for (const format of aacFormats) {
        if (MediaRecorder.isTypeSupported(format)) {
          selectedFormat = format;
          break;
        }
      }
      
      if (selectedFormat) {
        mediaRecorder = new MediaRecorder(stream, { mimeType: selectedFormat });
        console.log('📹 Recording in format:', selectedFormat);
      } else {
        mediaRecorder = new MediaRecorder(stream);
        console.log('📹 Recording in default format (no AAC support)');
      }
      
      mediaRecorderRef.current = mediaRecorder;
      
      // Setup data handling
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      // Setup audio visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsPaused(false);
      onRecordingStateChange(true);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      // Start audio level monitoring
      updateAudioLevel();
      
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      setHasRecording(true);
      onRecordingStateChange(false);
      
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      
      // Stop all tracks
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    }
  };

  const updateAudioLevel = () => {
    if (analyserRef.current && (isRecording || isPaused)) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      setAudioLevel(normalizedLevel);
      
      console.log('Audio level:', normalizedLevel); // Debug
      
      if (isRecording && !isPaused) {
        animationRef.current = requestAnimationFrame(updateAudioLevel);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveRecording = async () => {
    if (!hasRecording || !recordingTitle.trim() || !selectedChapterId || !currentUser) {
      toast({
        title: "Missing Information",
        description: "Please provide a title and select a chapter.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    
    try {
      // Create audio blob from recorded chunks
      // Determine the correct MIME type based on what was actually recorded
      let mimeType = 'audio/aac'; // Default to AAC
      if (mediaRecorderRef.current) {
        mimeType = mediaRecorderRef.current.mimeType || 'audio/aac';
      }
      const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
      
      // Upload recording with audio to Firebase
      await recordingsService.uploadRecordingWithAudio(
        currentUser.uid,
        selectedChapterId,
        audioBlob,
        {
          title: recordingTitle,
          duration: recordingTime,
          date: new Date().toISOString()
        }
      );

      toast({
        title: "Recording Saved",
        description: "Your recording has been uploaded successfully.",
      });

      // Reset form
      setRecordingTime(0);
      setHasRecording(false);
      setRecordingTitle('');
      setSelectedChapterId('');
      setAudioLevel(0);
      recordedChunksRef.current = [];
      
    } catch (error) {
      console.error('Error saving recording:', error);
      toast({
        title: "Upload Failed",
        description: "Failed to save recording. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const deleteRecording = () => {
    // Delete the current recording
    console.log('Deleting current recording');
    setRecordingTime(0);
    setHasRecording(false);
    setRecordingTitle('');
    setAudioLevel(0);
  };

const WaveVisualization = ({ audioLevel, isRecording }: { audioLevel: number; isRecording: boolean }) => {
  // Mémoriser les barres pour éviter la re-création à chaque render
  const bars = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const baseHeight = 0.3 + (i % 3) * 0.1;
      
      return (
        <div
          key={i}
          className={`bg-gradient-to-t from-primary to-primary-glow rounded-full relative bar-${i}`}
          style={{
            height: `${baseHeight * 100}%`,
            minHeight: '12px',
            width: '4px',
            transition: 'transform 150ms ease-out',
          }}
        >
          {/* Ink-like texture */}
          <div className="absolute inset-0 bg-gradient-to-t from-accent/20 to-transparent rounded-full"></div>
        </div>
      );
    });
  }, []); // Pas de dépendances - les barres sont créées une seule fois

  // Effet pour animer les barres en fonction de l'audio level
  useEffect(() => {
    if (isRecording) {
      const animateBars = () => {
        bars.forEach((_, i) => {
          const bar = document.querySelector(`.bar-${i}`) as HTMLElement;
          if (bar) {
            const variation = Math.sin(Date.now() * 0.005 + i * 0.5) * 0.3;
            const scale = 0.8 + audioLevel * 0.6 + variation * 0.2;
            bar.style.transform = `scaleY(${Math.max(0.5, scale)})`;
            bar.style.boxShadow = '0 0 8px rgba(139, 69, 19, 0.4)';
          }
        });
      };
      
      const interval = setInterval(animateBars, 50); // 20 FPS pour une animation fluide
      return () => clearInterval(interval);
    } else {
      // Reset des barres quand on arrête
      bars.forEach((_, i) => {
        const bar = document.querySelector(`.bar-${i}`) as HTMLElement;
        if (bar) {
          bar.style.transform = 'scaleY(1)';
          bar.style.boxShadow = 'none';
        }
      });
    }
  }, [isRecording, audioLevel, bars]);

  return (
    <div className="flex items-center justify-center space-x-2 h-24 p-4 rounded-xl bg-gradient-to-r from-background/50 to-card/50 border border-primary/10">
      {bars}
    </div>
  );
};

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-6 md:space-y-8 font-sans">
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-3xl md:text-5xl font-cursive font-bold text-primary mb-4 md:mb-6 drop-shadow-sm">Share Your Story</h2>
        <p className="text-muted-foreground text-lg md:text-xl font-serif leading-relaxed max-w-2xl mx-auto px-4">
          Speak as if sharing with a beloved grandchild. Let your heart guide your words.
          "Memories are the only treasures that grow richer when shared."
        </p>
      </div>

      {/* Recording Interface */}
      <div className="vintage-card rounded-2xl md:rounded-3xl p-6 md:p-8 max-w-xl md:max-w-2xl mx-auto">
        <div className="text-center mb-6 md:mb-8">
          <div className="mb-4 md:mb-6">
            <div className="text-3xl md:text-4xl font-serif text-primary font-bold">
              {formatTime(recordingTime)}
            </div>
          </div>
          <p className="text-base md:text-lg font-serif text-muted-foreground italic">
            {isRecording ? 'Your story is being captured...' : isPaused ? 'Take a breath, then continue' : 'Press the seal to begin your tale'}
          </p>
        </div>

        {/* Audio Visualization - Only when recording */}
        {isRecording && (
          <div className="mb-6 md:mb-8">
            <WaveVisualization audioLevel={audioLevel} isRecording={isRecording} />
          </div>
        )}

        {/* Recording Controls */}
        <div className="flex items-center justify-center space-x-4 md:space-x-6 mb-6 md:mb-8">
          <button
            onClick={startRecording}
            disabled={isRecording}
            className={cn(
              "relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center transition-organic",
              "bg-primary text-primary-foreground hover:bg-primary/90",
              "hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed",
              "border-2 border-primary/30 shadow-vintage",
              isRecording && "vintage-pulse ink-drop"
            )}
          >
            <Mic className="w-5 h-5 md:w-6 md:h-6" />
            {/* Animation au clic */}
            {!isRecording && (
              <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse"></div>
            )}
            {isRecording && (
              <div className="absolute -inset-2 rounded-full border-2 border-accent/50 animate-ping"></div>
            )}
          </button>

          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            disabled={!isRecording && !isPaused}
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-organic",
              "bg-secondary text-secondary-foreground hover:bg-secondary/90 hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "border-2 border-secondary/30 shadow-vintage"
            )}
          >
            {isPaused ? <Play className="w-4 h-4 md:w-5 md:h-5" /> : <Pause className="w-4 h-4 md:w-5 md:h-5" />}
          </button>

          <button
            onClick={stopRecording}
            disabled={!isRecording && !isPaused}
            className={cn(
              "w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center transition-organic",
              "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:scale-105",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "border-2 border-destructive/30 shadow-vintage"
            )}
          >
            <Square className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Save Recording */}
        {hasRecording && (
          <div className="space-y-4 pt-4 md:pt-6 border-t border-border/50">
            <input
              type="text"
              value={recordingTitle}
              onChange={(e) => setRecordingTitle(e.target.value)}
              placeholder="Name this memory..."
              className="w-full px-4 py-3 text-base rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-organic"
            />
            
            <Select value={selectedChapterId} onValueChange={setSelectedChapterId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a chapter to save this recording to..." />
              </SelectTrigger>
              <SelectContent>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    {chapter.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex space-x-3">
              <button
                onClick={saveRecording}
                disabled={!recordingTitle.trim() || !selectedChapterId || saving}
                className="flex-1 bg-primary text-primary-foreground py-3 px-4 md:px-6 text-base rounded-lg hover:bg-primary/90 transition-organic font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Recording'
                )}
              </button>
              <button
                onClick={deleteRecording}
                className="flex items-center justify-center px-4 py-3 rounded-lg border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground transition-organic"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Recording Tips */}
      <div className="vintage-card rounded-xl p-6 max-w-2xl mx-auto mt-8">
        
        <h3 className="text-lg font-semibold text-primary mb-4">Recording Tips</h3>
        <div className="grid md:grid-cols-2 gap-6 font-serif text-foreground/90 leading-relaxed">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-accent text-xl">✦</span>
              <span>Speak as if sharing with a beloved grandchild</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-accent text-xl">✦</span>
              <span>Let your emotions flow naturally - they're part of the story</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <span className="text-accent text-xl">✦</span>
              <span>Silence and pauses add depth to your narrative</span>
            </div>
            <div className="flex items-start space-x-3">
              <span className="text-accent text-xl">✦</span>
              <span>Share the small details that paint the full picture</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordingPage;