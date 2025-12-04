import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Users, MessageCircle, User as UserIcon, Loader2, Mail, Phone } from 'lucide-react';
import { api } from '../../lib/api';

interface Contact {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  profilePhotoUrl: string | null;
  profileSlug: string | null;
  phone: string | null;
  gamificationPoints?: {
    tier: string;
  } | null;
}

export function ContactsView() {
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user's contacts
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', searchQuery],
    queryFn: async () => {
      const params: any = {};
      if (searchQuery) params.search = searchQuery;

      const response = await api.get('/contacts', { params });
      return response.data;
    },
  });

  // Handle both array response and object with contacts property (for mock data)
  const contacts = Array.isArray(data) ? data : (data?.contacts || []);

  // Filter contacts by search query (client-side backup)
  const filteredContacts = searchQuery
    ? contacts.filter((contact: Contact) => {
        const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
        const email = contact.email.toLowerCase();
        const query = searchQuery.toLowerCase();
        return fullName.includes(query) || email.includes(query);
      })
    : contacts;

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              My Contacts
            </h2>
            <p className="text-sm text-gray-600">
              {filteredContacts.length} {filteredContacts.length === 1 ? 'contact' : 'contacts'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
          />
        </div>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="text-red-600 mb-2 font-semibold">Failed to load contacts</div>
          <div className="text-sm text-gray-600">
            {(error as any)?.message || 'Please try again later'}
          </div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {searchQuery ? 'No Contacts Found' : 'No Contacts Yet'}
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Start connecting with other producers and writers to build your network!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact: Contact) => {
            const fullName =
              contact.firstName && contact.lastName
                ? `${contact.firstName} ${contact.lastName}`
                : contact.firstName || contact.lastName || 'User';

            return (
              <div
                key={contact.id}
                className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all group"
              >
                <div className="p-6">
                  {/* Avatar and Name */}
                  <div className="flex items-center gap-4 mb-4">
                    {contact.profilePhotoUrl ? (
                      <img
                        src={contact.profilePhotoUrl}
                        alt={fullName}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-white text-xl font-semibold">
                        {contact.firstName?.charAt(0) || 'U'}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
                        {fullName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          {contact.role}
                        </span>
                        {contact.gamificationPoints?.tier && (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-600">
                            {contact.gamificationPoints.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <a
                        href={`mailto:${contact.email}`}
                        className="truncate hover:text-purple-600 transition-colors"
                      >
                        {contact.email}
                      </a>
                    </div>
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <a
                          href={`tel:${contact.phone}`}
                          className="hover:text-purple-600 transition-colors"
                        >
                          {contact.phone}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {contact.profileSlug && (
                      <Link
                        to={`/user/${contact.profileSlug}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Profile</span>
                      </Link>
                    )}
                    <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                      <MessageCircle className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
