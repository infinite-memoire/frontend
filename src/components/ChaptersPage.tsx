import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, MoreVertical, Plus, Edit, Trash2, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { chaptersService, recordingsService, Chapter, Recording } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';

// Interfaces imported from services/firestore.ts

const ChaptersPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);
  const [deletingRecording, setDeletingRecording] = useState<string | null>(null);
  const [compilingChapter, setCompilingChapter] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [newChapter, setNewChapter] = useState({
    title: '',
    description: '',
    topics: '',
  });

  // Load chapters from Firebase
  useEffect(() => {
    if (!currentUser) return;

    setLoading(true);
    
    // Set up real-time listener
    const unsubscribe = chaptersService.listenToChapters(currentUser.uid, (chaptersData) => {
      setChapters(chaptersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSaveChapter = async () => {
    if (!currentUser || !newChapter.title.trim()) return;

    try {
      const chapterData = {
        title: newChapter.title,
        description: newChapter.description,
        topics: newChapter.topics.split(',').map(t => t.trim()).filter(t => t),
        createdAt: new Date().toISOString(),
      };

      if (editingChapter) {
        await chaptersService.updateChapter(currentUser.uid, editingChapter.id, chapterData);
        toast({
          title: "Chapter updated",
          description: "Your chapter has been successfully updated.",
        });
      } else {
        await chaptersService.addChapter(currentUser.uid, chapterData);
        toast({
          title: "Chapter created",
          description: "Your new chapter has been created.",
        });
      }

      setNewChapter({ title: '', description: '', topics: '' });
      setEditingChapter(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save chapter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditChapter = (chapter: Chapter) => {
    setEditingChapter(chapter);
    setNewChapter({
      title: chapter.title,
      description: chapter.description,
      topics: chapter.topics.join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!currentUser) return;

    try {
      await chaptersService.deleteChapter(currentUser.uid, chapterId);
      toast({
        title: "Chapter deleted",
        description: "Chapter and all its recordings have been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chapter. Please try again.",
        variant: "destructive",
      });
    }
  };

  const togglePlayRecording = async (recordingId: string) => {
    if (playingRecording === recordingId) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlayingRecording(null);
    } else {
      // Start playing
      const recording = chapters
        .flatMap(chapter => chapter.recordings)
        .find(r => r.id === recordingId);
      
      if (recording?.audioUrl) {
        try {
          if (audioRef.current) {
            audioRef.current.pause();
          }
          
          audioRef.current = new Audio(recording.audioUrl);
          audioRef.current.onended = () => setPlayingRecording(null);
          audioRef.current.onerror = () => {
            console.error('Error playing audio');
            setPlayingRecording(null);
            toast({
              title: "Playback Error",
              description: "Unable to play recording. Please try again.",
              variant: "destructive",
            });
          };
          
          await audioRef.current.play();
          setPlayingRecording(recordingId);
        } catch (error) {
          console.error('Error playing audio:', error);
          setPlayingRecording(null);
          toast({
            title: "Playback Error",
            description: "Unable to play recording. Please try again.",
            variant: "destructive",
          });
        }
      }
    }
  };

  // Handle recording deletion
  const handleDeleteRecording = async (chapterId: string, recordingId: string) => {
    if (!currentUser) return;
    
    try {
      await recordingsService.deleteRecording(currentUser.uid, chapterId, recordingId);
      
      toast({
        title: "Success",
        description: "Recording deleted successfully!",
      });
      
      setDeletingRecording(null);
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCompileChapter = async (chapterId: string) => {
    const chapter = chapters.find(c => c.id === chapterId);
    if (!chapter || chapter.recordings.length === 0) {
      toast({
        title: "No recordings",
        description: "This chapter needs recordings to compile into a story.",
        variant: "destructive",
      });
      return;
    }

    setCompilingChapter(chapterId);
    
    try {
      // TODO: Replace with actual backend call
      // Simulate backend processing
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      toast({
        title: "Story compiled!",
        description: `${chapter.title} has been compiled into a complete story.`,
      });
      
      // TODO: Handle the returned story text from backend
      console.log('Compiled story for chapter:', chapter.title);
      
    } catch (error) {
      console.error('Error compiling chapter:', error);
      toast({
        title: "Compilation failed",
        description: "Failed to compile the story. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompilingChapter(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground mt-2">Loading your chapters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 font-sans">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-cursive font-bold text-primary mb-4">My Chapters</h2>
        <p className="text-muted-foreground text-lg font-serif">
          Your recorded memories organized into chapters
        </p>
      </div>

      {/* Header with New Chapter Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold text-foreground">Recorded Chapters</h3>
          <p className="text-sm text-muted-foreground">
            {chapters.length} {chapters.length === 1 ? 'chapter' : 'chapters'} • {chapters.reduce((acc, chapter) => acc + chapter.recordings.length, 0)} recordings total
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => {
                setEditingChapter(null);
                setNewChapter({ title: '', description: '', topics: '' });
              }}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chapter
            </Button>
          </DialogTrigger>
          <DialogContent className="vintage-card">
            <DialogHeader>
              <DialogTitle className="font-serif">
                {editingChapter ? 'Edit Chapter' : 'Create New Chapter'}
              </DialogTitle>
              <DialogDescription>
                Organize your recordings into meaningful chapters
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Chapter Title</label>
                <Input
                  value={newChapter.title}
                  onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                  placeholder="Enter chapter title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  value={newChapter.description}
                  onChange={(e) => setNewChapter({ ...newChapter, description: e.target.value })}
                  placeholder="Describe this chapter..."
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Topics</label>
                <Input
                  value={newChapter.topics}
                  onChange={(e) => setNewChapter({ ...newChapter, topics: e.target.value })}
                  placeholder="family, memories, childhood (comma-separated)"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveChapter} className="bg-primary hover:bg-primary/90">
                {editingChapter ? 'Update Chapter' : 'Create Chapter'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Chapters Grid */}
      {chapters.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {chapters.map((chapter) => (
            <Card key={chapter.id} className="vintage-card hover:shadow-glow transition-organic">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="font-serif text-lg">{chapter.title}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {chapter.description}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="vintage-card">
                      <DropdownMenuItem onClick={() => handleEditChapter(chapter)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                {/* Topics */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {chapter.topics.map((topic, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    {chapter.recordings.length} recording{chapter.recordings.length !== 1 ? 's' : ''} • Created {formatDate(chapter.createdAt)}
                  </div>
                  
                  {/* Audio Recordings - Only show if there are recordings */}
                  {chapter.recordings.length > 0 && (
                    <div className="space-y-2">
                      {chapter.recordings.map((recording) => (
                        <div key={recording.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                            <div className="flex items-center space-x-3 flex-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => togglePlayRecording(recording.id)}
                                className="h-8 w-8 p-0 rounded-full"
                              >
                                {playingRecording === recording.id ? (
                                  <Pause className="w-4 h-4" />
                                ) : (
                                  <Play className="w-4 h-4" />
                                )}
                              </Button>
                              
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{recording.title}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatDuration(recording.duration)} • {formatDate(recording.date)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Recording Actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="bg-background border border-border shadow-lg z-50" align="end">
                                <DropdownMenuItem 
                                  onClick={() => setDeletingRecording(recording.id)}
                                  className="cursor-pointer text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete recording
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Compile Button */}
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <Button
                      onClick={() => handleCompileChapter(chapter.id)}
                      disabled={chapter.recordings.length === 0 || compilingChapter === chapter.id}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                      size="lg"
                    >
                      <BookOpen className="w-5 h-5 mr-2" />
                      {compilingChapter === chapter.id ? 'Compiling Story...' : 'Compile Chapter'}
                    </Button>
                    {chapter.recordings.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        Add recordings to compile this chapter
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="vintage-card rounded-xl p-8 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-foreground mb-2">No Chapters Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start recording your memories and organize them into chapters
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Chapter
            </Button>
          </div>
        </div>
      )}

      {/* Delete Recording Confirmation Dialog */}
      <AlertDialog open={!!deletingRecording} onOpenChange={() => setDeletingRecording(null)}>
        <AlertDialogContent className="bg-background border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recording</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recording? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRecording(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const recording = chapters
                  .flatMap(chapter => chapter.recordings)
                  .find(r => r.id === deletingRecording);
                if (recording) {
                  handleDeleteRecording(recording.chapterId, recording.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ChaptersPage;