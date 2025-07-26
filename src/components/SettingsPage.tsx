import { useState, useEffect, useRef } from 'react';
import { User, CreditCard, History, Volume2, Download, Shield, Upload, Check, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { userService, UserSettings } from '@/services/userService';
import { exportService } from '@/services/exportService';
import { subscriptionPlans, countryCodes, SubscriptionPlan } from '@/data/subscriptionPlans';
import { useToast } from '@/hooks/use-toast';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';

const SettingsPage = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Password change states
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Plan selection states
  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>(subscriptionPlans[0]); // Default to Free
  
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: currentUser?.email || '',
    avatar: '',
    phoneNumber: '',
    countryCode: '+33'
  });

  const [audioSettings, setAudioSettings] = useState({
    autoSave: true,
    highQuality: true,
    noiseReduction: false,
    autoTranscription: false
  });

  // Load user settings on component mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const settings = await userService.initializeUserIfNeeded(currentUser.uid, currentUser.email || '');
        
        setUserProfile({
          name: settings.name,
          email: currentUser.email || '',
          avatar: settings.avatar || '',
          phoneNumber: settings.phoneNumber,
          countryCode: settings.countryCode || '+33'
        });
        
        setAudioSettings(settings.audioSettings);
      } catch (error) {
        console.error('Error loading user settings:', error);
        toast({
          title: "Error",
          description: "Failed to load settings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserSettings();
  }, [currentUser, toast]);

  const handleProfileUpdate = async () => {
    if (!currentUser) return;
    
    try {
      setSaving(true);
      await userService.updateUserSettings(currentUser.uid, {
        name: userProfile.name,
        phoneNumber: userProfile.phoneNumber,
        countryCode: userProfile.countryCode,
        avatar: userProfile.avatar,
      });
      
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAudioSettingsUpdate = async (setting: string, value: boolean) => {
    if (!currentUser) return;
    
    const newAudioSettings = { ...audioSettings, [setting]: value };
    setAudioSettings(newAudioSettings);
    
    try {
      await userService.updateUserSettings(currentUser.uid, {
        audioSettings: newAudioSettings
      });
      
      toast({
        title: "Settings updated",
        description: `${setting} has been ${value ? 'enabled' : 'disabled'}.`,
      });
    } catch (error) {
      console.error('Error updating audio settings:', error);
      // Revert the change on error
      setAudioSettings(audioSettings);
      toast({
        title: "Error",
        description: "Failed to update audio settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const subscriptionData = {
    plan: currentPlan.name,
    status: 'active',
    nextBilling: '2024-02-15',
    price: currentPlan.price + currentPlan.currency,
    features: currentPlan.features
  };

  const historyData = [
    { id: '1', action: 'Profile updated', item: 'Personal information', date: new Date().toISOString(), time: new Date().toLocaleTimeString() },
    { id: '2', action: 'Settings changed', item: 'Audio preferences', date: new Date(Date.now() - 86400000).toISOString(), time: '4:45 PM' },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Handle avatar upload
  const handleAvatarUpload = async (file: File) => {
    if (!currentUser) return;
    
    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select a valid image file.",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        title: "Error",
        description: "Image size must be less than 2MB.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setUploadingAvatar(true);
      const avatarUrl = await userService.uploadAvatar(currentUser.uid, file);
      
      setUserProfile(prev => ({ ...prev, avatar: avatarUrl }));
      
      await userService.updateUserSettings(currentUser.uid, {
        avatar: avatarUrl
      });
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!currentUser) return;
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords don't match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setChangingPassword(true);
      
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(currentUser.email!, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Update password
      await updatePassword(currentUser, newPassword);
      
      toast({
        title: "Success",
        description: "Password updated successfully!",
      });
      
      setIsPasswordDialogOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      let errorMessage = "Failed to change password. Please try again.";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "New password is too weak.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle export recordings
  const handleExportRecordings = async () => {
    if (!currentUser) return;
    
    try {
      setExporting(true);
      await exportService.exportAllRecordings(currentUser.uid);
      
      toast({
        title: "Export Started",
        description: "Your recordings are being downloaded. Check your downloads folder.",
      });
    } catch (error: any) {
      console.error('Error exporting recordings:', error);
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export recordings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  // Handle plan change
  const handlePlanChange = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setIsPlanDialogOpen(true);
  };

  const confirmPlanChange = () => {
    if (selectedPlan) {
      setCurrentPlan(selectedPlan);
      toast({
        title: "Plan Updated",
        description: `You've selected the ${selectedPlan.name} plan. Payment integration will be available soon.`,
      });
      setIsPlanDialogOpen(false);
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 glass-card">
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="audio" className="flex items-center space-x-2">
              <Volume2 className="w-4 h-4" />
              <span className="hidden sm:inline">Audio</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center space-x-2">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Subscription</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20 border-2 border-primary/20">
                    <AvatarImage src={userProfile.avatar} alt={userProfile.name} />
                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                      {userProfile.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleAvatarUpload(file);
                      }}
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <>
                          <Upload className="w-4 h-4 mr-2 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Change photo
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG up to 2MB
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Profile Form */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={userProfile.email}
                      disabled
                      className="bg-muted/50 cursor-not-allowed"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <div className="flex space-x-2">
                      <Select
                        value={userProfile.countryCode}
                        onValueChange={(value) => setUserProfile(prev => ({ ...prev, countryCode: value }))}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-background border border-border shadow-lg z-50">
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              {country.flag} {country.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="phone"
                        value={userProfile.phoneNumber}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="06 12 34 56 78"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <Button variant="outline" disabled={saving}>Cancel</Button>
                  <Button 
                    onClick={handleProfileUpdate} 
                    className="bg-primary hover:bg-primary/90"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </Card>

            {/* Security Section */}
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" />
                Security
              </h3>
              <div className="space-y-4">
                <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      Change password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-background border border-border">
                    <DialogHeader>
                      <DialogTitle>Change Password</DialogTitle>
                      <DialogDescription>
                        Enter your current password and choose a new one.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)} disabled={changingPassword}>
                        Cancel
                      </Button>
                      <Button onClick={handlePasswordChange} disabled={changingPassword}>
                        {changingPassword ? 'Changing...' : 'Change Password'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          </TabsContent>

          {/* Audio Settings Tab */}
          <TabsContent value="audio" className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Recording Preferences</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Auto-save</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save your recordings
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.autoSave}
                    onCheckedChange={(checked) => handleAudioSettingsUpdate('autoSave', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>High definition quality</Label>
                    <p className="text-sm text-muted-foreground">
                      Record in 48kHz quality for better audio quality
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.highQuality}
                    onCheckedChange={(checked) => handleAudioSettingsUpdate('highQuality', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Noise reduction</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically remove background noise
                    </p>
                  </div>
                  <Switch
                    checked={audioSettings.noiseReduction}
                    onCheckedChange={(checked) => handleAudioSettingsUpdate('noiseReduction', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Automatic transcription</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically convert your recordings to text
                    </p>
                    <Badge variant="secondary" className="text-xs">Premium</Badge>
                  </div>
                  <Switch
                    checked={audioSettings.autoTranscription}
                    onCheckedChange={(checked) => handleAudioSettingsUpdate('autoTranscription', checked)}
                  />
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Export and sharing</h3>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleExportRecordings}
                  disabled={exporting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {exporting ? 'Exporting...' : 'Export all recordings'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Download a complete archive of your audio memories
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Current subscription</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold flex items-center">
                      Plan {subscriptionData.plan}
                      <Badge className="ml-2 bg-primary text-primary-foreground">
                        {subscriptionData.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Next billing: {formatDate(subscriptionData.nextBilling)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{subscriptionData.price}</p>
                    <p className="text-sm text-muted-foreground">/month</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <h5 className="font-medium">Included features:</h5>
                  <ul className="space-y-1">
                    {subscriptionData.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-3 pt-4">
                  <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1">
                        Change plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-background border border-border max-w-4xl">
                      <DialogHeader>
                        <DialogTitle>Choose Your Plan</DialogTitle>
                        <DialogDescription>
                          Select the plan that best fits your needs
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 py-4">
                        {subscriptionPlans.map((plan) => (
                          <div
                            key={plan.id}
                            className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                              selectedPlan?.id === plan.id 
                                ? 'border-primary bg-primary/5' 
                                : currentPlan.id === plan.id
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-border'
                            } ${plan.recommended ? 'ring-2 ring-primary/20' : ''}`}
                            onClick={() => setSelectedPlan(plan)}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{plan.name}</h4>
                                {plan.recommended && (
                                  <Badge className="bg-primary text-primary-foreground">
                                    <Crown className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                                {currentPlan.id === plan.id && (
                                  <Badge variant="outline" className="border-green-500 text-green-600">
                                    <Check className="w-3 h-3 mr-1" />
                                    Current
                                  </Badge>
                                )}
                              </div>
                              <div>
                                <span className="text-2xl font-bold">{plan.price}{plan.currency}</span>
                                <span className="text-sm text-muted-foreground">/{plan.billing}</span>
                              </div>
                              <ul className="space-y-1">
                                {plan.features.slice(0, 3).map((feature, index) => (
                                  <li key={index} className="text-xs text-muted-foreground flex items-center">
                                    <Check className="w-3 h-3 mr-1 text-green-500" />
                                    {feature}
                                  </li>
                                ))}
                                {plan.features.length > 3 && (
                                  <li className="text-xs text-muted-foreground">
                                    +{plan.features.length - 3} more features
                                  </li>
                                )}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={confirmPlanChange}
                          disabled={!selectedPlan || selectedPlan.id === currentPlan.id}
                        >
                          {selectedPlan?.id === currentPlan.id ? 'Current Plan' : 'Select Plan'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="outline" className="flex-1">
                    Cancel subscription
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Billing history</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm">Jan 15, 2024</span>
                  <span className="text-sm font-medium">{currentPlan.price}{currentPlan.currency}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm">Dec 15, 2023</span>
                  <span className="text-sm font-medium">{currentPlan.price}{currentPlan.currency}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm">Nov 15, 2023</span>
                  <span className="text-sm font-medium">{currentPlan.price}{currentPlan.currency}</span>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Recent activity</h3>
              <div className="space-y-3">
                {historyData.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/20 transition-smooth">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.item}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{formatDate(item.date)}</p>
                      <p className="text-xs text-muted-foreground">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;