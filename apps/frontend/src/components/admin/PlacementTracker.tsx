import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { placementDealApi } from '../../lib/api';
import {
  Plus,
  Search,
  FileText,
  DollarSign,
  Edit,
  Trash2,
  Download,
  X,
  Check,
  Clock,
  Briefcase,
  Users,
} from 'lucide-react';

interface PlacementDeal {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientCompany?: string;
  clientPhone?: string;
  projectTitle: string;
  dealType: string;
  status: string;
  dealAmount?: number;
  commissionRate?: number;
  netAmount?: number;
  dealDate?: string;
  startDate?: string;
  endDate?: string;
  signedDate?: string;
  contractSigned: boolean;
  contractUrl?: string;
  legalNotes?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoicePaid: boolean;
  invoicePaidDate?: string;
  invoiceUrl?: string;
  trackTitle?: string;
  artistName?: string;
  projectType?: string;
  usageRights?: string;
  territory?: string;
  term?: string;
  notes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PlacementFormData {
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  clientPhone: string;
  projectTitle: string;
  dealType: string;
  status: string;
  dealAmount: string;
  commissionRate: string;
  dealDate: string;
  startDate: string;
  endDate: string;
  contractSigned: boolean;
  trackTitle: string;
  artistName: string;
  projectType: string;
  usageRights: string;
  territory: string;
  term: string;
  notes: string;
  internalNotes: string;
}

const DEAL_TYPES = [
  { value: 'SYNC_LICENSE', label: 'Sync License' },
  { value: 'MASTER_LICENSE', label: 'Master License' },
  { value: 'PUBLISHING_DEAL', label: 'Publishing Deal' },
  { value: 'PRODUCTION_DEAL', label: 'Production Deal' },
  { value: 'CUSTOM', label: 'Custom' },
  { value: 'OTHER', label: 'Other' },
];

const DEAL_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'gray' },
  { value: 'NEGOTIATING', label: 'Negotiating', color: 'yellow' },
  { value: 'CONTRACTED', label: 'Contracted', color: 'blue' },
  { value: 'ACTIVE', label: 'Active', color: 'green' },
  { value: 'COMPLETED', label: 'Completed', color: 'purple' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' },
];

export const PlacementTracker: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dealTypeFilter, setDealTypeFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState<PlacementDeal | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<PlacementDeal | null>(null);

  const [formData, setFormData] = useState<PlacementFormData>({
    clientName: '',
    clientEmail: '',
    clientCompany: '',
    clientPhone: '',
    projectTitle: '',
    dealType: 'SYNC_LICENSE',
    status: 'DRAFT',
    dealAmount: '',
    commissionRate: '15',
    dealDate: '',
    startDate: '',
    endDate: '',
    contractSigned: false,
    trackTitle: '',
    artistName: '',
    projectType: '',
    usageRights: '',
    territory: 'Worldwide',
    term: 'Perpetuity',
    notes: '',
    internalNotes: '',
  });

  // Fetch all deals
  const { data: dealsData, isLoading } = useQuery({
    queryKey: ['placement-deals', statusFilter, dealTypeFilter, searchTerm],
    queryFn: async () => {
      const response = await placementDealApi.getAll({
        status: statusFilter || undefined,
        dealType: dealTypeFilter || undefined,
        search: searchTerm || undefined,
      });
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['placement-deals-stats'],
    queryFn: async () => {
      const response = await placementDealApi.getStats();
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => placementDealApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      queryClient.invalidateQueries({ queryKey: ['placement-deals-stats'] });
      setShowForm(false);
      resetForm();
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => placementDealApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      queryClient.invalidateQueries({ queryKey: ['placement-deals-stats'] });
      setShowForm(false);
      setEditingDeal(null);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => placementDealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      queryClient.invalidateQueries({ queryKey: ['placement-deals-stats'] });
    },
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: (id: string) => placementDealApi.generateInvoice(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      setSelectedDeal(response.data);
      setShowInvoiceModal(true);
    },
  });

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientEmail: '',
      clientCompany: '',
      clientPhone: '',
      projectTitle: '',
      dealType: 'SYNC_LICENSE',
      status: 'DRAFT',
      dealAmount: '',
      commissionRate: '15',
      dealDate: '',
      startDate: '',
      endDate: '',
      contractSigned: false,
      trackTitle: '',
      artistName: '',
      projectType: '',
      usageRights: '',
      territory: 'Worldwide',
      term: 'Perpetuity',
      notes: '',
      internalNotes: '',
    });
  };

  const handleEdit = (deal: PlacementDeal) => {
    setEditingDeal(deal);
    setFormData({
      clientName: deal.clientName || '',
      clientEmail: deal.clientEmail || '',
      clientCompany: deal.clientCompany || '',
      clientPhone: deal.clientPhone || '',
      projectTitle: deal.projectTitle || '',
      dealType: deal.dealType || 'SYNC_LICENSE',
      status: deal.status || 'DRAFT',
      dealAmount: deal.dealAmount?.toString() || '',
      commissionRate: deal.commissionRate?.toString() || '15',
      dealDate: deal.dealDate ? new Date(deal.dealDate).toISOString().split('T')[0] : '',
      startDate: deal.startDate ? new Date(deal.startDate).toISOString().split('T')[0] : '',
      endDate: deal.endDate ? new Date(deal.endDate).toISOString().split('T')[0] : '',
      contractSigned: deal.contractSigned || false,
      trackTitle: deal.trackTitle || '',
      artistName: deal.artistName || '',
      projectType: deal.projectType || '',
      usageRights: deal.usageRights || '',
      territory: deal.territory || 'Worldwide',
      term: deal.term || 'Perpetuity',
      notes: deal.notes || '',
      internalNotes: deal.internalNotes || '',
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this placement deal?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      dealAmount: formData.dealAmount ? parseFloat(formData.dealAmount) : null,
      commissionRate: formData.commissionRate ? parseFloat(formData.commissionRate) : null,
      dealDate: formData.dealDate || null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    };

    if (editingDeal) {
      updateMutation.mutate({ id: editingDeal.id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '$0.00';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = DEAL_STATUSES.find((s) => s.value === status);
    const color = statusConfig?.color || 'gray';
    const label = statusConfig?.label || status;

    const colorClasses = {
      gray: 'bg-gray-500/20 text-gray-400',
      yellow: 'bg-yellow-500/20 text-yellow-400',
      blue: 'bg-blue-500/20 text-blue-400',
      green: 'bg-green-500/20 text-green-400',
      purple: 'bg-purple-500/20 text-purple-400',
      red: 'bg-red-500/20 text-red-400',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colorClasses[color as keyof typeof colorClasses]}`}>
        {label}
      </span>
    );
  };

  const deals = dealsData?.deals || [];
  const stats = statsData || { totalDeals: 0, activeDeals: 0, totalRevenue: 0, pendingInvoices: 0 };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Deals</span>
            <Briefcase className="h-5 w-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalDeals}</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Active Deals</span>
            <Clock className="h-5 w-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.activeDeals}</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Revenue</span>
            <DollarSign className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalRevenue)}</div>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Pending Invoices</span>
            <FileText className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.pendingInvoices}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-slate-700/30 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search deals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {DEAL_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          <select
            value={dealTypeFilter}
            onChange={(e) => setDealTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            {DEAL_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Add Button */}
          <button
            onClick={() => {
              resetForm();
              setEditingDeal(null);
              setShowForm(true);
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Deals Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading placement deals...</div>
        </div>
      ) : deals.length === 0 ? (
        <div className="bg-slate-700/30 rounded-lg p-12 text-center">
          <Briefcase className="h-16 w-16 mx-auto mb-4 text-gray-500" />
          <h3 className="text-xl font-semibold text-white mb-2">No Placement Deals</h3>
          <p className="text-gray-400 mb-6">Get started by creating your first placement deal</p>
          <button
            onClick={() => {
              resetForm();
              setEditingDeal(null);
              setShowForm(true);
            }}
            className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create First Deal
          </button>
        </div>
      ) : (
        <div className="bg-slate-700/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Client / Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {deals.map((deal: PlacementDeal) => (
                  <tr key={deal.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{deal.clientName}</div>
                      <div className="text-sm text-gray-400">{deal.projectTitle}</div>
                      {deal.clientCompany && (
                        <div className="text-xs text-gray-500">{deal.clientCompany}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-medium">
                        {DEAL_TYPES.find((t) => t.value === deal.dealType)?.label || deal.dealType}
                      </span>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(deal.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-white font-semibold">{formatCurrency(deal.dealAmount)}</div>
                      {deal.netAmount && (
                        <div className="text-xs text-green-400">Net: {formatCurrency(deal.netAmount)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{formatDate(deal.dealDate)}</td>
                    <td className="px-6 py-4 text-center">
                      {deal.invoiceNumber ? (
                        <div>
                          <div className="text-xs text-gray-400">{deal.invoiceNumber}</div>
                          {deal.invoicePaid ? (
                            <span className="text-xs text-green-400 flex items-center justify-center gap-1">
                              <Check className="h-3 w-3" /> Paid
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-400 flex items-center justify-center gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </span>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => generateInvoiceMutation.mutate(deal.id)}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          Generate
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(deal)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeal(deal);
                            setShowInvoiceModal(true);
                          }}
                          className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded transition-colors"
                          title="View Invoice"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(deal.id)}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">
                {editingDeal ? 'Edit Placement Deal' : 'New Placement Deal'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Client Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Client Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Client Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.clientCompany}
                      onChange={(e) => setFormData({ ...formData, clientCompany: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Deal Details */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Deal Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Project Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.projectTitle}
                      onChange={(e) => setFormData({ ...formData, projectTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Deal Type</label>
                    <select
                      value={formData.dealType}
                      onChange={(e) => setFormData({ ...formData, dealType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      {DEAL_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    >
                      {DEAL_STATUSES.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Deal Amount ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.dealAmount}
                      onChange={(e) => setFormData({ ...formData, dealAmount: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Commission Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.commissionRate}
                      onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Deal Date</label>
                    <input
                      type="date"
                      value={formData.dealDate}
                      onChange={(e) => setFormData({ ...formData, dealDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.contractSigned}
                      onChange={(e) => setFormData({ ...formData, contractSigned: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    Contract Signed
                  </label>
                </div>
              </div>

              {/* Track Information */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Track & Project Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Track Title</label>
                    <input
                      type="text"
                      value={formData.trackTitle}
                      onChange={(e) => setFormData({ ...formData, trackTitle: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Artist Name</label>
                    <input
                      type="text"
                      value={formData.artistName}
                      onChange={(e) => setFormData({ ...formData, artistName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Project Type</label>
                    <input
                      type="text"
                      placeholder="Film, TV, Commercial, Game, etc."
                      value={formData.projectType}
                      onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Territory</label>
                    <input
                      type="text"
                      value={formData.territory}
                      onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Term</label>
                    <input
                      type="text"
                      value={formData.term}
                      onChange={(e) => setFormData({ ...formData, term: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Usage Rights</label>
                    <textarea
                      value={formData.usageRights}
                      onChange={(e) => setFormData({ ...formData, usageRights: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Notes</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Public Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Internal Notes (Admin Only)</label>
                    <textarea
                      value={formData.internalNotes}
                      onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingDeal ? 'Update Deal' : 'Create Deal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedDeal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Invoice Preview</h3>
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedDeal(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Invoice Content */}
            <div className="p-8 overflow-y-auto flex-1 bg-white text-black">
              <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">INVOICE</h1>
                    {selectedDeal.invoiceNumber && (
                      <p className="text-gray-600">Invoice #{selectedDeal.invoiceNumber}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">Producer Tour</p>
                    <p className="text-sm text-gray-600">Music Placement Services</p>
                  </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="font-semibold mb-2">Bill To:</h3>
                    <p className="font-medium">{selectedDeal.clientName}</p>
                    {selectedDeal.clientCompany && <p className="text-sm text-gray-600">{selectedDeal.clientCompany}</p>}
                    {selectedDeal.clientEmail && <p className="text-sm text-gray-600">{selectedDeal.clientEmail}</p>}
                    {selectedDeal.clientPhone && <p className="text-sm text-gray-600">{selectedDeal.clientPhone}</p>}
                  </div>
                  <div className="text-right">
                    <div className="mb-2">
                      <span className="text-sm text-gray-600">Invoice Date:</span>
                      <p className="font-medium">{formatDate(selectedDeal.invoiceDate || selectedDeal.createdAt)}</p>
                    </div>
                    {selectedDeal.dealDate && (
                      <div>
                        <span className="text-sm text-gray-600">Deal Date:</span>
                        <p className="font-medium">{formatDate(selectedDeal.dealDate)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items */}
                <table className="w-full mb-8">
                  <thead className="border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="py-4">
                        <p className="font-medium">{selectedDeal.projectTitle}</p>
                        <p className="text-sm text-gray-600">{DEAL_TYPES.find((t) => t.value === selectedDeal.dealType)?.label}</p>
                        {selectedDeal.trackTitle && <p className="text-sm text-gray-600">Track: {selectedDeal.trackTitle}</p>}
                        {selectedDeal.artistName && <p className="text-sm text-gray-600">Artist: {selectedDeal.artistName}</p>}
                      </td>
                      <td className="py-4 text-right font-medium">{formatCurrency(selectedDeal.dealAmount)}</td>
                    </tr>
                    {selectedDeal.commissionRate && selectedDeal.commissionRate > 0 && (
                      <tr className="border-b border-gray-200">
                        <td className="py-2 text-sm">Commission ({selectedDeal.commissionRate}%)</td>
                        <td className="py-2 text-right text-sm">
                          -{formatCurrency(((selectedDeal.dealAmount || 0) * (selectedDeal.commissionRate / 100)))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-300">
                    <tr>
                      <td className="py-4 text-right font-bold">Total Amount Due:</td>
                      <td className="py-4 text-right font-bold text-xl">
                        {formatCurrency(selectedDeal.netAmount || selectedDeal.dealAmount)}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Payment Status */}
                {selectedDeal.invoicePaid && selectedDeal.invoicePaidDate && (
                  <div className="bg-green-100 border border-green-300 rounded p-4 mb-4">
                    <p className="text-green-800 font-semibold">✓ Paid on {formatDate(selectedDeal.invoicePaidDate)}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedDeal.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Notes:</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{selectedDeal.notes}</p>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-600">
                  <p>Thank you for your business!</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowInvoiceModal(false);
                  setSelectedDeal(null);
                }}
                className="px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Print / Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlacementTracker;
