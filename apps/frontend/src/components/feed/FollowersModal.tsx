import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { feedApi } from '../../lib/api';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab: 'followers' | 'following';
  userName?: string;
}

export function FollowersModal({ isOpen, onClose, userId, initialTab, userName }: FollowersModalProps) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(initialTab);

  // Fetch followers
  const { data: followersData, isLoading: followersLoading } = useQuery({
    queryKey: ['followers', userId],
    queryFn: async () => {
      const response = await feedApi.getFollowers(userId, { limit: 100 });
      return response.data.followers || [];
    },
    enabled: isOpen && activeTab === 'followers',
  });

  // Fetch following
  const { data: followingData, isLoading: followingLoading } = useQuery({
    queryKey: ['following', userId],
    queryFn: async () => {
      const response = await feedApi.getFollowing(userId, { limit: 100 });
      return response.data.following || [];
    },
    enabled: isOpen && activeTab === 'following',
  });

  const followers = followersData || [];
  const following = followingData || [];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    {userName ? `${userName}'s Connections` : 'Connections'}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('followers')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'followers'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Followers ({followers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('following')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'following'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Following ({following.length})
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto">
                  {(followersLoading || followingLoading) && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                  )}

                  {!followersLoading && !followingLoading && (
                    <div className="px-4 py-2">
                      {activeTab === 'followers' && followers.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <Users className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="text-sm">No followers yet</p>
                        </div>
                      )}

                      {activeTab === 'following' && following.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <Users className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="text-sm">Not following anyone yet</p>
                        </div>
                      )}

                      {activeTab === 'followers' &&
                        followers.map((user: any) => (
                          <Link
                            key={user.id}
                            to={user.profileSlug ? `/user/${user.profileSlug}` : `/user/id/${user.id}`}
                            onClick={onClose}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                              {user.profilePhotoUrl ? (
                                <img
                                  src={user.profilePhotoUrl}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                                  {user.firstName?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              {user.gamificationPoints?.tier && (
                                <p className="text-xs text-purple-600">{user.gamificationPoints.tier}</p>
                              )}
                            </div>
                          </Link>
                        ))}

                      {activeTab === 'following' &&
                        following.map((user: any) => (
                          <Link
                            key={user.id}
                            to={user.profileSlug ? `/user/${user.profileSlug}` : `/user/id/${user.id}`}
                            onClick={onClose}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                              {user.profilePhotoUrl ? (
                                <img
                                  src={user.profilePhotoUrl}
                                  alt={`${user.firstName} ${user.lastName}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                                  {user.firstName?.charAt(0) || 'U'}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">
                                {user.firstName} {user.lastName}
                              </p>
                              {user.gamificationPoints?.tier && (
                                <p className="text-xs text-purple-600">{user.gamificationPoints.tier}</p>
                              )}
                            </div>
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
