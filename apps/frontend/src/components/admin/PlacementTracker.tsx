import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { placementDealApi } from '../../lib/api';

interface Placement {
  id: string;
  clientFullName: string;
  clientPKA: string;
  songTitle: string;
  artistName: string;
  streams: string;
  label: string;
  coProducers: string;
  status: string;
  action: string;
  legalFeeAmount: string;
  legalFeeType: string;
  legalFeePaymentSource: string;
  hasLegalFeeBeenPaid: string;
  advance: string;
  masterRoyalty: string;
  pubPercent: string;
  sxLOD: string;
  contractContactName: string;
  contractCompany: string;
  contractContactEmail: string;
  contractMailingAddress: string;
  contractSoundExchangePayee: string;
  contractCreditLine: string;
  contractLink: string;
  released: boolean;
  advReceived: string;
  masterCol: string;
  soundEx: string;
  publicPerf: string;
  mech: string;
  agreement: string;
  notes: string;
}

interface BillingData {
  billingClientName: string;
  billingClientPKA: string;
  billingClientAddress: string;
  billingClientCity: string;
  billingProjectTitle: string;
  billingInvoiceNumber: string;
  billingArtistLegal: string;
  billingArtistStage: string;
  billingLabelName: string;
  billingBillToEmail: string;
  billingBillToContact: string;
  billingIssueDate: string;
  billingDueDate: string;
  billingAmount: string;
  billingCostsExpenses: string;
  billingSalesTax: string;
  billingAmountPaid: string;
  billingServices: string;
  billingPaymentTerms: string;
  billingPaymentChannel: string;
  billingBookkeepingNotes: string;
  billingBankAccountName: string;
  billingBankName: string;
  billingBankAddress: string;
  billingRoutingNumber: string;
  billingAccountNumber: string;
  billingSwiftCode: string;
}

const PlacementTracker: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedPlacements, setSelectedPlacements] = useState<Set<string>>(new Set());
  const [showFormModal, setShowFormModal] = useState(false);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<Placement | null>(null);
  const [clientFilter, setClientFilter] = useState('all');
  const [activeBillingDeal, setActiveBillingDeal] = useState<string | null>(null);

  // Fetch placements from API
  const { data: dealsData } = useQuery({
    queryKey: ['placement-deals'],
    queryFn: async () => {
      const response = await placementDealApi.getAll({});
      return response.data;
    },
  });

  const placements = (dealsData?.deals || []) as Placement[];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => {
      console.log('Creating placement with data:', data);
      return placementDealApi.create(data);
    },
    onSuccess: () => {
      console.log('Placement created successfully');
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      handleCloseForm();
      toast.success('Placement created successfully!');
    },
    onError: (error: any) => {
      console.error('Create placement error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Failed to create placement: ${errorMessage}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log('Updating placement', id, 'with data:', data);
      return placementDealApi.update(id, data);
    },
    onSuccess: () => {
      console.log('Placement updated successfully');
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      handleCloseForm();
      toast.success('Placement updated successfully!');
    },
    onError: (error: any) => {
      console.error('Update placement error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      toast.error(`Failed to update placement: ${errorMessage}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => placementDealApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      toast.success('Placement deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete placement');
    },
  });

  const [formData, setFormData] = useState<Placement>({
    id: '',
    clientFullName: '',
    clientPKA: '',
    songTitle: '',
    artistName: '',
    streams: '',
    label: '',
    coProducers: '',
    status: '',
    action: '',
    legalFeeAmount: '',
    legalFeeType: 'Flat Fee',
    legalFeePaymentSource: 'Out of Advance',
    hasLegalFeeBeenPaid: 'No',
    advance: '',
    masterRoyalty: '',
    pubPercent: '',
    sxLOD: '',
    contractContactName: '',
    contractCompany: '',
    contractContactEmail: '',
    contractMailingAddress: '',
    contractSoundExchangePayee: '',
    contractCreditLine: '',
    contractLink: '',
    released: false,
    advReceived: 'Not Received',
    masterCol: 'Not Collecting',
    soundEx: 'Not Collecting',
    publicPerf: 'Not Collecting',
    mech: 'Not Collecting',
    agreement: 'Draft has not been received',
    notes: ''
  });

  const [billingData, setBillingData] = useState<BillingData>({
    billingClientName: '',
    billingClientPKA: '',
    billingClientAddress: '',
    billingClientCity: '',
    billingProjectTitle: '',
    billingInvoiceNumber: '',
    billingArtistLegal: '',
    billingArtistStage: '',
    billingLabelName: '',
    billingBillToEmail: '',
    billingBillToContact: '',
    billingIssueDate: '',
    billingDueDate: '',
    billingAmount: '',
    billingCostsExpenses: 'n/a',
    billingSalesTax: '$0.00',
    billingAmountPaid: '$0.00',
    billingServices: '',
    billingPaymentTerms: '',
    billingPaymentChannel: '',
    billingBookkeepingNotes: '',
    billingBankAccountName: '',
    billingBankName: '',
    billingBankAddress: '',
    billingRoutingNumber: '',
    billingAccountNumber: '',
    billingSwiftCode: ''
  });

  const getProgressStatus = (placement: Placement) => {
    if (placement.agreement === 'Fully Executed') return 'green';
    if (placement.agreement === 'Partially Executed' || placement.agreement === 'In Legal Review') return 'yellow';
    return 'red';
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const requiredFields = [
      { field: 'clientFullName', label: 'Client Full Name' },
      { field: 'clientPKA', label: 'Client P/K/A' },
      { field: 'songTitle', label: 'Song Title' },
      { field: 'artistName', label: 'Artist Name' },
    ];

    const missingFields = requiredFields.filter(({ field }) => !formData[field as keyof Placement]?.toString().trim());

    if (missingFields.length > 0) {
      const fieldNames = missingFields.map(({ label }) => label).join(', ');
      alert(`Please fill in the following required fields: ${fieldNames}`);
      return;
    }

    const { id, ...placementData } = formData;
    if (editingPlacement) {
      updateMutation.mutate({ id: editingPlacement.id, data: placementData });
    } else {
      createMutation.mutate(placementData);
    }
  };

  const handleCloseForm = () => {
    setShowFormModal(false);
    setEditingPlacement(null);
    setFormData({
      id: '',
      clientFullName: '',
      clientPKA: '',
      songTitle: '',
      artistName: '',
      streams: '',
      label: '',
      coProducers: '',
      status: '',
      action: '',
      legalFeeAmount: '',
      legalFeeType: 'Flat Fee',
      legalFeePaymentSource: 'Out of Advance',
      hasLegalFeeBeenPaid: 'No',
      advance: '',
      masterRoyalty: '',
      pubPercent: '',
      sxLOD: '',
      contractContactName: '',
      contractCompany: '',
      contractContactEmail: '',
      contractMailingAddress: '',
      contractSoundExchangePayee: '',
      contractCreditLine: '',
      contractLink: '',
      released: false,
      advReceived: 'Not Received',
      masterCol: 'Not Collecting',
      soundEx: 'Not Collecting',
      publicPerf: 'Not Collecting',
      mech: 'Not Collecting',
      agreement: 'Draft has not been received',
      notes: ''
    });
  };

  const handleEdit = (placement: Placement) => {
    setFormData(placement);
    setEditingPlacement(placement);
    setShowFormModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this placement?')) {
      deleteMutation.mutate(id);
      setSelectedPlacements(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleRowClick = (id: string) => {
    setSelectedPlacements(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const visibleIds = filteredPlacements.map(p => p.id);
    setSelectedPlacements(new Set(visibleIds));
  };

  const handleClearSelection = () => {
    setSelectedPlacements(new Set());
  };

  const handleUseContractingInfo = () => {
    if (activeBillingDeal) {
      const placement = placements.find(p => p.id === activeBillingDeal);
      if (placement) {
        setBillingData(prev => ({
          ...prev,
          billingClientName: placement.contractContactName,
          billingLabelName: placement.contractCompany,
          billingBillToEmail: placement.contractContactEmail,
          billingClientAddress: placement.contractMailingAddress.split(',')[0] || '',
          billingClientCity: placement.contractMailingAddress.split(',').slice(1).join(',').trim() || ''
        }));
      }
    }
  };

  const uniqueClients = [...new Set(placements.map(p => p.clientFullName))];
  const filteredPlacements = clientFilter === 'all'
    ? placements
    : placements.filter(p => p.clientFullName === clientFilter);

  const inputClass = "block w-full py-2.5 px-3 bg-white/10 border border-white/[0.08] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = "block mb-1 text-xs font-medium text-gray-300 uppercase tracking-wide";

  return (
    <div className="min-h-screen bg-surface text-white">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Placement Tracker
          </h1>
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className={`${inputClass} min-w-[200px]`}
              >
                <option value="all">All Clients</option>
                {uniqueClients.map(client => (
                  <option key={client} value={client}>{client}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLegalModal(true)}
                className="px-4 py-2 bg-green-600 rounded-md shadow-sm font-semibold text-sm text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Legal AI Tool
              </button>
              <button
                onClick={() => setShowBillingModal(true)}
                className="px-4 py-2 bg-indigo-600 rounded-md shadow-sm font-semibold text-sm text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Billing AI Tool
              </button>
              <button
                onClick={() => setShowFormModal(true)}
                className="px-4 py-2 bg-blue-500 rounded-md shadow-sm font-semibold text-sm text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add New Placement
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          Tip: Click any placement row to mark it for Billing AI or Legal AI. Use the selection controls below to prep multiple placements at once.
        </p>

        {/* Selection Controls */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.06] text-gray-300 hover:bg-white/10"
          >
            Select All
          </button>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1.5 rounded-md border border-white/[0.08] bg-white/[0.06] text-gray-300 hover:bg-white/10"
          >
            Clear Selection
          </button>
          <span className="px-3 py-1 rounded-full bg-blue-900/50 text-blue-300">
            {selectedPlacements.size > 0 ? `${selectedPlacements.size} selected` : 'None selected'}
          </span>
        </div>

        {/* Main Table */}
        <div className="overflow-x-auto rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] shadow-xl">
          <table className="min-w-full divide-y divide-white/[0.08]">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Song & Artist</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider"># of Streams</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Label</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Co-Producers</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Notes</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Deal Terms</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Progress</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {filteredPlacements.map(placement => (
                <tr
                  key={placement.id}
                  onClick={() => handleRowClick(placement.id)}
                  className={`cursor-pointer transition-colors ${
                    selectedPlacements.has(placement.id)
                      ? 'bg-blue-900/30 shadow-[inset_4px_0_#3B82F6]'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <td className="py-4 px-4 text-sm text-gray-300">
                    <div>{placement.clientFullName}</div>
                    <div className="text-xs text-gray-500">{placement.clientPKA}</div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300">
                    <div className="font-medium">{placement.songTitle}</div>
                    <div className="text-xs text-gray-500">{placement.artistName}</div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300">{placement.streams}</td>
                  <td className="py-4 px-4 text-sm text-gray-300">{placement.label}</td>
                  <td className="py-4 px-4 text-sm text-gray-300">{placement.coProducers}</td>
                  <td className="py-4 px-4 text-sm text-gray-300">
                    <div className="max-w-xs truncate">{placement.notes}</div>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-300">
                    <div className="text-xs space-y-1">
                      {placement.advance && <div>Adv: {placement.advance}</div>}
                      {placement.masterRoyalty && <div>Master: {placement.masterRoyalty}</div>}
                      {placement.pubPercent && <div>Pub: {placement.pubPercent}</div>}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${getProgressStatus(placement)}-500`}></div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(placement);
                        }}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(placement.id);
                        }}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface p-6 sm:p-8 rounded-2xl shadow-xl border border-white/[0.08] w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-semibold mb-6 text-white">
                {editingPlacement ? 'Edit Placement' : 'Add New Placement'}
              </h2>
              <form onSubmit={handleFormSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">

                  {/* Column 1: Core Info */}
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>Client Full Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.clientFullName}
                        onChange={(e) => setFormData({...formData, clientFullName: e.target.value})}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>p/k/a "Producer Name" <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.clientPKA}
                        onChange={(e) => setFormData({...formData, clientPKA: e.target.value})}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Song Title <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.songTitle}
                        onChange={(e) => setFormData({...formData, songTitle: e.target.value})}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Artist Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.artistName}
                        onChange={(e) => setFormData({...formData, artistName: e.target.value})}
                        className={inputClass}
                        required
                      />
                    </div>
                    <div>
                      <label className={labelClass}># of Streams</label>
                      <input
                        type="text"
                        value={formData.streams}
                        onChange={(e) => setFormData({...formData, streams: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., 1,000,000"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Label</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => setFormData({...formData, label: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., Universal Music"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Co-Producers</label>
                      <input
                        type="text"
                        value={formData.coProducers}
                        onChange={(e) => setFormData({...formData, coProducers: e.target.value})}
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Column 2: Status & Terms */}
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>Status</label>
                      <input
                        type="text"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., Pending Agreement, Redline"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Action Item</label>
                      <input
                        type="text"
                        value={formData.action}
                        onChange={(e) => setFormData({...formData, action: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., Follow up with lawyer"
                      />
                    </div>

                    {/* Legal Fee Section */}
                    <fieldset className="space-y-4 bg-white/[0.04] p-4 rounded-lg">
                      <legend className="text-xs font-semibold text-gray-300 mb-2 uppercase">Legal Fee</legend>
                      <div>
                        <label className={labelClass}>Amount</label>
                        <input
                          type="text"
                          value={formData.legalFeeAmount}
                          onChange={(e) => setFormData({...formData, legalFeeAmount: e.target.value})}
                          className={inputClass}
                          placeholder="e.g., $500 or 10%"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fee Type</label>
                        <select
                          value={formData.legalFeeType}
                          onChange={(e) => setFormData({...formData, legalFeeType: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Flat Fee">Flat Fee</option>
                          <option value="Percentage">Percentage</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Payment Source</label>
                        <select
                          value={formData.legalFeePaymentSource}
                          onChange={(e) => setFormData({...formData, legalFeePaymentSource: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Out of Advance">Out of Advance</option>
                          <option value="Paid Directly">Paid Directly</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Has Legal Fee been paid?</label>
                        <select
                          value={formData.hasLegalFeeBeenPaid}
                          onChange={(e) => setFormData({...formData, hasLegalFeeBeenPaid: e.target.value})}
                          className={inputClass}
                        >
                          <option value="No">No</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </fieldset>
                  </div>

                  {/* Column 3: Deal Terms */}
                  <div className="space-y-6">
                    <div>
                      <label className={labelClass}>Advance</label>
                      <input
                        type="text"
                        value={formData.advance}
                        onChange={(e) => setFormData({...formData, advance: e.target.value})}
                        className={inputClass}
                        placeholder="$0.00"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Master Royalty</label>
                      <input
                        type="text"
                        value={formData.masterRoyalty}
                        onChange={(e) => setFormData({...formData, masterRoyalty: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., 2% PPD"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Publishing</label>
                      <input
                        type="text"
                        value={formData.pubPercent}
                        onChange={(e) => setFormData({...formData, pubPercent: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., 50%"
                      />
                    </div>
                    <div>
                      <label className={labelClass}>SX LOD %</label>
                      <input
                        type="text"
                        value={formData.sxLOD}
                        onChange={(e) => setFormData({...formData, sxLOD: e.target.value})}
                        className={inputClass}
                        placeholder="e.g., 20%"
                      />
                    </div>
                  </div>

                  {/* Contracting Info */}
                  <fieldset className="md:col-span-3 mt-4 bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
                    <legend className="text-xs font-semibold text-gray-300 mb-2 uppercase">Contracting Info</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Full Name</label>
                        <input
                          type="text"
                          value={formData.contractContactName}
                          onChange={(e) => setFormData({...formData, contractContactName: e.target.value})}
                          className={inputClass}
                          placeholder="Label contact name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Contracting Company</label>
                        <input
                          type="text"
                          value={formData.contractCompany}
                          onChange={(e) => setFormData({...formData, contractCompany: e.target.value})}
                          className={inputClass}
                          placeholder="Label or company name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Email Address</label>
                        <input
                          type="email"
                          value={formData.contractContactEmail}
                          onChange={(e) => setFormData({...formData, contractContactEmail: e.target.value})}
                          className={inputClass}
                          placeholder="contact@label.com"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Mailing Address</label>
                        <input
                          type="text"
                          value={formData.contractMailingAddress}
                          onChange={(e) => setFormData({...formData, contractMailingAddress: e.target.value})}
                          className={inputClass}
                          placeholder="123 Label Street, City, State ZIP"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>SoundExchange LOD Recipient (Payee)</label>
                        <input
                          type="text"
                          value={formData.contractSoundExchangePayee}
                          onChange={(e) => setFormData({...formData, contractSoundExchangePayee: e.target.value})}
                          className={inputClass}
                          placeholder="Payee Name"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Credit Line</label>
                        <input
                          type="text"
                          value={formData.contractCreditLine}
                          onChange={(e) => setFormData({...formData, contractCreditLine: e.target.value})}
                          className={inputClass}
                          placeholder="Credit line text"
                        />
                      </div>
                    </div>
                  </fieldset>

                  {/* Other Info */}
                  <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mt-4">
                    <div>
                      <label className={labelClass}>Contract Link</label>
                      <input
                        type="url"
                        value={formData.contractLink}
                        onChange={(e) => setFormData({...formData, contractLink: e.target.value})}
                        className={inputClass}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.released}
                        onChange={(e) => setFormData({...formData, released: e.target.checked})}
                        className="w-5 h-5 text-blue-600 bg-white/10 border-white/[0.08] rounded focus:ring-blue-500 focus:ring-2"
                      />
                      <label className="ml-3 text-sm font-medium text-gray-300">Released?</label>
                    </div>
                  </div>

                  {/* Checklist */}
                  <fieldset className="md:col-span-3 mt-4">
                    <legend className="text-xs font-semibold text-gray-300 mb-3 uppercase">Checklist</legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                      <div>
                        <label className={labelClass}>Advance Received</label>
                        <select
                          value={formData.advReceived}
                          onChange={(e) => setFormData({...formData, advReceived: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Not Received">Not Received</option>
                          <option value="Received">Received</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Master Royalties</label>
                        <select
                          value={formData.masterCol}
                          onChange={(e) => setFormData({...formData, masterCol: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Not Collecting">Not Collecting</option>
                          <option value="Collecting">Collecting</option>
                          <option value="Advance hasn't recouped">Advance hasn't recouped</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>SoundExchange Royalties</label>
                        <select
                          value={formData.soundEx}
                          onChange={(e) => setFormData({...formData, soundEx: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Submitted LOD">Submitted LOD</option>
                          <option value="Not Collecting">Not Collecting</option>
                          <option value="Collecting">Collecting</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Public Performance</label>
                        <select
                          value={formData.publicPerf}
                          onChange={(e) => setFormData({...formData, publicPerf: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Not Collecting">Not Collecting</option>
                          <option value="Collecting">Collecting</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Mechanical Royalties</label>
                        <select
                          value={formData.mech}
                          onChange={(e) => setFormData({...formData, mech: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Not Collecting">Not Collecting</option>
                          <option value="Collecting">Collecting</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Agreement</label>
                        <select
                          value={formData.agreement}
                          onChange={(e) => setFormData({...formData, agreement: e.target.value})}
                          className={inputClass}
                        >
                          <option value="Draft has not been received">Draft has not been received</option>
                          <option value="Draft has been received">Draft has been received</option>
                          <option value="In Legal Review">In Legal Review</option>
                          <option value="Partially Executed">Partially Executed</option>
                          <option value="Fully Executed">Fully Executed</option>
                        </select>
                      </div>
                    </div>
                  </fieldset>

                  {/* Notes */}
                  <div className="md:col-span-3 mt-4">
                    <label className={labelClass}>Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={4}
                      className={inputClass}
                      placeholder="e.g., Last reply received 3/10. Waiting on countersignature..."
                    />
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md shadow-sm font-semibold text-sm text-gray-300 hover:bg-white/15"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 border border-transparent rounded-md shadow-sm font-semibold text-sm text-white hover:bg-blue-600"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Billing AI Modal */}
        {showBillingModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/[0.08] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-indigo-400 uppercase">Billing AI Tool</p>
                  <h2 className="text-2xl font-semibold text-white">AI Billing Workspace</h2>
                  <p className="text-sm text-gray-400">Billing AI drafts invoices, posts bookkeeping notes, and handles payment flows using the placement data you sync from the tracker.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBillingModal(false)}
                    className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md shadow-sm font-semibold text-sm text-gray-300 hover:bg-white/15"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Selected Deals */}
                <section className="space-y-4">
                  <div className="bg-blue-900/30 border border-blue-700 rounded-xl p-4">
                    <p className="text-sm font-semibold text-blue-300">
                      {selectedPlacements.size > 0 ? `${selectedPlacements.size} placements selected` : 'Select placements to sync.'}
                    </p>
                    <p className="text-xs text-blue-400 mt-1">Tap rows inside the tracker to mark which deals you want Billing AI to work on.</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlacements.size === 0 ? (
                      <p className="text-sm text-gray-500">No deals selected yet.</p>
                    ) : (
                      Array.from(selectedPlacements).map(id => {
                        const placement = placements.find(p => p.id === id);
                        if (!placement) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => setActiveBillingDeal(id)}
                            className={`w-full text-left rounded-lg border p-4 transition ${
                              activeBillingDeal === id
                                ? 'border-blue-500 bg-blue-900/30 ring-1 ring-blue-400'
                                : 'border-white/[0.08] bg-white/[0.04] hover:border-blue-400'
                            }`}
                          >
                            <div className="text-sm font-medium text-white">{placement.clientFullName}</div>
                            <div className="text-xs text-gray-400">{placement.songTitle} - {placement.artistName}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Multi-select placements to build a combined billing run. Each card stores its own invoice context.</p>
                    <p>All deal intel stays in sync when you reopen Billing AI.</p>
                  </div>
                </section>

                {/* Main Content - Billing Form */}
                <section className="lg:col-span-2 space-y-6">
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Active deal</p>
                    {activeBillingDeal ? (
                      <>
                        <p className="text-xl font-semibold text-white">
                          {placements.find(p => p.id === activeBillingDeal)?.clientFullName}
                        </p>
                        <p className="text-sm text-gray-400">
                          {placements.find(p => p.id === activeBillingDeal)?.songTitle}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-semibold text-white">Select a placement</p>
                        <p className="text-sm text-gray-400">Choose a deal card on the left to auto-populate invoice data, bookkeeping notes, and payment instructions.</p>
                      </>
                    )}
                  </div>

                  <form className="space-y-8">
                    <section className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Client Legal Name</label>
                          <input
                            type="text"
                            value={billingData.billingClientName}
                            onChange={(e) => setBillingData({...billingData, billingClientName: e.target.value})}
                            className={inputClass}
                            placeholder="Client legal name"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Producer (p/k/a)</label>
                          <input
                            type="text"
                            value={billingData.billingClientPKA}
                            onChange={(e) => setBillingData({...billingData, billingClientPKA: e.target.value})}
                            className={inputClass}
                            placeholder="Stage name"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Bill To Street Address</label>
                          <input
                            type="text"
                            value={billingData.billingClientAddress}
                            onChange={(e) => setBillingData({...billingData, billingClientAddress: e.target.value})}
                            className={inputClass}
                            placeholder="123 Label Street"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>City, State ZIP</label>
                          <input
                            type="text"
                            value={billingData.billingClientCity}
                            onChange={(e) => setBillingData({...billingData, billingClientCity: e.target.value})}
                            className={inputClass}
                            placeholder="Los Angeles, CA 90001"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Project / Song</label>
                          <input
                            type="text"
                            value={billingData.billingProjectTitle}
                            onChange={(e) => setBillingData({...billingData, billingProjectTitle: e.target.value})}
                            className={inputClass}
                            placeholder="Song title or project"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Invoice Number</label>
                          <input
                            type="text"
                            value={billingData.billingInvoiceNumber}
                            onChange={(e) => setBillingData({...billingData, billingInvoiceNumber: e.target.value})}
                            className={inputClass}
                            placeholder="Auto-generated"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Artist Legal Name</label>
                          <input
                            type="text"
                            value={billingData.billingArtistLegal}
                            onChange={(e) => setBillingData({...billingData, billingArtistLegal: e.target.value})}
                            className={inputClass}
                            placeholder="Artist legal name"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Artist (p/k/a)</label>
                          <input
                            type="text"
                            value={billingData.billingArtistStage}
                            onChange={(e) => setBillingData({...billingData, billingArtistStage: e.target.value})}
                            className={inputClass}
                            placeholder="Stage name"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bill To Company</label>
                          <input
                            type="text"
                            value={billingData.billingLabelName}
                            onChange={(e) => setBillingData({...billingData, billingLabelName: e.target.value})}
                            className={inputClass}
                            placeholder="Label or company"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Bill To Email</label>
                          <input
                            type="email"
                            value={billingData.billingBillToEmail}
                            onChange={(e) => setBillingData({...billingData, billingBillToEmail: e.target.value})}
                            className={inputClass}
                            placeholder="finance@label.com"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Attn (Employee Name)</label>
                          <input
                            type="text"
                            value={billingData.billingBillToContact}
                            onChange={(e) => setBillingData({...billingData, billingBillToContact: e.target.value})}
                            className={inputClass}
                            placeholder="Label employee name"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleUseContractingInfo}
                        className="px-3 py-1.5 rounded-md border border-white/[0.08] bg-white/10 text-sm text-gray-300 hover:bg-white/15"
                      >
                        Use placement contracting info
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Issue Date</label>
                          <input
                            type="date"
                            value={billingData.billingIssueDate}
                            onChange={(e) => setBillingData({...billingData, billingIssueDate: e.target.value})}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Due Date</label>
                          <input
                            type="date"
                            value={billingData.billingDueDate}
                            onChange={(e) => setBillingData({...billingData, billingDueDate: e.target.value})}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Invoice Amount</label>
                          <input
                            type="text"
                            value={billingData.billingAmount}
                            onChange={(e) => setBillingData({...billingData, billingAmount: e.target.value})}
                            className={inputClass}
                            placeholder="$0.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className={labelClass}>Costs / Expenses</label>
                          <input
                            type="text"
                            value={billingData.billingCostsExpenses}
                            onChange={(e) => setBillingData({...billingData, billingCostsExpenses: e.target.value})}
                            className={inputClass}
                            placeholder="n/a"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Sales Tax</label>
                          <input
                            type="text"
                            value={billingData.billingSalesTax}
                            onChange={(e) => setBillingData({...billingData, billingSalesTax: e.target.value})}
                            className={inputClass}
                            placeholder="$0.00"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Amount Paid</label>
                          <input
                            type="text"
                            value={billingData.billingAmountPaid}
                            onChange={(e) => setBillingData({...billingData, billingAmountPaid: e.target.value})}
                            className={inputClass}
                            placeholder="$0.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Services Covered</label>
                          <textarea
                            value={billingData.billingServices}
                            onChange={(e) => setBillingData({...billingData, billingServices: e.target.value})}
                            className={inputClass}
                            rows={3}
                            placeholder="Deliverables, splits, or notes for this invoice"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Payment Terms</label>
                          <textarea
                            value={billingData.billingPaymentTerms}
                            onChange={(e) => setBillingData({...billingData, billingPaymentTerms: e.target.value})}
                            className={inputClass}
                            rows={3}
                            placeholder="e.g., Net 15, wire details, recoup provisions"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Payment Channel</label>
                          <input
                            type="text"
                            value={billingData.billingPaymentChannel}
                            onChange={(e) => setBillingData({...billingData, billingPaymentChannel: e.target.value})}
                            className={inputClass}
                            placeholder="Wire / ACH / PayPal"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bookkeeping Notes</label>
                          <textarea
                            value={billingData.billingBookkeepingNotes}
                            onChange={(e) => setBillingData({...billingData, billingBookkeepingNotes: e.target.value})}
                            className={inputClass}
                            rows={3}
                            placeholder="Internal ledger notes, account numbers, recoup status"
                          />
                        </div>
                      </div>
                    </section>

                    {/* Invoice Preview Section */}
                    <section className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Invoice Preview</h3>
                        <button
                          type="button"
                          className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          Draft Invoice with Billing AI
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                          Save Invoice Draft
                        </button>
                        <button type="button" className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                          Export Invoice (HTML)
                        </button>
                        <button type="button" className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                          Export Invoice (DOC)
                        </button>
                        <button type="button" className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                          Export Invoice (PDF)
                        </button>
                        <button type="button" className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                          Export Billing Package (JSON)
                        </button>
                        <span className="text-xs text-gray-500">No draft saved yet.</span>
                      </div>

                      <div className="bg-white/[0.04] rounded-xl p-6">
                        <div className="bg-white rounded-lg p-6 text-gray-900">
                          <div className="text-center text-sm text-gray-500">
                            Invoice draft will appear here once you select a placement.
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 text-center">
                        Review the generated invoice, make edits in the fields above, then export or send when ready.
                      </p>
                    </section>

                    {/* Banking Details */}
                    <fieldset className="space-y-4 bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                      <legend className="text-xs font-semibold text-gray-300 uppercase">Wire / Banking Details</legend>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Account Name</label>
                          <input
                            type="text"
                            value={billingData.billingBankAccountName}
                            onChange={(e) => setBillingData({...billingData, billingBankAccountName: e.target.value})}
                            className={inputClass}
                            placeholder="Name on account"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bank Name</label>
                          <input
                            type="text"
                            value={billingData.billingBankName}
                            onChange={(e) => setBillingData({...billingData, billingBankName: e.target.value})}
                            className={inputClass}
                            placeholder="Bank"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Bank Address</label>
                          <input
                            type="text"
                            value={billingData.billingBankAddress}
                            onChange={(e) => setBillingData({...billingData, billingBankAddress: e.target.value})}
                            className={inputClass}
                            placeholder="Bank address"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Routing #</label>
                          <input
                            type="text"
                            value={billingData.billingRoutingNumber}
                            onChange={(e) => setBillingData({...billingData, billingRoutingNumber: e.target.value})}
                            className={inputClass}
                            placeholder="Routing number"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Account #</label>
                          <input
                            type="text"
                            value={billingData.billingAccountNumber}
                            onChange={(e) => setBillingData({...billingData, billingAccountNumber: e.target.value})}
                            className={inputClass}
                            placeholder="Account number"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Swift / IBAN</label>
                          <input
                            type="text"
                            value={billingData.billingSwiftCode}
                            onChange={(e) => setBillingData({...billingData, billingSwiftCode: e.target.value})}
                            className={inputClass}
                            placeholder="SWIFT or IBAN"
                          />
                        </div>
                      </div>
                    </fieldset>

                    <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowBillingModal(false)}
                        className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 border border-transparent rounded-md shadow-sm font-semibold text-sm text-white hover:bg-indigo-700"
                      >
                        Send Billing Package
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Legal AI Modal */}
        {showLegalModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-surface w-full max-w-6xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/[0.08] p-6 sm:p-8 space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-green-400 uppercase">Legal AI Tool</p>
                  <h2 className="text-2xl font-semibold text-white">AI Legal Workspace</h2>
                  <p className="text-sm text-gray-400">Legal AI assists with contract review, redline tracking, agreement drafting, and legal term analysis for your placements.</p>
                </div>
                <button
                  onClick={() => setShowLegalModal(false)}
                  className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md shadow-sm font-semibold text-sm text-gray-300 hover:bg-white/15"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Selected Deals */}
                <section className="space-y-4">
                  <div className="bg-green-900/30 border border-green-700 rounded-xl p-4">
                    <p className="text-sm font-semibold text-green-300">
                      {selectedPlacements.size > 0 ? `${selectedPlacements.size} placements selected` : 'Select placements for legal review.'}
                    </p>
                    <p className="text-xs text-green-400 mt-1">Click rows in the tracker to mark which deals need legal attention.</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlacements.size === 0 ? (
                      <p className="text-sm text-gray-500">No deals selected yet.</p>
                    ) : (
                      Array.from(selectedPlacements).map(id => {
                        const placement = placements.find(p => p.id === id);
                        if (!placement) return null;
                        const statusColor = placement.agreement === 'Fully Executed' ? 'green' :
                                          placement.agreement === 'In Legal Review' ? 'yellow' : 'red';
                        return (
                          <div
                            key={id}
                            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm font-medium text-white">{placement.clientFullName}</div>
                              <div className={`w-2 h-2 rounded-full bg-${statusColor}-500`}></div>
                            </div>
                            <div className="text-xs text-gray-400 mb-1">{placement.songTitle} - {placement.artistName}</div>
                            <div className="text-xs text-gray-500">Status: {placement.agreement}</div>
                            {placement.status && (
                              <div className="text-xs text-yellow-400 mt-1">Action: {placement.status}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>Legal AI tracks agreement status, redlines, and contract versions for each placement.</p>
                    <p>Upload contracts or paste links to enable AI-powered analysis.</p>
                  </div>
                </section>

                {/* Main Content - Legal Tools */}
                <section className="lg:col-span-2 space-y-6">
                  {/* Contract Analysis Section */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Contract Review</p>
                      <p className="text-sm text-gray-300">Upload or link to contracts for AI-powered analysis and redline tracking.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Contract Document Link</label>
                        <input
                          type="url"
                          className={inputClass}
                          placeholder="https://docs.google.com/... or DocuSign link"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Agreement Status</label>
                        <select className={inputClass}>
                          <option value="Draft has not been received">Draft has not been received</option>
                          <option value="Draft has been received">Draft has been received</option>
                          <option value="In Legal Review">In Legal Review</option>
                          <option value="Partially Executed">Partially Executed</option>
                          <option value="Fully Executed">Fully Executed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Contract Upload</label>
                      <div className="border-2 border-dashed border-white/[0.08] rounded-lg p-6 text-center hover:border-white/20 transition-colors">
                        <div className="text-gray-400 text-sm mb-2">
                          <svg className="mx-auto h-12 w-12 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Drop contract file here or click to browse
                        </div>
                        <p className="text-xs text-gray-500">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Tools */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Legal AI Actions</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button className="px-4 py-3 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-left">
                        <div className="font-bold mb-1">🔍 Analyze Contract</div>
                        <div className="text-xs opacity-90">Review terms, identify issues, suggest improvements</div>
                      </button>

                      <button className="px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-left">
                        <div className="font-bold mb-1">📝 Generate Agreement</div>
                        <div className="text-xs opacity-90">Create producer agreement from placement data</div>
                      </button>

                      <button className="px-4 py-3 bg-purple-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-left">
                        <div className="font-bold mb-1">🔄 Track Redlines</div>
                        <div className="text-xs opacity-90">Compare versions and track changes</div>
                      </button>

                      <button className="px-4 py-3 bg-orange-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 text-left">
                        <div className="font-bold mb-1">⚖️ Explain Terms</div>
                        <div className="text-xs opacity-90">Plain English explanations of legal clauses</div>
                      </button>
                    </div>
                  </div>

                  {/* Legal Terms Reference */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Deal Terms & Legal Notes</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Advance Amount</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="$0.00"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Master Royalty Rate</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="e.g., 2% PPD"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Publishing Percentage</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="e.g., 50%"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>SoundExchange LOD %</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="e.g., 20%"
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Legal Notes & Redlines</label>
                      <textarea
                        className={inputClass}
                        rows={4}
                        placeholder="Track legal discussions, redline requests, negotiation points, etc..."
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Key Contract Clauses</label>
                      <textarea
                        className={inputClass}
                        rows={3}
                        placeholder="Important clauses to review: recoupment, reversion, credit, etc..."
                      />
                    </div>
                  </div>

                  {/* Legal Fee Tracking */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <p className="text-xs font-semibold text-gray-400 uppercase">Legal Fee Information</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass}>Legal Fee Amount</label>
                        <input
                          type="text"
                          className={inputClass}
                          placeholder="e.g., $500 or 10%"
                        />
                      </div>
                      <div>
                        <label className={labelClass}>Fee Type</label>
                        <select className={inputClass}>
                          <option value="Flat Fee">Flat Fee</option>
                          <option value="Percentage">Percentage</option>
                          <option value="Hourly">Hourly</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Payment Source</label>
                        <select className={inputClass}>
                          <option value="Out of Advance">Out of Advance</option>
                          <option value="Paid Directly">Paid Directly</option>
                          <option value="Split">Split Payment</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass}>Payment Status</label>
                        <select className={inputClass}>
                          <option value="No">Not Paid</option>
                          <option value="Yes">Paid</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={labelClass}>Attorney/Firm Contact</label>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder="Law firm or attorney name and email"
                      />
                    </div>
                  </div>

                  {/* AI Analysis Results */}
                  <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-400 uppercase">AI Analysis Results</p>
                      <span className="text-xs text-gray-500">No analysis run yet</span>
                    </div>

                    <div className="bg-white rounded-lg p-6 text-gray-900 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-3">⚖️</div>
                        <p className="text-sm text-gray-500">Legal AI analysis will appear here</p>
                        <p className="text-xs text-gray-400 mt-1">Upload a contract and click "Analyze Contract" to begin</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                        Export Analysis Report (PDF)
                      </button>
                      <button className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                        Save Legal Package (JSON)
                      </button>
                      <button className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15">
                        Generate Agreement (DOCX)
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-white/[0.08]">
                    <button
                      onClick={() => setShowLegalModal(false)}
                      className="px-4 py-2 bg-white/10 border border-white/[0.08] rounded-md text-sm font-semibold text-gray-300 hover:bg-white/15"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-green-600 border border-transparent rounded-md shadow-sm font-semibold text-sm text-white hover:bg-green-700">
                      Save Legal Updates
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlacementTracker;