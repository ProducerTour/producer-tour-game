import { useState, useEffect } from 'react';
import { creditSuggestionsApi, CollaboratorSuggestion } from '../lib/creditSuggestionsApi';

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

  // Calculate total split percentage
  const totalSplit = collaborators.reduce((sum, c) => sum + (c.splitPercentage || 0), 0);
  const isValidSplit = totalSplit <= 100;

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
    updated[index] = { ...updated[index], [field]: value };
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
        <h3 className="text-lg font-semibold text-white">Collaborators & Credits</h3>
        <div className="text-sm">
          <span className={`font-medium ${isValidSplit ? 'text-emerald-400' : 'text-red-400'}`}>
            Total: {totalSplit.toFixed(2)}%
          </span>
          {!isValidSplit && <span className="ml-2 text-red-400">Cannot exceed 100%</span>}
        </div>
      </div>

      <div className="space-y-3">
        {collaborators.map((collab, index) => (
          <div key={collab.id || index} className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08] relative">
            {collab.isPrimary && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 bg-white/[0.12] text-white text-xs rounded-lg border border-white/[0.08]">Primary</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* First Name */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={collab.firstName}
                  onChange={(e) => {
                    updateCollaborator(index, 'firstName', e.target.value);
                    handleSearch(e.target.value, index);
                  }}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
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
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={collab.lastName}
                  onChange={(e) => updateCollaborator(index, 'lastName', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="Last name"
                  disabled={collab.isPrimary}
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Role *
                </label>
                <select
                  value={collab.role}
                  onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                >
                  {ROLES.map(role => (
                    <option key={role} value={role} className="bg-slate-800 text-white">{role}</option>
                  ))}
                </select>
              </div>

              {/* Split % */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Split % *
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={collab.splitPercentage}
                  onChange={(e) => updateCollaborator(index, 'splitPercentage', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="0.00"
                />
              </div>

              {/* PRO */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  PRO
                </label>
                <select
                  value={collab.pro || ''}
                  onChange={(e) => updateCollaborator(index, 'pro', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                >
                  <option value="" className="bg-slate-800 text-white">Select PRO</option>
                  {PROS.map(pro => (
                    <option key={pro} value={pro} className="bg-slate-800 text-white">{pro}</option>
                  ))}
                </select>
              </div>

              {/* IPI Number */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  IPI Number
                </label>
                <input
                  type="text"
                  value={collab.ipiNumber || ''}
                  onChange={(e) => updateCollaborator(index, 'ipiNumber', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="000000000"
                />
              </div>

              {/* Notes (optional) */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={collab.notes || ''}
                  onChange={(e) => updateCollaborator(index, 'notes', e.target.value)}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="Additional notes"
                />
              </div>

              {/* Remove button */}
              {!collab.isPrimary && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => removeCollaborator(index)}
                    className="w-full px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 rounded-lg font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addCollaborator}
        className="w-full px-4 py-3 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.08] text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span>
        Add Collaborator
      </button>

      {!isValidSplit && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-sm">
          Total split percentage cannot exceed 100%. Please adjust the values.
        </div>
      )}
    </div>
  );
}
