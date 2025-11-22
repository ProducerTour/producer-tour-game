import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Lock, Bell, Settings, CreditCard, Info, User, Building2, BookOpen, Camera, Trash2, Loader2, Plane, Globe, Music, Instagram, Twitter, Linkedin, ExternalLink, Copy, Check, ArrowLeft, Youtube, CloudRain, Smartphone } from 'lucide-react';
import { userApi, settingsApi, preferencesApi, systemSettingsApi, api } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import AdminGuide from '../components/AdminGuide';
import { PaymentSettings } from '../components/PaymentSettings';
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

type SettingsSection = 'profile' | 'password' | 'payments' | 'notifications' | 'publishers' | 'documentation' | 'system' | 'tourhub';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  // Check for section query param (e.g., /settings?section=tourhub)
  const sectionParam = searchParams.get('section') as SettingsSection | null;
  const validSections: SettingsSection[] = ['profile', 'password', 'payments', 'notifications', 'publishers', 'documentation', 'system', 'tourhub'];
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

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    minimumWithdrawalAmount: 50,
  });

  // Profile photo state
  const photoInputRef = useRef<HTMLInputElement>(null);
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

  // Fetch system settings (admin only)
  const { data: systemSettingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await systemSettingsApi.getSettings();
      return response.data;
    },
    enabled: user?.role === 'ADMIN' && activeSection === 'system',
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

  // Update local state when system settings data loads
  useEffect(() => {
    if (systemSettingsData) {
      console.log('📥 System settings data loaded:', systemSettingsData);
      setSystemSettings({
        minimumWithdrawalAmount: (systemSettingsData as any).minimumWithdrawalAmount || 50,
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
      const url = `${window.location.origin}/writer/${tourHubForm.profileSlug}`;
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
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
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
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
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
    <div className="min-h-screen bg-surface relative">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-green-500/5 rounded-full blur-[100px]" />
      </div>

      {/* Header with Back Button */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-400" />
            <span className="font-semibold text-white">Settings</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-0">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-text-muted">Manage your account settings and preferences</p>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-2 space-y-1">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'profile'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-text-secondary hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <span className="font-medium">User Info</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('password')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'password'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-text-secondary hover:bg-white/[0.04]'
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
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeSection === 'payments'
                      ? 'bg-primary-500/20 text-primary-400'
                      : 'text-text-secondary hover:bg-white/[0.04]'
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
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'notifications'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-text-secondary hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">Notifications</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('tourhub')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'tourhub'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-text-secondary hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Plane className="w-4 h-4" />
                  <span className="font-medium">My Tour Profile</span>
                </div>
              </button>
              {user?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveSection('system')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === 'system'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">System</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('publishers')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === 'publishers'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">Publishers</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('documentation')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === 'documentation'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-text-secondary hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-4 h-4" />
                      <span className="font-medium">Documentation</span>
                    </div>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">User Information</h2>

                  {/* Profile Photo */}
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-text-secondary mb-4">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {profilePhotoUrl ? (
                            <img
                              src={profilePhotoUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-white/40">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
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
                            className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Camera className="w-4 h-4" />
                            {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                          </button>
                          {profilePhotoUrl && (
                            <button
                              type="button"
                              onClick={handleDeletePhoto}
                              disabled={isUploadingPhoto}
                              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {user?.role !== 'ADMIN' && (
                      <p className="text-xs text-text-muted mt-2">
                        Contact your administrator to update your profile photo
                      </p>
                    )}
                    {user?.role === 'ADMIN' && (
                      <p className="text-xs text-text-muted mt-2">
                        Recommended: Square image, at least 200x200px. Max 5MB.
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          First Name
                        </label>
                        {user?.role === 'ADMIN' ? (
                          <input
                            type="text"
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                          />
                        ) : (
                          <div className="w-full px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white">
                            {profileData.firstName || 'Not set'}
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Last Name
                        </label>
                        {user?.role === 'ADMIN' ? (
                          <input
                            type="text"
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                          />
                        ) : (
                          <div className="w-full px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white">
                            {profileData.lastName || 'Not set'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Email Address
                      </label>
                      {user?.role === 'ADMIN' ? (
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                        />
                      ) : (
                        <div className="w-full px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white">
                          {profileData.email || 'Not set'}
                        </div>
                      )}
                    </div>

                    {/* Writer IPI - only for WRITER role */}
                    {user?.role === 'WRITER' && (
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Writer IPI Number
                        </label>
                        <div className="w-full px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white">
                          {user?.writerIpiNumber || 'Not set'}
                        </div>
                      </div>
                    )}

                    {/* Publisher IPI - for WRITER and PUBLISHER roles */}
                    {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Publisher IPI Number
                        </label>
                        <div className="w-full px-4 py-2 bg-white/[0.04] border border-white/10 rounded-lg text-white">
                          {user?.publisherIpiNumber || 'Not set'}
                        </div>
                      </div>
                    )}

                    {user?.role !== 'ADMIN' && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Info className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-300 mb-1">Read-Only Information</p>
                            <p className="text-sm text-blue-200/80">
                              Your user information can only be updated by an administrator. Contact support if you need to make changes.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {user?.role === 'ADMIN' && (
                      <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                        <button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed transition-colors"
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
                  <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                      />
                      <p className="text-sm text-text-muted mt-1">
                        Password must be at least 6 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                      <button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed transition-colors"
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
                  <h2 className="text-2xl font-bold text-white mb-6">Payment Settings</h2>
                  <PaymentSettings />
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                      <div>
                        <h3 className="text-white font-medium">Email Notifications</h3>
                        <p className="text-sm text-text-muted">Receive email updates about new statements</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.emailNotificationsEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('emailNotificationsEnabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                      <div>
                        <h3 className="text-white font-medium">Statement Notifications</h3>
                        <p className="text-sm text-text-muted">Get notified when new statements are published</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.statementNotificationsEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('statementNotificationsEnabled', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                      <div>
                        <h3 className="text-white font-medium">Monthly Summary</h3>
                        <p className="text-sm text-text-muted">Receive monthly earning summaries</p>
                      </div>
                      <Switch
                        checked={notificationPrefs.monthlySummaryEnabled}
                        onCheckedChange={(checked) => handlePreferenceToggle('monthlySummaryEnabled', checked)}
                      />
                    </div>

                    <p className="text-sm text-text-muted pt-4">
                      Changes are saved automatically. Disable notifications to prevent emails during payment testing.
                    </p>
                  </div>
                </div>
              )}

              {/* Writer Tour Hub Section */}
              {activeSection === 'tourhub' && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
                      <Plane className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">My Tour Profile</h2>
                      <p className="text-text-muted text-sm">Customize your public profile</p>
                    </div>
                  </div>

                  {/* Profile Photo Section */}
                  <div className="mb-8 bg-white/[0.04] rounded-xl border border-white/[0.08] p-6">
                    <label className="block text-sm font-medium text-text-secondary mb-4">
                      Profile Photo
                    </label>
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full overflow-hidden bg-white/10 flex items-center justify-center">
                          {profilePhotoUrl ? (
                            <img
                              src={profilePhotoUrl}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-3xl font-bold text-white/40">
                              {user?.firstName?.[0]}{user?.lastName?.[0]}
                            </span>
                          )}
                        </div>
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
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
                          className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <Camera className="w-4 h-4" />
                          {profilePhotoUrl ? 'Change Photo' : 'Upload Photo'}
                        </button>
                        {profilePhotoUrl && (
                          <button
                            type="button"
                            onClick={handleDeletePhoto}
                            disabled={isUploadingPhoto}
                            className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-text-muted mt-2">
                      Recommended: Square image, at least 200x200px. Max 2MB.
                    </p>
                  </div>

                  <form onSubmit={handleTourHubSubmit} className="space-y-6">
                    {/* Profile URL / Slug */}
                    <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-6">
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Profile URL
                      </label>
                      <div className="flex gap-3">
                        <div className="flex-1 flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                          <span className="text-text-muted">{window.location.origin}/writer/</span>
                          <input
                            type="text"
                            value={tourHubForm.profileSlug}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, profileSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                            placeholder="your-name"
                            className="flex-1 bg-transparent text-white focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={generateSlug}
                          className="px-4 py-2 bg-white/10 text-text-secondary rounded-lg hover:bg-white/20 transition-colors text-sm"
                        >
                          Generate
                        </button>
                        {tourHubForm.profileSlug && (
                          <button
                            type="button"
                            onClick={copyProfileUrl}
                            className="px-4 py-2 bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors flex items-center gap-2"
                          >
                            {slugCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {slugCopied ? 'Copied!' : 'Copy'}
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-2">
                        Only lowercase letters, numbers, and hyphens allowed
                      </p>
                      {tourHubForm.profileSlug && (
                        <a
                          href={`/writer/${tourHubForm.profileSlug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-300 mt-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Preview your public profile
                        </a>
                      )}
                    </div>

                    {/* Public Profile Toggle */}
                    <div className="flex items-center justify-between p-4 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                      <div>
                        <h3 className="text-white font-medium">Make Profile Public</h3>
                        <p className="text-sm text-text-muted">Allow anyone to view your Writer Tour Hub profile</p>
                      </div>
                      <Switch
                        checked={tourHubForm.isPublicProfile}
                        onCheckedChange={(checked) => setTourHubForm({ ...tourHubForm, isPublicProfile: checked })}
                      />
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Bio
                      </label>
                      <textarea
                        value={tourHubForm.bio}
                        onChange={(e) => setTourHubForm({ ...tourHubForm, bio: e.target.value })}
                        placeholder="Tell people about yourself, your music journey, achievements..."
                        rows={4}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50 resize-none"
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        value={tourHubForm.location}
                        onChange={(e) => setTourHubForm({ ...tourHubForm, location: e.target.value })}
                        placeholder="e.g., Los Angeles, CA"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                      />
                    </div>

                    {/* Social Links */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white">Social & Web Links</h3>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-2">
                          <Globe className="w-4 h-4" />
                          Website
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.website}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, website: e.target.value })}
                          placeholder="https://yourwebsite.com"
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                        />
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-green-400 mb-2">
                          <Music className="w-4 h-4" />
                          Spotify Artist URL
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.spotifyArtistUrl}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, spotifyArtistUrl: e.target.value })}
                          placeholder="https://open.spotify.com/artist/..."
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-green-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-pink-400 mb-2">
                            <Instagram className="w-4 h-4" />
                            Instagram
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-text-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.instagramHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, instagramHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-sky-400 mb-2">
                            <Twitter className="w-4 h-4" />
                            Twitter / X
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-text-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.twitterHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, twitterHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
                          <Linkedin className="w-4 h-4" />
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          value={tourHubForm.linkedinUrl}
                          onChange={(e) => setTourHubForm({ ...tourHubForm, linkedinUrl: e.target.value })}
                          placeholder="https://linkedin.com/in/..."
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                            <Smartphone className="w-4 h-4" />
                            TikTok
                          </label>
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
                            <span className="text-text-muted">@</span>
                            <input
                              type="text"
                              value={tourHubForm.tiktokHandle}
                              onChange={(e) => setTourHubForm({ ...tourHubForm, tiktokHandle: e.target.value.replace('@', '') })}
                              placeholder="username"
                              className="flex-1 bg-transparent text-white focus:outline-none"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-red-400 mb-2">
                            <Youtube className="w-4 h-4" />
                            YouTube Channel
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.youtubeChannelUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, youtubeChannelUrl: e.target.value })}
                            placeholder="https://youtube.com/@..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-red-500/50"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-rose-400 mb-2">
                            <Music className="w-4 h-4" />
                            Apple Music
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.appleMusicUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, appleMusicUrl: e.target.value })}
                            placeholder="https://music.apple.com/artist/..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-rose-500/50"
                          />
                        </div>

                        <div>
                          <label className="flex items-center gap-2 text-sm font-medium text-orange-400 mb-2">
                            <CloudRain className="w-4 h-4" />
                            SoundCloud
                          </label>
                          <input
                            type="url"
                            value={tourHubForm.soundcloudUrl}
                            onChange={(e) => setTourHubForm({ ...tourHubForm, soundcloudUrl: e.target.value })}
                            placeholder="https://soundcloud.com/..."
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Info Box */}
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <Info className="w-4 h-4 text-purple-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-300 mb-1">About Your Public Profile</p>
                          <p className="text-sm text-purple-200/80">
                            Your public profile showcases your placements, achievements, and Tour Miles.
                            Share your profile URL with others to show off your success!
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                      <button
                        type="submit"
                        disabled={updateTourHubMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed transition-colors"
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
                  <h2 className="text-2xl font-bold text-white mb-6">Producer Tour Publishers</h2>
                  <p className="text-text-muted mb-6">
                    Manage your Producer Tour publisher IPIs. These are used for MLC statement matching to identify which writers use Producer Tour as their publisher.
                  </p>

                  {/* Add/Edit Publisher Form */}
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {isEditing ? 'Edit Publisher' : 'Add New Publisher'}
                    </h3>
                    <form onSubmit={handlePublisherSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            Publisher Name *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.publisherName}
                            onChange={(e) => setPublisherForm({ ...publisherForm, publisherName: e.target.value })}
                            placeholder="e.g., Producer Tour ASCAP"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-text-secondary mb-2">
                            IPI Number *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.ipiNumber}
                            onChange={(e) => setPublisherForm({ ...publisherForm, ipiNumber: e.target.value })}
                            placeholder="e.g., 1266292635"
                            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={publisherForm.notes}
                          onChange={(e) => setPublisherForm({ ...publisherForm, notes: e.target.value })}
                          placeholder="Additional notes..."
                          rows={2}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
                        />
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id="isActive"
                            checked={publisherForm.isActive}
                            onCheckedChange={(checked) => setPublisherForm({ ...publisherForm, isActive: checked as boolean })}
                          />
                          <label htmlFor="isActive" className="text-sm text-text-secondary cursor-pointer">
                            Active
                          </label>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={createPublisherMutation.isPending || updatePublisherMutation.isPending}
                          className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-white/20 disabled:cursor-not-allowed transition-colors"
                        >
                          {isEditing ? 'Update Publisher' : 'Add Publisher'}
                        </button>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-6 py-2 bg-white/20 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </div>

                  {/* Publishers List */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white mb-4">Configured Publishers</h3>
                    {!publishersData?.data?.publishers?.length ? (
                      <div className="text-center py-8 text-text-muted">
                        No publishers configured yet. Add one above to get started.
                      </div>
                    ) : (
                      publishersData.data.publishers.map((publisher: any) => (
                        <div
                          key={publisher.id}
                          className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-white font-medium">{publisher.publisherName}</h4>
                              <span className={`px-2 py-1 rounded text-xs ${
                                publisher.isActive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-text-muted'
                              }`}>
                                {publisher.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-text-muted mt-1">IPI: {publisher.ipiNumber}</p>
                            {publisher.notes && (
                              <p className="text-sm text-text-muted mt-1">{publisher.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPublisher(publisher)}
                              className="px-4 py-2 text-sm bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              Edit
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button
                                  disabled={deletePublisherMutation.isPending}
                                  className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
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
                                    className="bg-red-500 hover:bg-red-600"
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
                  <h2 className="text-2xl font-bold text-white mb-6">System Settings</h2>
                  <p className="text-text-muted mb-8">Configure system-wide settings that affect all users</p>

                  <div className="space-y-6">
                    {/* Minimum Withdrawal Amount */}
                    <div className="bg-white/[0.04] rounded-xl border border-white/[0.08] p-6">
                      <label className="block text-sm font-medium text-text-secondary mb-4">
                        Minimum Withdrawal Amount
                      </label>
                      <p className="text-sm text-text-muted mb-4">
                        Set the minimum amount writers must have in their available balance before they can request a withdrawal.
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-xs">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted">$</span>
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
                            className="w-full pl-8 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                          />
                        </div>
                        <button
                          onClick={handleSystemSettingsUpdate}
                          disabled={updateSystemSettingsMutation.isPending}
                          className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {updateSystemSettingsMutation.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                      <p className="text-xs text-text-muted mt-2">
                        Current: ${systemSettings.minimumWithdrawalAmount.toFixed(2)} • Recommended: $50.00 - $100.00
                      </p>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                          <Info className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-300 mb-1">About System Settings</p>
                          <p className="text-sm text-blue-200/80">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
