import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Search, Edit, Trash2, Building2, Mail, Phone, MapPin, User } from 'lucide-react';
import { getAuthToken } from '../../lib/api';

interface Contact {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  category: 'label' | 'publisher' | 'distributor' | 'attorney' | 'manager' | 'other';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const ContactsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA',
    category: 'label' as Contact['category'],
    notes: '',
  });

  // Fetch contacts
  const { data: contactsData, isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/contacts`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) {
        // Return empty array if endpoint doesn't exist yet
        if (response.status === 404) {
          return { contacts: [] };
        }
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  const contacts: Contact[] = contactsData?.contacts || [];

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`${API_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact created successfully!');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create contact');
    },
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await fetch(`${API_URL}/api/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact updated successfully!');
      handleCloseModal();
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update contact');
    },
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_URL}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) throw new Error('Failed to delete contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete contact');
    },
  });

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingContact(null);
    setFormData({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'USA',
      category: 'label',
      notes: '',
    });
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setFormData({
      companyName: contact.companyName || '',
      contactName: contact.contactName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zipCode: contact.zipCode || '',
      country: contact.country || 'USA',
      category: contact.category || 'label',
      notes: contact.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName && !formData.contactName) {
      toast.error('Please enter a company name or contact name');
      return;
    }
    if (editingContact) {
      updateMutation.mutate({ id: editingContact.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  // Filter contacts
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'label': return 'bg-[#f0e226]/15 text-[#f0e226] border-[#f0e226]/30';
      case 'publisher': return 'bg-[#f0e226]/15 text-[#f0e226] border-[#f0e226]/30';
      case 'distributor': return 'bg-[#f0e226]/15 text-[#f0e226] border-[#f0e226]/30';
      case 'attorney': return 'bg-[#f0e226]/15 text-[#f0e226] border-[#f0e226]/30';
      case 'manager': return 'bg-[#f0e226]/15 text-[#f0e226] border-[#f0e226]/30';
      default: return 'bg-white/10 text-white/60 border-white/10';
    }
  };

  const inputClass = "block w-full py-2.5 px-3 bg-black border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226]/50";
  const labelClass = "block mb-1 text-xs font-medium text-white/40 uppercase tracking-[0.2em]";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white">Contacts</h1>
          <p className="text-sm text-white/40 mt-1">Manage label contacts, publishers, and billing recipients</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0e226] text-black text-sm font-medium hover:bg-[#f0e226]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Contact
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${inputClass} pl-10`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${inputClass} w-full sm:w-48`}
        >
          <option value="all">All Categories</option>
          <option value="label">Labels</option>
          <option value="publisher">Publishers</option>
          <option value="distributor">Distributors</option>
          <option value="attorney">Attorneys</option>
          <option value="manager">Managers</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-[#19181a] border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center py-12 bg-[#19181a] border border-white/5">
          <Building2 className="w-12 h-12 mx-auto text-[#f0e226]/30 mb-4" />
          <h3 className="text-lg font-normal text-white mb-2">No contacts found</h3>
          <p className="text-sm text-white/40 mb-4">
            {searchQuery || categoryFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Add your first contact to get started'}
          </p>
          {!searchQuery && categoryFilter === 'all' && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0e226] text-black text-sm font-medium hover:bg-[#f0e226]/90"
            >
              <Plus className="w-4 h-4" />
              Add Contact
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="group relative overflow-hidden bg-[#19181a] border border-white/5 p-5 hover:border-[#f0e226]/30 transition-all duration-300"
            >
              <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-white truncate">
                    {contact.companyName || contact.contactName}
                  </h3>
                  {contact.companyName && contact.contactName && (
                    <p className="text-sm text-white/40 flex items-center gap-1 mt-1">
                      <User className="w-3 h-3" />
                      {contact.contactName}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-0.5 text-xs font-medium border ${getCategoryColor(contact.category)}`}>
                  {contact.category}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Mail className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <a href={`mailto:${contact.email}`} className="truncate hover:text-[#f0e226]">
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Phone className="w-4 h-4 text-white/30 flex-shrink-0" />
                    <a href={`tel:${contact.phone}`} className="hover:text-[#f0e226]">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {(contact.address || contact.city) && (
                  <div className="flex items-start gap-2 text-white/60">
                    <MapPin className="w-4 h-4 text-white/30 flex-shrink-0 mt-0.5" />
                    <span className="truncate">
                      {[contact.address, contact.city, contact.state, contact.zipCode]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                )}
              </div>

              {contact.notes && (
                <p className="mt-3 text-xs text-white/30 line-clamp-2">{contact.notes}</p>
              )}

              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/5">
                <button
                  onClick={() => handleEdit(contact)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white/60 hover:text-[#f0e226] hover:bg-[#f0e226]/10 transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(contact.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative bg-[#19181a] p-6 shadow-xl border border-white/5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <h2 className="text-xl font-light text-white mb-6">
              {editingContact ? 'Edit Contact' : 'Add New Contact'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., Universal Music Group"
                  />
                </div>
                <div>
                  <label className={labelClass}>Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className={inputClass}
                    placeholder="e.g., John Smith"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={inputClass}
                    placeholder="contact@label.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className={inputClass}
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as Contact['category'] })}
                  className={inputClass}
                >
                  <option value="label">Label</option>
                  <option value="publisher">Publisher</option>
                  <option value="distributor">Distributor</option>
                  <option value="attorney">Attorney</option>
                  <option value="manager">Manager</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Street Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className={inputClass}
                  placeholder="123 Music Row"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-2 md:col-span-1">
                  <label className={labelClass}>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className={inputClass}
                    placeholder="Nashville"
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className={inputClass}
                    placeholder="TN"
                  />
                </div>
                <div>
                  <label className={labelClass}>ZIP Code</label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    className={inputClass}
                    placeholder="37203"
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className={inputClass}
                    placeholder="USA"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={inputClass}
                  rows={3}
                  placeholder="Additional notes about this contact..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-[#f0e226] text-black text-sm font-medium hover:bg-[#f0e226]/90 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingContact ? 'Update Contact' : 'Add Contact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsTab;
