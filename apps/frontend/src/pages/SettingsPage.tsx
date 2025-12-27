import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Lock, Bell, Settings, CreditCard, Info, User, Building2, BookOpen, Camera, Trash2, Loader2, Plane, Globe, Music, Instagram, Twitter, Linkedin, ExternalLink, Copy, Check, ArrowLeft, Youtube, CloudRain, Smartphone, MessageCircle, Volume2, VolumeX, Eye, EyeOff, BellRing, ChevronDown, ChevronUp, Palette, CheckCircle, XCircle, LogOut } from 'lucide-react';
import { userApi, settingsApi, preferencesApi, systemSettingsApi, chatSettingsApi, api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { usePushNotifications } from '../hooks/usePushNotifications';
import AdminGuide from '../components/AdminGuide';
import { PaymentSettings } from '../components/PaymentSettings';
import { ThemeSelector } from '../components/settings/ThemeSelector';
import {
  Switch,
  Checkbox,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui';

type SettingsSection = 'profile' | 'password' | 'payments' | 'notifications' | 'chat' | 'publishers' | 'documentation' | 'system' | 'tourhub' | 'appearance' | 'avatar';

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Push notifications hook
  const {
    isSupported: pushSupported,
    permission: pushPermission,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    iosInstallPrompt,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification,
  } = usePushNotifications();

  // Check for section query param (e.g., /settings?section=tourhub)
  const sectionParam = searchParams.get('section') as SettingsSection | null;
  const validSections: SettingsSection[] = ['profile', 'password', 'payments', 'notifications', 'chat', 'publishers', 'documentation', 'system', 'tourhub', 'appearance', 'avatar'];
  const initialSection: SettingsSection = sectionParam && validSections.includes(sectionParam) ? sectionParam : 'profile';

  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | '', text: string }>({ type: '', text: '' });

  // Publisher management state
  const [publisherForm, setPublisherForm] = useState({
    id: '',
    ipiNumber: '',
    publisherName: '',
    notes: '',
    isActive: true
  });
  const [isEditing, setIsEditing] = useState(false);

  // Profile form state
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    writerIpiNumber: user?.writerIpiNumber || '',
    publisherIpiNumber: user?.publisherIpiNumber || ''
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Notification preferences state (initialized from user data or defaults)
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotificationsEnabled: (user as any)?.emailNotificationsEnabled ?? true,
    statementNotificationsEnabled: (user as any)?.statementNotificationsEnabled ?? true,
    monthlySummaryEnabled: (user as any)?.monthlySummaryEnabled ?? false,
  });

  // Chat settings state
  const [chatSettings, setChatSettings] = useState({
    chatSoundEnabled: true,
    chatSoundType: 'chime' as 'chime' | 'pop' | 'ding' | 'bell' | 'subtle',
    chatVisibilityStatus: 'online' as 'online' | 'away' | 'invisible' | 'do_not_disturb',
    chatShowOnlineStatus: true,
    chatShowTypingIndicator: true,
    chatMessagePreview: true,
    chatDesktopNotifications: true,
  });

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    minimumWithdrawalAmount: 50,
    emailsEnabled: true,
  });

  // Profile photo state
  const photoInputRef = useRef<HTMLInputElement>(null);
  const tourHubPhotoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>((user as any)?.profilePhotoUrl || null);

  // Writer Tour Hub state
  const [tourHubForm, setTourHubForm] = useState({
    bio: '',
    location: '',
    website: '',
    spotifyArtistUrl: '',
    instagramHandle: '',
    twitterHandle: '',
    linkedinUrl: '',
    tiktokHandle: '',
    soundcloudUrl: '',
    youtubeChannelUrl: '',
    appleMusicUrl: '',
    isPublicProfile: false,
    profileSlug: ''
  });
  const [slugCopied, setSlugCopied] = useState(false);
  const [slugCheckQuery, setSlugCheckQuery] = useState('');

  // Collapsible section state for Tour Profile
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    socialLinks: false,  // Hidden by default
  });

  // Fetch system settings (admin only)
  const { data: systemSettingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await systemSettingsApi.getSettings();
      return response.data;
    },
    enabled: user?.role === 'ADMIN' && activeSection === 'system',
  });

  // Fetch chat settings
  const { data: chatSettingsData } = useQuery({
    queryKey: ['chat-settings'],
    queryFn: async () => {
      const response = await chatSettingsApi.getSettings();
      return response.data;
    },
    enabled: activeSection === 'chat',
  });

  // Fetch user profile for Tour Hub
  const { data: tourHubProfileData } = useQuery<{
    bio?: string;
    location?: string;
    website?: string;
    spotifyArtistUrl?: string;
    instagramHandle?: string;
    twitterHandle?: string;
    linkedinUrl?: string;
    tiktokHandle?: string;
    soundcloudUrl?: string;
    youtubeChannelUrl?: string;
    appleMusicUrl?: string;
    isPublicProfile?: boolean;
    profileSlug?: string;
  }>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await api.get('/profile/me');
      return response.data;
    },
    enabled: activeSection === 'tourhub',
  });

  // Slug availability check query
  const { data: slugAvailability, isLoading: isCheckingSlug } = useQuery<{ available: boolean; reason: string | null }>({
    queryKey: ['slug-availability', slugCheckQuery],
    queryFn: async () => {
      const response = await api.get(`/profile/slug/${slugCheckQuery}/check`);
      return response.data;
    },
    enabled: slugCheckQuery.length >= 2 && activeSection === 'tourhub',
  });

  // Update Tour Hub form when profile data loads
  useEffect(() => {
    if (tourHubProfileData) {
      setTourHubForm({
        bio: tourHubProfileData.bio || '',
        location: tourHubProfileData.location || '',
        website: tourHubProfileData.website || '',
        spotifyArtistUrl: tourHubProfileData.spotifyArtistUrl || '',
        instagramHandle: tourHubProfileData.instagramHandle || '',
        twitterHandle: tourHubProfileData.twitterHandle || '',
        linkedinUrl: tourHubProfileData.linkedinUrl || '',
        tiktokHandle: tourHubProfileData.tiktokHandle || '',
        soundcloudUrl: tourHubProfileData.soundcloudUrl || '',
        youtubeChannelUrl: tourHubProfileData.youtubeChannelUrl || '',
        appleMusicUrl: tourHubProfileData.appleMusicUrl || '',
        isPublicProfile: tourHubProfileData.isPublicProfile || false,
        profileSlug: tourHubProfileData.profileSlug || ''
      });
    }
  }, [tourHubProfileData]);

  // Debounce slug availability check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (tourHubForm.profileSlug && tourHubForm.profileSlug.length >= 2) {
        setSlugCheckQuery(tourHubForm.profileSlug);
      } else {
        setSlugCheckQuery('');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [tourHubForm.profileSlug]);

  // Update chat settings when data loads
  useEffect(() => {
    if (chatSettingsData) {
      setChatSettings({
        chatSoundEnabled: chatSettingsData.chatSoundEnabled ?? true,
        chatSoundType: chatSettingsData.chatSoundType ?? 'chime',
        chatVisibilityStatus: chatSettingsData.chatVisibilityStatus ?? 'online',
        chatShowOnlineStatus: chatSettingsData.chatShowOnlineStatus ?? true,
        chatShowTypingIndicator: chatSettingsData.chatShowTypingIndicator ?? true,
        chatMessagePreview: chatSettingsData.chatMessagePreview ?? true,
        chatDesktopNotifications: chatSettingsData.chatDesktopNotifications ?? true,
      });
    }
  }, [chatSettingsData]);

  // Update local state when system settings data loads
  useEffect(() => {
    if (systemSettingsData) {
      console.log('📥 System settings data loaded:', systemSettingsData);
      setSystemSettings({
        minimumWithdrawalAmount: (systemSettingsData as any).minimumWithdrawalAmount || 50,
        emailsEnabled: (systemSettingsData as any).emailsEnabled ?? true,
      });
    }
  }, [systemSettingsData]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: any) => userApi.update(user!.id, data),
    onSuccess: (response) => {
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      // Update user in auth store
      updateUser({ ...user!, ...response.data.user });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const updatePasswordMutation = useMutation({
    mutationFn: (data: any) => userApi.update(user!.id, data),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update password' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  // Notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: any) => preferencesApi.updatePreferences(preferences),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Notification preferences updated!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update preferences' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const handlePreferenceToggle = (key: string, value: boolean) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    // Immediately save to backend
    updatePreferencesMutation.mutate({ [key]: value });
  };

  // Chat settings mutation
  const updateChatSettingsMutation = useMutation({
    mutationFn: (settings: any) => chatSettingsApi.updateSettings(settings),
    onSuccess: () => {
      toast.success('Chat settings updated!');
      queryClient.invalidateQueries({ queryKey: ['chat-settings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update chat settings');
    }
  });

  const handleChatSettingToggle = (key: string, value: boolean | string) => {
    const newSettings = { ...chatSettings, [key]: value };
    setChatSettings(newSettings);
    // Immediately save to backend
    updateChatSettingsMutation.mutate({ [key]: value });
  };

  // System settings mutation
  const updateSystemSettingsMutation = useMutation({
    mutationFn: (settings: any) => {
      console.log('📡 Sending update request with:', settings);
      return systemSettingsApi.updateSettings(settings);
    },
    onSuccess: (response) => {
      console.log('✅ Update successful! Response:', response);
      console.log('✅ Saved settings:', response.data);
      setMessage({ type: 'success', text: 'System settings updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      console.error('❌ Update failed:', error);
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update system settings' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const handleSystemSettingsUpdate = () => {
    console.log('💾 Saving system settings:', systemSettings);
    updateSystemSettingsMutation.mutate(systemSettings);
  };

  // Tour Hub mutation
  const updateTourHubMutation = useMutation({
    mutationFn: (data: typeof tourHubForm) => api.put('/profile/hub', data),
    onSuccess: (response) => {
      toast.success('Profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['my-profile', user?.id] }); // Sync with Social Profile page
      if (response.data.user) {
        updateUser({ ...user!, ...response.data.user });
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to update profile');
    }
  });

  const handleTourHubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateTourHubMutation.mutate(tourHubForm);
  };

  const generateSlug = () => {
    const slug = `${user?.firstName || ''}-${user?.lastName || ''}`
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    setTourHubForm({ ...tourHubForm, profileSlug: slug });
  };

  const copyProfileUrl = () => {
    if (tourHubForm.profileSlug) {
      const url = `${window.location.origin}/user/${tourHubForm.profileSlug}`;
      navigator.clipboard.writeText(url);
      setSlugCopied(true);
      toast.success('Profile URL copied to clipboard!');
      setTimeout(() => setSlugCopied(false), 2000);
    }
  };

  // Publisher queries and mutations
  const { data: publishersData } = useQuery({
    queryKey: ['publishers'],
    queryFn: () => settingsApi.publishers.list(),
    enabled: user?.role === 'ADMIN' && activeSection === 'publishers'
  });

  const createPublisherMutation = useMutation({
    mutationFn: (data: any) => settingsApi.publishers.create(data),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Publisher added successfully!' });
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setPublisherForm({ id: '', ipiNumber: '', publisherName: '', notes: '', isActive: true });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to add publisher' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const updatePublisherMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => settingsApi.publishers.update(id, data),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Publisher updated successfully!' });
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setPublisherForm({ id: '', ipiNumber: '', publisherName: '', notes: '', isActive: true });
      setIsEditing(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update publisher' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const deletePublisherMutation = useMutation({
    mutationFn: (id: string) => settingsApi.publishers.delete(id),
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Publisher deleted successfully!' });
      queryClient.invalidateQueries({ queryKey: ['publishers'] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (error: any) => {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to delete publisher' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'All password fields are required' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    updatePasswordMutation.mutate({
      password: passwordData.newPassword
    });
  };

  const handlePublisherSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!publisherForm.ipiNumber || !publisherForm.publisherName) {
      setMessage({ type: 'error', text: 'IPI number and publisher name are required' });
      return;
    }

    if (isEditing && publisherForm.id) {
      updatePublisherMutation.mutate({
        id: publisherForm.id,
        data: {
          ipiNumber: publisherForm.ipiNumber,
          publisherName: publisherForm.publisherName,
          notes: publisherForm.notes,
          isActive: publisherForm.isActive
        }
      });
    } else {
      createPublisherMutation.mutate({
        ipiNumber: publisherForm.ipiNumber,
        publisherName: publisherForm.publisherName,
        notes: publisherForm.notes
      });
    }
  };

  const handleEditPublisher = (publisher: any) => {
    setPublisherForm({
      id: publisher.id,
      ipiNumber: publisher.ipiNumber,
      publisherName: publisher.publisherName,
      notes: publisher.notes || '',
      isActive: publisher.isActive
    });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setPublisherForm({ id: '', ipiNumber: '', publisherName: '', notes: '', isActive: true });
    setIsEditing(false);
  };

  const handleDeletePublisher = (id: string) => {
    deletePublisherMutation.mutate(id);
  };

  // Photo upload handlers
  const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size before uploading
    if (file.size > MAX_PHOTO_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.error(`File too large (${sizeMB}MB). Maximum size is 2MB.`);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (tourHubPhotoInputRef.current) tourHubPhotoInputRef.current.value = '';
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      // Don't manually set Content-Type - axios will set it with the correct boundary
      const response = await api.post('/profile/photo', formData);

      if (response.data.success) {
        setProfilePhotoUrl(response.data.user.profilePhotoUrl);
        updateUser({ ...user!, profilePhotoUrl: response.data.user.profilePhotoUrl } as any);
        toast.success('Profile photo updated!');
      }
    } catch (error: any) {
      console.error('Photo upload error:', error.response?.data);
      const errorData = error.response?.data;
      const errorMessage = errorData?.message || errorData?.error || 'Failed to upload photo. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (tourHubPhotoInputRef.current) tourHubPhotoInputRef.current.value = '';
    }
  };

  const handleDeletePhoto = async () => {
    setIsUploadingPhoto(true);
    try {
      await api.delete('/profile/photo');
      setProfilePhotoUrl(null);
      updateUser({ ...user!, profilePhotoUrl: null } as any);
      toast.success('Profile photo removed!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.response?.data?.error || 'Failed to remove photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-background relative">
      {/* Background Effects - Theme aware */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-theme-primary-5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-theme-primary-3 rounded-full blur-[100px]" />
      </div>

      {/* Header with Back Button */}
      <header className="bg-theme-card-80 backdrop-blur-sm border-b border-theme-border sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-theme-foreground-muted hover:text-theme-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-theme-primary" />
            <span className="font-semibold text-theme-foreground">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme-foreground mb-2">Settings</h1>
          <p className="text-theme-foreground-muted">Manage your account settings and preferences</p>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`mb-6 p-4 ${
            message.type === 'success'
              ? 'bg-theme-success-bg border border-theme-success-30 text-theme-success'
              : 'bg-theme-error-bg border border-theme-error-30 text-theme-error'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="relative overflow-hidden bg-theme-card border border-theme-border p-2 space-y-1">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'profile'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span className="font-medium">User Info</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('password')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'password'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4" />
                  <span className="font-medium">Password</span>
                </div>
              </button>
              {user?.role === 'WRITER' && (
                <button
                  onClick={() => setActiveSection('payments')}
                  className={`w-full text-left px-4 py-3 transition-colors ${
                    activeSection === 'payments'
                      ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                      : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-4 h-4" />
                    <span className="font-medium">Payments</span>
                  </div>
                </button>
              )}
              <button
                onClick={() => setActiveSection('notifications')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'notifications'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">Notifications</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('chat')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'chat'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4" />
                  <span className="font-medium">Chat</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('tourhub')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'tourhub'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4" />
                  <span className="font-medium">My Tour Profile</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('avatar')}
                className={`w-full text-left px-4 py-3 transition-colors ${
                  activeSection === 'avatar'
                    ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                    : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span className="font-medium">3D Avatar</span>
                </div>
              </button>
              {user?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveSection('system')}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeSection === 'system'
                        ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                        : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">System</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('publishers')}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeSection === 'publishers'
                        ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                        : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">Publishers</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('documentation')}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeSection === 'documentation'
                        ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                        : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-medium">Documentation</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('appearance')}
                    className={`w-full text-left px-4 py-3 transition-colors ${
                      activeSection === 'appearance'
                        ? 'bg-theme-primary-10 text-theme-primary border-l-2 border-theme-primary'
                        : 'text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground border-l-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Palette className="w-4 h-4" />
                      <span className="font-medium">Appearance</span>
                    </div>
                  </button>
                </>
              )}

              {/* Logout Button */}
              <div className="mt-4 pt-4 border-t border-theme-border">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 transition-colors border-l-2 border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4" />
                    <span className="font-medium">Log Out</span>
                  </div>
                </button>
              </div>
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">User Information</h2>

                  {/* Profile Photo */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-theme-foreground-secondary mb-4">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-theme-border-strong flex items-center justify-center">
                          {profilePhotoUrl ? (
                            <img
                              src={profilePhotoUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-theme-foreground-muted">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-theme-background-50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-theme-foreground animate-spin" />
                          </div>
                        )}
                      </div>
                      {user?.role === 'ADMIN' && (
                        <div className="flex flex-col gap-2">
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handlePhotoSelect}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            disabled={isUploadingPhoto}
                            className="px-4 py-2 bg-theme-primary-20 text-theme-primary text-sm font-medium hover:bg-theme-primary-30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                          </button>
                          {profilePhotoUrl && (
                            <button
                              type="button"
                              onClick={handleDeletePhoto}
                              disabled={isUploadingPhoto}
                              className="px-4 py-2 bg-theme-error-20 text-theme-error text-sm font-medium hover:bg-theme-error-30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {user?.role !== 'ADMIN' && (
                      <p className="text-xs text-theme-foreground-muted mt-2">
                        Contact your administrator to update your profile photo
                      </p>
                    )}
                    {user?.role === 'ADMIN' && (
                      <p className="text-xs text-theme-foreground-muted mt-2">
                        Recommended: Square image, at least 200x200px. Max 5MB.
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          First Name
                        </label>
                        {user?.role === 'ADMIN' ? (
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                          />
                        ) : (
                          <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                            {profileData.firstName || 'Not set'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          Last Name
                        </label>
                        {user?.role === 'ADMIN' ? (
                          <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                          />
                        ) : (
                          <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                            {profileData.lastName || 'Not set'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Email Address
                      </label>
                      {user?.role === 'ADMIN' ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                        />
                      ) : (
                        <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                          {profileData.email || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Writer IPI - only for WRITER role */}
                    {user?.role === 'WRITER' && (
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          Writer IPI Number
                        </label>
                        <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                          {user?.writerIpiNumber || 'Not set'}
                        </div>
                      </div>
                    )}

                    {/* Publisher IPI - for WRITER and PUBLISHER roles */}
                    {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          Publisher IPI Number
                        </label>
                        <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                          {user?.publisherIpiNumber || 'Not set'}
                        </div>
                      </div>
                    )}

                    {/* Publisher Legal Name - for ALL roles when set */}
                    {user?.publisherName && (
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          Publisher Legal Name
                        </label>
                        <div className="w-full px-4 py-2 bg-theme-card-hover border border-theme-border text-theme-foreground">
                          {user.publisherName}
                        </div>
                      </div>
                    )}

                    {user?.role !== 'ADMIN' && (
                      <div className="bg-theme-primary-10 border border-theme-primary-30 p-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 bg-theme-primary-20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-4 h-4 text-theme-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-theme-primary mb-1">Read-Only Information</p>
                            <p className="text-sm text-theme-foreground-secondary">
                              Your user information can only be updated by an administrator. Contact support if you need to make changes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {user?.role === 'ADMIN' && (
                      <div className="flex justify-end pt-4 border-t border-theme-border">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="px-6 py-2 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* Password Section */}
              {activeSection === 'password' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">Change Password</h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                      />
                      <p className="text-sm text-theme-foreground-muted mt-1">
                        Password must be at least 6 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-theme-border">
                      <button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="px-6 py-2 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Payments Section */}
              {activeSection === 'payments' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">Payment Settings</h2>
                  <PaymentSettings />
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-theme-card-hover border border-theme-border">
                      <div>
                        <h3 className="text-theme-foreground font-medium">Email Notifications</h3>
                        <p className="text-sm text-theme-foreground-muted">Receive email updates about new statements</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.emailNotificationsEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('emailNotificationsEnabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-theme-card-hover border border-theme-border">
                      <div>
                        <h3 className="text-theme-foreground font-medium">Statement Notifications</h3>
                        <p className="text-sm text-theme-foreground-muted">Get notified when new statements are published</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.statementNotificationsEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('statementNotificationsEnabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-theme-card-hover border border-theme-border">
                      <div>
                        <h3 className="text-theme-foreground font-medium">Monthly Summary</h3>
                        <p className="text-sm text-theme-foreground-muted">Receive monthly earning summaries</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.monthlySummaryEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('monthlySummaryEnabled', checked)}
                      />
                    </div>

                    <p className="text-sm text-theme-foreground-muted pt-4">
                      Changes are saved automatically. Disable notifications to prevent emails during payment testing.
                    </p>
                  </div>
                </div>
              )}

              {/* Chat Settings Section */}
              {activeSection === 'chat' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-theme-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-theme-foreground">Chat Settings</h2>
                      <p className="text-theme-foreground-muted text-sm">Manage your chat preferences and privacy</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Visibility Status */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <h3 className="text-lg font-semibold text-theme-foreground mb-4">Visibility Status</h3>
                      <p className="text-sm text-theme-foreground-muted mb-4">
                        Choose how you appear to other users in the chat
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { value: 'online', label: 'Online', color: 'bg-green-500', description: 'Available for chat' },
                          { value: 'away', label: 'Away', color: 'bg-yellow-500', description: 'Temporarily unavailable' },
                          { value: 'do_not_disturb', label: 'Do Not Disturb', color: 'bg-red-500', description: 'No notifications' },
                          { value: 'invisible', label: 'Invisible', color: 'bg-gray-500', description: 'Appear offline' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => handleChatSettingToggle('chatVisibilityStatus', status.value)}
                            className={`p-4 border transition-all ${
                              chatSettings.chatVisibilityStatus === status.value
                                ? 'border-theme-primary bg-theme-primary-10'
                                : 'border-theme-border hover:border-theme-border-hover bg-theme-card-hover'
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`w-3 h-3 rounded-full ${status.color}`} />
                              <span className="text-theme-foreground font-medium text-sm">{status.label}</span>
                            </div>
                            <p className="text-xs text-theme-foreground-muted">{status.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sound Settings */}
                    <div className="bg-theme-card-hover border border-theme-border p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {chatSettings.chatSoundEnabled ? (
                            <Volume2 className="w-5 h-5 text-theme-success" />
                          ) : (
                            <VolumeX className="w-5 h-5 text-theme-foreground-muted" />
                          )}
                          <div>
                            <h3 className="text-theme-foreground font-medium">Message Sounds</h3>
                            <p className="text-sm text-theme-foreground-muted">Play a sound when you receive new messages</p>
                          </div>
                        </div>
                        <Switch
                          checked={chatSettings.chatSoundEnabled}
                          onCheckedChange={(checked) => handleChatSettingToggle('chatSoundEnabled', checked)}
                        />
                      </div>

                      {/* Sound Type Selector */}
                      {chatSettings.chatSoundEnabled && (
                        <div className="pt-2 border-t border-theme-border">
                          <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                            Notification Sound
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { value: 'chime', label: 'Chime' },
                              { value: 'pop', label: 'Pop' },
                              { value: 'ding', label: 'Ding' },
                              { value: 'bell', label: 'Bell' },
                              { value: 'subtle', label: 'Subtle' },
                            ].map((sound) => (
                              <button
                                key={sound.value}
                                onClick={() => handleChatSettingToggle('chatSoundType', sound.value)}
                                className={`px-3 py-1.5 text-sm font-medium transition-all ${
                                  chatSettings.chatSoundType === sound.value
                                    ? 'bg-theme-primary text-theme-primary-foreground'
                                    : 'bg-theme-border-strong text-theme-foreground-secondary hover:bg-theme-card-hover'
                                }`}
                              >
                                {sound.label}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-theme-foreground-muted mt-2">
                            Select a sound to preview. The sound will play when you receive new messages.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Push Notifications */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <BellRing className="w-5 h-5 text-theme-primary" />
                        <div>
                          <h3 className="text-lg font-semibold text-theme-foreground">Push Notifications</h3>
                          <p className="text-sm text-theme-foreground-muted">
                            Receive notifications on your device even when the app is closed
                          </p>
                        </div>
                      </div>

                      {/* iOS PWA Install Prompt */}
                      {iosInstallPrompt && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 mb-4">
                          <div className="flex gap-3">
                            <Smartphone className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                Enable Push Notifications on iOS
                              </p>
                              <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                                To receive push notifications on your iPhone or iPad:
                              </p>
                              <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                                <li>Tap the Share button in Safari</li>
                                <li>Select "Add to Home Screen"</li>
                                <li>Open the app from your home screen</li>
                                <li>Return here to enable notifications</li>
                              </ol>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Permission Denied Warning */}
                      {pushPermission === 'denied' && (
                        <div className="bg-theme-error-bg border border-theme-error-30 p-4 mb-4">
                          <div className="flex gap-3">
                            <XCircle className="w-5 h-5 text-theme-error flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-theme-error mb-1">
                                Notifications Blocked
                              </p>
                              <p className="text-sm text-theme-foreground-secondary">
                                You've blocked notifications for this site. To enable, click the lock icon in your browser's address bar and allow notifications.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Push Error */}
                      {pushError && pushPermission !== 'denied' && (
                        <div className="bg-theme-warning-bg border border-theme-warning/30 p-4 mb-4">
                          <p className="text-sm text-theme-warning">{pushError}</p>
                        </div>
                      )}

                      {/* Push Toggle & Controls */}
                      {pushSupported && !iosInstallPrompt && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-theme-foreground font-medium">
                                {pushSubscribed ? 'Notifications Enabled' : 'Enable Notifications'}
                              </p>
                              <p className="text-sm text-theme-foreground-muted">
                                {pushSubscribed
                                  ? 'You will receive push notifications for messages and activity'
                                  : 'Get notified about new messages, follows, and more'}
                              </p>
                            </div>
                            <Switch
                              checked={pushSubscribed}
                              disabled={pushLoading || pushPermission === 'denied'}
                              onCheckedChange={async (checked) => {
                                if (checked) {
                                  const success = await subscribePush();
                                  if (success) {
                                    toast.success('Push notifications enabled!');
                                    // Also update the server preference
                                    handleChatSettingToggle('chatDesktopNotifications', true);
                                  }
                                } else {
                                  const success = await unsubscribePush();
                                  if (success) {
                                    toast.success('Push notifications disabled');
                                    handleChatSettingToggle('chatDesktopNotifications', false);
                                  }
                                }
                              }}
                            />
                          </div>

                          {/* Test Notification Button */}
                          {pushSubscribed && (
                            <button
                              onClick={async () => {
                                const success = await sendTestNotification();
                                if (success) {
                                  toast.success('Test notification sent! Check your device.');
                                } else {
                                  toast.error('Failed to send test notification');
                                }
                              }}
                              disabled={pushLoading}
                              className="px-4 py-2 bg-theme-primary-20 text-theme-primary text-sm font-medium hover:bg-theme-primary-30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <Bell className="w-4 h-4" />
                              Send Test Notification
                            </button>
                          )}
                        </div>
                      )}

                      {/* Not Supported */}
                      {!pushSupported && !iosInstallPrompt && (
                        <div className="bg-theme-border-strong p-4">
                          <p className="text-sm text-theme-foreground-muted">
                            Push notifications are not supported in your browser. Try using Chrome, Firefox, Edge, or Safari.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Message Preview */}
                    <div className="flex items-center justify-between p-4 bg-theme-card-hover border border-theme-border">
                      <div className="flex items-center gap-3">
                        <Eye className="w-5 h-5 text-theme-primary" />
                        <div>
                          <h3 className="text-theme-foreground font-medium">Message Preview</h3>
                          <p className="text-sm text-theme-foreground-muted">Show message content in notifications</p>
                        </div>
                      </div>
                      <Switch
                        checked={chatSettings.chatMessagePreview}
                        onCheckedChange={(checked) => handleChatSettingToggle('chatMessagePreview', checked)}
                      />
                    </div>

                    {/* Privacy Settings */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <h3 className="text-lg font-semibold text-theme-foreground mb-4">Privacy</h3>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {chatSettings.chatShowOnlineStatus ? (
                              <Eye className="w-5 h-5 text-theme-success" />
                            ) : (
                              <EyeOff className="w-5 h-5 text-theme-foreground-muted" />
                            )}
                            <div>
                              <h4 className="text-theme-foreground font-medium">Show Online Status</h4>
                              <p className="text-sm text-theme-foreground-muted">Let others see when you're online</p>
                            </div>
                          </div>
                          <Switch
                            checked={chatSettings.chatShowOnlineStatus}
                            onCheckedChange={(checked) => handleChatSettingToggle('chatShowOnlineStatus', checked)}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <MessageCircle className="w-5 h-5 text-theme-primary" />
                            <div>
                              <h4 className="text-theme-foreground font-medium">Show Typing Indicator</h4>
                              <p className="text-sm text-theme-foreground-muted">Let others see when you're typing</p>
                            </div>
                          </div>
                          <Switch
                            checked={chatSettings.chatShowTypingIndicator}
                            onCheckedChange={(checked) => handleChatSettingToggle('chatShowTypingIndicator', checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-theme-primary-10 border border-theme-primary-30 p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-theme-primary-20 flex items-center justify-center flex-shrink-0">
                          <Info className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-theme-primary mb-1">About Chat Privacy</p>
                          <p className="text-sm text-theme-foreground-secondary">
                            Your privacy settings are synced across all devices. Changes take effect immediately.
                            When set to "Invisible", you'll appear offline but can still send and receive messages.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Writer Tour Hub Section */}
              {activeSection === 'tourhub' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-theme-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-theme-foreground">My Tour Profile</h2>
                      <p className="text-theme-foreground-muted text-sm">Customize your public profile</p>
                    </div>
                  </div>

                  {/* Profile Photo Section */}
                  <div className="mb-8 bg-theme-card-hover border border-theme-border p-6">
                    <label className="block text-sm font-medium text-theme-foreground-secondary mb-4">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-theme-border-strong flex items-center justify-center">
                          {profilePhotoUrl ? (
                            <img
                              src={profilePhotoUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-theme-foreground-muted">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-theme-background-50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-theme-foreground animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <input
                          ref={tourHubPhotoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handlePhotoSelect}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => tourHubPhotoInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="px-4 py-2 bg-theme-primary-20 text-theme-primary text-sm font-medium hover:bg-theme-primary-30 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {profilePhotoUrl && (
                          <button
                            type="button"
                            onClick={handleDeletePhoto}
                            disabled={isUploadingPhoto}
                            className="px-4 py-2 bg-theme-error-20 text-theme-error text-sm font-medium hover:bg-theme-error-30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-theme-foreground-muted mt-2">
                      Recommended: Square image, at least 200x200px. Max 2MB.
                    </p>
                  </div>

                  <form onSubmit={handleTourHubSubmit} className="space-y-6">
                    {/* Profile URL / Slug */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Profile URL
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-theme-input border border-theme-border-strong">
                          <span className="text-theme-foreground-muted">{window.location.origin}/user/</span>
                          <input
                            type="text"
                            value={tourHubForm.profileSlug}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, profileSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            placeholder="your-name"
                            className="flex-1 bg-transparent text-theme-foreground focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generateSlug}
                          className="px-4 py-2 bg-theme-border-strong text-theme-foreground-secondary hover:bg-theme-card-hover transition-colors text-sm"
                        >
                          Generate
                        </button>
                        {tourHubForm.profileSlug && (
                          <button
                            type="button"
                            onClick={copyProfileUrl}
                            className="px-4 py-2 bg-theme-primary-20 text-theme-primary hover:bg-theme-primary-30 transition-colors flex items-center gap-2"
                          >
                            {slugCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {slugCopied ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-theme-foreground-muted mt-2">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                      {/* Slug availability indicator */}
                      {tourHubForm.profileSlug && tourHubForm.profileSlug.length >= 2 && (
                        <div className="flex items-center gap-2 mt-2">
                          {isCheckingSlug ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-theme-foreground-muted" />
                              <span className="text-sm text-theme-foreground-muted">Checking availability...</span>
                            </>
                          ) : slugAvailability?.available ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-500" />
                              <span className="text-sm text-green-600">This URL is available!</span>
                            </>
                          ) : slugAvailability ? (
                            <>
                              <XCircle className="w-4 h-4 text-red-500" />
                              <span className="text-sm text-red-600">
                                {slugAvailability.reason === 'invalid_format'
                                  ? 'Invalid format - use only lowercase letters, numbers, and hyphens'
                                  : 'This URL is already taken'}
                              </span>
                            </>
                          ) : null}
                        </div>
                      )}
                      <Link
                        to="/my-profile"
                        className="inline-flex items-center gap-1 text-sm text-theme-primary hover:opacity-80 mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Go to your profile hub
                      </Link>
                    </div>

                    {/* Public Profile Toggle */}
                    <div className="flex items-center justify-between p-4 bg-theme-card-hover border border-theme-border">
                      <div>
                        <h3 className="text-theme-foreground font-medium">Make Profile Public</h3>
                        <p className="text-sm text-theme-foreground-muted">Allow anyone to view your Writer Tour Hub profile</p>
                      </div>
                      <Switch
                        checked={tourHubForm.isPublicProfile}
                        onCheckedChange={(checked) => setTourHubForm({ ...tourHubForm, isPublicProfile: checked })}
                      />
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Bio
                      </label>
                      <textarea
                        value={tourHubForm.bio}
                        onChange={(e) => setTourHubForm({ ...tourHubForm, bio: e.target.value })}
                        placeholder="Tell people about yourself, your music journey, achievements..."
                        rows={4}
                        className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus resize-none"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={tourHubForm.location}
                        onChange={(e) => setTourHubForm({ ...tourHubForm, location: e.target.value })}
                        placeholder="e.g., Los Angeles, CA"
                        className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                      />
                    </div>

                    {/* Social Links - Collapsible */}
                    <div className="bg-theme-card-hover border border-theme-border overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedSections(prev => ({ ...prev, socialLinks: !prev.socialLinks }))}
                        className="w-full flex items-center justify-between p-4 hover:bg-theme-border-strong transition-colors"
                      >
                        <h3 className="text-lg font-semibold text-theme-foreground">Social & Web Links</h3>
                        {expandedSections.socialLinks ? (
                          <ChevronUp className="w-5 h-5 text-theme-foreground-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-theme-foreground-muted" />
                        )}
                      </button>

                      {expandedSections.socialLinks && (
                        <div className="space-y-4 p-4 pt-0 border-t border-theme-border">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                          <Globe className="w-4 h-4" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.website}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, website: e.target.value })}
                          placeholder="https://yourwebsite.com"
                          className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-theme-primary mb-2">
                          <Music className="w-4 h-4" />
                          Spotify Artist URL
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.spotifyArtistUrl}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, spotifyArtistUrl: e.target.value })}
                          placeholder="https://open.spotify.com/artist/..."
                          className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <Instagram className="w-4 h-4" />
                            Instagram
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-theme-input border border-theme-border-strong">
                            <span className="text-theme-foreground-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.instagramHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, instagramHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-theme-foreground focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <Twitter className="w-4 h-4" />
                            Twitter / X
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-theme-input border border-theme-border-strong">
                            <span className="text-theme-foreground-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.twitterHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, twitterHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-theme-foreground focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.linkedinUrl}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, linkedinUrl: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <Smartphone className="w-4 h-4" />
                            TikTok
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-theme-input border border-theme-border-strong">
                            <span className="text-theme-foreground-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.tiktokHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, tiktokHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-theme-foreground focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <Youtube className="w-4 h-4" />
                            YouTube Channel
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.youtubeChannelUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, youtubeChannelUrl: e.target.value })}
                            placeholder="https://youtube.com/@..."
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <Music className="w-4 h-4" />
                            Apple Music
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.appleMusicUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, appleMusicUrl: e.target.value })}
                            placeholder="https://music.apple.com/artist/..."
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-theme-foreground-secondary mb-2">
                            <CloudRain className="w-4 h-4" />
                            SoundCloud
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.soundcloudUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, soundcloudUrl: e.target.value })}
                            placeholder="https://soundcloud.com/..."
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                          />
                        </div>
                      </div>
                        </div>
                      )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-theme-primary-10 border border-theme-primary-30 p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-theme-primary-20 flex items-center justify-center flex-shrink-0">
                          <Info className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-theme-primary mb-1">About Your Public Profile</p>
                          <p className="text-sm text-theme-foreground-secondary">
                            Your public profile showcases your placements, achievements, and Tour Miles.
                            Share your profile URL with others to show off your success!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-theme-border">
                      <button
                        type="submit"
                        disabled={updateTourHubMutation.isPending}
                        className="px-6 py-2 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {updateTourHubMutation.isPending ? 'Saving...' : 'Save Profile'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Publishers Section (Admin Only) */}
              {activeSection === 'publishers' && user?.role === 'ADMIN' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">Producer Tour Publishers</h2>
                  <p className="text-theme-foreground-muted mb-6">
                    Manage your Producer Tour publisher IPIs. These are used for MLC statement matching to identify which writers use Producer Tour as their publisher.
                  </p>

                  {/* Add/Edit Publisher Form */}
                  <div className="bg-theme-card-hover border border-theme-border p-6 mb-6">
                    <h3 className="text-lg font-semibold text-theme-foreground mb-4">
                      {isEditing ? 'Edit Publisher' : 'Add New Publisher'}
                    </h3>
                    <form onSubmit={handlePublisherSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                            Publisher Name *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.publisherName}
                            onChange={(e) => setPublisherForm({ ...publisherForm, publisherName: e.target.value })}
                            placeholder="e.g., Producer Tour ASCAP"
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                            IPI Number *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.ipiNumber}
                            onChange={(e) => setPublisherForm({ ...publisherForm, ipiNumber: e.target.value })}
                            placeholder="e.g., 1266292635"
                            className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-secondary mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={publisherForm.notes}
                          onChange={(e) => setPublisherForm({ ...publisherForm, notes: e.target.value })}
                          placeholder="Additional notes..."
                          rows={2}
                          className="w-full px-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus"
                        />
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="isActive"
                            checked={publisherForm.isActive}
                            onCheckedChange={(checked) => setPublisherForm({ ...publisherForm, isActive: checked as boolean })}
                          />
                          <label htmlFor="isActive" className="text-sm text-theme-foreground-secondary cursor-pointer">
                            Active
                          </label>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={createPublisherMutation.isPending || updatePublisherMutation.isPending}
                          className="px-6 py-2 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isEditing ? 'Update Publisher' : 'Add Publisher'}
                        </button>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-6 py-2 bg-theme-border-strong text-theme-foreground font-medium hover:bg-theme-card-hover transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Publishers List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-theme-foreground mb-4">Configured Publishers</h3>
                    {!publishersData?.data?.publishers?.length ? (
                      <div className="text-center py-8 text-theme-foreground-muted">
                        No publishers configured yet. Add one above to get started.
                      </div>
                    ) : (
                      publishersData.data.publishers.map((publisher: any) => (
                        <div
                          key={publisher.id}
                          className="bg-theme-card-hover border border-theme-border p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-theme-foreground font-medium">{publisher.publisherName}</h4>
                              <span className={`px-2 py-1 text-xs ${
                                publisher.isActive
                                  ? 'bg-theme-success-bg text-theme-success border border-theme-success-30'
                                  : 'bg-theme-border-strong text-theme-foreground-muted border border-theme-border'
                              }`}>
                                {publisher.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-theme-foreground-muted mt-1">IPI: {publisher.ipiNumber}</p>
                            {publisher.notes && (
                              <p className="text-sm text-theme-foreground-muted mt-1">{publisher.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPublisher(publisher)}
                              className="px-4 py-2 text-sm bg-theme-primary-20 text-theme-primary hover:bg-theme-primary-30 transition-colors"
                            >
                              Edit
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  disabled={deletePublisherMutation.isPending}
                                  className="px-4 py-2 text-sm bg-theme-error-20 text-theme-error hover:bg-theme-error-30 transition-colors disabled:opacity-50"
                                >
                                  Delete
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Publisher</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{publisher.publisherName}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeletePublisher(publisher.id)}
                                    className="bg-theme-error hover:bg-theme-error-80"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* System Settings Section (Admin Only) */}
              {activeSection === 'system' && user?.role === 'ADMIN' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">System Settings</h2>
                  <p className="text-theme-foreground-muted mb-8">Configure system-wide settings that affect all users</p>

                  <div className="space-y-6">
                    {/* Minimum Withdrawal Amount */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <label className="block text-sm font-medium text-theme-foreground-secondary mb-4">
                        Minimum Withdrawal Amount
                      </label>
                      <p className="text-sm text-theme-foreground-muted mb-4">
                        Set the minimum amount writers must have in their available balance before they can request a withdrawal.
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-theme-foreground-muted">$</span>
                          <input
                            type="number"
                            min="0"
                            max="10000"
                            step="0.01"
                            value={systemSettings.minimumWithdrawalAmount}
                            onChange={(e) => setSystemSettings({
                              ...systemSettings,
                              minimumWithdrawalAmount: parseFloat(e.target.value) || 0
                            })}
                            className="w-full pl-8 pr-4 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:ring-2 focus:ring-theme-input-focus"
                          />
                        </div>
                        <button
                          onClick={handleSystemSettingsUpdate}
                          disabled={updateSystemSettingsMutation.isPending}
                          className="px-6 py-2 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updateSystemSettingsMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <p className="text-xs text-theme-foreground-muted mt-2">
                        Current: ${systemSettings.minimumWithdrawalAmount.toFixed(2)} • Recommended: $50.00 - $100.00
                      </p>
                    </div>

                    {/* System Emails Toggle */}
                    <div className="bg-theme-card-hover border border-theme-border p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-theme-foreground-secondary mb-1">
                            System Emails
                          </label>
                          <p className="text-sm text-theme-foreground-muted">
                            Enable or disable all system emails (payment notifications, welcome emails, etc.). Useful when testing.
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-3">
                          <Switch
                            checked={systemSettings.emailsEnabled}
                            onCheckedChange={(checked) => {
                              setSystemSettings({ ...systemSettings, emailsEnabled: checked });
                              updateSystemSettingsMutation.mutate({ emailsEnabled: checked });
                            }}
                          />
                          <span className={`text-sm font-medium ${systemSettings.emailsEnabled ? 'text-green-500' : 'text-red-500'}`}>
                            {systemSettings.emailsEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                      {!systemSettings.emailsEnabled && (
                        <div className="mt-4 bg-amber-500/10 border border-amber-500/30 p-3 rounded flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-500">
                            System emails are currently disabled. No emails will be sent to users until this is re-enabled.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Info Box */}
                    <div className="bg-theme-primary-10 border border-theme-primary-30 p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-theme-primary-20 flex items-center justify-center flex-shrink-0">
                          <Info className="w-4 h-4 text-theme-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-theme-primary mb-1">About System Settings</p>
                          <p className="text-sm text-theme-foreground-secondary">
                            Changes to system settings take effect immediately for all users. Writers will see the updated minimum amount the next time they view their wallet.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Documentation Section (Admin Only) */}
              {activeSection === 'documentation' && user?.role === 'ADMIN' && (
                <div>
                  <AdminGuide />
                </div>
              )}

              {/* Appearance Section (Admin Only) */}
              {activeSection === 'appearance' && user?.role === 'ADMIN' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-6">Appearance</h2>
                  <p className="text-theme-foreground-muted mb-8">Customize how your dashboard looks and feels</p>
                  <ThemeSelector />
                </div>
              )}

              {/* 3D Avatar Section */}
              {activeSection === 'avatar' && (
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground mb-2">3D Avatar</h2>
                  <p className="text-theme-foreground-muted mb-8">
                    Customize your 3D avatar for Producer Tour Play and multiplayer experiences
                  </p>

                  <div className="bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 rounded-2xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-theme-foreground mb-2">Character Creator</h3>
                        <p className="text-theme-foreground-muted text-sm mb-4">
                          Create and customize your unique 3D avatar. Choose your body type, skin tone, facial features, hair style, and more.
                        </p>
                        <Link
                          to="/character-creator"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-medium rounded-lg transition-all"
                        >
                          <Camera className="w-4 h-4" />
                          Open Character Creator
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
