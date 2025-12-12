import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Upload, FileText, ChevronLeft, ChevronDown, AlertTriangle, Check, Clock,
  Download, RefreshCw, Music, Database, DollarSign, Globe, TrendingDown,
  FileSpreadsheet, Loader2, Info, Zap, Shield, BarChart3,
  CheckCircle2, XCircle, ArrowRight, Disc, Eye, ListMusic, Users, Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import { FileDropzone, FileList, ACCEPT_CONFIGS } from '../components/ui/FileDropzone';
import Sidebar from '../components/Sidebar';
import ImpersonationBanner from '../components/ImpersonationBanner';
import { leakScannerApi, getAuthToken } from '../lib/api';

// Types
type ScanMode = 'single' | 'catalog' | 'placements' | 'reports';
type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

// Placement type from API
interface PlacementForScan {
  id: string;
  title: string;
  artist: string;
  isrc?: string;
  spotifyTrackId?: string;
  releaseDate?: string;
  musicbrainzId?: string;
  status: string;
  writers: Array<{
    name: string;
    role: string;
    split: number;
    pro?: string;
    ipiNumber?: string;
  }>;
  primaryWriter?: string;
  totalSplit: number;
}

interface MetadataIssue {
  code: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  fix: string;
  fixInstructions?: string;
  deduction?: number;
}

// Backend scan result types
interface BackendScanResult {
  song: {
    title: string;
    artist?: string;
    writer?: string;
    isrc?: string;
    iswc?: string;
    publisher?: string;
  };
  score: number;
  grade: Grade;
  issues: Array<{
    code: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    deduction: number;
    fixInstructions: string;
  }>;
  sources: {
    musicbrainz?: {
      found: boolean;
      recordings?: Array<{
        mbid: string;
        title: string;
        artists: string;
        isrcs: string[];
        score: number;
        releases?: Array<{ title: string; date: string }>;
      }>;
      works?: Array<{
        mbid: string;
        title: string;
        iswcs: string[];
        score: number;
      }>;
    };
    spotify?: {
      found: boolean;
      track?: {
        id: string;
        name: string;
        artist: string;
        album: string;
        releaseDate: string;
        isrc: string;
        popularity: number;
        duration: number;
        image: string;
        spotifyUrl: string;
        explicit: boolean;
      };
    };
    discogs?: {
      found: boolean;
      releases?: Array<{
        id: number;
        title: string;
        type: string;
        year: number;
        country: string;
        genre: string[];
        style: string[];
        label: string[];
        format: string[];
        thumb: string;
        uri: string;
      }>;
    };
    songview?: {
      found: boolean;
      results?: Array<{
        source: string;
        title: string;
        writers: string;
        performers: string;
        publishers: string;
        matchScore?: number; // Cross-source confidence score (0-100)
      }>;
      writerCount?: number;
      publisherCount?: number;
    };
  };
  foundData: {
    isrcs: string[];
    iswcs: string[];
    artists: string[];
    writers: string[];
    writersDetail?: Array<{
      name: string;
      affiliation: string;  // PRO affiliation (BMI, ASCAP, etc.)
      ipi: string;          // IPI/CAE number
    }>;
    publishers: string[];
    publishersDetail?: Array<{
      name: string;
      affiliation: string;
      ipi: string;
    }>;
    titleVariations: string[];
    releaseDates: string[];
  };
  scannedAt: string;
}

interface SongScore {
  score: number;
  grade: Grade;
  issues: MetadataIssue[];
  estimated_lost_revenue: number;
  territories_affected: string[];
  priority_fixes: string[];
  // Backend data for comparison
  backendResult?: BackendScanResult;
}

interface CatalogReport {
  catalog_id: string;
  catalog_name: string;
  generated_at: string;
  summary: {
    total_songs: number;
    overall_score: number;
    overall_grade: Grade;
    total_estimated_lost_revenue: number;
    grade_distribution: Record<Grade, number>;
    territories_affected: string[];
  };
  issues: {
    top_issues: Array<{
      code: string;
      count: number;
      severity: string;
      description: string;
      fix_suggestion: string;
    }>;
    critical_songs_count: number;
  };
  recommendations: {
    priority_actions: string[];
  };
  songs: Array<{
    original: Record<string, string>;
    score: number;
    grade: Grade;
    issues: MetadataIssue[];
    estimated_lost_revenue: number;
  }>;
}

interface QuickSummary {
  total_songs: number;
  quick_score: number;
  issues_detected: {
    missing_iswc: number;
    missing_isrc: number;
    missing_publisher: number;
  };
  estimated_problems: number;
  recommendation: string;
}

// Grade colors and labels
const GRADE_CONFIG: Record<Grade, { color: string; bg: string; border: string; label: string }> = {
  A: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', label: 'Excellent' },
  B: { color: 'text-lime-400', bg: 'bg-lime-500/20', border: 'border-lime-500/30', label: 'Good' },
  C: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', label: 'Fair' },
  D: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', label: 'Poor' },
  F: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', label: 'Critical' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' },
  low: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
};

// Grade Badge Component
const GradeBadge = ({ grade, size = 'md' }: { grade: Grade; size?: 'sm' | 'md' | 'lg' }) => {
  const config = GRADE_CONFIG[grade];
  const sizeClasses = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-12 h-12 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  return (
    <div className={`${sizeClasses[size]} ${config.bg} ${config.border} border-2 rounded-xl flex items-center justify-center font-bold ${config.color}`}>
      {grade}
    </div>
  );
};

// Score Circle Component
const ScoreCircle = ({ score, grade }: { score: number; grade: Grade }) => {
  const config = GRADE_CONFIG[grade];
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle cx="64" cy="64" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
        <circle
          cx="64" cy="64" r="45" fill="none"
          className={config.color.replace('text-', 'stroke-')}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-bold ${config.color}`}>{score}</span>
        <span className="text-xs text-gray-400">Grade {grade}</span>
      </div>
    </div>
  );
};

// Check if user value matches any found value (fuzzy match)
const checkValueMatch = (userValue: string, foundValues: string[]): boolean => {
  const normalizedUser = userValue.toLowerCase().replace(/[^a-z0-9]/g, '');
  return foundValues.some(found => {
    const normalizedFound = found.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalizedFound.includes(normalizedUser) || normalizedUser.includes(normalizedFound);
  });
};

// Comparison Row Component - Cleaner table-style display
// Modern two-column comparison field
const ComparisonField = ({
  label,
  icon: Icon,
  userValue,
  foundValues,
  sources: _sources,
  isIdentifier = false
}: {
  label: string;
  icon?: any;
  userValue?: string;
  foundValues: string[];
  sources?: string[];
  isIdentifier?: boolean;
}) => {
  const hasUserValue = userValue && userValue.trim() !== '';
  const hasFoundValues = foundValues.length > 0;
  const hasMismatch = hasUserValue && hasFoundValues && !checkValueMatch(userValue!, foundValues);
  const isMatch = hasUserValue && hasFoundValues && checkValueMatch(userValue!, foundValues);
  const isNewData = !hasUserValue && hasFoundValues;

  // Status colors
  const getStatusStyle = () => {
    if (hasMismatch) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' };
    if (isMatch) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' };
    if (isNewData) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' };
    return { bg: 'bg-white/[0.02]', border: 'border-white/5', dot: 'bg-gray-600' };
  };
  const style = getStatusStyle();

  return (
    <div className={`rounded-lg ${style.bg} border ${style.border} p-3 transition-all hover:border-white/20`}>
      {/* Label with status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {hasMismatch && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-medium">
            Mismatch
          </span>
        )}
        {isMatch && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">
            ✓ Verified
          </span>
        )}
        {isNewData && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-medium">
            Found
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Your Input Column */}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-600 mb-1 uppercase">Your Data</p>
          {hasUserValue ? (
            <p className={`text-sm ${isIdentifier ? 'font-mono' : 'font-medium'} ${
              hasMismatch ? 'text-orange-300' : isMatch ? 'text-emerald-300' : 'text-white'
            } break-all`}>
              {userValue}
            </p>
          ) : (
            <p className="text-sm text-gray-600 italic">Not provided</p>
          )}
        </div>

        {/* Found Values Column */}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-600 mb-1 uppercase">Discovered</p>
          {hasFoundValues ? (
            <div className="space-y-1">
              {foundValues.slice(0, 4).map((v, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className={`text-sm ${isIdentifier ? 'font-mono' : 'font-medium'} ${
                    hasMismatch ? 'text-orange-300' : 'text-emerald-300'
                  } break-all`}>
                    {v}
                  </span>
                </div>
              ))}
              {foundValues.length > 4 && (
                <p className="text-xs text-gray-500">+{foundValues.length - 4} more</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">Not found</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Specialized component for displaying writers/publishers with IPI details
const WritersDetailField = ({
  label,
  icon: Icon,
  userValue,
  foundValues,
  detailValues
}: {
  label: string;
  icon?: any;
  userValue?: string;
  foundValues: string[];
  detailValues?: Array<{ name: string; affiliation: string; ipi: string }>;
}) => {
  const hasUserValue = userValue && userValue.trim() !== '';
  const hasFoundValues = foundValues.length > 0 || (detailValues && detailValues.length > 0);
  const hasMismatch = hasUserValue && hasFoundValues && !checkValueMatch(userValue!, foundValues);
  const isMatch = hasUserValue && hasFoundValues && checkValueMatch(userValue!, foundValues);
  const isNewData = !hasUserValue && hasFoundValues;

  // Use detail values if available, otherwise fall back to simple string values
  const displayDetails = detailValues && detailValues.length > 0;

  const getStatusStyle = () => {
    if (hasMismatch) return { bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400' };
    if (isMatch) return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' };
    if (isNewData) return { bg: 'bg-blue-500/10', border: 'border-blue-500/30', dot: 'bg-blue-400' };
    return { bg: 'bg-white/[0.02]', border: 'border-white/5', dot: 'bg-gray-600' };
  };
  const style = getStatusStyle();

  // PRO affiliation badge colors
  const getAffiliationColor = (affiliation: string) => {
    const aff = affiliation?.toUpperCase() || '';
    if (aff.includes('BMI')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (aff.includes('ASCAP')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (aff.includes('SESAC')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (aff.includes('GMR')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  return (
    <div className={`rounded-lg ${style.bg} border ${style.border} p-3 transition-all hover:border-white/20`}>
      {/* Label with status indicator */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {Icon && <Icon className="w-3.5 h-3.5 text-gray-500" />}
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {hasMismatch && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded font-medium">
            Mismatch
          </span>
        )}
        {isMatch && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">
            ✓ Verified
          </span>
        )}
        {isNewData && (
          <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded font-medium">
            Found
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Your Input Column */}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-600 mb-1 uppercase">Your Data</p>
          {hasUserValue ? (
            <p className={`text-sm font-medium ${
              hasMismatch ? 'text-orange-300' : isMatch ? 'text-emerald-300' : 'text-white'
            } break-all`}>
              {userValue}
            </p>
          ) : (
            <p className="text-sm text-gray-600 italic">Not provided</p>
          )}
        </div>

        {/* Found Values Column - with IPI details */}
        <div className="min-w-0">
          <p className="text-[10px] text-gray-600 mb-1 uppercase">Discovered</p>
          {hasFoundValues ? (
            <div className="space-y-2">
              {displayDetails ? (
                // Show detailed writer info with IPI
                detailValues!.slice(0, 4).map((detail, i) => (
                  <div key={i} className="space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-sm font-medium ${
                        hasMismatch ? 'text-orange-300' : 'text-emerald-300'
                      }`}>
                        {detail.name}
                      </span>
                      {detail.affiliation && (
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${getAffiliationColor(detail.affiliation)}`}>
                          {detail.affiliation}
                        </span>
                      )}
                    </div>
                    {detail.ipi && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">IPI:</span>
                        <span className="text-[11px] font-mono text-cyan-400/80 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          {detail.ipi}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                // Fall back to simple string display
                foundValues.slice(0, 4).map((v, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`text-sm font-medium ${
                      hasMismatch ? 'text-orange-300' : 'text-emerald-300'
                    } break-all`}>
                      {v}
                    </span>
                  </div>
                ))
              )}
              {(displayDetails ? detailValues!.length : foundValues.length) > 4 && (
                <p className="text-xs text-gray-500">
                  +{(displayDetails ? detailValues!.length : foundValues.length) - 4} more
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">Not found</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Source Badge Component - Compact inline source indicator
const SourceBadge = ({
  name,
  icon: Icon,
  found,
  color,
  detail
}: {
  name: string;
  icon: any;
  found: boolean;
  color: string;
  detail?: string;
}) => {
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    green: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
    orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
    purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    gray: { bg: 'bg-white/5', border: 'border-white/10', text: 'text-gray-500' }
  };

  const c = found ? colors[color] : colors.gray;

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${c.bg} ${c.border} transition-all hover:border-white/20`}>
      <Icon className={`w-3.5 h-3.5 ${c.text}`} />
      <span className={`text-xs font-medium ${c.text}`}>{name}</span>
      {found ? (
        <CheckCircle2 className={`w-3.5 h-3.5 ${c.text}`} />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-gray-600" />
      )}
      {found && detail && (
        <span className={`text-[10px] font-mono ${c.text} opacity-80 ml-1`}>{detail}</span>
      )}
    </div>
  );
};

export default function LeakScannerPage() {
  const navigate = useNavigate();

  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    const handleSidebarToggle = (e: CustomEvent<{ isCollapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.isCollapsed);
    };
    window.addEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
    return () => window.removeEventListener('sidebar-toggle', handleSidebarToggle as EventListener);
  }, []);

  // Mode state
  const [scanMode, setScanMode] = useState<ScanMode>('single');

  // Single song scan state
  const [titleInput, setTitleInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [writerInput, setWriterInput] = useState('');
  const [isrcInput, setIsrcInput] = useState('');
  const [iswcInput, setIswcInput] = useState('');
  const [publisherInput, setPublisherInput] = useState('');
  const [singleScanResult, setSingleScanResult] = useState<SongScore | null>(null);
  const [isSingleScanning, setIsSingleScanning] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Catalog upload state
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [quickSummary, setQuickSummary] = useState<QuickSummary | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [catalogReport, setCatalogReport] = useState<CatalogReport | null>(null);
  const [_uploadSongCount, setUploadSongCount] = useState(0);

  // Reports state
  const [savedReports, _setSavedReports] = useState<CatalogReport[]>([]);

  // Placements state
  const [userPlacements, setUserPlacements] = useState<PlacementForScan[]>([]);
  const [selectedPlacements, setSelectedPlacements] = useState<string[]>([]);
  const [isLoadingPlacements, setIsLoadingPlacements] = useState(false);
  const [isScanningPlacements, setIsScanningPlacements] = useState(false);
  const [placementsScanResults, setPlacementsScanResults] = useState<BackendScanResult[]>([]);
  const [placementsScanSummary, setPlacementsScanSummary] = useState<any>(null);
  const [expandedPlacementIdx, setExpandedPlacementIdx] = useState<number | null>(null);

  // Load placements when switching to placements mode
  useEffect(() => {
    if (scanMode === 'placements' && userPlacements.length === 0) {
      loadPlacements();
    }
  }, [scanMode]);

  const loadPlacements = async () => {
    setIsLoadingPlacements(true);
    try {
      const response = await leakScannerApi.getPlacements();
      if (response.data.success) {
        setUserPlacements(response.data.placements);
      }
    } catch (error) {
      console.error('Failed to load placements:', error);
      toast.error('Failed to load your placements');
    } finally {
      setIsLoadingPlacements(false);
    }
  };

  const scanSelectedPlacements = async () => {
    if (selectedPlacements.length === 0 && userPlacements.length === 0) {
      toast.error('No placements to scan');
      return;
    }

    setIsScanningPlacements(true);
    try {
      const response = await leakScannerApi.scanPlacements(
        selectedPlacements.length > 0 ? selectedPlacements : undefined
      );

      if (response.data.success) {
        setPlacementsScanResults(response.data.results);
        setPlacementsScanSummary(response.data.summary);
        toast.success(`Scanned ${response.data.totalScanned} placements!`);
      }
    } catch (error) {
      console.error('Placement scan error:', error);
      toast.error('Failed to scan placements');
    } finally {
      setIsScanningPlacements(false);
    }
  };

  const togglePlacementSelection = (id: string) => {
    setSelectedPlacements(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const selectAllPlacements = () => {
    if (selectedPlacements.length === userPlacements.length) {
      setSelectedPlacements([]);
    } else {
      setSelectedPlacements(userPlacements.map(p => p.id));
    }
  };

  // Search using backend API with MusicBrainz cross-check
  const searchWithApi = useCallback(async () => {
    if (!titleInput.trim()) {
      toast.error('Please enter a song title');
      return;
    }

    setIsSingleScanning(true);
    setShowComparison(false);

    try {
      const response = await leakScannerApi.scanSingle({
        title: titleInput,
        artist: artistInput || undefined,
        writer: writerInput || undefined,
        isrc: isrcInput || undefined,
        iswc: iswcInput || undefined,
        publisher: publisherInput || undefined,
      });

      const data = response.data;

      if (data.success && data.result) {
        const backendResult = data.result as BackendScanResult;

        // Convert backend result to SongScore format
        const songScore: SongScore = {
          score: backendResult.score,
          grade: backendResult.grade,
          issues: backendResult.issues.map(i => ({
            code: i.code,
            severity: i.severity,
            description: i.description,
            fix: i.fixInstructions,
            deduction: i.deduction,
          })),
          estimated_lost_revenue: calculateLostRevenue(backendResult.issues),
          territories_affected: backendResult.foundData.releaseDates.length > 0 ? ['US', 'EU', 'UK'] : [],
          priority_fixes: backendResult.issues.slice(0, 3).map(i => i.fixInstructions),
          backendResult,
        };

        setSingleScanResult(songScore);
        setShowComparison(true);
        toast.success('Cross-check complete!');
      } else {
        throw new Error('Invalid response');
      }
    } catch (error: any) {
      console.error('API scan error:', error);

      // Fall back to local scoring
      toast.error('API unavailable, using local scoring');
      const localScore = calculateLocalScore({
        title: titleInput,
        artist: artistInput,
        writer: writerInput,
        isrc: isrcInput,
        iswc: iswcInput,
        publisher: publisherInput,
      });
      setSingleScanResult(localScore);
    } finally {
      setIsSingleScanning(false);
    }
  }, [titleInput, artistInput, writerInput, isrcInput, iswcInput, publisherInput]);

  // Real-time local preview (quick scoring as user types)
  const handleSingleInputChange = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    if (!titleInput.trim()) {
      setSingleScanResult(null);
      setShowComparison(false);
      return;
    }

    previewTimeoutRef.current = setTimeout(async () => {
      // Only do local preview, don't call API (that's triggered by button)
      const localScore = calculateLocalScore({
        title: titleInput,
        artist: artistInput,
        writer: writerInput,
        isrc: isrcInput,
        iswc: iswcInput,
        publisher: publisherInput,
      });
      setSingleScanResult(localScore);
    }, 300);
  }, [titleInput, artistInput, writerInput, isrcInput, iswcInput, publisherInput]);

  useEffect(() => {
    handleSingleInputChange();
    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [handleSingleInputChange]);

  // Calculate lost revenue from issues
  const calculateLostRevenue = (issues: Array<{ severity: string; deduction: number }>) => {
    const baseRevenue = 500;
    return issues.reduce((acc, issue) => {
      const impact = { critical: 0.20, high: 0.12, medium: 0.05, low: 0.02 };
      return acc + baseRevenue * (impact[issue.severity as keyof typeof impact] || 0.05);
    }, 0);
  };

  // Local scoring function (quick preview)
  const calculateLocalScore = (data: Record<string, string>): SongScore => {
    let score = 100;
    const issues: MetadataIssue[] = [];
    const territories: string[] = [];

    if (!data.iswc) {
      score -= 25;
      issues.push({
        code: 'MISSING_ISWC',
        severity: 'critical',
        description: 'No ISWC (International Standard Musical Work Code) found',
        fix: 'Register the composition with your PRO to obtain an ISWC',
      });
      territories.push('US', 'EU', 'UK', 'CA', 'AU');
    }

    if (!data.isrc) {
      score -= 20;
      issues.push({
        code: 'MISSING_ISRC',
        severity: 'high',
        description: 'No ISRC (International Standard Recording Code) found',
        fix: 'Request ISRC from your distributor or apply directly through your local ISRC agency',
      });
    }

    if (!data.publisher) {
      score -= 15;
      issues.push({
        code: 'MISSING_PUBLISHER',
        severity: 'high',
        description: 'No publisher listed for the composition',
        fix: 'Register publisher information with your PRO or consider self-publishing',
      });
    }

    if (!data.writer && !data.artist) {
      score -= 10;
      issues.push({
        code: 'MISSING_WRITER',
        severity: 'medium',
        description: 'No writer or artist information provided',
        fix: 'Add writer/composer information for accurate royalty tracking',
      });
    }

    score = Math.max(0, score);

    let grade: Grade;
    if (score >= 90) grade = 'A';
    else if (score >= 75) grade = 'B';
    else if (score >= 60) grade = 'C';
    else if (score >= 40) grade = 'D';
    else grade = 'F';

    const baseRevenue = 500;
    const lostRevenue = issues.reduce((acc, issue) => {
      const impact = { critical: 0.20, high: 0.12, medium: 0.05, low: 0.02 };
      return acc + baseRevenue * (impact[issue.severity] || 0.05);
    }, 0);

    return {
      score,
      grade,
      issues,
      estimated_lost_revenue: Math.round(lostRevenue),
      territories_affected: [...new Set(territories)],
      priority_fixes: issues.slice(0, 3).map(i => i.fix),
    };
  };

  // Sample search handler - fills form and triggers API search
  const handleSampleSearch = async (title: string, artist: string) => {
    setTitleInput(title);
    setArtistInput(artist);
    setWriterInput('');
    setIsrcInput('');
    setIswcInput('');
    setPublisherInput('');

    // Trigger API search after a short delay
    setTimeout(async () => {
      setIsSingleScanning(true);
      setShowComparison(false);

      try {
        const response = await leakScannerApi.scanSingle({
          title,
          artist,
        });

        if (response.data.success && response.data.result) {
          const backendResult = response.data.result as BackendScanResult;

          const songScore: SongScore = {
            score: backendResult.score,
            grade: backendResult.grade,
            issues: backendResult.issues.map(i => ({
              code: i.code,
              severity: i.severity,
              description: i.description,
              fix: i.fixInstructions,
              deduction: i.deduction,
            })),
            estimated_lost_revenue: calculateLostRevenue(backendResult.issues),
            territories_affected: backendResult.foundData.releaseDates.length > 0 ? ['US', 'EU', 'UK'] : [],
            priority_fixes: backendResult.issues.slice(0, 3).map(i => i.fixInstructions),
            backendResult,
          };

          setSingleScanResult(songScore);
          setShowComparison(true);
          toast.success(`Found data for "${title}" by ${artist}`);
        }
      } catch (error) {
        console.error('Sample search error:', error);
        toast.error('Search failed, showing local preview');
        const localScore = calculateLocalScore({ title, artist, writer: '', isrc: '', iswc: '', publisher: '' });
        setSingleScanResult(localScore);
      } finally {
        setIsSingleScanning(false);
      }
    }, 100);
  };

  // File upload handler
  const handleFilesAccepted = async (files: File[]) => {
    setUploadedFiles(files);
    setIsUploading(true);
    setCatalogReport(null);
    setQuickSummary(null);

    try {
      const response = await leakScannerApi.uploadCatalog(files[0]);

      if (response.data.success) {
        setCatalogId(response.data.scanId);
        setUploadSongCount(response.data.songCount || 0);

        // Create quick summary from upload response
        const summary: QuickSummary = {
          total_songs: response.data.songCount || 0,
          quick_score: 0,
          issues_detected: { missing_iswc: 0, missing_isrc: 0, missing_publisher: 0 },
          estimated_problems: 0,
          recommendation: `${response.data.songCount} songs ready for scanning. Click "Run Full Leak Scan" to analyze.`,
        };
        setQuickSummary(summary);
        toast.success(`Uploaded ${response.data.songCount} songs`);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Failed to upload catalog');

      // Demo fallback
      const mockSummary: QuickSummary = {
        total_songs: 25,
        quick_score: 68,
        issues_detected: { missing_iswc: 12, missing_isrc: 8, missing_publisher: 15 },
        estimated_problems: 35,
        recommendation: 'Demo mode: Significant metadata gaps detected.',
      };
      setQuickSummary(mockSummary);
      setCatalogId('demo-preview');
    } finally {
      setIsUploading(false);
    }
  };

  // Run full catalog scan
  const runFullScan = async () => {
    if (!catalogId) return;

    setIsScanning(true);
    try {
      const response = await leakScannerApi.runScan(catalogId, { limit: 50 });

      if (response.data.success) {
        const data = response.data;

        // Build catalog report from response
        const report: CatalogReport = {
          catalog_id: catalogId,
          catalog_name: data.catalogName || uploadedFiles[0]?.name || 'Catalog',
          generated_at: new Date().toISOString(),
          summary: {
            total_songs: data.totalScanned || 0,
            overall_score: data.summary?.averageScore || 0,
            overall_grade: getGradeFromScore(data.summary?.averageScore || 0),
            total_estimated_lost_revenue: estimateTotalLostRevenue(data.results || []),
            grade_distribution: data.summary?.gradeDistribution || { A: 0, B: 0, C: 0, D: 0, F: 0 },
            territories_affected: ['US', 'EU', 'UK'],
          },
          issues: {
            top_issues: data.summary?.topIssues || [],
            critical_songs_count: data.summary?.criticalCount || 0,
          },
          recommendations: {
            priority_actions: generatePriorityActions(data.summary?.topIssues || []),
          },
          songs: data.results || [],
        };

        setCatalogReport(report);
        toast.success('Leak scan complete!');
      } else {
        throw new Error(response.data.error || 'Scan failed');
      }
    } catch (error: any) {
      console.error('Scan error:', error);
      toast.error('Scan failed. Showing demo results.');

      // Demo results
      const demoReport: CatalogReport = {
        catalog_id: catalogId,
        catalog_name: uploadedFiles[0]?.name || 'Demo Catalog',
        generated_at: new Date().toISOString(),
        summary: {
          total_songs: quickSummary?.total_songs || 25,
          overall_score: 68,
          overall_grade: 'C',
          total_estimated_lost_revenue: 2450,
          grade_distribution: { A: 5, B: 8, C: 7, D: 3, F: 2 },
          territories_affected: ['US', 'EU', 'UK', 'CA'],
        },
        issues: {
          top_issues: [
            { code: 'MISSING_ISWC', count: 12, severity: 'critical', description: 'No ISWC found', fix_suggestion: 'Register with your PRO' },
            { code: 'MISSING_PUBLISHER', count: 15, severity: 'high', description: 'No publisher listed', fix_suggestion: 'Add publisher info' },
            { code: 'MISSING_ISRC', count: 8, severity: 'high', description: 'No ISRC found', fix_suggestion: 'Request from distributor' },
          ],
          critical_songs_count: 2,
        },
        recommendations: {
          priority_actions: [
            'Register 12 songs with your PRO to obtain ISWCs',
            'Add publisher information to 15 songs',
            'Request ISRCs for 8 songs from your distributor',
          ],
        },
        songs: [],
      };
      setCatalogReport(demoReport);
    } finally {
      setIsScanning(false);
    }
  };

  // Helper functions
  const getGradeFromScore = (score: number): Grade => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  const estimateTotalLostRevenue = (results: any[]) => {
    return results.reduce((acc, r) => {
      const issueCount = r.issues?.length || 0;
      return acc + issueCount * 50;
    }, 0);
  };

  const generatePriorityActions = (topIssues: any[]) => {
    return topIssues.slice(0, 3).map(issue =>
      `Fix ${issue.count || 0} songs: ${issue.description || issue.code}`
    );
  };

  // Download report with auth token
  const downloadReport = (format: 'html' | 'json' | 'csv') => {
    if (!catalogId) return;
    const token = getAuthToken();
    const url = leakScannerApi.getReportUrl(catalogId, format);
    window.open(`${url}?token=${token}`, '_blank');
  };

  // Reset scanner
  const resetScanner = () => {
    setUploadedFiles([]);
    setCatalogId(null);
    setQuickSummary(null);
    setCatalogReport(null);
  };

  return (
    <div className="flex flex-col h-screen bg-surface overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[300px] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[100px]" />
      </div>

      <ImpersonationBanner />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />

        <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'} overflow-y-auto transition-all duration-300`}>
          <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pt-16 md:pt-8 pb-24 md:pb-8">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate('/tools')}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  Leak Scanner
                </h1>
                <p className="text-theme-foreground-muted text-sm sm:text-base mt-1">
                  Find missing royalties by analyzing your catalog metadata
                </p>
              </div>
            </div>

            {/* Mode Tabs */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-6 overflow-x-auto">
              {[
                { mode: 'single' as ScanMode, label: 'Single Song', icon: Music },
                { mode: 'placements' as ScanMode, label: 'My Placements', icon: ListMusic },
                { mode: 'catalog' as ScanMode, label: 'Catalog Upload', icon: Upload },
                { mode: 'reports' as ScanMode, label: 'Reports', icon: FileText },
              ].map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    scanMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Single Song Mode */}
            <AnimatePresence mode="wait">
              {scanMode === 'single' && (
                <motion.div
                  key="single"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Input Card */}
                  <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Search className="w-5 h-5 text-emerald-400" />
                      Song Details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">
                          Song Title <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={titleInput}
                          onChange={(e) => setTitleInput(e.target.value)}
                          placeholder="Enter song title..."
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Artist</label>
                        <input
                          type="text"
                          value={artistInput}
                          onChange={(e) => setArtistInput(e.target.value)}
                          placeholder="Artist name..."
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Writer/Composer</label>
                        <input
                          type="text"
                          value={writerInput}
                          onChange={(e) => setWriterInput(e.target.value)}
                          placeholder="Writer name..."
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Publisher</label>
                        <input
                          type="text"
                          value={publisherInput}
                          onChange={(e) => setPublisherInput(e.target.value)}
                          placeholder="Publisher name..."
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">ISRC</label>
                        <input
                          type="text"
                          value={isrcInput}
                          onChange={(e) => setIsrcInput(e.target.value)}
                          placeholder="e.g., USRC17607839"
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">ISWC</label>
                        <input
                          type="text"
                          value={iswcInput}
                          onChange={(e) => setIswcInput(e.target.value)}
                          placeholder="e.g., T-070237182-1"
                          className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                        />
                      </div>
                    </div>

                    {/* Search Button */}
                    <div className="mt-4">
                      <button
                        onClick={searchWithApi}
                        disabled={isSingleScanning || !titleInput.trim()}
                        className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSingleScanning ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Searching Spotify, MusicBrainz, BMI/ASCAP...
                          </>
                        ) : (
                          <>
                            <Database className="w-5 h-5" />
                            Cross-Check All Databases + PROs
                          </>
                        )}
                      </button>
                    </div>

                    {/* Quick examples */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="text-xs text-gray-500">Try a sample:</span>
                      {[
                        { title: 'Hello', artist: 'Adele' },
                        { title: 'Blinding Lights', artist: 'The Weeknd' },
                        { title: 'Shape of You', artist: 'Ed Sheeran' },
                      ].map((ex) => (
                        <button
                          key={ex.title}
                          onClick={() => handleSampleSearch(ex.title, ex.artist)}
                          disabled={isSingleScanning}
                          className="px-3 py-1.5 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Disc className="w-3 h-3" />
                          {ex.artist} - {ex.title}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Real-time Results */}
                  {(singleScanResult || isSingleScanning) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6"
                    >
                      {isSingleScanning ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                          <span className="ml-3 text-gray-400">Searching databases...</span>
                        </div>
                      ) : singleScanResult && (
                        <div className="space-y-6">
                          {/* Score Display */}
                          <div className="flex items-center gap-6">
                            <ScoreCircle score={singleScanResult.score} grade={singleScanResult.grade} />
                            <div className="flex-1">
                              <p className={`text-lg font-semibold ${GRADE_CONFIG[singleScanResult.grade].color}`}>
                                {GRADE_CONFIG[singleScanResult.grade].label} Metadata
                              </p>
                              <p className="text-gray-400 text-sm mt-1">
                                {singleScanResult.issues.length === 0
                                  ? 'No issues detected!'
                                  : `${singleScanResult.issues.length} issue${singleScanResult.issues.length > 1 ? 's' : ''} found`}
                              </p>
                              {singleScanResult.estimated_lost_revenue > 0 && (
                                <p className="text-red-400 text-sm mt-1 flex items-center gap-1">
                                  <TrendingDown className="w-4 h-4" />
                                  Est. ${singleScanResult.estimated_lost_revenue}/year potential loss
                                </p>
                              )}
                            </div>
                            {singleScanResult.backendResult && (
                              <button
                                onClick={() => setShowComparison(!showComparison)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                                  showComparison
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                <Eye className="w-4 h-4" />
                                {showComparison ? 'Hide' : 'Show'} Comparison
                              </button>
                            )}
                          </div>

                          {/* Comparison View */}
                          {showComparison && singleScanResult.backendResult && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="border-t border-white/10 pt-4"
                            >
                              {/* Sources Header */}
                              <div className="flex items-center gap-3 mb-5">
                                <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Sources</span>
                                <div className="flex flex-wrap gap-2">
                                  <SourceBadge
                                    name="Spotify"
                                    icon={Music}
                                    found={!!singleScanResult.backendResult.sources.spotify?.found}
                                    color="green"
                                    detail={singleScanResult.backendResult.sources.spotify?.track?.isrc}
                                  />
                                  <SourceBadge
                                    name="MusicBrainz"
                                    icon={Database}
                                    found={!!singleScanResult.backendResult.sources.musicbrainz?.found}
                                    color="blue"
                                    detail={singleScanResult.backendResult.sources.musicbrainz?.recordings?.[0]?.score
                                      ? `${singleScanResult.backendResult.sources.musicbrainz.recordings[0].score}%`
                                      : undefined}
                                  />
                                  <SourceBadge
                                    name="Discogs"
                                    icon={Disc}
                                    found={!!singleScanResult.backendResult.sources.discogs?.found}
                                    color="orange"
                                    detail={singleScanResult.backendResult.sources.discogs?.releases?.[0]?.year?.toString()}
                                  />
                                  <SourceBadge
                                    name="PRO"
                                    icon={FileText}
                                    found={!!singleScanResult.backendResult.sources.songview?.found}
                                    color="purple"
                                    detail={singleScanResult.backendResult.sources.songview?.writerCount !== undefined
                                      ? `${singleScanResult.backendResult.sources.songview.writerCount} writers`
                                      : undefined}
                                  />
                                </div>
                              </div>

                              {/* Comparison Grid */}
                              <div className="space-y-6">
                                {/* Identifiers Section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                                    <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-semibold px-2">Identifiers</span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <ComparisonField
                                      label="ISRC"
                                      icon={Disc}
                                      userValue={isrcInput}
                                      foundValues={singleScanResult.backendResult.foundData.isrcs}
                                      isIdentifier={true}
                                    />
                                    <ComparisonField
                                      label="ISWC"
                                      icon={FileText}
                                      userValue={iswcInput}
                                      foundValues={singleScanResult.backendResult.foundData.iswcs}
                                      isIdentifier={true}
                                    />
                                  </div>
                                </div>

                                {/* Track Info Section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent" />
                                    <span className="text-[11px] uppercase tracking-widest text-blue-400 font-semibold px-2">Track Info</span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-blue-500/30 to-transparent" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <ComparisonField
                                      label="Title"
                                      icon={Music}
                                      userValue={titleInput}
                                      foundValues={singleScanResult.backendResult.foundData.titleVariations}
                                    />
                                    <ComparisonField
                                      label="Artists"
                                      icon={Users}
                                      userValue={artistInput}
                                      foundValues={singleScanResult.backendResult.foundData.artists}
                                    />
                                    <ComparisonField
                                      label="Release"
                                      icon={Clock}
                                      foundValues={singleScanResult.backendResult.foundData.releaseDates}
                                    />
                                  </div>
                                </div>

                                {/* Rights Holders Section */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 to-transparent" />
                                    <span className="text-[11px] uppercase tracking-widest text-purple-400 font-semibold px-2">Rights Holders</span>
                                    <div className="h-px flex-1 bg-gradient-to-l from-purple-500/30 to-transparent" />
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <WritersDetailField
                                      label="Writers"
                                      icon={Users}
                                      userValue={writerInput}
                                      foundValues={singleScanResult.backendResult.foundData.writers}
                                      detailValues={singleScanResult.backendResult.foundData.writersDetail}
                                    />
                                    <WritersDetailField
                                      label="Publishers"
                                      icon={Globe}
                                      foundValues={singleScanResult.backendResult.foundData.publishers || []}
                                      detailValues={singleScanResult.backendResult.foundData.publishersDetail}
                                    />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          {/* Issues List */}
                          {singleScanResult.issues.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                Issues Found
                              </h4>
                              {singleScanResult.issues.map((issue, idx) => (
                                <div
                                  key={idx}
                                  className={`p-4 rounded-xl ${SEVERITY_CONFIG[issue.severity].bg} border ${SEVERITY_CONFIG[issue.severity].border}`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className={`font-medium ${SEVERITY_CONFIG[issue.severity].color}`}>
                                        {issue.description}
                                      </p>
                                      <p className="text-gray-400 text-sm mt-1">
                                        <span className="text-emerald-400">Fix:</span> {issue.fix}
                                      </p>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${SEVERITY_CONFIG[issue.severity].bg} ${SEVERITY_CONFIG[issue.severity].color}`}>
                                      {issue.severity}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Territories */}
                          {singleScanResult.territories_affected.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                              <Globe className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-500">Affected territories:</span>
                              <div className="flex gap-1">
                                {singleScanResult.territories_affected.map((t) => (
                                  <span key={t} className="px-2 py-0.5 bg-white/5 rounded text-gray-400 text-xs">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* My Placements Mode */}
              {scanMode === 'placements' && (
                <motion.div
                  key="placements"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <ListMusic className="w-5 h-5 text-blue-400" />
                          Scan Your Placements
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Analyze your existing placements for metadata issues, split conflicts, and missing registrations.
                        </p>
                      </div>
                      <button
                        onClick={loadPlacements}
                        disabled={isLoadingPlacements}
                        className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoadingPlacements ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Loading State */}
                  {isLoadingPlacements && (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoadingPlacements && userPlacements.length === 0 && (
                    <div className="text-center py-12">
                      <ListMusic className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-400">No Placements Found</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        Add placements in Manage Placements to scan them here.
                      </p>
                      <button
                        onClick={() => navigate('/writer/manage-placements')}
                        className="mt-4 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition-colors"
                      >
                        Go to Manage Placements
                      </button>
                    </div>
                  )}

                  {/* Placements List */}
                  {!isLoadingPlacements && userPlacements.length > 0 && (
                    <>
                      {/* Selection Controls */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={selectAllPlacements}
                            className="text-sm text-gray-400 hover:text-white transition-colors"
                          >
                            {selectedPlacements.length === userPlacements.length ? 'Deselect All' : 'Select All'}
                          </button>
                          {selectedPlacements.length > 0 && (
                            <span className="text-sm text-blue-400">
                              {selectedPlacements.length} selected
                            </span>
                          )}
                        </div>
                        <button
                          onClick={scanSelectedPlacements}
                          disabled={isScanningPlacements}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isScanningPlacements ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Scanning...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              Scan {selectedPlacements.length > 0 ? `${selectedPlacements.length} Placements` : 'All'}
                            </>
                          )}
                        </button>
                      </div>

                      {/* Placements Grid */}
                      <div className="grid gap-3">
                        {userPlacements.map((placement) => (
                          <div
                            key={placement.id}
                            onClick={() => togglePlacementSelection(placement.id)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${
                              selectedPlacements.includes(placement.id)
                                ? 'bg-blue-500/10 border-blue-500/30'
                                : 'bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.04]'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                selectedPlacements.includes(placement.id)
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'border-gray-600'
                              }`}>
                                {selectedPlacements.includes(placement.id) && (
                                  <Check className="w-3 h-3 text-white" />
                                )}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <h4 className="font-medium text-white truncate">{placement.title}</h4>
                                    <p className="text-sm text-gray-400">{placement.artist}</p>
                                  </div>
                                  {/* Split indicator */}
                                  <div className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                                    placement.totalSplit === 100
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : placement.totalSplit > 100
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-orange-500/20 text-orange-400'
                                  }`}>
                                    <Percent className="w-3 h-3" />
                                    {placement.totalSplit}%
                                  </div>
                                </div>

                                {/* Metadata Row */}
                                <div className="flex flex-wrap gap-3 mt-2 text-xs">
                                  {placement.isrc && (
                                    <span className="flex items-center gap-1 text-emerald-400">
                                      <CheckCircle2 className="w-3 h-3" />
                                      ISRC
                                    </span>
                                  )}
                                  {!placement.isrc && (
                                    <span className="flex items-center gap-1 text-orange-400">
                                      <XCircle className="w-3 h-3" />
                                      No ISRC
                                    </span>
                                  )}
                                  {placement.writers.length > 0 && (
                                    <span className="flex items-center gap-1 text-gray-400">
                                      <Users className="w-3 h-3" />
                                      {placement.writers.length} Writer{placement.writers.length > 1 ? 's' : ''}
                                    </span>
                                  )}
                                  {placement.releaseDate && (
                                    <span className="text-gray-500">
                                      {new Date(placement.releaseDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                {/* Writers */}
                                {placement.writers.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {placement.writers.slice(0, 3).map((w, i) => (
                                      <span
                                        key={i}
                                        className={`text-[10px] px-1.5 py-0.5 rounded ${
                                          w.pro ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}
                                      >
                                        {w.name} ({w.split}%)
                                        {w.pro && ` • ${w.pro}`}
                                      </span>
                                    ))}
                                    {placement.writers.length > 3 && (
                                      <span className="text-[10px] text-gray-500">
                                        +{placement.writers.length - 3} more
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Scan Results */}
                      {placementsScanResults.length > 0 && (
                        <div className="mt-8 space-y-6">
                          {/* Enhanced Summary */}
                          {placementsScanSummary && (
                            <div className="bg-gradient-to-br from-white/[0.04] to-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
                              <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                Scan Summary
                              </h4>

                              {/* Summary Stats */}
                              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                      <ListMusic className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-white">{placementsScanSummary.totalSongs}</p>
                                      <p className="text-xs text-gray-500">Tracks Scanned</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                      placementsScanSummary.averageScore >= 80 ? 'bg-emerald-500/20' :
                                      placementsScanSummary.averageScore >= 60 ? 'bg-yellow-500/20' :
                                      'bg-red-500/20'
                                    }`}>
                                      <Shield className={`w-5 h-5 ${
                                        placementsScanSummary.averageScore >= 80 ? 'text-emerald-400' :
                                        placementsScanSummary.averageScore >= 60 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`} />
                                    </div>
                                    <div>
                                      <p className={`text-2xl font-bold ${
                                        placementsScanSummary.averageScore >= 80 ? 'text-emerald-400' :
                                        placementsScanSummary.averageScore >= 60 ? 'text-yellow-400' :
                                        'text-red-400'
                                      }`}>{placementsScanSummary.averageScore}</p>
                                      <p className="text-xs text-gray-500">Average Score</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                                      <AlertTriangle className="w-5 h-5 text-red-400" />
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-red-400">{placementsScanSummary.criticalCount}</p>
                                      <p className="text-xs text-gray-500">Critical Issues</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                      <Clock className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <div>
                                      <p className="text-2xl font-bold text-orange-400">{placementsScanSummary.highCount}</p>
                                      <p className="text-xs text-gray-500">High Priority</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Grade Distribution */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 mr-2">Grade Distribution:</span>
                                {(['A', 'B', 'C', 'D', 'F'] as Grade[]).map((grade) => {
                                  const count = placementsScanResults.filter(r => r.grade === grade).length;
                                  return count > 0 ? (
                                    <div
                                      key={grade}
                                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${GRADE_CONFIG[grade].bg} ${GRADE_CONFIG[grade].color}`}
                                    >
                                      {grade}: {count}
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}

                          {/* Results Header */}
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                              <Database className="w-5 h-5 text-purple-400" />
                              Detailed Results
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div> Verified
                              </span>
                              <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-gray-500"></div> Not Found
                              </span>
                            </div>
                          </div>

                          {/* Enhanced Results List */}
                          <div className="space-y-4">
                            {placementsScanResults.map((result, idx) => {
                              const sourcesFound = [
                                result.sources.spotify?.found,
                                result.sources.musicbrainz?.found,
                                result.sources.discogs?.found,
                                result.sources.songview?.found
                              ].filter(Boolean).length;

                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  className={`bg-gradient-to-br from-white/[0.04] to-white/[0.02] border rounded-2xl overflow-hidden ${
                                    result.grade === 'A' ? 'border-emerald-500/20' :
                                    result.grade === 'B' ? 'border-lime-500/20' :
                                    result.grade === 'C' ? 'border-yellow-500/20' :
                                    result.grade === 'D' ? 'border-orange-500/20' :
                                    'border-red-500/20'
                                  }`}
                                >
                                  {/* Main Content */}
                                  <div className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                      {/* Track Info */}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                          {/* Album Art Placeholder or Spotify Image */}
                                          {result.sources.spotify?.track?.image ? (
                                            <img
                                              src={result.sources.spotify.track.image}
                                              alt={result.song.title}
                                              className="w-14 h-14 rounded-lg object-cover"
                                            />
                                          ) : (
                                            <div className="w-14 h-14 rounded-lg bg-white/[0.05] flex items-center justify-center">
                                              <Music className="w-6 h-6 text-gray-500" />
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <h5 className="font-semibold text-white truncate">{result.song.title}</h5>
                                            <p className="text-sm text-gray-400 truncate">{result.song.artist || 'Unknown Artist'}</p>
                                          </div>
                                        </div>

                                        {/* Source Indicators */}
                                        <div className="flex items-center gap-2 flex-wrap mb-3">
                                          {/* Spotify */}
                                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                            result.sources.spotify?.found
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'bg-white/[0.03] text-gray-500'
                                          }`}>
                                            <div className={`w-3 h-3 rounded-full ${result.sources.spotify?.found ? 'bg-[#1DB954]' : 'bg-gray-600'}`}></div>
                                            Spotify
                                          </div>

                                          {/* MusicBrainz */}
                                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                            result.sources.musicbrainz?.found
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'bg-white/[0.03] text-gray-500'
                                          }`}>
                                            <div className={`w-3 h-3 rounded-full ${result.sources.musicbrainz?.found ? 'bg-orange-500' : 'bg-gray-600'}`}></div>
                                            MusicBrainz
                                          </div>

                                          {/* Discogs */}
                                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                            result.sources.discogs?.found
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'bg-white/[0.03] text-gray-500'
                                          }`}>
                                            <div className={`w-3 h-3 rounded-full ${result.sources.discogs?.found ? 'bg-white' : 'bg-gray-600'}`}></div>
                                            Discogs
                                          </div>

                                          {/* BMI/ASCAP */}
                                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
                                            result.sources.songview?.found
                                              ? 'bg-emerald-500/20 text-emerald-400'
                                              : 'bg-white/[0.03] text-gray-500'
                                          }`}>
                                            <div className={`w-3 h-3 rounded-full ${result.sources.songview?.found ? 'bg-purple-500' : 'bg-gray-600'}`}></div>
                                            PRO Registry
                                          </div>
                                        </div>

                                        {/* Discovered Data */}
                                        {(result.foundData.isrcs.length > 0 || result.foundData.writers.length > 0 || result.foundData.iswcs.length > 0) && (
                                          <div className="flex flex-wrap gap-2 text-xs">
                                            {result.foundData.isrcs.length > 0 && (
                                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                                                <Disc className="w-3 h-3" />
                                                ISRC: {result.foundData.isrcs[0]}
                                              </span>
                                            )}
                                            {result.foundData.writers.length > 0 && (
                                              <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded">
                                                <Users className="w-3 h-3" />
                                                {result.foundData.writers.length} Writer{result.foundData.writers.length > 1 ? 's' : ''} Found
                                              </span>
                                            )}
                                            {result.foundData.iswcs.length > 0 && (
                                              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded">
                                                <FileText className="w-3 h-3" />
                                                ISWC: {result.foundData.iswcs[0]}
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* Score Badge */}
                                      <div className="flex flex-col items-center">
                                        <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center ${GRADE_CONFIG[result.grade].bg} border ${GRADE_CONFIG[result.grade].border}`}>
                                          <span className={`text-2xl font-bold ${GRADE_CONFIG[result.grade].color}`}>{result.score}</span>
                                          <span className={`text-xs font-medium ${GRADE_CONFIG[result.grade].color}`}>{result.grade}</span>
                                        </div>
                                        <span className="text-[10px] text-gray-500 mt-1">{GRADE_CONFIG[result.grade].label}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Issues Section */}
                                  {result.issues.length > 0 && (
                                    <div className="border-t border-white/[0.06] bg-white/[0.02] p-4">
                                      <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {result.issues.length} Issue{result.issues.length > 1 ? 's' : ''} Found
                                      </p>
                                      <div className="space-y-2">
                                        {result.issues.map((issue, i) => (
                                          <div
                                            key={i}
                                            className={`p-3 rounded-lg border ${
                                              issue.severity === 'critical'
                                                ? 'bg-red-500/10 border-red-500/20'
                                                : issue.severity === 'high'
                                                ? 'bg-orange-500/10 border-orange-500/20'
                                                : issue.severity === 'medium'
                                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                                : 'bg-blue-500/10 border-blue-500/20'
                                            }`}
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                                    issue.severity === 'critical' ? 'bg-red-500/30 text-red-400' :
                                                    issue.severity === 'high' ? 'bg-orange-500/30 text-orange-400' :
                                                    issue.severity === 'medium' ? 'bg-yellow-500/30 text-yellow-400' :
                                                    'bg-blue-500/30 text-blue-400'
                                                  }`}>
                                                    {issue.severity}
                                                  </span>
                                                  <span className="text-xs text-gray-500">-{issue.deduction} pts</span>
                                                </div>
                                                <p className={`text-sm ${
                                                  issue.severity === 'critical' ? 'text-red-300' :
                                                  issue.severity === 'high' ? 'text-orange-300' :
                                                  issue.severity === 'medium' ? 'text-yellow-300' :
                                                  'text-blue-300'
                                                }`}>
                                                  {issue.description}
                                                </p>
                                                {issue.fixInstructions && (
                                                  <p className="text-xs text-gray-400 mt-1 flex items-start gap-1">
                                                    <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                                    {issue.fixInstructions}
                                                  </p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* No Issues - Clean Status */}
                                  {result.issues.length === 0 && (
                                    <div className="border-t border-white/[0.06] bg-emerald-500/5 p-3">
                                      <p className="text-xs text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        All metadata checks passed! This track is well-documented across {sourcesFound} source{sourcesFound > 1 ? 's' : ''}.
                                      </p>
                                    </div>
                                  )}

                                  {/* View Details Button */}
                                  <div className="border-t border-white/[0.06] p-3">
                                    <button
                                      onClick={() => setExpandedPlacementIdx(expandedPlacementIdx === idx ? null : idx)}
                                      className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-1"
                                    >
                                      <Database className="w-3.5 h-3.5" />
                                      {expandedPlacementIdx === idx ? 'Hide' : 'View'} Database Comparison
                                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedPlacementIdx === idx ? 'rotate-180' : ''}`} />
                                    </button>
                                  </div>

                                  {/* Expanded Comparison View */}
                                  {expandedPlacementIdx === idx && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="border-t border-white/[0.06] bg-white/[0.02] p-4"
                                    >
                                      <h4 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
                                        <Database className="w-4 h-4 text-emerald-400" />
                                        Database Comparison
                                      </h4>

                                      {/* Comparison Grid - Matching Single Song Format */}
                                      <div className="space-y-6">
                                        {/* Identifiers Section */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/30 to-transparent" />
                                            <span className="text-[11px] uppercase tracking-widest text-emerald-400 font-semibold px-2">Identifiers</span>
                                            <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/30 to-transparent" />
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <ComparisonField
                                              label="ISRC"
                                              icon={Disc}
                                              userValue={result.song.isrc}
                                              foundValues={result.foundData.isrcs}
                                              isIdentifier={true}
                                            />
                                            <ComparisonField
                                              label="ISWC"
                                              icon={FileText}
                                              foundValues={result.foundData.iswcs}
                                              isIdentifier={true}
                                            />
                                          </div>
                                        </div>

                                        {/* Track Info Section */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="h-px flex-1 bg-gradient-to-r from-blue-500/30 to-transparent" />
                                            <span className="text-[11px] uppercase tracking-widest text-blue-400 font-semibold px-2">Track Info</span>
                                            <div className="h-px flex-1 bg-gradient-to-l from-blue-500/30 to-transparent" />
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <ComparisonField
                                              label="Title"
                                              icon={Music}
                                              userValue={result.song.title}
                                              foundValues={result.foundData.titleVariations}
                                            />
                                            <ComparisonField
                                              label="Artists"
                                              icon={Users}
                                              userValue={result.song.artist}
                                              foundValues={result.foundData.artists}
                                            />
                                            <ComparisonField
                                              label="Release"
                                              icon={Clock}
                                              foundValues={result.foundData.releaseDates}
                                            />
                                          </div>
                                        </div>

                                        {/* Rights Holders Section */}
                                        <div>
                                          <div className="flex items-center gap-2 mb-3">
                                            <div className="h-px flex-1 bg-gradient-to-r from-purple-500/30 to-transparent" />
                                            <span className="text-[11px] uppercase tracking-widest text-purple-400 font-semibold px-2">Rights Holders</span>
                                            <div className="h-px flex-1 bg-gradient-to-l from-purple-500/30 to-transparent" />
                                          </div>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <WritersDetailField
                                              label="Writers"
                                              icon={Users}
                                              userValue={result.song.writer}
                                              foundValues={result.foundData.writers}
                                              detailValues={result.foundData.writersDetail}
                                            />
                                            <WritersDetailField
                                              label="Publishers"
                                              icon={Globe}
                                              foundValues={result.foundData.publishers || []}
                                              detailValues={result.foundData.publishersDetail}
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Source Status Cards */}
                                      <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                                        {/* Spotify */}
                                        <div className={`p-3 rounded-xl border ${
                                          result.sources.spotify?.found
                                            ? 'bg-green-500/10 border-green-500/20'
                                            : 'bg-gray-500/5 border-gray-500/10'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Music className="w-3.5 h-3.5" />
                                            <span className={`text-xs font-medium ${result.sources.spotify?.found ? 'text-green-400' : 'text-gray-500'}`}>
                                              Spotify
                                            </span>
                                            {result.sources.spotify?.found ? (
                                              <CheckCircle2 className="w-3 h-3 text-green-400 ml-auto" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-gray-500 ml-auto" />
                                            )}
                                          </div>
                                          {result.sources.spotify?.track?.isrc && (
                                            <p className="text-[10px] font-mono text-green-400">ISRC: {result.sources.spotify.track.isrc}</p>
                                          )}
                                        </div>

                                        {/* MusicBrainz */}
                                        <div className={`p-3 rounded-xl border ${
                                          result.sources.musicbrainz?.found
                                            ? 'bg-blue-500/10 border-blue-500/20'
                                            : 'bg-gray-500/5 border-gray-500/10'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Database className="w-3.5 h-3.5" />
                                            <span className={`text-xs font-medium ${result.sources.musicbrainz?.found ? 'text-blue-400' : 'text-gray-500'}`}>
                                              MusicBrainz
                                            </span>
                                            {result.sources.musicbrainz?.found ? (
                                              <CheckCircle2 className="w-3 h-3 text-blue-400 ml-auto" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-gray-500 ml-auto" />
                                            )}
                                          </div>
                                          {result.sources.musicbrainz?.recordings?.[0] && (
                                            <p className="text-[10px] text-gray-400 truncate">{result.sources.musicbrainz.recordings[0].artists}</p>
                                          )}
                                        </div>

                                        {/* Discogs */}
                                        <div className={`p-3 rounded-xl border ${
                                          result.sources.discogs?.found
                                            ? 'bg-orange-500/10 border-orange-500/20'
                                            : 'bg-gray-500/5 border-gray-500/10'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <Disc className="w-3.5 h-3.5" />
                                            <span className={`text-xs font-medium ${result.sources.discogs?.found ? 'text-orange-400' : 'text-gray-500'}`}>
                                              Discogs
                                            </span>
                                            {result.sources.discogs?.found ? (
                                              <CheckCircle2 className="w-3 h-3 text-orange-400 ml-auto" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-gray-500 ml-auto" />
                                            )}
                                          </div>
                                        </div>

                                        {/* PRO Registry */}
                                        <div className={`p-3 rounded-xl border ${
                                          result.sources.songview?.found
                                            ? 'bg-purple-500/10 border-purple-500/20'
                                            : 'bg-gray-500/5 border-gray-500/10'
                                        }`}>
                                          <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-3.5 h-3.5" />
                                            <span className={`text-xs font-medium ${result.sources.songview?.found ? 'text-purple-400' : 'text-gray-500'}`}>
                                              PRO
                                            </span>
                                            {result.sources.songview?.found ? (
                                              <CheckCircle2 className="w-3 h-3 text-purple-400 ml-auto" />
                                            ) : (
                                              <XCircle className="w-3 h-3 text-gray-500 ml-auto" />
                                            )}
                                          </div>
                                          {result.foundData.iswcs[0] && (
                                            <p className="text-[10px] font-mono text-purple-400">ISWC: {result.foundData.iswcs[0]}</p>
                                          )}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              )}

              {/* Catalog Upload Mode */}
              {scanMode === 'catalog' && (
                <motion.div
                  key="catalog"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {!catalogReport ? (
                    <>
                      {/* Upload Zone */}
                      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Upload className="w-5 h-5 text-emerald-400" />
                          Upload Catalog
                        </h3>

                        {uploadedFiles.length === 0 ? (
                          <FileDropzone
                            onFilesAccepted={handleFilesAccepted}
                            accept={ACCEPT_CONFIGS.spreadsheets}
                            maxFiles={1}
                            maxSize={16 * 1024 * 1024}
                          />
                        ) : (
                          <div className="space-y-4">
                            <FileList
                              files={uploadedFiles}
                              onRemove={() => resetScanner()}
                            />

                            {isUploading && (
                              <div className="flex items-center gap-3 text-gray-400">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>Analyzing catalog...</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Expected columns info */}
                        <div className="mt-4 p-4 bg-white/[0.02] rounded-xl">
                          <p className="text-xs text-gray-500 flex items-center gap-2 mb-2">
                            <Info className="w-4 h-4" />
                            Expected columns (CSV/XLSX)
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {['title *', 'artist', 'writer', 'isrc', 'iswc', 'publisher'].map((col) => (
                              <span
                                key={col}
                                className={`px-2 py-1 rounded text-xs ${
                                  col.includes('*') ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-gray-400'
                                }`}
                              >
                                {col}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Quick Summary */}
                      {quickSummary && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6"
                        >
                          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Quick Analysis
                          </h3>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-white">{quickSummary.total_songs}</p>
                              <p className="text-xs text-gray-500">Songs</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                              <p className={`text-2xl font-bold ${quickSummary.quick_score >= 70 ? 'text-emerald-400' : quickSummary.quick_score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {quickSummary.quick_score > 0 ? Math.round(quickSummary.quick_score) : '—'}
                              </p>
                              <p className="text-xs text-gray-500">Quick Score</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-orange-400">{quickSummary.estimated_problems || '—'}</p>
                              <p className="text-xs text-gray-500">Potential Issues</p>
                            </div>
                            <div className="bg-white/[0.03] rounded-xl p-4 text-center">
                              <p className="text-2xl font-bold text-red-400">{quickSummary.issues_detected.missing_iswc || '—'}</p>
                              <p className="text-xs text-gray-500">Missing ISWCs</p>
                            </div>
                          </div>

                          <p className="text-gray-400 text-sm mb-4">{quickSummary.recommendation}</p>

                          <button
                            onClick={runFullScan}
                            disabled={isScanning}
                            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {isScanning ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Running Full Scan...
                              </>
                            ) : (
                              <>
                                <BarChart3 className="w-5 h-5" />
                                Run Full Leak Scan
                              </>
                            )}
                          </button>
                        </motion.div>
                      )}
                    </>
                  ) : (
                    /* Full Report Display */
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      {/* Report Header */}
                      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                              <FileText className="w-5 h-5 text-emerald-400" />
                              Leak Report
                            </h3>
                            <p className="text-gray-400 text-sm">{catalogReport.catalog_name}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadReport('html')}
                              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                              <Download className="w-4 h-4" />
                              HTML
                            </button>
                            <button
                              onClick={() => downloadReport('csv')}
                              className="px-3 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center gap-2 text-sm"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                              CSV
                            </button>
                          </div>
                        </div>

                        {/* Score Summary */}
                        <div className="flex items-center gap-6 mb-6">
                          <ScoreCircle score={catalogReport.summary.overall_score} grade={catalogReport.summary.overall_grade} />
                          <div className="flex-1">
                            <p className={`text-lg font-semibold ${GRADE_CONFIG[catalogReport.summary.overall_grade].color}`}>
                              {GRADE_CONFIG[catalogReport.summary.overall_grade].label} Catalog Health
                            </p>
                            <p className="text-gray-400 text-sm">{catalogReport.summary.total_songs} songs analyzed</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-red-400">
                              ${catalogReport.summary.total_estimated_lost_revenue.toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">Est. lost/year</p>
                          </div>
                        </div>

                        {/* Grade Distribution */}
                        <div className="grid grid-cols-5 gap-2">
                          {(['A', 'B', 'C', 'D', 'F'] as Grade[]).map((grade) => {
                            const count = catalogReport.summary.grade_distribution[grade] || 0;
                            const pct = catalogReport.summary.total_songs > 0
                              ? Math.round((count / catalogReport.summary.total_songs) * 100)
                              : 0;
                            return (
                              <div key={grade} className="text-center">
                                <GradeBadge grade={grade} size="sm" />
                                <p className="text-white font-medium mt-2">{count}</p>
                                <p className="text-xs text-gray-500">{pct}%</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Priority Actions */}
                      {catalogReport.recommendations.priority_actions.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6">
                          <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-yellow-400" />
                            Priority Actions
                          </h4>
                          <div className="space-y-3">
                            {catalogReport.recommendations.priority_actions.map((action, idx) => (
                              <div key={idx} className="flex items-start gap-3">
                                <span className="w-6 h-6 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-xs font-medium flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <p className="text-gray-300 text-sm">{action}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Top Issues */}
                      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6">
                        <h4 className="text-white font-medium mb-4">Most Common Issues</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {catalogReport.issues.top_issues.map((issue, idx) => (
                            <div
                              key={idx}
                              className={`p-4 rounded-xl ${SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG]?.bg || 'bg-white/5'} border ${SEVERITY_CONFIG[issue.severity as keyof typeof SEVERITY_CONFIG]?.border || 'border-white/10'}`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-white font-medium text-sm">{issue.description}</p>
                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-400">
                                  {issue.count} songs
                                </span>
                              </div>
                              <p className="text-gray-400 text-xs">{issue.fix_suggestion}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* New Scan Button */}
                      <button
                        onClick={resetScanner}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Scan Another Catalog
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Reports Mode */}
              {scanMode === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6"
                >
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-400" />
                    Saved Reports
                  </h3>

                  {savedReports.length === 0 ? (
                    <div className="text-center py-12">
                      <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-400">No reports saved yet</p>
                      <p className="text-gray-500 text-sm mt-1">Upload a catalog to generate your first report</p>
                      <button
                        onClick={() => setScanMode('catalog')}
                        className="mt-4 px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                      >
                        Upload Catalog
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {savedReports.map((report) => (
                        <div
                          key={report.catalog_id}
                          className="p-4 bg-white/[0.03] rounded-xl flex items-center justify-between"
                        >
                          <div>
                            <p className="text-white font-medium">{report.catalog_name}</p>
                            <p className="text-gray-500 text-xs">
                              {new Date(report.generated_at).toLocaleDateString()} • {report.summary.total_songs} songs
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <GradeBadge grade={report.summary.overall_grade} size="sm" />
                            <button className="p-2 text-gray-400 hover:text-white transition-colors">
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              {[
                { icon: Database, title: 'Multi-Source + PRO Check', desc: 'Spotify, MusicBrainz, BMI/ASCAP' },
                { icon: Shield, title: 'FICO for Songs', desc: '0-100 metadata health score' },
                { icon: DollarSign, title: 'Revenue Analysis', desc: 'Estimate missing royalties' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{title}</p>
                    <p className="text-gray-500 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
