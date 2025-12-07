import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Loader2, Users, UserPlus, Check, XIcon, MessageCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { socialContactsApi } from '../../lib/api';

interface ContactsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Contact {
  id: string;
  contactId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  contactUser?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profilePhotoUrl?: string;
    profileSlug?: string;
  };
  isOnline?: boolean;
}

interface ContactRequest {
  id: string;
  userId: string;
  status: 'PENDING';
  requester?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profilePhotoUrl?: string;
    profileSlug?: string;
  };
}

export function ContactsModal({ isOpen, onClose }: ContactsModalProps) {
  const [activeTab, setActiveTab] = useState<'contacts' | 'requests'>('contacts');
  const queryClient = useQueryClient();

  // Fetch contacts
  const { data: contactsData, isLoading: contactsLoading } = useQuery({
    queryKey: ['social-contacts'],
    queryFn: async () => {
      const response = await socialContactsApi.getContacts();
      return response.data.contacts || response.data || [];
    },
    enabled: isOpen,
  });

  // Fetch pending requests
  const { data: requestsData, isLoading: requestsLoading } = useQuery({
    queryKey: ['social-contacts-requests'],
    queryFn: async () => {
      const response = await socialContactsApi.getRequests();
      return response.data || [];
    },
    enabled: isOpen,
  });

  // Accept request mutation
  const acceptMutation = useMutation({
    mutationFn: (contactId: string) => socialContactsApi.acceptRequest(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['social-contacts-requests'] });
      toast.success('Contact request accepted!');
    },
    onError: () => {
      toast.error('Failed to accept request');
    },
  });

  // Decline request mutation
  const declineMutation = useMutation({
    mutationFn: (contactId: string) => socialContactsApi.removeContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-contacts'] });
      queryClient.invalidateQueries({ queryKey: ['social-contacts-requests'] });
      toast.success('Request declined');
    },
    onError: () => {
      toast.error('Failed to decline request');
    },
  });

  // Remove contact mutation
  const removeMutation = useMutation({
    mutationFn: (contactId: string) => socialContactsApi.removeContact(contactId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-contacts'] });
      toast.success('Contact removed');
    },
    onError: () => {
      toast.error('Failed to remove contact');
    },
  });

  const contacts: Contact[] = contactsData || [];
  const requests: ContactRequest[] = requestsData || [];

  // Filter to only show accepted contacts
  const acceptedContacts = contacts.filter(c => c.status === 'ACCEPTED');
  const pendingRequestsCount = requests.length;

  const handleStartChat = (contactUser: Contact['contactUser']) => {
    if (contactUser) {
      // Navigate to chat or open chat widget
      // For now, close modal - the chat widget can be opened separately
      onClose();
      toast.success(`Opening chat with ${contactUser.firstName}`);
    }
  };

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
                    My Contacts
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
                    onClick={() => setActiveTab('contacts')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'contacts'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Contacts ({acceptedContacts.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                      activeTab === 'requests'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Requests
                    {pendingRequestsCount > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-medium bg-red-500 text-white rounded-full">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="max-h-96 overflow-y-auto">
                  {(contactsLoading || requestsLoading) && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                  )}

                  {!contactsLoading && !requestsLoading && (
                    <div className="px-4 py-2">
                      {/* Contacts Tab */}
                      {activeTab === 'contacts' && acceptedContacts.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <Users className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="text-sm font-medium">No contacts yet</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Add friends using the chat widget
                          </p>
                        </div>
                      )}

                      {activeTab === 'contacts' &&
                        acceptedContacts.map((contact) => {
                          const user = contact.contactUser;
                          if (!user) return null;

                          return (
                            <div
                              key={contact.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Link
                                to={user.profileSlug ? `/user/${user.profileSlug}` : `/user/id/${user.id}`}
                                onClick={onClose}
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                  {user.profilePhotoUrl ? (
                                    <img
                                      src={user.profilePhotoUrl}
                                      alt={`${user.firstName} ${user.lastName}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                      {user.firstName?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                  {contact.isOnline && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {user.email}
                                  </p>
                                </div>
                              </Link>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleStartChat(user)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Start chat"
                                >
                                  <MessageCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => removeMutation.mutate(contact.contactId)}
                                  disabled={removeMutation.isPending}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove contact"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {/* Requests Tab */}
                      {activeTab === 'requests' && requests.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                          <UserPlus className="w-12 h-12 mb-3 text-gray-400" />
                          <p className="text-sm font-medium">No pending requests</p>
                          <p className="text-xs text-gray-400 mt-1">
                            When someone sends you a friend request, it will appear here
                          </p>
                        </div>
                      )}

                      {activeTab === 'requests' &&
                        requests.map((request) => {
                          const user = request.requester;
                          if (!user) return null;

                          return (
                            <div
                              key={request.id}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <Link
                                to={user.profileSlug ? `/user/${user.profileSlug}` : `/user/id/${user.id}`}
                                onClick={onClose}
                                className="flex items-center gap-3 flex-1 min-w-0"
                              >
                                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                                  {user.profilePhotoUrl ? (
                                    <img
                                      src={user.profilePhotoUrl}
                                      alt={`${user.firstName} ${user.lastName}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                      {user.firstName?.charAt(0) || 'U'}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-900 truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Wants to connect
                                  </p>
                                </div>
                              </Link>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => acceptMutation.mutate(user.id)}
                                  disabled={acceptMutation.isPending}
                                  className="p-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                                  title="Accept"
                                >
                                  <Check className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => declineMutation.mutate(user.id)}
                                  disabled={declineMutation.isPending}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Decline"
                                >
                                  <XIcon className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
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
