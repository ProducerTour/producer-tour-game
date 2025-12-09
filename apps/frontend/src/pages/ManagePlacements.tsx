import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2, Music, Clock, Plus, X,
  ChevronDown, Search, Users, Calendar, DollarSign, Percent, FileText, Trash2,
  Upload, Download, AlertCircle, FileSpreadsheet, Edit3
} from 'lucide-react';
import toast from 'react-hot-toast';
import { workRegistrationApi, PendingSubmission } from '@/lib/workRegistrationApi';
import { placementApi } from '@/lib/api';
import { SubmissionStatusBadge } from '@/components/SubmissionStatusBadge';
import { SpotifyTrackLookup } from '@/components/SpotifyTrackLookup';
import { CollaboratorForm, Collaborator } from '@/components/CollaboratorForm';
import { audiodbApi } from '@/lib/audiodbApi';

export default function ManagePlacements() {
  const [placements, setPlacements] = useState<PendingSubmission[]>([]);
  const [filteredPlacements, setFilteredPlacements] = useState<PendingSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add Placement Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSpotifyModal, setShowSpotifyModal] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualEntry, setManualEntry] = useState({
    title: '',
    artist: '',
    albumName: '',
    isrc: '',
    genre: '',
    releaseYear: '',
    label: '',
    notes: '',
  });

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // Edit Placement State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<PendingSubmission | null>(null);
  const [editCollaborators, setEditCollaborators] = useState<Collaborator[]>([]);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editEntry, setEditEntry] = useState({
    title: '',
    artist: '',
    albumName: '',
    isrc: '',
    genre: '',
    releaseYear: '',
    label: '',
    notes: '',
  });

  useEffect(() => {
    loadApprovedPlacements();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredPlacements(placements);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredPlacements(
        placements.filter(
          (p) =>
            p.title.toLowerCase().includes(query) ||
            p.artist.toLowerCase().includes(query) ||
            p.caseNumber?.toLowerCase().includes(query) ||
            p.user?.firstName?.toLowerCase().includes(query) ||
            p.user?.lastName?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, placements]);

  const loadApprovedPlacements = async () => {
    try {
      setIsLoading(true);
      const response = await workRegistrationApi.getApprovedPlacements();
      setPlacements(response.data.placements);
      setFilteredPlacements(response.data.placements);
    } catch (error) {
      console.error('Failed to load approved placements:', error);
      toast.error('Failed to load placements');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Delete placement handler
  const handleDeletePlacement = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await placementApi.delete(id);
      toast.success(`"${title}" deleted successfully`);
      // Remove from local state
      setPlacements(prev => prev.filter(p => p.id !== id));
      setFilteredPlacements(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete placement:', error);
      toast.error('Failed to delete placement');
    }
  };

  // Open edit modal
  const openEditModal = (placement: PendingSubmission) => {
    setEditingPlacement(placement);
    setEditEntry({
      title: placement.title || '',
      artist: placement.artist || '',
      albumName: placement.albumName || '',
      isrc: placement.isrc || '',
      genre: placement.genre || '',
      releaseYear: placement.releaseYear || '',
      label: placement.label || '',
      notes: placement.notes || '',
    });
    // Convert credits to collaborators format
    const collabs: Collaborator[] = (placement.credits || []).map((c: any) => ({
      id: c.id,
      firstName: c.firstName || '',
      lastName: c.lastName || '',
      role: c.role || 'WRITER',
      splitPercentage: c.splitPercentage || 0,
      pro: c.pro || '',
      ipiNumber: c.ipiNumber || '',
      isPrimary: c.isPrimary || false,
      notes: c.notes || '',
      userId: c.userId || undefined,
      publisherIpiNumber: c.publisherIpiNumber || '',
      isExternalWriter: c.isExternalWriter || false,
    }));
    setEditCollaborators(collabs);
    setShowEditModal(true);
  };

  // Handle edit submission
  const handleEditSubmit = async () => {
    if (!editingPlacement) return;

    // Validate
    if (!editEntry.title.trim() || !editEntry.artist.trim()) {
      toast.error('Title and artist are required');
      return;
    }

    // Validate splits
    const totalSplit = editCollaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
    if (editCollaborators.length > 0 && Math.abs(100 - totalSplit) > 0.1) {
      toast.error(`Split percentages must equal 100%. Current total: ${totalSplit.toFixed(2)}%`);
      return;
    }

    setIsEditSubmitting(true);

    try {
      await placementApi.update(editingPlacement.id, {
        title: editEntry.title,
        artist: editEntry.artist,
        albumName: editEntry.albumName || undefined,
        isrc: editEntry.isrc || undefined,
        genre: editEntry.genre || undefined,
        releaseYear: editEntry.releaseYear || undefined,
        label: editEntry.label || undefined,
        notes: editEntry.notes || undefined,
        credits: editCollaborators.map((c, idx) => ({
          firstName: c.firstName,
          lastName: c.lastName,
          role: c.role,
          splitPercentage: c.splitPercentage,
          pro: c.pro || undefined,
          ipiNumber: c.ipiNumber || undefined,
          isPrimary: idx === 0,
          notes: c.notes || undefined,
          userId: c.userId || undefined,
          publisherIpiNumber: c.publisherIpiNumber || undefined,
          isExternalWriter: c.isExternalWriter || false,
        })),
      });

      toast.success('Placement updated successfully!');
      setShowEditModal(false);
      setEditingPlacement(null);
      loadApprovedPlacements();
    } catch (error: any) {
      console.error('Failed to update placement:', error);
      toast.error(error.response?.data?.error || 'Failed to update placement');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Handle Spotify track selection
  const handleTrackSelect = async (track: any) => {
    try {
      const enriched = await audiodbApi.enrichPlacementData(
        track.artist,
        track.title,
        track.album
      );

      setSelectedTrack({
        ...track,
        enriched,
      });
      setManualEntry({
        title: track.title,
        artist: track.artist,
        albumName: enriched?.album?.name || track.album || '',
        isrc: track.isrc || '',
        genre: enriched?.artist?.genre || enriched?.album?.genre || '',
        releaseYear: enriched?.album?.year || '',
        label: enriched?.album?.label || '',
        notes: '',
      });
      setShowSpotifyModal(false);
    } catch (error) {
      console.error('AudioDB enrichment error:', error);
      setSelectedTrack(track);
      setManualEntry({
        title: track.title,
        artist: track.artist,
        albumName: track.album || '',
        isrc: track.isrc || '',
        genre: '',
        releaseYear: '',
        label: '',
        notes: '',
      });
      setShowSpotifyModal(false);
    }
  };

  // Reset add form
  const resetAddForm = () => {
    setSelectedTrack(null);
    setCollaborators([]);
    setManualEntry({
      title: '',
      artist: '',
      albumName: '',
      isrc: '',
      genre: '',
      releaseYear: '',
      label: '',
      notes: '',
    });
  };

  // CSV Template columns (supports up to 6 writers)
  const csvTemplateHeaders = [
    'title', 'artist', 'albumName', 'isrc', 'genre', 'releaseYear', 'label',
    'writer1_firstName', 'writer1_lastName', 'writer1_role', 'writer1_split', 'writer1_pro', 'writer1_ipi',
    'writer2_firstName', 'writer2_lastName', 'writer2_role', 'writer2_split', 'writer2_pro', 'writer2_ipi',
    'writer3_firstName', 'writer3_lastName', 'writer3_role', 'writer3_split', 'writer3_pro', 'writer3_ipi',
    'writer4_firstName', 'writer4_lastName', 'writer4_role', 'writer4_split', 'writer4_pro', 'writer4_ipi',
    'writer5_firstName', 'writer5_lastName', 'writer5_role', 'writer5_split', 'writer5_pro', 'writer5_ipi',
    'writer6_firstName', 'writer6_lastName', 'writer6_role', 'writer6_split', 'writer6_pro', 'writer6_ipi',
    'notes'
  ];

  // Download CSV template
  const downloadTemplate = () => {
    const exampleRow = [
      'Song Title', 'Artist Name', 'Album Name', 'USRC12345678', 'Pop', '2024', 'Record Label',
      'John', 'Doe', 'WRITER', '25', 'ASCAP', '123456789',
      'Jane', 'Smith', 'PRODUCER', '25', 'BMI', '987654321',
      'Bob', 'Johnson', 'COMPOSER', '25', 'SESAC', '456789123',
      'Alice', 'Brown', 'LYRICIST', '25', 'ASCAP', '789123456',
      '', '', '', '', '', '',
      '', '', '', '', '', '',
      'Optional notes'
    ];
    const csvContent = [csvTemplateHeaders.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'placement_bulk_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse a CSV line properly (handles quoted values with commas)
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  // Parse CSV file
  const parseCSV = (text: string): any[] => {
    // Normalize line endings
    const normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    console.log('CSV Headers detected:', headers);
    const rows: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      const values = parseCSVLine(lines[i]).map(v => v.replace(/^["']|["']$/g, '').trim());
      const row: any = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      console.log(`Row ${i} data:`, row);

      // Parse writers from row (supports up to 6 writers)
      const writers = [];
      for (let w = 1; w <= 6; w++) {
        const firstName = row[`writer${w}_firstname`] || '';
        const lastName = row[`writer${w}_lastname`] || '';
        if (firstName || lastName) {
          // Parse split percentage - handle %, commas, spaces
          const splitRaw = row[`writer${w}_split`] || '0';
          const splitClean = splitRaw.replace(/[%,\s]/g, '');
          const splitValue = parseFloat(splitClean) || 0;

          writers.push({
            firstName,
            lastName,
            role: row[`writer${w}_role`] || 'WRITER',
            splitPercentage: splitValue,
            pro: row[`writer${w}_pro`] || '',
            ipiNumber: row[`writer${w}_ipi`] || '',
          });
        }
      }

      rows.push({
        title: row.title || '',
        artist: row.artist || '',
        albumName: row.albumname || '',
        isrc: row.isrc || '',
        genre: row.genre || '',
        releaseYear: row.releaseyear || '',
        label: row.label || '',
        notes: row.notes || '',
        writers,
      });
    }

    return rows;
  };

  // Handle CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseCSV(text);

        // Validate parsed data
        const errors: string[] = [];
        const validRows: any[] = [];
        const duplicateWarnings: string[] = [];

        // First pass: basic validation
        for (let idx = 0; idx < parsed.length; idx++) {
          const row = parsed[idx];
          const rowNum = idx + 2; // +2 because row 1 is headers, and we're 0-indexed

          if (!row.title) {
            errors.push(`Row ${rowNum}: Missing title`);
            continue;
          }
          if (!row.artist) {
            errors.push(`Row ${rowNum}: Missing artist`);
            continue;
          }

          // Validate writers
          if (row.writers.length === 0) {
            errors.push(`Row ${rowNum}: No writers/collaborators defined`);
            continue;
          }

          const totalSplit = row.writers.reduce((sum: number, w: any) => sum + w.splitPercentage, 0);
          if (Math.abs(totalSplit - 100) > 0.01) {
            const splitDetails = row.writers.map((w: any) => `${w.firstName} ${w.lastName}: ${w.splitPercentage}%`).join(', ');
            errors.push(`Row ${rowNum}: Split percentages equal ${totalSplit.toFixed(2)}%, must equal 100% (${splitDetails})`);
            continue;
          }

          validRows.push({ ...row, rowNum });
        }

        // Second pass: check for duplicates in the database
        toast.loading('Checking for duplicates...', { id: 'duplicate-check' });
        const finalValidRows: any[] = [];

        for (const row of validRows) {
          try {
            const duplicateCheck = await placementApi.checkDuplicate(row.title);
            if (duplicateCheck.data.isDuplicate) {
              const existing = duplicateCheck.data.existingPlacement;
              duplicateWarnings.push(
                `Row ${row.rowNum}: "${row.title}" already exists${existing.caseNumber ? ` (Case: ${existing.caseNumber})` : ''}`
              );
            } else {
              finalValidRows.push(row);
            }
          } catch (error) {
            // If duplicate check fails, still allow the row
            console.warn(`Duplicate check failed for row ${row.rowNum}:`, error);
            finalValidRows.push(row);
          }
        }

        toast.dismiss('duplicate-check');

        // Add duplicate warnings to errors
        const allIssues = [...errors, ...duplicateWarnings.map(w => `⚠️ DUPLICATE: ${w}`)];

        setBulkErrors(allIssues);
        setBulkData(finalValidRows);

        if (finalValidRows.length > 0) {
          toast.success(`Parsed ${finalValidRows.length} valid placement${finalValidRows.length !== 1 ? 's' : ''}`);
        }
        if (duplicateWarnings.length > 0) {
          toast(`${duplicateWarnings.length} duplicate${duplicateWarnings.length !== 1 ? 's' : ''} found and skipped`, { icon: '⚠️' });
        }
        if (errors.length > 0) {
          toast.error(`${errors.length} row${errors.length !== 1 ? 's' : ''} have errors`);
        }
      } catch (error) {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
        toast.dismiss('duplicate-check');
      }
    };
    reader.readAsText(file);
  };

  // Submit bulk placements
  const handleBulkSubmit = async () => {
    if (bulkData.length === 0) {
      toast.error('No valid placements to import');
      return;
    }

    setIsBulkSubmitting(true);
    setBulkProgress({ current: 0, total: bulkData.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < bulkData.length; i++) {
      const row = bulkData[i];
      setBulkProgress({ current: i + 1, total: bulkData.length });

      try {
        const placementData = {
          title: row.title,
          artist: row.artist,
          platform: 'OTHER',
          releaseDate: new Date().toISOString(),
          isrc: row.isrc || undefined,
          status: 'APPROVED',
          albumName: row.albumName || undefined,
          genre: row.genre || undefined,
          releaseYear: row.releaseYear || undefined,
          label: row.label || undefined,
          notes: row.notes || undefined,
          credits: row.writers.map((w: any, idx: number) => ({
            firstName: w.firstName,
            lastName: w.lastName,
            role: w.role,
            splitPercentage: w.splitPercentage,
            pro: w.pro || undefined,
            ipiNumber: w.ipiNumber || undefined,
            isPrimary: idx === 0,
          })),
          skipDuplicateCheck: false,
        };

        await placementApi.create(placementData);
        successCount++;
      } catch (error: any) {
        console.error(`Failed to create placement: ${row.title}`, error);
        failCount++;
      }
    }

    setIsBulkSubmitting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} placement${successCount !== 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to import ${failCount} placement${failCount !== 1 ? 's' : ''}`);
    }

    // Reset and reload
    setShowBulkModal(false);
    setBulkData([]);
    setBulkErrors([]);
    loadApprovedPlacements();
  };

  // Submit new placement
  const handleSubmitPlacement = async () => {
    // Validation
    if (!manualEntry.title.trim() || !manualEntry.artist.trim()) {
      toast.error('Title and artist are required');
      return;
    }

    // Validate collaborators - splits must equal exactly 100%
    const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
    const isExactly100 = Math.abs(100 - totalSplit) < 0.01;

    if (!isExactly100) {
      toast.error(`Split percentages must equal exactly 100%. Current total: ${totalSplit.toFixed(2)}%`);
      return;
    }

    if (collaborators.length === 0) {
      toast.error('Please add at least one collaborator with split percentages');
      return;
    }

    // Check for duplicates
    try {
      const duplicateCheck = await placementApi.checkDuplicate(manualEntry.title);
      if (duplicateCheck.data.isDuplicate) {
        const existing = duplicateCheck.data.existingPlacement;
        toast.error(
          <div>
            <div className="font-semibold">Duplicate Song Detected</div>
            <div className="text-sm text-gray-400 mt-1">
              "{existing.title}" already exists
              {existing.caseNumber && ` (Case: ${existing.caseNumber})`}
            </div>
          </div>,
          { duration: 5000, icon: '⚠️' }
        );
        return;
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
    }

    setIsSubmitting(true);

    try {
      const placementData = {
        title: manualEntry.title,
        artist: manualEntry.artist,
        platform: 'SPOTIFY',
        releaseDate: new Date().toISOString(),
        isrc: manualEntry.isrc || undefined,
        spotifyTrackId: selectedTrack?.id,
        status: 'APPROVED', // Admin creates directly as approved
        albumName: manualEntry.albumName || undefined,
        genre: manualEntry.genre || undefined,
        releaseYear: manualEntry.releaseYear || undefined,
        label: manualEntry.label || undefined,
        albumArtUrl: selectedTrack?.enriched?.album?.thumbnail || selectedTrack?.image,
        albumArtHQUrl: selectedTrack?.enriched?.album?.thumbnailHQ,
        artistThumbUrl: selectedTrack?.enriched?.artist?.thumbnail,
        artistBio: selectedTrack?.enriched?.artist?.biography,
        musicbrainzId: selectedTrack?.enriched?.album?.musicbrainzId || selectedTrack?.enriched?.artist?.musicbrainzId,
        audioDbArtistId: selectedTrack?.enriched?.artist?.id,
        audioDbAlbumId: selectedTrack?.enriched?.album?.id,
        audioDbData: selectedTrack?.enriched,
        notes: manualEntry.notes || undefined,
        credits: collaborators.map(c => ({
          firstName: c.firstName,
          lastName: c.lastName,
          role: c.role,
          splitPercentage: c.splitPercentage,
          pro: c.pro || undefined,
          ipiNumber: c.ipiNumber || undefined,
          isPrimary: c.isPrimary || false,
          notes: c.notes || undefined,
          userId: c.userId || undefined,
          publisherIpiNumber: c.publisherIpiNumber || undefined,
          isExternalWriter: c.isExternalWriter || false,
        })),
        skipDuplicateCheck: true, // Already checked above
      };

      await placementApi.create(placementData);

      toast.success('Placement added successfully!');

      // Reset form and close modal
      setShowAddModal(false);
      resetAddForm();

      // Reload placements
      loadApprovedPlacements();
    } catch (error: any) {
      console.error('Failed to create placement:', error);
      toast.error(error.response?.data?.error || 'Failed to create placement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stats
  const totalPlacements = placements.length;
  const approvedCount = placements.filter(p => p.status === 'APPROVED').length;
  const trackingCount = placements.filter(p => p.status === 'TRACKING').length;
  const completedCount = placements.filter(p => p.status === 'COMPLETED').length;

  // Collaborator split calculation
  const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
  const isValidSplit = Math.abs(100 - totalSplit) < 0.01;

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-light text-theme-foreground">Manage Placements</h1>
          <p className="text-theme-foreground-muted mt-1">View and manage approved work registrations</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Bulk Import Button */}
          <button
            onClick={() => setShowBulkModal(true)}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-theme-foreground font-medium flex items-center gap-2 transition-colors"
          >
            <Upload className="w-5 h-5" />
            Bulk Import
          </button>

          {/* Add Placement Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Placement
          </button>

          {/* Search */}
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-foreground-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, artist, case #, or writer..."
              className="w-full pl-10 pr-4 py-3 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Total Placements</p>
              <p className="text-3xl font-light text-theme-foreground">{totalPlacements}</p>
            </div>
            <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
              <Music className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Approved</p>
              <p className="text-3xl font-light text-theme-foreground">{approvedCount}</p>
            </div>
            <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Tracking</p>
              <p className="text-3xl font-light text-theme-foreground">{trackingCount}</p>
            </div>
            <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300 border-t-2 border-t-theme-primary">
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-theme-foreground-muted uppercase tracking-[0.2em] mb-2">Completed</p>
              <p className="text-3xl font-light text-theme-foreground">{completedCount}</p>
            </div>
            <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-theme-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPlacements.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 bg-theme-primary/10 flex items-center justify-center">
            <Music className="w-10 h-10 text-theme-primary" />
          </div>
          <h3 className="text-2xl font-light text-theme-foreground mb-2">No Placements Yet</h3>
          <p className="text-theme-foreground-muted mb-6">
            {searchQuery ? 'No placements match your search.' : 'Approved work registrations will appear here.'}
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-theme-primary hover:bg-theme-primary-hover text-black font-medium inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Placement
          </button>
        </div>
      )}

      {/* Placements List */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-4">
          {filteredPlacements.map((placement, index) => (
            <motion.div
              key={placement.id}
              className="relative overflow-hidden bg-theme-card border border-theme-border hover:border-theme-border-hover transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              layout
            >
              <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
              {/* Main Content */}
              <div
                className="p-6 cursor-pointer hover:bg-black/30 transition-colors"
                onClick={() => toggleExpand(placement.id)}
              >
                <div className="flex items-start gap-6">
                  {/* Album Art */}
                  <div className="flex-shrink-0">
                    {placement.albumArtUrl ? (
                      <motion.img
                        src={placement.albumArtUrl}
                        alt={placement.title}
                        className="w-24 h-24 rounded-lg object-cover shadow-xl"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center shadow-xl">
                        <Music className="w-12 h-12 text-text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-bold text-theme-foreground">{placement.title}</h3>
                          {placement.caseNumber && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-300 rounded text-xs font-mono border border-green-500/30">
                              {placement.caseNumber}
                            </span>
                          )}
                          {expandedId !== placement.id && (
                            <span className="text-text-muted text-xs flex items-center gap-1">
                              <ChevronDown className="w-3 h-3" />
                              Click to expand
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-lg">{placement.artist}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <SubmissionStatusBadge status={placement.status} />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(placement);
                          }}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Edit placement"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlacement(placement.id, placement.title);
                          }}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete placement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Writer Info & Metadata */}
                    <div className="flex flex-wrap gap-3">
                      {placement.user && (
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <Users className="w-4 h-4" />
                          <span>{placement.user.firstName} {placement.user.lastName}</span>
                        </div>
                      )}
                      {placement.reviewedAt && (
                        <div className="flex items-center gap-2 text-sm text-text-muted">
                          <Calendar className="w-4 h-4" />
                          <span>Approved {formatDate(placement.reviewedAt)}</span>
                        </div>
                      )}
                      {placement.genre && (
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm border border-blue-500/30">
                          {placement.genre}
                        </span>
                      )}
                      {placement.credits && placement.credits.length > 0 && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm border border-purple-500/30">
                          {placement.credits.length} collaborator{placement.credits.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === placement.id && (
                <div className="px-6 pb-6 border-t border-white/[0.08]">
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Column - Song Info */}
                    <div className="space-y-4">
                      <h4 className="text-theme-foreground font-semibold mb-3">Song Information</h4>
                      <div>
                        <p className="text-text-muted text-sm mb-1">Title</p>
                        <p className="text-theme-foreground font-medium">{placement.title}</p>
                      </div>
                      <div>
                        <p className="text-text-muted text-sm mb-1">Artist</p>
                        <p className="text-theme-foreground">{placement.artist}</p>
                      </div>
                      {placement.albumName && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Album</p>
                          <p className="text-theme-foreground">{placement.albumName}</p>
                        </div>
                      )}
                      {placement.isrc && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">ISRC</p>
                          <p className="text-theme-foreground font-mono">{placement.isrc}</p>
                        </div>
                      )}
                      {placement.releaseDate && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Release Date</p>
                          <p className="text-theme-foreground">{formatDate(placement.releaseDate)}</p>
                        </div>
                      )}
                      {placement.genre && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Genre</p>
                          <p className="text-theme-foreground">{placement.genre}</p>
                        </div>
                      )}
                      {placement.label && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Label</p>
                          <p className="text-theme-foreground">{placement.label}</p>
                        </div>
                      )}
                    </div>

                    {/* Right Column - Writer & Deal Info */}
                    <div className="space-y-4">
                      <h4 className="text-theme-foreground font-semibold mb-3">Writer & Deal Information</h4>
                      {placement.user && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Submitted By</p>
                          <p className="text-theme-foreground">
                            {placement.user.firstName} {placement.user.lastName}
                          </p>
                          <p className="text-text-muted text-sm">{placement.user.email}</p>
                        </div>
                      )}
                      {placement.caseNumber && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Case Number</p>
                          <p className="text-green-400 font-mono font-semibold">{placement.caseNumber}</p>
                        </div>
                      )}
                      {placement.reviewedAt && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Approved Date</p>
                          <p className="text-theme-foreground">{formatDate(placement.reviewedAt)}</p>
                        </div>
                      )}
                      {placement.dealTerms && (
                        <div>
                          <p className="text-text-muted text-sm mb-1">Deal Terms</p>
                          <p className="text-theme-foreground">{placement.dealTerms}</p>
                        </div>
                      )}
                      {placement.advanceAmount && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-400" />
                          <div>
                            <p className="text-text-muted text-sm mb-1">Advance Amount</p>
                            <p className="text-theme-foreground font-medium">${placement.advanceAmount.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {placement.royaltyPercentage && (
                        <div className="flex items-center gap-2">
                          <Percent className="w-4 h-4 text-blue-400" />
                          <div>
                            <p className="text-text-muted text-sm mb-1">Royalty Percentage</p>
                            <p className="text-theme-foreground font-medium">{placement.royaltyPercentage}%</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Credits/Collaborators Section */}
                  {placement.credits && placement.credits.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-white/[0.08]">
                      <h4 className="text-theme-foreground font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        Collaborators & Splits ({placement.credits.length})
                      </h4>
                      <div className="space-y-3">
                        {placement.credits.map((credit, idx) => (
                          <div key={credit.id || idx} className="flex items-center justify-between p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-theme-foreground font-semibold">
                                  {credit.firstName} {credit.lastName}
                                </p>
                                {credit.isPrimary && (
                                  <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded">Primary</span>
                                )}
                                {credit.userId && (
                                  <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">PT Linked</span>
                                )}
                                {credit.isExternalWriter && (
                                  <span className="px-2 py-0.5 bg-slate-600/50 text-slate-400 text-xs rounded">External</span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-3 text-sm">
                                <span className="text-text-muted">{credit.role}</span>
                                {credit.pro && (
                                  <span className="text-text-muted">PRO: {credit.pro}</span>
                                )}
                                {credit.ipiNumber && (
                                  <span className="text-text-muted font-mono">IPI: {credit.ipiNumber}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-400">{credit.splitPercentage}%</p>
                              <p className="text-xs text-text-muted">Split</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 text-sm text-text-muted">
                        Total Split: <span className={`font-semibold ${placement.credits.reduce((sum, c) => sum + Number(c.splitPercentage), 0) === 100 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {Number(placement.credits.reduce((sum, c) => sum + Number(c.splitPercentage), 0)).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes Section */}
                  {placement.notes && (
                    <div className="mt-6 pt-6 border-t border-white/[0.08]">
                      <h4 className="text-theme-foreground font-semibold mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-400" />
                        Notes
                      </h4>
                      <div className="p-4 bg-white/[0.04] rounded-lg border border-white/[0.08]">
                        <p className="text-text-secondary whitespace-pre-wrap">{placement.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </AnimatePresence>

      {/* Add Placement Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              className="bg-theme-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-theme-border"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-theme-card border-b border-theme-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground flex items-center gap-3">
                    <Music className="w-6 h-6 text-blue-400" />
                    Add New Placement
                  </h2>
                  <p className="text-theme-foreground-muted mt-1">Manually add a placement directly to the tracker</p>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-theme-foreground rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Song Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-theme-foreground mb-4">Song Information</h3>

                  {/* Spotify Lookup Button */}
                  <motion.button
                    onClick={() => setShowSpotifyModal(true)}
                    className="w-full p-4 bg-gradient-to-r from-green-600/20 to-green-500/10 border border-green-500/30 rounded-xl text-left hover:from-green-600/30 hover:to-green-500/20 transition-all mb-4"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <Search className="w-6 h-6 text-green-400" />
                      <div>
                        <p className="text-theme-foreground font-semibold">Search Spotify</p>
                        <p className="text-theme-foreground-muted text-sm">Find and auto-fill song details from Spotify</p>
                      </div>
                    </div>
                  </motion.button>

                  {/* Selected Track Preview */}
                  {selectedTrack && (
                    <div className="p-4 bg-white/[0.04] rounded-xl border border-white/[0.08] mb-4 flex items-center gap-4">
                      {(selectedTrack.enriched?.album?.thumbnail || selectedTrack.image) && (
                        <img
                          src={selectedTrack.enriched?.album?.thumbnail || selectedTrack.image}
                          alt={selectedTrack.title}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <p className="text-theme-foreground font-semibold">{selectedTrack.title}</p>
                        <p className="text-theme-foreground-muted">{selectedTrack.artist}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTrack(null);
                          resetAddForm();
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}

                  {/* Manual Entry Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Title *</label>
                      <input
                        type="text"
                        value={manualEntry.title}
                        onChange={(e) => setManualEntry({ ...manualEntry, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Song title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Artist *</label>
                      <input
                        type="text"
                        value={manualEntry.artist}
                        onChange={(e) => setManualEntry({ ...manualEntry, artist: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Artist name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Album</label>
                      <input
                        type="text"
                        value={manualEntry.albumName}
                        onChange={(e) => setManualEntry({ ...manualEntry, albumName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Album name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ISRC</label>
                      <input
                        type="text"
                        value={manualEntry.isrc}
                        onChange={(e) => setManualEntry({ ...manualEntry, isrc: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="ISRC code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Genre</label>
                      <input
                        type="text"
                        value={manualEntry.genre}
                        onChange={(e) => setManualEntry({ ...manualEntry, genre: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Genre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Release Year</label>
                      <input
                        type="text"
                        value={manualEntry.releaseYear}
                        onChange={(e) => setManualEntry({ ...manualEntry, releaseYear: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="e.g., 2024"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-theme-foreground-muted mb-2">Label</label>
                      <input
                        type="text"
                        value={manualEntry.label}
                        onChange={(e) => setManualEntry({ ...manualEntry, label: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Record label"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-theme-foreground-muted mb-2">Notes</label>
                      <textarea
                        value={manualEntry.notes}
                        onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Collaborators */}
                <div>
                  <h3 className="text-lg font-semibold text-theme-foreground mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Collaborators & Splits
                  </h3>

                  {/* Split Total Indicator */}
                  <div className={`mb-4 p-3 rounded-lg border ${
                    isValidSplit
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-amber-500/10 border-amber-500/30'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isValidSplit ? 'text-green-400' : 'text-amber-400'}`}>
                        Total Split: {totalSplit.toFixed(2)}%
                      </span>
                      {!isValidSplit && (
                        <span className="text-sm text-amber-400">
                          {totalSplit < 100 ? `${(100 - totalSplit).toFixed(2)}% remaining` : `${(totalSplit - 100).toFixed(2)}% over`}
                        </span>
                      )}
                    </div>
                  </div>

                  <CollaboratorForm
                    collaborators={collaborators}
                    onChange={setCollaborators}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                  <motion.button
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-theme-foreground rounded-xl font-semibold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleSubmitPlacement}
                    disabled={isSubmitting || !manualEntry.title || !manualEntry.artist || !isValidSplit || collaborators.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30"
                    whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        Add Placement
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spotify Lookup Modal */}
      <AnimatePresence>
        {showSpotifyModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSpotifyModal(false)}
          >
            <motion.div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SpotifyTrackLookup
                onTrackSelect={handleTrackSelect}
                onClose={() => setShowSpotifyModal(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Import Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              className="bg-theme-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-theme-border"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-theme-card border-b border-theme-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground flex items-center gap-3">
                    <FileSpreadsheet className="w-6 h-6 text-green-400" />
                    Bulk Import Placements
                  </h2>
                  <p className="text-text-muted mt-1">Import multiple placements from a CSV file</p>
                </div>
                <button
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkData([]);
                    setBulkErrors([]);
                  }}
                  className="p-2 text-gray-400 hover:text-theme-foreground rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Instructions */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <h3 className="text-blue-400 font-semibold mb-2">CSV Format Instructions</h3>
                  <p className="text-text-muted text-sm mb-3">
                    Your CSV file should include the following columns. Supports up to 6 writers per song:
                  </p>
                  <div className="text-xs text-text-muted font-mono bg-black/20 p-3 rounded-lg overflow-x-auto">
                    title, artist, albumName, isrc, genre, releaseYear, label,<br />
                    writer1_firstName, writer1_lastName, writer1_role, writer1_split, writer1_pro, writer1_ipi,<br />
                    writer2_firstName, ... writer2_ipi,<br />
                    writer3_firstName, ... writer3_ipi,<br />
                    writer4_firstName, ... writer4_ipi,<br />
                    writer5_firstName, ... writer5_ipi,<br />
                    writer6_firstName, ... writer6_ipi,<br />
                    notes
                  </div>
                  <p className="text-text-muted text-sm mt-3">
                    <strong>Note:</strong> Split percentages must equal exactly 100% for each song (across all writers).
                    Roles can be: WRITER, PRODUCER, COMPOSER, LYRICIST.
                  </p>
                </div>

                {/* Download Template */}
                <motion.button
                  onClick={downloadTemplate}
                  className="w-full p-4 bg-white/5 border border-theme-border-strong rounded-xl text-left hover:bg-white/10 transition-all flex items-center gap-3"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <Download className="w-6 h-6 text-green-400" />
                  <div>
                    <p className="text-theme-foreground font-semibold">Download CSV Template</p>
                    <p className="text-text-muted text-sm">Get a pre-formatted template with example data</p>
                  </div>
                </motion.button>

                {/* File Upload */}
                <div>
                  <label className="block text-sm text-text-muted mb-2">Upload CSV File</label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="p-8 border-2 border-dashed border-white/20 rounded-xl text-center hover:border-white/40 transition-colors">
                      <Upload className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-theme-foreground font-medium">Click or drag to upload CSV file</p>
                      <p className="text-text-muted text-sm mt-1">Supports .csv files</p>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {bulkErrors.length > 0 && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <h4 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Validation Errors ({bulkErrors.length})
                    </h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {bulkErrors.map((error, idx) => (
                        <p key={idx} className="text-red-300 text-sm">{error}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parsed Data Preview */}
                {bulkData.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-theme-foreground font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      Ready to Import ({bulkData.length} placement{bulkData.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {bulkData.map((row, idx) => (
                        <div key={idx} className="p-3 bg-white/5 rounded-lg border border-theme-border-strong flex items-center justify-between">
                          <div>
                            <p className="text-theme-foreground font-medium">{row.title}</p>
                            <p className="text-text-muted text-sm">{row.artist}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-purple-400">{row.writers.length} writer{row.writers.length !== 1 ? 's' : ''}</p>
                            <p className="text-xs text-text-muted">
                              {row.writers.map((w: any) => `${w.firstName} (${w.splitPercentage}%)`).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress */}
                {isBulkSubmitting && (
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-blue-400 font-medium">Importing placements...</span>
                      <span className="text-theme-foreground">{bulkProgress.current} / {bulkProgress.total}</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2">
                      <motion.div
                        className="bg-blue-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                  <motion.button
                    onClick={() => {
                      setShowBulkModal(false);
                      setBulkData([]);
                      setBulkErrors([]);
                    }}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-theme-foreground rounded-xl font-semibold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleBulkSubmit}
                    disabled={isBulkSubmitting || bulkData.length === 0}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-green-600/30"
                    whileHover={{ scale: isBulkSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isBulkSubmitting ? 1 : 0.98 }}
                  >
                    {isBulkSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        Import {bulkData.length} Placement{bulkData.length !== 1 ? 's' : ''}
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Placement Modal */}
      <AnimatePresence>
        {showEditModal && editingPlacement && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              className="bg-theme-card rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-theme-border"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-theme-card border-b border-theme-border p-6 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-theme-foreground flex items-center gap-3">
                    <Edit3 className="w-6 h-6 text-blue-400" />
                    Edit Placement
                  </h2>
                  <p className="text-theme-foreground-muted mt-1">
                    Update placement details and collaborator splits
                  </p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 text-gray-400 hover:text-theme-foreground rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Song Information */}
                <div>
                  <h3 className="text-lg font-semibold text-theme-foreground mb-4">Song Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Title *</label>
                      <input
                        type="text"
                        value={editEntry.title}
                        onChange={(e) => setEditEntry({ ...editEntry, title: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Song title"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Artist *</label>
                      <input
                        type="text"
                        value={editEntry.artist}
                        onChange={(e) => setEditEntry({ ...editEntry, artist: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Artist name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Album</label>
                      <input
                        type="text"
                        value={editEntry.albumName}
                        onChange={(e) => setEditEntry({ ...editEntry, albumName: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Album name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-text-muted mb-2">ISRC</label>
                      <input
                        type="text"
                        value={editEntry.isrc}
                        onChange={(e) => setEditEntry({ ...editEntry, isrc: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="ISRC code"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Genre</label>
                      <input
                        type="text"
                        value={editEntry.genre}
                        onChange={(e) => setEditEntry({ ...editEntry, genre: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Genre"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-theme-foreground-muted mb-2">Release Year</label>
                      <input
                        type="text"
                        value={editEntry.releaseYear}
                        onChange={(e) => setEditEntry({ ...editEntry, releaseYear: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="e.g., 2024"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-theme-foreground-muted mb-2">Label</label>
                      <input
                        type="text"
                        value={editEntry.label}
                        onChange={(e) => setEditEntry({ ...editEntry, label: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        placeholder="Record label"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm text-theme-foreground-muted mb-2">Notes</label>
                      <textarea
                        value={editEntry.notes}
                        onChange={(e) => setEditEntry({ ...editEntry, notes: e.target.value })}
                        className="w-full px-4 py-3 bg-white/5 border border-theme-border-strong rounded-xl text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Collaborators */}
                <div>
                  <h3 className="text-lg font-semibold text-theme-foreground mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    Collaborators & Splits
                  </h3>

                  {/* Split Total Indicator */}
                  {(() => {
                    const editTotalSplit = editCollaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
                    const isEditValidSplit = Math.abs(100 - editTotalSplit) < 0.1;
                    return (
                      <div className={`mb-4 p-3 rounded-lg border ${
                        isEditValidSplit
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-amber-500/10 border-amber-500/30'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium ${isEditValidSplit ? 'text-green-400' : 'text-amber-400'}`}>
                            Total Split: {editTotalSplit.toFixed(2)}%
                          </span>
                          {!isEditValidSplit && (
                            <span className="text-sm text-amber-400">
                              {editTotalSplit < 100 ? `${(100 - editTotalSplit).toFixed(2)}% remaining` : `${(editTotalSplit - 100).toFixed(2)}% over`}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  <CollaboratorForm
                    collaborators={editCollaborators}
                    onChange={setEditCollaborators}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.08]">
                  <motion.button
                    onClick={() => setShowEditModal(false)}
                    className="px-6 py-3 bg-white/10 hover:bg-white/20 text-theme-foreground rounded-xl font-semibold transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    onClick={handleEditSubmit}
                    disabled={isEditSubmitting || !editEntry.title || !editEntry.artist}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-blue-600/30"
                    whileHover={{ scale: isEditSubmitting ? 1 : 1.02 }}
                    whileTap={{ scale: isEditSubmitting ? 1 : 0.98 }}
                  >
                    {isEditSubmitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
