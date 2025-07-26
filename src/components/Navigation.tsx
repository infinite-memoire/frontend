import { useState, useEffect } from 'react';
import { Mic, BookOpen, Settings, User, Feather, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isRecording: boolean;
}

const Navigation = ({ activeTab, onTabChange, isRecording }: NavigationProps) => {
  const { currentUser, logout } = useAuth();
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        const settings = await userService.getUserSettings(currentUser.uid);
        if (settings) {
          setUserAvatar(settings.avatar || '');
          setUserName(settings.name || currentUser.email?.split('@')[0] || '');
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const tabs = [
    { id: 'record', label: 'Recording', icon: Mic },
    { id: 'stories', label: 'Stories', icon: BookOpen },
    { id: 'publish', label: 'Publish', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="vintage-card border-b border-border/50 font-sans">
      <div className="container mx-auto px-4 py-3 md:py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3">
            <div className="flex items-center space-x-2 md:space-x-3">
              <Feather className="w-6 h-6 md:w-8 md:h-8 text-primary drop-shadow-sm" strokeWidth={1.5} />
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-cursive font-bold text-primary drop-shadow-sm">
                  mémoire
                </h1>
                <span className="hidden md:block text-xs text-muted-foreground font-serif italic">preserving stories</span>
              </div>
            </div>
          </div>

          <nav className="flex items-center space-x-1 md:space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isRecordTab = tab.id === 'record';
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex flex-col md:flex-row items-center space-y-1 md:space-y-0 md:space-x-2 px-2 md:px-5 py-2 md:py-3 rounded-lg md:rounded-xl transition-organic relative overflow-hidden",
                    "hover:bg-primary/10 hover:shadow-vintage",
                    "border border-transparent hover:border-primary/20",
                    isActive && "bg-primary text-primary-foreground shadow-glow border-primary/30",
                    isRecordTab && isRecording && "vintage-pulse"
                  )}
                >
                  <div className="relative">
                    <Icon className={cn(
                      "w-4 h-4 transition-organic",
                      isActive && "text-primary-foreground",
                      !isActive && "text-muted-foreground",
                      isRecordTab && isRecording && "text-primary-foreground"
                    )} />
                  </div>
                  <span className={cn(
                    "text-xs md:text-sm font-medium transition-organic",
                    isActive && "text-primary-foreground",
                    !isActive && "text-muted-foreground",
                    isRecordTab && isRecording && "text-primary-foreground"
                  )}>
                    {tab.label}
                  </span>
                  {/* Vintage tab decoration */}
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-accent/10 to-transparent pointer-events-none rounded-lg md:rounded-xl"></div>
                  )}
                </button>
              );
            })}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary/20">
                  <AvatarImage src={userAvatar} alt={userName} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-background border border-border shadow-lg z-50" align="end">
              <DropdownMenuItem 
                onClick={() => onTabChange('settings')}
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                Profile & Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navigation;