import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, settingsApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import Navigation from '../components/Navigation';
import AdminGuide from '../components/AdminGuide';

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'notifications' | 'publishers' | 'documentation'>('profile');
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
    if (confirm('Are you sure you want to delete this publisher?')) {
      deletePublisherMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Navigation />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
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
            <nav className="bg-slate-800 rounded-lg p-2 space-y-1">
              <button
                onClick={() => setActiveSection('profile')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'profile'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-300 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>👤</span>
                  <span className="font-medium">Profile</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('password')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'password'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-300 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>🔒</span>
                  <span className="font-medium">Password</span>
                </div>
              </button>
              <button
                onClick={() => setActiveSection('notifications')}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === 'notifications'
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-gray-300 hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span>🔔</span>
                  <span className="font-medium">Notifications</span>
                </div>
              </button>
              {user?.role === 'ADMIN' && (
                <>
                  <button
                    onClick={() => setActiveSection('publishers')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === 'publishers'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-gray-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>🏢</span>
                      <span className="font-medium">Publishers</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveSection('documentation')}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      activeSection === 'documentation'
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-gray-300 hover:bg-slate-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>📚</span>
                      <span className="font-medium">Documentation</span>
                    </div>
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-lg p-6">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Profile Information</h2>
                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          First Name
                        </label>
                        <input
                          type="text"
                          value={profileData.firstName}
                          onChange={(e) => setProfileData({ ...profileData, firstName: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Last Name
                        </label>
                        <input
                          type="text"
                          value={profileData.lastName}
                          onChange={(e) => setProfileData({ ...profileData, lastName: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    {/* Writer IPI - only for WRITER role */}
                    {user?.role === 'WRITER' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Writer IPI Number
                        </label>
                        <input
                          type="text"
                          value={profileData.writerIpiNumber}
                          onChange={(e) => setProfileData({ ...profileData, writerIpiNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          placeholder="Enter your Writer IPI/CAE number"
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          Your Writer IPI number is used for songwriter identification
                        </p>
                      </div>
                    )}

                    {/* Publisher IPI - for WRITER and PUBLISHER roles */}
                    {(user?.role === 'WRITER' || user?.role === 'PUBLISHER') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Publisher IPI Number
                        </label>
                        <input
                          type="text"
                          value={profileData.publisherIpiNumber}
                          onChange={(e) => setProfileData({ ...profileData, publisherIpiNumber: e.target.value })}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                          placeholder="Enter your Publisher IPI/CAE number"
                        />
                        <p className="text-sm text-gray-400 mt-1">
                          Your Publisher IPI number is used for publishing identification
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-700">
                      <button
                        type="submit"
                        disabled={updateProfileMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Password Section */}
              {activeSection === 'password' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Change Password</h2>
                  <form onSubmit={handlePasswordSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                      <p className="text-sm text-gray-400 mt-1">
                        Password must be at least 6 characters
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-700">
                      <button
                        type="submit"
                        disabled={updatePasswordMutation.isPending}
                        className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                      >
                        {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">Email Notifications</h3>
                        <p className="text-sm text-gray-400">Receive email updates about new statements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">Statement Notifications</h3>
                        <p className="text-sm text-gray-400">Get notified when new statements are published</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                      <div>
                        <h3 className="text-white font-medium">Monthly Summary</h3>
                        <p className="text-sm text-gray-400">Receive monthly earning summaries</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                      </label>
                    </div>

                    <p className="text-sm text-gray-400 pt-4">
                      Note: Notification preferences are currently for display only. Email functionality will be enabled once SMTP is configured.
                    </p>
                  </div>
                </div>
              )}

              {/* Publishers Section (Admin Only) */}
              {activeSection === 'publishers' && user?.role === 'ADMIN' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Producer Tour Publishers</h2>
                  <p className="text-gray-400 mb-6">
                    Manage your Producer Tour publisher IPIs. These are used for MLC statement matching to identify which writers use Producer Tour as their publisher.
                  </p>

                  {/* Add/Edit Publisher Form */}
                  <div className="bg-slate-700/30 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      {isEditing ? 'Edit Publisher' : 'Add New Publisher'}
                    </h3>
                    <form onSubmit={handlePublisherSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Publisher Name *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.publisherName}
                            onChange={(e) => setPublisherForm({ ...publisherForm, publisherName: e.target.value })}
                            placeholder="e.g., Producer Tour ASCAP"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            IPI Number *
                          </label>
                          <input
                            type="text"
                            value={publisherForm.ipiNumber}
                            onChange={(e) => setPublisherForm({ ...publisherForm, ipiNumber: e.target.value })}
                            placeholder="e.g., 1266292635"
                            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Notes (Optional)
                        </label>
                        <textarea
                          value={publisherForm.notes}
                          onChange={(e) => setPublisherForm({ ...publisherForm, notes: e.target.value })}
                          placeholder="Additional notes..."
                          rows={2}
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                        />
                      </div>
                      {isEditing && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={publisherForm.isActive}
                            onChange={(e) => setPublisherForm({ ...publisherForm, isActive: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <label htmlFor="isActive" className="text-sm text-gray-300">
                            Active
                          </label>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={createPublisherMutation.isPending || updatePublisherMutation.isPending}
                          className="px-6 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                        >
                          {isEditing ? 'Update Publisher' : 'Add Publisher'}
                        </button>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-6 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
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
                      <div className="text-center py-8 text-gray-400">
                        No publishers configured yet. Add one above to get started.
                      </div>
                    ) : (
                      publishersData.data.publishers.map((publisher: any) => (
                        <div
                          key={publisher.id}
                          className="bg-slate-700/30 rounded-lg p-4 flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h4 className="text-white font-medium">{publisher.publisherName}</h4>
                              <span className={`px-2 py-1 rounded text-xs ${
                                publisher.isActive
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-500/20 text-gray-400'
                              }`}>
                                {publisher.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">IPI: {publisher.ipiNumber}</p>
                            {publisher.notes && (
                              <p className="text-sm text-gray-500 mt-1">{publisher.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPublisher(publisher)}
                              className="px-4 py-2 text-sm bg-primary-500/20 text-primary-400 rounded-lg hover:bg-primary-500/30 transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePublisher(publisher.id)}
                              disabled={deletePublisherMutation.isPending}
                              className="px-4 py-2 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
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
