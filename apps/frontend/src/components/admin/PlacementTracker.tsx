import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { placementDealApi, getAuthToken, aiApi } from '../../lib/api';
import { BookUser, ChevronDown, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface BusinessContact {
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
  category: string;
}

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
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showBillingContactPicker, setShowBillingContactPicker] = useState(false);

  // Legal AI state
  const [contractText, setContractText] = useState('');
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [aiGeneratedContract, setAiGeneratedContract] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiChatMessages, setAiChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [aiChatInput, setAiChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [selectedDealType, setSelectedDealType] = useState<'producer_agreement' | 'sync_license' | 'work_for_hire' | 'split_sheet' | 'beat_lease'>('producer_agreement');
  const [legalTermsInput, setLegalTermsInput] = useState('');
  const [termExplanations, setTermExplanations] = useState<any[]>([]);
  const [isExplainingTerms, setIsExplainingTerms] = useState(false);

  // Fetch placements from API
  const { data: dealsData } = useQuery({
    queryKey: ['placement-deals'],
    queryFn: async () => {
      const response = await placementDealApi.getAll({});
      return response.data;
    },
  });

  const placements = (dealsData?.deals || []) as Placement[];

  // Fetch business contacts for autofill
  const { data: contactsData } = useQuery({
    queryKey: ['business-contacts'],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/contacts`, {
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) return { contacts: [] };
        throw new Error('Failed to fetch contacts');
      }
      return response.json();
    },
  });

  const businessContacts: BusinessContact[] = contactsData?.contacts || [];

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

  // Create billing invoice mutation - sends to Billing Hub with FEE type
  const createBillingInvoiceMutation = useMutation({
    mutationFn: ({ dealId, data }: { dealId: string; data: any }) =>
      placementDealApi.createBillingInvoice(dealId, data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['placement-deals'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const invoice = response.data?.invoice;
      const invoiceNumber = invoice?.invoiceNumber || 'Invoice';
      const amount = invoice?.grossAmount ? `$${Number(invoice.grossAmount).toFixed(2)}` : '';
      toast.success(`${invoiceNumber} created for ${amount}! View it in the Billing Hub.`);
      setShowBillingModal(false);
      setBillingData({
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
      setActiveBillingDeal(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create billing invoice');
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

  // Autofill contracting info from a business contact
  const handleAutofillFromContact = (contact: BusinessContact) => {
    // Build mailing address from contact fields
    const addressParts = [
      contact.address,
      contact.city,
      contact.state,
      contact.zipCode,
      contact.country
    ].filter(Boolean);
    const mailingAddress = addressParts.join(', ');

    setFormData(prev => ({
      ...prev,
      contractContactName: contact.contactName,
      contractCompany: contact.companyName,
      contractContactEmail: contact.email,
      contractMailingAddress: mailingAddress,
    }));
    setShowContactPicker(false);
    toast.success(`Autofilled from ${contact.companyName}`);
  };

  // Autofill billing info from a business contact
  const handleAutofillBillingFromContact = (contact: BusinessContact) => {
    // Build city/state/zip string
    const cityStateZip = [
      contact.city,
      contact.state,
      contact.zipCode
    ].filter(Boolean).join(', ');

    setBillingData(prev => ({
      ...prev,
      billingLabelName: contact.companyName,
      billingBillToContact: contact.contactName,
      billingClientAddress: contact.address || '',
      billingClientCity: cityStateZip,
      billingBillToEmail: contact.email,
    }));
    setShowBillingContactPicker(false);
    toast.success(`Billing info autofilled from ${contact.companyName}`);
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

  // Auto-fill billing data when a placement is selected
  const handleSelectBillingDeal = (id: string) => {
    setActiveBillingDeal(id);
    const placement = placements.find(p => p.id === id);
    if (placement) {
      // Generate invoice number based on current date and placement
      const today = new Date();
      const invoiceNum = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}-${placement.clientPKA?.replace(/\s+/g, '').substring(0, 4).toUpperCase() || 'XXXX'}`;

      // Set due date to 30 days from now
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);

      setBillingData(prev => ({
        ...prev,
        billingClientName: placement.clientFullName || '',
        billingClientPKA: placement.clientPKA || '',
        billingProjectTitle: placement.songTitle || '',
        billingInvoiceNumber: invoiceNum,
        billingArtistLegal: placement.artistName || '',
        billingArtistStage: placement.artistName || '',
        billingLabelName: placement.contractCompany || placement.label || '',
        billingBillToEmail: placement.contractContactEmail || '',
        billingBillToContact: placement.contractContactName || '',
        billingClientAddress: placement.contractMailingAddress?.split(',')[0] || '',
        billingClientCity: placement.contractMailingAddress?.split(',').slice(1).join(',').trim() || '',
        billingIssueDate: today.toISOString().split('T')[0],
        billingDueDate: dueDate.toISOString().split('T')[0],
        billingAmount: placement.advance?.replace(/[^0-9.]/g, '') || '',
        billingServices: `Production services for "${placement.songTitle}" by ${placement.artistName}`,
        billingPaymentTerms: 'Net 30',
      }));
      // Show preview when placement is selected
      setShowInvoicePreview(true);
    }
  };

  // Generate draft invoice preview
  const handleDraftInvoice = () => {
    if (!activeBillingDeal) {
      toast.error('Please select a placement first');
      return;
    }
    setShowInvoicePreview(true);
    toast.success('Invoice preview generated! Review and edit as needed.');
  };

  // Handle billing invoice submission - creates FEE invoice in Billing Hub
  const handleBillingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeBillingDeal) {
      toast.error('Please select a placement deal first');
      return;
    }

    // Parse amount - remove $ and commas if present
    const amountStr = billingData.billingAmount.replace(/[$,]/g, '');
    const amount = parseFloat(amountStr);

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid billing amount');
      return;
    }

    const placement = placements.find(p => p.id === activeBillingDeal);

    createBillingInvoiceMutation.mutate({
      dealId: activeBillingDeal,
      data: {
        grossAmount: amount,
        description: billingData.billingServices || `Billing for ${placement?.songTitle || 'Placement'} - ${placement?.artistName || 'Unknown Artist'}`,
        billingClientName: billingData.billingClientName || placement?.clientFullName,
        billingLabelName: billingData.billingLabelName,
        billingBillToEmail: billingData.billingBillToEmail,
        billingBillToContact: billingData.billingBillToContact,
      },
    });
  };

  const uniqueClients = [...new Set(placements.map(p => p.clientFullName))];
  const filteredPlacements = clientFilter === 'all'
    ? placements
    : placements.filter(p => p.clientFullName === clientFilter);

  const inputClass = "block w-full py-2.5 px-3 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors";
  const labelClass = "block mb-1 text-xs font-medium text-theme-primary uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-theme-background text-theme-foreground">
      <div className="max-w-screen-xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-light text-theme-foreground mb-1">
              Producer Clearances
            </h1>
            <p className="text-theme-foreground-muted text-sm">Track placement deals, contracts, and billing</p>
          </div>
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
                className="px-4 py-2 bg-theme-background/50 border border-theme-border-strong text-theme-foreground-secondary text-sm hover:bg-theme-background hover:text-theme-foreground transition-colors"
              >
                Legal AI Tool
              </button>
              <button
                onClick={() => setShowBillingModal(true)}
                className="px-4 py-2 bg-theme-background/50 border border-theme-border-strong text-theme-foreground-secondary text-sm hover:bg-theme-background hover:text-theme-foreground transition-colors"
              >
                Billing AI Tool
              </button>
              <button
                onClick={() => setShowFormModal(true)}
                className="px-4 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover transition-colors"
              >
                Add New Placement
              </button>
            </div>
          </div>
        </div>

        <p className="text-sm text-theme-foreground-muted mb-4">
          Click any row to mark for Billing AI or Legal AI. Use the selection controls below to prep multiple placements at once.
        </p>

        {/* Selection Controls */}
        <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1.5 border border-theme-border-strong bg-theme-input text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground transition-colors"
          >
            Select All
          </button>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1.5 border border-theme-border-strong bg-theme-input text-theme-foreground-secondary hover:bg-theme-card-hover hover:text-theme-foreground transition-colors"
          >
            Clear Selection
          </button>
          <span className={`px-3 py-1 text-xs uppercase tracking-wider ${
            selectedPlacements.size > 0
              ? 'bg-theme-primary/15 text-theme-primary border border-theme-border-hover'
              : 'bg-theme-input text-theme-foreground-muted border border-theme-border-strong'
          }`}>
            {selectedPlacements.size > 0 ? `${selectedPlacements.size} selected` : 'None selected'}
          </span>
        </div>

        {/* Main Table */}
        <div className="relative overflow-hidden bg-theme-card border border-theme-border">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-theme-border">
              <thead className="bg-theme-input">
                <tr>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Client</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Song & Artist</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider"># of Streams</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Label</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Co-Producers</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Notes</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Deal Terms</th>
                  <th className="py-3 px-4 text-left text-xs text-theme-foreground-muted uppercase tracking-wider">Progress</th>
                  <th className="py-3 px-4 text-right text-xs text-theme-foreground-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {filteredPlacements.map(placement => (
                  <tr
                    key={placement.id}
                    onClick={() => handleRowClick(placement.id)}
                    className={`cursor-pointer transition-colors ${
                      selectedPlacements.has(placement.id)
                        ? 'bg-theme-primary/10 shadow-[inset_4px_0_var(--theme-primary)]'
                        : 'hover:bg-theme-card-hover'
                    }`}
                  >
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">
                      <div className="text-theme-foreground">{placement.clientFullName}</div>
                      <div className="text-xs text-theme-foreground-muted">{placement.clientPKA}</div>
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <div className="text-theme-foreground">{placement.songTitle}</div>
                      <div className="text-xs text-theme-foreground-muted">{placement.artistName}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">{placement.streams}</td>
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">{placement.label}</td>
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">{placement.coProducers}</td>
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">
                      <div className="max-w-xs truncate">{placement.notes}</div>
                    </td>
                    <td className="py-4 px-4 text-sm text-theme-foreground-secondary">
                      <div className="text-xs space-y-1">
                        {placement.advance && <div className="text-theme-primary">Adv: {placement.advance}</div>}
                        {placement.masterRoyalty && <div>Master: {placement.masterRoyalty}</div>}
                        {placement.pubPercent && <div>Pub: {placement.pubPercent}</div>}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          getProgressStatus(placement) === 'green' ? 'bg-emerald-500' :
                          getProgressStatus(placement) === 'yellow' ? 'bg-theme-primary' : 'bg-white/30'
                        }`}></div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(placement);
                          }}
                          className="text-theme-primary hover:text-white text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(placement.id);
                          }}
                          className="text-theme-foreground-muted hover:text-red-400 text-sm transition-colors"
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
        </div>

        {/* Form Modal */}
        {showFormModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative overflow-hidden bg-theme-card p-6 sm:p-8 border border-theme-border-strong w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              <h2 className="text-2xl font-light mb-6 text-theme-foreground">
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
                    <fieldset className="space-y-4 bg-black/30 p-4 border border-theme-border">
                      <legend className="text-xs text-theme-foreground-muted mb-2 uppercase tracking-wider">Legal Fee</legend>
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
                  <fieldset className="md:col-span-3 mt-4 bg-black/30 border border-theme-border p-4">
                    <div className="flex items-center justify-between mb-2">
                      <legend className="text-xs text-theme-foreground-muted uppercase tracking-wider">Contracting Info</legend>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowContactPicker(!showContactPicker)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-theme-primary hover:text-white bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-border-hover transition-colors"
                        >
                          <BookUser className="w-3.5 h-3.5" />
                          Autofill from Contacts
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showContactPicker ? 'rotate-180' : ''}`} />
                        </button>
                        {showContactPicker && (
                          <div className="absolute right-0 mt-1 w-72 max-h-64 overflow-y-auto bg-theme-card border border-theme-border-strong shadow-xl z-50">
                            {businessContacts.length === 0 ? (
                              <div className="p-3 text-sm text-theme-foreground-muted text-center">
                                No contacts found. Add contacts in the Contacts tab.
                              </div>
                            ) : (
                              <div className="py-1">
                                {businessContacts.map((contact) => (
                                  <button
                                    key={contact.id}
                                    type="button"
                                    onClick={() => handleAutofillFromContact(contact)}
                                    className="w-full px-3 py-2 text-left hover:bg-theme-primary/10 transition-colors"
                                  >
                                    <div className="text-sm text-theme-foreground">{contact.companyName}</div>
                                    <div className="text-xs text-theme-foreground-muted">{contact.contactName} • {contact.category.toLowerCase()}</div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
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
                    <legend className="text-xs text-theme-foreground-muted mb-3 uppercase tracking-wider">Checklist</legend>
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
                <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-theme-border">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 border border-theme-border-strong text-theme-foreground-secondary hover:text-white hover:bg-white/5 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover transition-colors"
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
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative overflow-hidden bg-theme-card w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-theme-border-strong p-6 sm:p-8 space-y-6">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-theme-primary tracking-wider uppercase mb-1">Billing AI Tool</p>
                  <h2 className="text-2xl font-light text-theme-foreground">AI Billing Workspace</h2>
                  <p className="text-sm text-theme-foreground-muted mt-1">Billing AI drafts invoices, posts bookkeeping notes, and handles payment flows using the placement data you sync from the tracker.</p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBillingModal(false)}
                    className="px-4 py-2 border border-theme-border-strong text-theme-foreground-secondary hover:text-white hover:bg-white/5 text-sm transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Selected Deals */}
                <section className="space-y-4">
                  <div className="bg-theme-primary/10 border border-theme-border-hover p-4">
                    <p className="text-sm text-theme-primary">
                      {selectedPlacements.size > 0 ? `${selectedPlacements.size} placements selected` : 'Select placements to sync.'}
                    </p>
                    <p className="text-xs text-theme-foreground-muted mt-1">Tap rows inside the tracker to mark which deals you want Billing AI to work on.</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlacements.size === 0 ? (
                      <p className="text-sm text-theme-foreground">No deals selected yet.</p>
                    ) : (
                      Array.from(selectedPlacements).map(id => {
                        const placement = placements.find(p => p.id === id);
                        if (!placement) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => handleSelectBillingDeal(id)}
                            className={`w-full text-left border p-4 transition ${
                              activeBillingDeal === id
                                ? 'border-theme-primary bg-theme-primary-10'
                                : 'border-theme-border bg-black/30 hover:border-theme-input-focus'
                            }`}
                          >
                            <div className="text-sm text-theme-foreground">{placement.clientFullName}</div>
                            <div className="text-xs text-theme-foreground-muted">{placement.songTitle} - {placement.artistName}</div>
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="text-xs text-theme-foreground-muted/50 space-y-1">
                    <p>Multi-select placements to build a combined billing run. Each card stores its own invoice context.</p>
                    <p>All deal intel stays in sync when you reopen Billing AI.</p>
                  </div>
                </section>

                {/* Main Content - Billing Form */}
                <section className="lg:col-span-2 space-y-6">
                  <div className="bg-black/30 border border-theme-border p-4">
                    <p className="text-xs text-theme-foreground-muted uppercase tracking-wider mb-1">Active deal</p>
                    {activeBillingDeal ? (
                      <>
                        <p className="text-xl font-light text-theme-foreground">
                          {placements.find(p => p.id === activeBillingDeal)?.clientFullName}
                        </p>
                        <p className="text-sm text-theme-primary">
                          {placements.find(p => p.id === activeBillingDeal)?.songTitle}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xl font-light text-theme-foreground">Select a placement</p>
                        <p className="text-sm text-theme-foreground-muted">Choose a deal card on the left to auto-populate invoice data, bookkeeping notes, and payment instructions.</p>
                      </>
                    )}
                  </div>

                  <form className="space-y-8" onSubmit={handleBillingSubmit}>
                    {/* Producer/Client Info */}
                    <section className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Producer Legal Name</label>
                          <input
                            type="text"
                            value={billingData.billingClientName}
                            onChange={(e) => setBillingData({...billingData, billingClientName: e.target.value})}
                            className={inputClass}
                            placeholder="Producer's legal name"
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
                    </section>

                    {/* Bill To Section */}
                    <fieldset className="space-y-4 bg-black/30 border border-theme-border p-4">
                      <div className="flex items-center justify-between">
                        <legend className="text-xs text-theme-foreground-muted uppercase tracking-wider px-2">Bill To (Via Email Section)</legend>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowBillingContactPicker(!showBillingContactPicker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-theme-primary hover:text-white bg-theme-primary/10 hover:bg-theme-primary/20 border border-theme-border-hover transition-colors"
                          >
                            <BookUser className="w-3.5 h-3.5" />
                            Autofill from Contacts
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showBillingContactPicker ? 'rotate-180' : ''}`} />
                          </button>
                          {showBillingContactPicker && (
                            <div className="absolute right-0 mt-1 w-72 max-h-64 overflow-y-auto bg-theme-card border border-theme-border-strong shadow-xl z-50">
                              {businessContacts.length === 0 ? (
                                <div className="p-3 text-sm text-theme-foreground-muted text-center">
                                  No contacts found. Add contacts in the Contacts tab.
                                </div>
                              ) : (
                                <div className="py-1">
                                  {businessContacts.map((contact) => (
                                    <button
                                      key={contact.id}
                                      type="button"
                                      onClick={() => handleAutofillBillingFromContact(contact)}
                                      className="w-full px-3 py-2 text-left hover:bg-theme-primary/10 transition-colors"
                                    >
                                      <div className="text-sm text-theme-foreground">{contact.companyName}</div>
                                      <div className="text-xs text-theme-foreground-muted">{contact.contactName} • {contact.category.toLowerCase()}</div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-theme-foreground-muted/50 -mt-2">This information appears in the "Via Email" section of the invoice</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={labelClass}>Company Name</label>
                          <input
                            type="text"
                            value={billingData.billingLabelName}
                            onChange={(e) => setBillingData({...billingData, billingLabelName: e.target.value})}
                            className={inputClass}
                            placeholder="Label or company name"
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Attn (Contact Name)</label>
                          <input
                            type="text"
                            value={billingData.billingBillToContact}
                            onChange={(e) => setBillingData({...billingData, billingBillToContact: e.target.value})}
                            className={inputClass}
                            placeholder="Contact person name"
                          />
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Street Address</label>
                        <input
                          type="text"
                          value={billingData.billingClientAddress}
                          onChange={(e) => setBillingData({...billingData, billingClientAddress: e.target.value})}
                          className={inputClass}
                          placeholder="123 Label Street"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div>
                          <label className={labelClass}>Email</label>
                          <input
                            type="email"
                            value={billingData.billingBillToEmail}
                            onChange={(e) => setBillingData({...billingData, billingBillToEmail: e.target.value})}
                            className={inputClass}
                            placeholder="finance@label.com"
                          />
                        </div>
                      </div>
                    </fieldset>

                    {/* Invoice Details */}
                    <section className="space-y-6">

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
                        <h3 className="text-xs text-theme-foreground-muted uppercase tracking-wider">Invoice Preview</h3>
                        <button
                          type="button"
                          onClick={handleDraftInvoice}
                          disabled={!activeBillingDeal}
                          className="px-4 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Draft Invoice with Billing AI
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button type="button" className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors">
                          Save Invoice Draft
                        </button>
                        <button type="button" className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors">
                          Export Invoice (HTML)
                        </button>
                        <button type="button" className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors">
                          Export Invoice (DOC)
                        </button>
                        <button type="button" className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors">
                          Export Invoice (PDF)
                        </button>
                        <button type="button" className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors">
                          Export Billing Package (JSON)
                        </button>
                        <span className="text-xs text-theme-foreground-muted/50">No draft saved yet.</span>
                      </div>

                      <div className="bg-black/30 border border-theme-border p-6">
                        <div className="bg-white rounded-lg p-8 text-gray-900 font-serif" style={{ fontFamily: 'Times New Roman, serif' }}>
                          {!showInvoicePreview || !activeBillingDeal ? (
                            <div className="text-center text-sm text-gray-500 py-12">
                              Invoice draft will appear here once you select a placement.
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {/* Producer Tour Letterhead */}
                              <div className="text-center border-b border-gray-300 pb-4">
                                <h1 className="text-2xl font-bold tracking-wide" style={{ fontFamily: 'Arial Black, sans-serif', color: '#8B7355' }}>
                                  Producer Tour LLC
                                </h1>
                                <p className="text-sm text-gray-600 mt-1">7143 State Road 54</p>
                                <p className="text-sm text-gray-600">New Port Richey, FL 34653</p>
                                <p className="text-sm text-blue-600">Royalties@ProducerTour.Com</p>
                                <p className="text-sm text-gray-600">+1 (424) 274-9044</p>
                              </div>

                              {/* Date and Bill To */}
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm underline font-semibold">Via Email</p>
                                  <p className="text-sm mt-1">{billingData.billingLabelName || 'COMPANY NAME'}</p>
                                  <p className="text-sm">{billingData.billingClientAddress || 'COMPANY ADDRESS'}</p>
                                  <p className="text-sm">{billingData.billingClientCity || 'CITY, STATE ZIP CODE'}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm">
                                    {billingData.billingIssueDate
                                      ? new Date(billingData.billingIssueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
                                      : 'Date Not Set'}
                                  </p>
                                </div>
                              </div>

                              {/* INVOICE Title */}
                              <div className="text-center py-2">
                                <h2 className="text-lg font-bold underline">INVOICE</h2>
                              </div>

                              {/* RE: Line */}
                              <div className="text-sm">
                                <p>
                                  <span className="font-bold">RE:</span>{' '}
                                  {billingData.billingClientName || 'PRODUCER FULL NAME'} p/k/a "{billingData.billingClientPKA || 'PRODUCER NAME'}" ("Producer") t/p{' '}
                                  {billingData.billingArtistLegal || 'ARTIST FULL NAME'} p/k/a "{billingData.billingArtistStage || 'ARTIST NAME'}" ("Artist") – Invoice #{billingData.billingInvoiceNumber || 'PT-0000-00-00000'}
                                </p>
                              </div>

                              {/* Artist/Song/Label/Due Date Table */}
                              <table className="w-full border-collapse border border-gray-400 text-sm">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border border-gray-400 p-2 text-left font-bold">ARTIST</th>
                                    <th className="border border-gray-400 p-2 text-left font-bold">SONG</th>
                                    <th className="border border-gray-400 p-2 text-left font-bold">LABEL</th>
                                    <th className="border border-gray-400 p-2 text-left font-bold">DUE DATE</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-gray-400 p-2">{billingData.billingArtistStage || ''}</td>
                                    <td className="border border-gray-400 p-2">{billingData.billingProjectTitle || ''}</td>
                                    <td className="border border-gray-400 p-2">{billingData.billingLabelName || ''}</td>
                                    <td className="border border-gray-400 p-2">Upon Receipt</td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* Description of Services Table */}
                              <table className="w-full border-collapse border border-gray-400 text-sm">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="border border-gray-400 p-2 text-left font-bold">DESCRIPTION OF SERVICES</th>
                                    <th className="border border-gray-400 p-2 text-center font-bold w-24">COSTS/EXP.</th>
                                    <th className="border border-gray-400 p-2 text-center font-bold w-28">FEE/ADVANCE</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-gray-400 p-2">
                                      Fee for production services in connection with one (1) master recording of musical composition entitled "{billingData.billingProjectTitle || 'SONG TITLE'}" by {billingData.billingArtistStage || 'ARTIST NAME'}
                                    </td>
                                    <td className="border border-gray-400 p-2 text-center">{billingData.billingCostsExpenses || 'n/a'}</td>
                                    <td className="border border-gray-400 p-2 text-center">${billingData.billingAmount || '0.00'}</td>
                                  </tr>
                                  {/* Empty rows for additional line items */}
                                  <tr>
                                    <td className="border border-gray-400 p-2 h-8"></td>
                                    <td className="border border-gray-400 p-2"></td>
                                    <td className="border border-gray-400 p-2"></td>
                                  </tr>
                                  <tr>
                                    <td className="border border-gray-400 p-2 h-8"></td>
                                    <td className="border border-gray-400 p-2"></td>
                                    <td className="border border-gray-400 p-2"></td>
                                  </tr>
                                </tbody>
                              </table>

                              {/* Totals */}
                              <div className="flex justify-end">
                                <table className="border-collapse border border-gray-400 text-sm w-64">
                                  <tbody>
                                    <tr>
                                      <td className="border border-gray-400 p-2 text-right tracking-widest">S u b t o t a l</td>
                                      <td className="border border-gray-400 p-2 text-right w-24">${billingData.billingAmount || '0.00'}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-gray-400 p-2 text-right tracking-widest">S a l e s  T a x</td>
                                      <td className="border border-gray-400 p-2 text-right">{billingData.billingSalesTax || '$0.00'}</td>
                                    </tr>
                                    <tr>
                                      <td className="border border-gray-400 p-2 text-right tracking-widest">A m o u n t<br/>P a i d</td>
                                      <td className="border border-gray-400 p-2 text-right">{billingData.billingAmountPaid || '$0.00'}</td>
                                    </tr>
                                    <tr className="font-bold">
                                      <td className="border border-gray-400 p-2 text-right tracking-widest">T o t a l  D u e</td>
                                      <td className="border border-gray-400 p-2 text-right">${billingData.billingAmount || '0.00'}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>

                              {/* Payment Instructions */}
                              <div className="text-sm pt-4 border-t border-gray-300">
                                <p className="mb-2">Please mail check payable to Producer Tour LLC to the address above or send via wire to:</p>
                                <div className="space-y-0.5">
                                  <p><span className="font-semibold">Name:</span> Producer Tour LLC</p>
                                  <p><span className="font-semibold">Bank Name:</span> Truist Bank</p>
                                  <p><span className="font-semibold">Bank Address:</span> 6500 Massachusetts Ave, New Port Richey, FL 34653</p>
                                  <p><span className="font-semibold">Account Number:</span> 1100028572520</p>
                                  <p><span className="font-semibold">Routing Number:</span> 263191387</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-theme-foreground-muted/50 text-center">
                        {showInvoicePreview && activeBillingDeal
                          ? 'Edit the fields above to update the preview. Export when ready.'
                          : 'Review the generated invoice, make edits in the fields above, then export or send when ready.'
                        }
                      </p>
                    </section>

                    {/* Banking Details */}
                    <fieldset className="space-y-4 bg-black/30 border border-theme-border p-4">
                      <legend className="text-xs text-theme-foreground-muted uppercase tracking-wider">Wire / Banking Details</legend>
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
                        className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors"
                        disabled={createBillingInvoiceMutation.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={!activeBillingDeal || createBillingInvoiceMutation.isPending}
                        className="px-4 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {createBillingInvoiceMutation.isPending ? 'Creating Invoice...' : 'Create Invoice & Send to Billing Hub'}
                      </button>
                    </div>
                    <p className="text-xs text-theme-foreground-muted/50 text-center mt-2">
                      Invoice will appear in the Billing Hub with FEE type (20% commission). You can review and process payment from there.
                    </p>
                  </form>
                </section>
              </div>
            </div>
          </div>
        )}

        {/* Legal AI Modal */}
        {showLegalModal && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="relative overflow-hidden bg-theme-card w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-theme-border-strong p-6 sm:p-8 space-y-6">
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs text-theme-primary tracking-wider uppercase mb-1">Legal AI Tool</p>
                  <h2 className="text-2xl font-light text-theme-foreground">AI Legal Workspace</h2>
                  <p className="text-sm text-theme-foreground mt-1">Legal AI assists with contract review, redline tracking, agreement drafting, and legal term analysis for your placements.</p>
                </div>
                <button
                  onClick={() => setShowLegalModal(false)}
                  className="px-4 py-2 border border-theme-border-strong text-theme-foreground-secondary hover:text-white hover:bg-white/5 text-sm transition-colors"
                >
                  Close
                </button>
              </div>

              {/* AI Chat - Prominent at top */}
              <div className="bg-gradient-to-r from-theme-primary/10 to-transparent border border-theme-primary/30 rounded-lg p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-theme-primary rounded-full animate-pulse" />
                  <p className="text-sm font-medium text-theme-primary">Ask Legal AI</p>
                  <span className="text-xs text-theme-foreground">— Ask about contracts, royalties, splits, or any music business legal question</span>
                </div>
                <div className="bg-black/30 rounded p-3 max-h-[250px] overflow-y-auto space-y-2">
                  {aiChatMessages.length === 0 ? (
                    <div className="text-center py-4">
                      <p className="text-sm text-theme-foreground">No messages yet. Try asking:</p>
                      <div className="mt-2 flex flex-wrap gap-2 justify-center">
                        <button
                          onClick={() => setAiChatInput("What should I look for in a producer agreement?")}
                          className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 border border-theme-border rounded-full text-theme-foreground-secondary transition-colors"
                        >
                          What should I look for in a producer agreement?
                        </button>
                        <button
                          onClick={() => setAiChatInput("Explain master royalties vs publishing royalties")}
                          className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 border border-theme-border rounded-full text-theme-foreground-secondary transition-colors"
                        >
                          Explain master vs publishing royalties
                        </button>
                        <button
                          onClick={() => setAiChatInput("What is a typical producer split for streaming?")}
                          className="text-xs px-3 py-1 bg-white/5 hover:bg-white/10 border border-theme-border rounded-full text-theme-foreground-secondary transition-colors"
                        >
                          Typical producer split for streaming?
                        </button>
                      </div>
                    </div>
                  ) : (
                    aiChatMessages.map((msg, i) => (
                      <div key={i} className={`p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-theme-primary/20 ml-8' : 'bg-white/10 mr-8'}`}>
                        <span className="text-xs font-medium text-theme-foreground-secondary">{msg.role === 'user' ? 'You' : 'Legal AI'}:</span>
                        <p className="text-theme-foreground mt-1 whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="p-3 rounded-lg text-sm bg-white/10 mr-8">
                      <span className="text-xs font-medium text-theme-foreground-secondary">Legal AI:</span>
                      <p className="text-theme-foreground mt-1 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Thinking...
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiChatInput}
                    onChange={(e) => setAiChatInput(e.target.value)}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter' && aiChatInput.trim() && !isChatting) {
                        const message = aiChatInput.trim();
                        setAiChatInput('');
                        setIsChatting(true);
                        setAiChatMessages(prev => [...prev, { role: 'user', content: message }]);
                        try {
                          const response = await aiApi.chat(message, aiChatMessages);
                          setAiChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
                        } catch (error: any) {
                          toast.error(error.response?.data?.error || 'Chat failed');
                        } finally {
                          setIsChatting(false);
                        }
                      }
                    }}
                    className={`${inputClass} flex-1`}
                    placeholder="Ask a legal question..."
                    disabled={isChatting}
                  />
                  <button
                    onClick={async () => {
                      if (!aiChatInput.trim() || isChatting) return;
                      const message = aiChatInput.trim();
                      setAiChatInput('');
                      setIsChatting(true);
                      setAiChatMessages(prev => [...prev, { role: 'user', content: message }]);
                      try {
                        const response = await aiApi.chat(message, aiChatMessages);
                        setAiChatMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
                      } catch (error: any) {
                        toast.error(error.response?.data?.error || 'Chat failed');
                      } finally {
                        setIsChatting(false);
                      }
                    }}
                    disabled={isChatting || !aiChatInput.trim()}
                    className="px-6 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded"
                  >
                    {isChatting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ask'}
                  </button>
                  {aiChatMessages.length > 0 && (
                    <button
                      onClick={() => setAiChatMessages([])}
                      className="px-3 py-2 text-xs text-theme-foreground-muted hover:text-white border border-theme-border hover:bg-white/5 transition-colors rounded"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar - Selected Deals */}
                <section className="space-y-4">
                  <div className="bg-theme-primary/10 border border-theme-border-hover p-4">
                    <p className="text-sm text-theme-primary">
                      {selectedPlacements.size > 0 ? `${selectedPlacements.size} placements selected` : 'Select placements for legal review.'}
                    </p>
                    <p className="text-xs text-theme-foreground mt-1">Click rows in the tracker to mark which deals need legal attention.</p>
                  </div>
                  <div className="space-y-3">
                    {selectedPlacements.size === 0 ? (
                      <p className="text-sm text-theme-foreground">No deals selected yet.</p>
                    ) : (
                      Array.from(selectedPlacements).map(id => {
                        const placement = placements.find(p => p.id === id);
                        if (!placement) return null;
                        const statusColor = placement.agreement === 'Fully Executed' ? 'bg-emerald-500' :
                                          placement.agreement === 'In Legal Review' ? 'bg-theme-primary' : 'bg-white/30';
                        return (
                          <div
                            key={id}
                            className="border border-theme-border bg-black/30 p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="text-sm text-theme-foreground">{placement.clientFullName}</div>
                              <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
                            </div>
                            <div className="text-xs text-theme-foreground-secondary mb-1">{placement.songTitle} - {placement.artistName}</div>
                            <div className="text-xs text-theme-foreground-secondary">Status: {placement.agreement}</div>
                            {placement.status && (
                              <div className="text-xs text-theme-primary mt-1">Action: {placement.status}</div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="text-xs text-theme-foreground space-y-1">
                    <p>Legal AI tracks agreement status, redlines, and contract versions for each placement.</p>
                    <p>Upload contracts or paste links to enable AI-powered analysis.</p>
                  </div>
                </section>

                {/* Main Content - Legal Tools */}
                <section className="lg:col-span-2 space-y-6">
                  {/* Contract Analysis Section */}
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <div>
                      <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider mb-2">Contract Review</p>
                      <p className="text-sm text-theme-foreground font-normal">Upload or link to contracts for AI-powered analysis and redline tracking.</p>
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
                      <div className="border-2 border-dashed border-theme-border-strong p-6 text-center hover:border-theme-border-hover transition-colors">
                        <div className="text-theme-foreground-secondary text-sm mb-2">
                          <svg className="mx-auto h-12 w-12 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Drop contract file here or click to browse
                        </div>
                        <p className="text-xs text-theme-foreground-secondary">PDF, DOC, DOCX up to 10MB</p>
                      </div>
                    </div>
                  </div>

                  {/* Contract Text Input for Analysis */}
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider">Contract Text for AI Analysis</p>
                    <textarea
                      value={contractText}
                      onChange={(e) => setContractText(e.target.value)}
                      className={inputClass}
                      rows={6}
                      placeholder="Paste your contract text here for AI analysis..."
                    />
                  </div>

                  {/* AI Analysis Tools */}
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider">Legal AI Actions</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={async () => {
                          if (!contractText.trim()) {
                            toast.error('Please paste contract text to analyze');
                            return;
                          }
                          setIsAnalyzing(true);
                          setAiAnalysisResult(null);
                          try {
                            const response = await aiApi.analyzeContract(contractText);
                            setAiAnalysisResult(response.data.analysis);
                            toast.success('Contract analyzed successfully!');
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Failed to analyze contract');
                          } finally {
                            setIsAnalyzing(false);
                          }
                        }}
                        disabled={isAnalyzing || !contractText.trim()}
                        className="group px-4 py-3 bg-theme-primary text-black text-sm text-left hover:bg-theme-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium mb-1 flex items-center gap-2">
                          {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin" />}
                          Analyze Contract
                        </div>
                        <div className="text-xs opacity-70">Review terms, identify issues, suggest improvements</div>
                      </button>

                      <button
                        onClick={async () => {
                          const selectedPlacement = selectedPlacements.size > 0
                            ? placements.find(p => selectedPlacements.has(p.id))
                            : null;

                          if (!selectedPlacement) {
                            toast.error('Please select a placement to generate an agreement');
                            return;
                          }
                          setIsGenerating(true);
                          setAiGeneratedContract('');
                          try {
                            const response = await aiApi.generateContract({
                              dealType: selectedDealType,
                              clientName: selectedPlacement.clientFullName,
                              clientPKA: selectedPlacement.clientPKA,
                              artistName: selectedPlacement.artistName,
                              songTitle: selectedPlacement.songTitle,
                              labelName: selectedPlacement.label,
                              advance: selectedPlacement.advance,
                              masterRoyalty: selectedPlacement.masterRoyalty,
                              publishingPercent: selectedPlacement.pubPercent,
                              soundExchangeLOD: selectedPlacement.sxLOD,
                            });
                            setAiGeneratedContract(response.data.contract);
                            toast.success('Agreement generated successfully!');
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Failed to generate agreement');
                          } finally {
                            setIsGenerating(false);
                          }
                        }}
                        disabled={isGenerating || selectedPlacements.size === 0}
                        className="px-4 py-3 bg-white/10 border border-theme-border-strong text-white text-sm text-left hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium mb-1 flex items-center gap-2">
                          {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                          Generate Agreement
                        </div>
                        <div className="text-xs text-theme-foreground-secondary">Create producer agreement from placement data</div>
                      </button>

                      <button className="px-4 py-3 bg-white/10 border border-theme-border-strong text-white text-sm text-left hover:bg-white/20 transition-colors opacity-50 cursor-not-allowed">
                        <div className="font-medium mb-1">Track Redlines</div>
                        <div className="text-xs text-theme-foreground-secondary">Compare versions and track changes (Coming soon)</div>
                      </button>

                      <button
                        onClick={async () => {
                          if (!legalTermsInput.trim()) {
                            toast.error('Please enter terms to explain');
                            return;
                          }
                          setIsExplainingTerms(true);
                          setTermExplanations([]);
                          try {
                            const terms = legalTermsInput.split(',').map(t => t.trim()).filter(Boolean);
                            const response = await aiApi.explainTerms(terms);
                            setTermExplanations(response.data.explanations);
                            toast.success('Terms explained!');
                          } catch (error: any) {
                            toast.error(error.response?.data?.error || 'Failed to explain terms');
                          } finally {
                            setIsExplainingTerms(false);
                          }
                        }}
                        disabled={isExplainingTerms || !legalTermsInput.trim()}
                        className="px-4 py-3 bg-white/10 border border-theme-border-strong text-white text-sm text-left hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="font-medium mb-1 flex items-center gap-2">
                          {isExplainingTerms && <Loader2 className="w-4 h-4 animate-spin" />}
                          Explain Terms
                        </div>
                        <div className="text-xs text-theme-foreground-secondary">Plain English explanations of legal clauses</div>
                      </button>
                    </div>

                    {/* Deal Type Selector for Agreement Generation */}
                    <div className="mt-4">
                      <label className={labelClass}>Agreement Type (for Generate)</label>
                      <select
                        value={selectedDealType}
                        onChange={(e) => setSelectedDealType(e.target.value as any)}
                        className={inputClass}
                      >
                        <option value="producer_agreement">Producer Agreement</option>
                        <option value="sync_license">Sync License</option>
                        <option value="work_for_hire">Work for Hire</option>
                        <option value="split_sheet">Split Sheet</option>
                        <option value="beat_lease">Beat Lease</option>
                      </select>
                    </div>

                    {/* Terms Input for Explain Terms */}
                    <div className="mt-4">
                      <label className={labelClass}>Legal Terms to Explain (comma-separated)</label>
                      <input
                        type="text"
                        value={legalTermsInput}
                        onChange={(e) => setLegalTermsInput(e.target.value)}
                        className={inputClass}
                        placeholder="e.g., recoupment, mechanical royalty, sync license, reversion"
                      />
                    </div>
                  </div>

                  {/* Legal Terms Reference */}
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider">Deal Terms & Legal Notes</p>

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
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider">Legal Fee Information</p>

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
                  <div className="bg-black/30 border border-theme-border p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-theme-foreground-secondary uppercase tracking-wider">AI Analysis Results</p>
                      <span className="text-xs text-theme-foreground-secondary">{aiAnalysisResult || aiGeneratedContract || termExplanations.length > 0 ? 'Results ready' : 'No analysis run yet'}</span>
                    </div>

                    <div className="bg-white rounded-lg p-6 text-gray-900 min-h-[200px] max-h-[500px] overflow-y-auto">
                      {isAnalyzing || isGenerating || isExplainingTerms ? (
                        <div className="flex flex-col items-center justify-center h-full">
                          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
                          <p className="text-sm text-gray-500">
                            {isAnalyzing ? 'Analyzing contract...' : isGenerating ? 'Generating agreement...' : 'Explaining terms...'}
                          </p>
                        </div>
                      ) : aiAnalysisResult ? (
                        <div className="space-y-4 text-sm">
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
                            <p className="text-gray-700">{aiAnalysisResult.summary}</p>
                          </div>

                          {aiAnalysisResult.plainEnglishSummary && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Plain English</h4>
                              <p className="text-gray-700">{aiAnalysisResult.plainEnglishSummary}</p>
                            </div>
                          )}

                          {aiAnalysisResult.keyTerms?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-gray-900 mb-2">Key Terms</h4>
                              <div className="space-y-2">
                                {aiAnalysisResult.keyTerms.map((term: any, i: number) => (
                                  <div key={i} className={`p-2 rounded border-l-4 ${
                                    term.concern === 'high' ? 'border-red-500 bg-red-50' :
                                    term.concern === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                                    term.concern === 'low' ? 'border-blue-500 bg-blue-50' :
                                    'border-gray-300 bg-gray-50'
                                  }`}>
                                    <span className="font-medium">{term.term}:</span> {term.explanation}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {aiAnalysisResult.redFlags?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-red-600 mb-2">Red Flags</h4>
                              <ul className="list-disc list-inside text-red-700 space-y-1">
                                {aiAnalysisResult.redFlags.map((flag: string, i: number) => (
                                  <li key={i}>{flag}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {aiAnalysisResult.recommendations?.length > 0 && (
                            <div>
                              <h4 className="font-semibold text-green-600 mb-2">Recommendations</h4>
                              <ul className="list-disc list-inside text-green-700 space-y-1">
                                {aiAnalysisResult.recommendations.map((rec: string, i: number) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : aiGeneratedContract ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Generated Agreement</h4>
                          <pre className="whitespace-pre-wrap text-xs text-gray-700 font-mono bg-gray-50 p-4 rounded max-h-[400px] overflow-y-auto">
                            {aiGeneratedContract}
                          </pre>
                        </div>
                      ) : termExplanations.length > 0 ? (
                        <div className="space-y-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Term Explanations</h4>
                          {termExplanations.map((exp: any, i: number) => (
                            <div key={i} className="p-3 bg-gray-50 rounded">
                              <h5 className="font-semibold text-gray-900">{exp.term}</h5>
                              <p className="text-gray-700 text-sm mt-1"><strong>Definition:</strong> {exp.definition}</p>
                              <p className="text-gray-700 text-sm mt-1"><strong>Music Industry Context:</strong> {exp.musicIndustryContext}</p>
                              <p className="text-gray-700 text-sm mt-1"><strong>Example:</strong> {exp.example}</p>
                              <p className="text-orange-600 text-sm mt-1"><strong>Watch out for:</strong> {exp.watchOutFor}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="text-4xl mb-3">⚖️</div>
                          <p className="text-sm text-gray-500">Legal AI analysis will appear here</p>
                          <p className="text-xs text-gray-400 mt-1">Paste a contract and click "Analyze Contract" to begin</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => {
                          if (aiGeneratedContract) {
                            navigator.clipboard.writeText(aiGeneratedContract);
                            toast.success('Contract copied to clipboard!');
                          } else if (aiAnalysisResult) {
                            navigator.clipboard.writeText(JSON.stringify(aiAnalysisResult, null, 2));
                            toast.success('Analysis copied to clipboard!');
                          }
                        }}
                        disabled={!aiAnalysisResult && !aiGeneratedContract}
                        className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Copy to Clipboard
                      </button>
                      <button
                        onClick={() => {
                          setAiAnalysisResult(null);
                          setAiGeneratedContract('');
                          setTermExplanations([]);
                          setContractText('');
                        }}
                        className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors"
                      >
                        Clear Results
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t border-theme-border">
                    <button
                      onClick={() => setShowLegalModal(false)}
                      className="px-4 py-2 border border-theme-border-strong text-sm text-theme-foreground-secondary hover:text-white hover:bg-white/5 transition-colors"
                    >
                      Close
                    </button>
                    <button className="px-4 py-2 bg-theme-primary text-black text-sm font-medium hover:bg-theme-primary-hover transition-colors">
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