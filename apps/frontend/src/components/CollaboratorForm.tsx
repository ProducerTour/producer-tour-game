import { useState, useEffect } from 'react';
import { creditSuggestionsApi, CollaboratorSuggestion } from '../lib/creditSuggestionsApi';
import { userApi } from '../lib/api';
import { Search, X, UserCheck, UserX } from 'lucide-react';

interface LinkedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  writerIpiNumber?: string;
  publisherIpiNumber?: string;
  proAffiliation?: string;
}

export interface Collaborator {
  id?: string; // temp ID for frontend
  firstName: string;
  lastName: string;
  role: string;
  splitPercentage: number;
  pro?: string;
  ipiNumber?: string;
  isPrimary?: boolean;
  notes?: string;
  // New fields for user linking and statement processing
  userId?: string;             // Links to PT User account (for statement processing)
  publisherIpiNumber?: string; // Determines PT representation
  isExternalWriter?: boolean;  // True if not a PT client
}

interface CollaboratorFormProps {
  collaborators: Collaborator[];
  onChange: (collaborators: Collaborator[]) => void;
  currentUserName?: { firstName: string; lastName: string };
}

const ROLES = ['Composer (Music)', 'Songwriter (Lyrics)', 'Both'];
const PROS = ['BMI', 'ASCAP', 'SESAC', 'GMR', 'SOCAN'];

export function CollaboratorForm({ collaborators, onChange, currentUserName }: CollaboratorFormProps) {
  const [suggestions, setSuggestions] = useState<CollaboratorSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeInputIndex, setActiveInputIndex] = useState<number | null>(null);

  // User linking state
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchIndex, setUserSearchIndex] = useState<number | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<LinkedUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  // Calculate total split percentage
  const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
  const splitDifference = 100 - totalSplit;
  const isExactly100 = Math.abs(splitDifference) < 0.01;
  const isValidSplit = isExactly100; // Must equal exactly 100%

  // Add collaborator
  const addCollaborator = () => {
    const newCollaborator: Collaborator = {
      id: `temp-${Date.now()}`,
      firstName: '',
      lastName: '',
      role: 'Composer (Music)',
      splitPercentage: 0,
      ipiNumber: '',
      isPrimary: false,
    };
    onChange([...collaborators, newCollaborator]);
  };

  // Remove collaborator
  const removeCollaborator = (index: number) => {
    onChange(collaborators.filter((_, i) => i !== index));
  };

  // Update collaborator
  const updateCollaborator = (index: number, field: keyof Collaborator, value: any) => {
    const updated = [...collaborators];
    const current = updated[index];

    // If changing firstName or lastName, clear the userId link since
    // the credit is no longer associated with that user
    if ((field === 'firstName' || field === 'lastName') && current.userId) {
      updated[index] = {
        ...current,
        [field]: value,
        userId: undefined,  // Clear user link when name changes
        publisherIpiNumber: undefined,  // Clear publisher IPI too
      };
      console.log(`[CollaboratorForm] Name changed, clearing userId link for ${current.firstName} ${current.lastName}`);
    } else {
      updated[index] = { ...current, [field]: value };
    }
    onChange(updated);
  };

  // Search for suggestions
  const handleSearch = async (query: string, index: number) => {
    setActiveInputIndex(index);

    if (query.length >= 2) {
      try {
        const results = await creditSuggestionsApi.searchCollaborators(query);
        setSuggestions(results);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Apply suggestion
  const applySuggestion = (suggestion: CollaboratorSuggestion, index: number) => {
    updateCollaborator(index, 'firstName', suggestion.firstName);
    updateCollaborator(index, 'lastName', suggestion.lastName);
    updateCollaborator(index, 'role', suggestion.role);
    if (suggestion.ipiNumber) {
      updateCollaborator(index, 'ipiNumber', suggestion.ipiNumber);
    }
    setShowSuggestions(false);
  };

  // Open user search modal
  const openUserSearch = (index: number) => {
    const collab = collaborators[index];
    setUserSearchIndex(index);
    setUserSearchQuery(`${collab.firstName} ${collab.lastName}`.trim());
    setUserSearchResults([]);
    setShowUserSearch(true);
  };

  // Search for PT users
  const searchUsers = async () => {
    if (userSearchQuery.length < 2) return;

    setIsSearchingUsers(true);
    try {
      const response = await userApi.searchWriters(userSearchQuery);
      // Backend returns 'results' not 'users'
      setUserSearchResults(response.data.results || []);
    } catch (error) {
      console.error('User search error:', error);
      setUserSearchResults([]);
    }
    setIsSearchingUsers(false);
  };

  // Link collaborator to PT user and autofill their info
  const linkUser = (user: LinkedUser) => {
    if (userSearchIndex === null) return;

    const updated = [...collaborators];
    updated[userSearchIndex] = {
      ...updated[userSearchIndex],
      // Autofill name, IPI, and PRO from user profile
      firstName: user.firstName || updated[userSearchIndex].firstName,
      lastName: user.lastName || updated[userSearchIndex].lastName,
      ipiNumber: user.writerIpiNumber || updated[userSearchIndex].ipiNumber || undefined,
      pro: user.proAffiliation || updated[userSearchIndex].pro || undefined,
      // Link to PT account
      userId: user.id,
      publisherIpiNumber: user.publisherIpiNumber || undefined,
      isExternalWriter: false,
    };
    onChange(updated);
    setShowUserSearch(false);
  };

  // Unlink collaborator from PT user
  const unlinkUser = (index: number) => {
    const updated = [...collaborators];
    updated[index] = {
      ...updated[index],
      userId: undefined,
      publisherIpiNumber: undefined,
      isExternalWriter: true, // Mark as external when unlinked
    };
    onChange(updated);
  };

  // Mark as external writer (not a PT client)
  const markAsExternal = (index: number) => {
    const updated = [...collaborators];
    updated[index] = {
      ...updated[index],
      userId: undefined,
      isExternalWriter: true,
    };
    onChange(updated);
    setShowUserSearch(false);
  };

  // Load frequent collaborators on mount
  useEffect(() => {
    const loadFrequent = async () => {
      try {
        const frequent = await creditSuggestionsApi.getFrequentCollaborators(5);
        setSuggestions(frequent);
      } catch (error) {
        console.error('Load frequent error:', error);
      }
    };
    loadFrequent();
  }, []);

  // Add current user as primary collaborator if none exist
  useEffect(() => {
    if (collaborators.length === 0 && currentUserName) {
      onChange([
        {
          id: 'temp-primary',
          firstName: currentUserName.firstName,
          lastName: currentUserName.lastName,
          role: 'Composer (Music)',
          splitPercentage: 100,
          isPrimary: true,
        },
      ]);
    }
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-theme-foreground">Collaborators & Credits</h3>
        <div className="text-sm">
          <span className={`font-medium ${isValidSplit ? 'text-emerald-400' : 'text-red-400'}`}>
            Total: {totalSplit.toFixed(2)}%
          </span>
          {!isValidSplit && (
            <span className="ml-2 text-red-400">
              {splitDifference > 0
                ? `(${splitDifference.toFixed(2)}% remaining)`
                : `(${Math.abs(splitDifference).toFixed(2)}% over)`}
            </span>
          )}
          {isValidSplit && <span className="ml-2 text-emerald-400">✓</span>}
        </div>
      </div>

      <div className="space-y-3">
        {collaborators.map((collab, index) => (
          <div key={collab.id || index} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08]">
            {/* Header Row with Autofill Button */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                {collab.isPrimary && (
                  <span className="px-2 py-1 bg-white/[0.12] text-white text-xs rounded-lg border border-white/[0.08]">Primary</span>
                )}
                {collab.userId && (
                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-lg border border-emerald-500/30 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" />
                    Linked to PT
                  </span>
                )}
                {collab.isExternalWriter && !collab.userId && (
                  <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-lg border border-amber-500/30 flex items-center gap-1">
                    <UserX className="w-3 h-3" />
                    External Writer
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Autofill from PT User button */}
                {!collab.isPrimary && (
                  <button
                    type="button"
                    onClick={() => openUserSearch(index)}
                    className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Search className="w-3 h-3" />
                    Autofill from PT User
                  </button>
                )}
                {/* Unlink button if linked */}
                {collab.userId && !collab.isPrimary && (
                  <button
                    type="button"
                    onClick={() => unlinkUser(index)}
                    className="p-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-gray-400 hover:text-white rounded-lg transition-colors"
                    title="Unlink from PT account"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Remove button */}
                {!collab.isPrimary && (
                  <button
                    type="button"
                    onClick={() => removeCollaborator(index)}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg transition-colors"
                    title="Remove collaborator"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* First Name */}
              <div className="relative">
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={collab.firstName}
                  onChange={(e) => {
                    updateCollaborator(index, 'firstName', e.target.value);
                    handleSearch(e.target.value, index);
                  }}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="First name"
                  disabled={collab.isPrimary}
                />

                {/* Suggestions dropdown */}
                {showSuggestions && activeInputIndex === index && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-surface-elevated border border-white/[0.08] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applySuggestion(suggestion, index)}
                        className="w-full px-3 py-2 text-left hover:bg-white/[0.08] text-white text-sm flex justify-between items-center transition-colors"
                      >
                        <span>
                          {suggestion.fullName} ({suggestion.role})
                        </span>
                        <span className="text-gray-500 text-xs">{suggestion.frequency}x</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={collab.lastName}
                  onChange={(e) => updateCollaborator(index, 'lastName', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="Last name"
                  disabled={collab.isPrimary}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  Role *
                </label>
                <select
                  value={collab.role}
                  onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role} className="bg-slate-800 text-white">{role}</option>
                  ))}
                </select>
              </div>

              {/* Split % */}
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  Split % *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={collab.splitPercentage}
                  onChange={(e) => updateCollaborator(index, 'splitPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* PRO */}
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  PRO
                </label>
                <select
                  value={collab.pro || ''}
                  onChange={(e) => updateCollaborator(index, 'pro', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                >
                  <option value="" className="bg-slate-800 text-white">Select PRO</option>
                  {PROS.map(pro => (
                    <option key={pro} value={pro} className="bg-slate-800 text-white">{pro}</option>
                  ))}
                </select>
              </div>

              {/* IPI Number */}
              <div>
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  IPI Number
                </label>
                <input
                  type="text"
                  value={collab.ipiNumber || ''}
                  onChange={(e) => updateCollaborator(index, 'ipiNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="000000000"
                />
              </div>

              {/* Notes (optional) */}
              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={collab.notes || ''}
                  onChange={(e) => updateCollaborator(index, 'notes', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-theme-border-strong rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="Additional notes"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCollaborator}
        className="w-full px-4 py-3 bg-white/[0.08] hover:bg-white/[0.12] border border-theme-border-strong text-theme-foreground rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span>
        Add Collaborator
      </button>

      {!isValidSplit && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          {splitDifference > 0
            ? `Split percentages must equal exactly 100%. You have ${splitDifference.toFixed(2)}% remaining to allocate.`
            : `Split percentages must equal exactly 100%. You are ${Math.abs(splitDifference).toFixed(2)}% over the limit.`}
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-elevated rounded-2xl w-full max-w-lg border border-white/[0.08] shadow-2xl">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Autofill from PT User</h3>
              <button
                type="button"
                onClick={() => setShowUserSearch(false)}
                className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Search Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-theme-foreground placeholder-theme-foreground-muted focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="Search by name, IPI, or email..."
                  autoFocus
                />
                <button
                  type="button"
                  onClick={searchUsers}
                  disabled={isSearchingUsers}
                  className="px-4 py-2 bg-white text-surface rounded-lg font-medium hover:bg-white/90 disabled:bg-gray-600 transition-colors"
                >
                  {isSearchingUsers ? '...' : 'Search'}
                </button>
              </div>

              {/* Search Results */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {userSearchResults.length > 0 ? (
                  userSearchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => linkUser(user)}
                      className="w-full p-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-theme-foreground font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-theme-foreground-muted text-sm">{user.email}</div>
                        </div>
                        <div className="text-right text-sm">
                          {user.proAffiliation && (
                            <span className="px-2 py-0.5 bg-white/[0.08] rounded text-gray-300">
                              {user.proAffiliation}
                            </span>
                          )}
                          {user.writerIpiNumber && (
                            <div className="text-gray-500 text-xs mt-1">
                              IPI: {user.writerIpiNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                ) : userSearchQuery.length >= 2 && !isSearchingUsers ? (
                  <div className="text-center py-8 text-theme-foreground-muted">
                    <p>No PT accounts found for "{userSearchQuery}"</p>
                    <p className="text-sm mt-2">
                      This collaborator may be an external writer not registered with Producer Tour.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-theme-foreground-muted">
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Search for a PT user to autofill</p>
                    <p className="text-sm mt-1">
                      Name, IPI, and PRO will be filled automatically
                    </p>
                  </div>
                )}
              </div>

              {/* Mark as External Button */}
              {userSearchIndex !== null && (
                <div className="pt-2 border-t border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => markAsExternal(userSearchIndex)}
                    className="w-full px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    Mark as External Writer (Not a PT Client)
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    External writers won't receive royalty distributions through Producer Tour
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
