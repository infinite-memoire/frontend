import { useState, useEffect } from 'react';
import { Crown, Download, Heart, Play, Pause, Share2, Star, TrendingUp, Users, Clock, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { chaptersService } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';

interface PublishedStory {
  id: string;
  title: string;
  description: string;
  author: string;
  authorAvatar?: string;
  category: string;
  duration: number; // in minutes
  price: number;
  downloads: number;
  rating: number;
  tags: string[];
  coverImage?: string;
  audioUrl?: string;
  isPremium: boolean;
  publishedDate: string;
}

interface UserChapter {
  id: string;
  title: string;
  description: string;
  recordingsCount: number;
  totalDuration: number;
}

const MarketplacePage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  
  const [userChapters, setUserChapters] = useState<UserChapter[]>([]);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [likedStories, setLikedStories] = useState<Set<string>>(new Set());
  const [ownedStories, setOwnedStories] = useState<Set<string>>(new Set());
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [publishPrice, setPublishPrice] = useState<string>('4.99');

  // Example published stories (free for demonstration)
  const featuredStories: PublishedStory[] = [
    {
      id: '1',
      title: "Grandmother's Memories",
      description: "Touching memories of a French grandmother recounting her childhood during the war.",
      author: 'Marie Leclerc',
      authorAvatar: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=100&h=100&fit=crop&crop=face',
      category: 'Family History',
      duration: 45,
      price: 0,
      downloads: 1247,
      rating: 4.8,
      tags: ['Family', 'History', 'War', 'Emotional'],
      isPremium: false,
      publishedDate: '2024-01-15',
      audioUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav'
    },
    {
      id: '2',
      title: 'Journey to Provence',
      description: 'Captivating tale of a culinary journey through Provence, with anecdotes and recipes.',
      author: 'Pierre Dubois',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      category: 'Travel',
      duration: 32,
      price: 0,
      downloads: 856,
      rating: 4.6,
      tags: ['Travel', 'Cuisine', 'Provence', 'Culture'],
      isPremium: false,
      publishedDate: '2024-01-20',
      audioUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav'
    },
    {
      id: '3',
      title: 'My First Love',
      description: 'A touching romantic story told with humor and nostalgia.',
      author: 'Sophie Martin',
      authorAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b372?w=100&h=100&fit=crop&crop=face',
      category: 'Romance',
      duration: 28,
      price: 0,
      downloads: 623,
      rating: 4.9,
      tags: ['Romance', 'Youth', 'Humor', 'Nostalgia'],
      isPremium: false,
      publishedDate: '2024-01-25',
      audioUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/CantinaBand3.wav'
    },
    {
      id: '4',
      title: 'Family Secrets',
      description: 'Surprising revelations about the secret history of a bourgeois Parisian family.',
      author: 'Antoine Rousseau',
      authorAvatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      category: 'Mystery',
      duration: 52,
      price: 0,
      downloads: 1089,
      rating: 4.7,
      tags: ['Mystery', 'Family', 'Secrets', 'Paris'],
      isPremium: false,
      publishedDate: '2024-01-10',
      audioUrl: 'https://www2.cs.uic.edu/~i101/SoundFiles/StarWars3.wav'
    }
  ];

  // Load user chapters
  useEffect(() => {
    const loadUserChapters = async () => {
      if (!currentUser) return;
      
      try {
        const chapters = await chaptersService.getChapters(currentUser.uid);
        const userChapterData = chapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          description: chapter.description,
          recordingsCount: chapter.recordings.length,
          totalDuration: Math.round(chapter.recordings.reduce((sum, r) => sum + r.duration, 0) / 60)
        }));
        setUserChapters(userChapterData);
      } catch (error) {
        console.error('Error loading user chapters:', error);
      }
    };

    loadUserChapters();
  }, [currentUser]);

  const toggleAudioPlay = (storyId: string) => {
    const story = featuredStories.find(s => s.id === storyId);
    if (!story?.audioUrl) return;

    if (playingAudio === storyId && currentAudio) {
      // Stop playback
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setPlayingAudio(null);
      setCurrentAudio(null);
    } else {
      // Stop previous audio if any
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      // Start new playback
      const audio = new Audio(story.audioUrl);
      audio.play().then(() => {
        setPlayingAudio(storyId);
        setCurrentAudio(audio);
        
        // Handle end of playback
        audio.onended = () => {
          setPlayingAudio(null);
          setCurrentAudio(null);
        };
        
        // Handle errors
        audio.onerror = () => {
          toast({
            title: "Playback error",
            description: "Unable to play this audio file.",
            variant: "destructive",
          });
          setPlayingAudio(null);
          setCurrentAudio(null);
        };
      }).catch(() => {
        toast({
          title: "Playback error",
          description: "Unable to play this audio file.",
          variant: "destructive",
        });
      });
    }
  };

  const toggleLike = (storyId: string) => {
    const newLiked = new Set(likedStories);
    if (newLiked.has(storyId)) {
      newLiked.delete(storyId);
      toast({
        title: "Removed from favorites",
        description: "This story has been removed from your favorites.",
      });
    } else {
      newLiked.add(storyId);
      toast({
        title: "Added to favorites",
        description: "This story has been added to your favorites.",
      });
    }
    setLikedStories(newLiked);
  };

  const handlePurchase = (story: PublishedStory) => {
    if (story.price === 0) {
      // Free addition to library
      const newOwned = new Set(ownedStories);
      newOwned.add(story.id);
      setOwnedStories(newOwned);
      
      toast({
        title: "Story added!",
        description: `"${story.title}" has been added to your library for free.`,
      });
    } else {
      toast({
        title: "Purchase simulated",
        description: `You have purchased "${story.title}" for $${story.price}. Stripe integration coming soon.`,
      });
    }
  };

  const handleShare = (story: PublishedStory) => {
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.description,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "The link to this story has been copied to the clipboard.",
      });
    }
  };

  const handlePublishChapter = async () => {
    if (!selectedChapter) {
      toast({
        title: "Error",
        description: "Please select a chapter to publish.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Publication simulated",
      description: `Your chapter will be published at the price of $${publishPrice}. Feature in development.`,
    });
    setIsPublishDialogOpen(false);
    setSelectedChapter('');
    setPublishPrice('4.99');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
  };

  const renderStoryCard = (story: PublishedStory) => (
    <Card key={story.id} className="glass-card group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={story.authorAvatar} alt={story.author} />
              <AvatarFallback>{story.author.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg leading-tight">{story.title}</CardTitle>
              <p className="text-sm text-muted-foreground">by {story.author}</p>
            </div>
          </div>
          {story.isPremium && (
            <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black">
              <Crown className="w-3 h-3 mr-1" />
              Premium
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDuration(story.duration)}
          </div>
          <div className="flex items-center">
            <Star className="w-4 h-4 mr-1 fill-yellow-400 text-yellow-400" />
            {story.rating}
          </div>
          <div className="flex items-center">
            <Download className="w-4 h-4 mr-1" />
            {story.downloads}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="text-sm leading-relaxed">
          {story.description}
        </CardDescription>

        <div className="flex flex-wrap gap-1">
          {story.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toggleAudioPlay(story.id)}
              className="flex items-center space-x-1"
            >
              {playingAudio === story.id ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>Preview</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleLike(story.id)}
              className={likedStories.has(story.id) ? 'text-red-500' : ''}
            >
              <Heart className={`w-4 h-4 ${likedStories.has(story.id) ? 'fill-current' : ''}`} />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare(story)}
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            {story.price === 0 ? (
              <Badge variant="secondary" className="text-green-600 bg-green-50 border-green-200">
                Free
              </Badge>
            ) : (
              <span className="text-lg font-bold text-primary">${story.price}</span>
            )}
            <Button 
              onClick={() => handlePurchase(story)}
              className={`${ownedStories.has(story.id) 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-primary hover:bg-primary/90'
              }`}
              disabled={ownedStories.has(story.id)}
            >
              {ownedStories.has(story.id) ? 'In my library' : story.price === 0 ? 'Add' : 'Buy'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Memory Marketplace
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Discover authentic stories, share your own memories and connect with a passionate community.
        </p>
      </div>

      <Tabs defaultValue="explore" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 glass-card">
          <TabsTrigger value="explore" className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Explore</span>
          </TabsTrigger>
          <TabsTrigger value="publish" className="flex items-center space-x-2">
            <Share2 className="w-4 h-4" />
            <span>Publish</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>My Sales</span>
          </TabsTrigger>
        </TabsList>

        {/* Explore Tab */}
        <TabsContent value="explore" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {featuredStories.map(renderStoryCard)}
          </div>
        </TabsContent>

        {/* Publish Tab */}
        <TabsContent value="publish" className="space-y-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="w-5 h-5" />
                <span>Publish Your Memories</span>
              </CardTitle>
              <CardDescription>
                Transform your recordings into paid stories and share them with the community.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {userChapters.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userChapters.map((chapter) => (
                      <Card key={chapter.id} className="border-2 border-dashed border-border hover:border-primary transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{chapter.title}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {chapter.description}
                          </p>
                          <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                            <span>{chapter.recordingsCount} recordings</span>
                            <span>{formatDuration(chapter.totalDuration)}</span>
                          </div>
                          <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                            <DialogTrigger asChild>
                              <Button 
                                className="w-full" 
                                onClick={() => setSelectedChapter(chapter.id)}
                              >
                                Publish this chapter
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-background border border-border">
                              <DialogHeader>
                                <DialogTitle>Publish "{chapter.title}"</DialogTitle>
                                <DialogDescription>
                                  Configure the publication details of your chapter.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Sale price ($)</label>
                                  <Select value={publishPrice} onValueChange={setPublishPrice}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                                      <SelectItem value="2.99">$2.99</SelectItem>
                                      <SelectItem value="4.99">$4.99</SelectItem>
                                      <SelectItem value="7.99">$7.99</SelectItem>
                                      <SelectItem value="9.99">$9.99</SelectItem>
                                      <SelectItem value="12.99">$12.99</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Category</label>
                                  <Select defaultValue="family">
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background border border-border shadow-lg z-50">
                                      <SelectItem value="family">Family History</SelectItem>
                                      <SelectItem value="travel">Travel</SelectItem>
                                      <SelectItem value="romance">Romance</SelectItem>
                                      <SelectItem value="mystery">Mystery</SelectItem>
                                      <SelectItem value="adventure">Adventure</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Keywords (comma separated)</label>
                                  <Input placeholder="family, nostalgia, emotional..." />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsPublishDialogOpen(false)}>
                                  Cancel
                                </Button>
                                <Button onClick={handlePublishChapter}>
                                  Publish now
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="space-y-4">
                    <Volume2 className="w-16 h-16 mx-auto text-muted-foreground" />
                    <h3 className="text-lg font-semibold">No chapters to publish</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      First create your recordings and organize them into chapters in the "Stories" tab to be able to publish them here.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total revenue</p>
                    <p className="text-2xl font-bold text-green-600">$47.89</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Downloads</p>
                    <p className="text-2xl font-bold text-blue-600">156</p>
                  </div>
                  <Download className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="glass-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average rating</p>
                    <p className="text-2xl font-bold text-yellow-600">4.7</p>
                  </div>
                  <Star className="w-8 h-8 text-yellow-600 fill-current" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>My Publications</CardTitle>
              <CardDescription>
                Manage your published stories and view their performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Share2 className="w-16 h-16 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-semibold mt-4">No publications yet</h3>
                <p className="text-muted-foreground mt-2">
                  Your published stories will appear here with their sales statistics.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketplacePage;