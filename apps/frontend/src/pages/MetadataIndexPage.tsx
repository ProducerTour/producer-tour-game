import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Music, Database, Link2, ChevronLeft, Plus, Trash2,
  Check, X, Clock, AlertTriangle, ExternalLink, Play, Pause, FolderPlus,
  List, Copy, ChevronUp, ChevronDown, Edit3, ArrowUpDown, FileDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
    release_date: string;
  };
  duration_ms: number;
  external_ids?: { isrc?: string };
  external_urls?: { spotify?: string };
  preview_url?: string | null;
}

interface MusicBrainzRecording {
  id: string;
  title: string;
  'artist-credit'?: { name: string; artist: { name: string } }[];
  releases?: { title: string; date?: string; 'release-group'?: { 'primary-type'?: string } }[];
  isrcs?: string[];
  length?: number;
}

interface SearchResult {
  id: string;
  source: 'spotify' | 'musicbrainz';
  title: string;
  artist: string;
  album: string;
  releaseDate: string;
  isrc?: string;
  duration?: number;
  imageUrl?: string;
  previewUrl?: string | null;
  externalUrl?: string;
  raw?: any;
  addedAt?: string;
}

interface SavedList {
  id: string;
  name: string;
  items: SearchResult[];
  createdAt: string;
  updatedAt: string;
}

type SearchMode = 'code' | 'keyword' | 'url';
type MatchStatus = 'matched' | 'partial' | 'unmatched' | 'pending';
type SortOption = 'artist' | 'title' | 'album' | 'release_date' | 'added';

// API Configuration
const SPOTIFY_CLIENT_ID = '059f6984e6464abd9144e1eb7556b73c';
const SPOTIFY_CLIENT_SECRET = '26553c3aa2f64ba7b90cf4e5459fe3e8';
const MUSICBRAINZ_API_URL = 'https://musicbrainz.org/ws/2';

// Helper functions
const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getMatchStatus = (spotify?: SearchResult, musicbrainz?: SearchResult): MatchStatus => {
  if (!spotify && !musicbrainz) return 'unmatched';
  if (!spotify || !musicbrainz) return 'partial';

  const normalizeStr = (str: string) => str.toLowerCase().trim().replace(/[^\w\s]/g, '');
  const spotifyTitle = normalizeStr(spotify.title);
  const mbTitle = normalizeStr(musicbrainz.title);

  if (spotifyTitle === mbTitle) return 'matched';
  if (spotifyTitle.includes(mbTitle) || mbTitle.includes(spotifyTitle)) return 'partial';
  return 'unmatched';
};

const StatusBadge = ({ status }: { status: MatchStatus }) => {
  const configs = {
    matched: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: Check, label: 'Matched' },
    partial: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: AlertTriangle, label: 'Partial' },
    unmatched: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: X, label: 'Unmatched' },
    pending: { bg: 'bg-white/10', text: 'text-theme-foreground-muted', border: 'border-white/20', icon: Clock, label: 'Pending' },
  };
  const config = configs[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export default function MetadataIndexPage() {
  const navigate = useNavigate();

  // Search state
  const [searchMode, setSearchMode] = useState<SearchMode>('code');
  const [isrcInput, setIsrcInput] = useState('');
  const [upcInput, setUpcInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [trackInput, setTrackInput] = useState('');
  const [albumInput, setAlbumInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [advancedMode, setAdvancedMode] = useState(false);
  const [yearInput, setYearInput] = useState('');

  // Advanced keyword mode fields
  const [versionInput, setVersionInput] = useState('');
  const [recordingYearInput, setRecordingYearInput] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState<'all' | 'audio' | 'video'>('all');

  // Real-time search preview
  const [previewResult, setPreviewResult] = useState<SearchResult | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sort state
  const [sortOption, setSortOption] = useState<SortOption>('added');

  // Results state
  const [spotifyResult, setSpotifyResult] = useState<SearchResult | null>(null);
  const [musicbrainzResult, setMusicbrainzResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  // Lists state
  const [savedLists, setSavedLists] = useState<SavedList[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [_newListName, setNewListName] = useState('');
  const [viewingList, setViewingList] = useState<SavedList | null>(null);

  // Audio preview state
  const [playingPreview, setPlayingPreview] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Spotify token
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  // Load saved lists from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('metadata-index-lists');
    if (saved) {
      try {
        setSavedLists(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved lists:', e);
      }
    }
  }, []);

  // Save lists to localStorage
  useEffect(() => {
    localStorage.setItem('metadata-index-lists', JSON.stringify(savedLists));
  }, [savedLists]);

  // Get Spotify access token
  const getSpotifyToken = useCallback(async (): Promise<string | null> => {
    if (spotifyToken) return spotifyToken;

    try {
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) throw new Error('Failed to get Spotify token');

      const data = await response.json();
      setSpotifyToken(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Spotify auth error:', error);
      return null;
    }
  }, [spotifyToken]);

  // Search Spotify by ISRC
  const searchSpotifyByIsrc = async (isrc: string): Promise<SearchResult | null> => {
    const token = await getSpotifyToken();
    if (!token) return null;

    try {
      const response = await fetch(`https://api.spotify.com/v1/search?q=isrc:${isrc}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const track = data.tracks?.items?.[0] as SpotifyTrack;
      if (!track) return null;

      return {
        id: track.id,
        source: 'spotify',
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        album: track.album.name,
        releaseDate: track.album.release_date,
        isrc: track.external_ids?.isrc,
        duration: track.duration_ms,
        imageUrl: track.album.images[0]?.url,
        previewUrl: track.preview_url,
        externalUrl: track.external_urls?.spotify,
        raw: track,
      };
    } catch (error) {
      console.error('Spotify search error:', error);
      return null;
    }
  };

  // Search Spotify by keywords
  const searchSpotifyByKeywords = async (artist: string, track?: string, album?: string): Promise<SearchResult | null> => {
    const token = await getSpotifyToken();
    if (!token) return null;

    try {
      let query = `artist:${artist}`;
      if (track) query += ` track:${track}`;
      if (album) query += ` album:${album}`;

      const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) return null;

      const data = await response.json();
      const spotifyTrack = data.tracks?.items?.[0] as SpotifyTrack;
      if (!spotifyTrack) return null;

      return {
        id: spotifyTrack.id,
        source: 'spotify',
        title: spotifyTrack.name,
        artist: spotifyTrack.artists.map(a => a.name).join(', '),
        album: spotifyTrack.album.name,
        releaseDate: spotifyTrack.album.release_date,
        isrc: spotifyTrack.external_ids?.isrc,
        duration: spotifyTrack.duration_ms,
        imageUrl: spotifyTrack.album.images[0]?.url,
        previewUrl: spotifyTrack.preview_url,
        externalUrl: spotifyTrack.external_urls?.spotify,
        raw: spotifyTrack,
      };
    } catch (error) {
      console.error('Spotify keyword search error:', error);
      return null;
    }
  };

  // Search Spotify by URL
  const searchSpotifyByUrl = async (url: string): Promise<SearchResult | null> => {
    const token = await getSpotifyToken();
    if (!token) return null;

    try {
      // Extract track/album ID from URL
      const trackMatch = url.match(/track\/([a-zA-Z0-9]+)/);
      const albumMatch = url.match(/album\/([a-zA-Z0-9]+)/);

      if (trackMatch) {
        const response = await fetch(`https://api.spotify.com/v1/tracks/${trackMatch[1]}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) return null;

        const track = await response.json() as SpotifyTrack;
        return {
          id: track.id,
          source: 'spotify',
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          album: track.album.name,
          releaseDate: track.album.release_date,
          isrc: track.external_ids?.isrc,
          duration: track.duration_ms,
          imageUrl: track.album.images[0]?.url,
          previewUrl: track.preview_url,
          externalUrl: track.external_urls?.spotify,
          raw: track,
        };
      }

      if (albumMatch) {
        const response = await fetch(`https://api.spotify.com/v1/albums/${albumMatch[1]}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) return null;

        const album = await response.json();
        return {
          id: album.id,
          source: 'spotify',
          title: album.name,
          artist: album.artists.map((a: any) => a.name).join(', '),
          album: album.name,
          releaseDate: album.release_date,
          imageUrl: album.images[0]?.url,
          externalUrl: album.external_urls?.spotify,
          raw: album,
        };
      }

      return null;
    } catch (error) {
      console.error('Spotify URL search error:', error);
      return null;
    }
  };

  // Search MusicBrainz by ISRC
  const searchMusicBrainzByIsrc = async (isrc: string): Promise<SearchResult | null> => {
    try {
      const response = await fetch(
        `${MUSICBRAINZ_API_URL}/recording/?query=isrc:${isrc}&fmt=json&limit=1`,
        { headers: { 'User-Agent': 'ProducerTour/1.0 (https://producertour.com)' } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const recording = data.recordings?.[0] as MusicBrainzRecording;
      if (!recording) return null;

      return {
        id: recording.id,
        source: 'musicbrainz',
        title: recording.title,
        artist: recording['artist-credit']?.map(a => a.name || a.artist.name).join(', ') || 'Unknown',
        album: recording.releases?.[0]?.title || '',
        releaseDate: recording.releases?.[0]?.date || '',
        isrc: recording.isrcs?.[0],
        duration: recording.length,
        externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
        raw: recording,
      };
    } catch (error) {
      console.error('MusicBrainz search error:', error);
      return null;
    }
  };

  // Search MusicBrainz by keywords
  const searchMusicBrainzByKeywords = async (artist: string, track?: string): Promise<SearchResult | null> => {
    try {
      let query = `artist:${artist}`;
      if (track) query += ` AND recording:${track}`;

      const response = await fetch(
        `${MUSICBRAINZ_API_URL}/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`,
        { headers: { 'User-Agent': 'ProducerTour/1.0 (https://producertour.com)' } }
      );

      if (!response.ok) return null;

      const data = await response.json();
      const recording = data.recordings?.[0] as MusicBrainzRecording;
      if (!recording) return null;

      return {
        id: recording.id,
        source: 'musicbrainz',
        title: recording.title,
        artist: recording['artist-credit']?.map(a => a.name || a.artist.name).join(', ') || 'Unknown',
        album: recording.releases?.[0]?.title || '',
        releaseDate: recording.releases?.[0]?.date || '',
        isrc: recording.isrcs?.[0],
        duration: recording.length,
        externalUrl: `https://musicbrainz.org/recording/${recording.id}`,
        raw: recording,
      };
    } catch (error) {
      console.error('MusicBrainz keyword search error:', error);
      return null;
    }
  };

  // Audio preview functions
  const togglePreview = (url: string) => {
    if (playingPreview === url) {
      audioElement?.pause();
      setPlayingPreview(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => setPlayingPreview(null);
      setAudioElement(audio);
      setPlayingPreview(url);
    }
  };

  // List management functions
  const createNewList = (name: string) => {
    const newList: SavedList = {
      id: Date.now().toString(),
      name: name || `List ${savedLists.length + 1}`,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSavedLists([...savedLists, newList]);
    setNewListName('');
    toast.success(`Created list: ${newList.name}`);
    return newList;
  };

  const addToList = (listId: string, result: SearchResult) => {
    setSavedLists(lists => lists.map(list => {
      if (list.id === listId) {
        // Check if already in list
        if (list.items.some(item => item.id === result.id && item.source === result.source)) {
          toast.error('Already in this list');
          return list;
        }
        toast.success(`Added to ${list.name}`);
        return {
          ...list,
          items: [...list.items, { ...result, addedAt: new Date().toISOString() }],
          updatedAt: new Date().toISOString(),
        };
      }
      return list;
    }));
    setShowListModal(false);
  };

  const removeFromList = (listId: string, resultId: string, source: string) => {
    setSavedLists(lists => lists.map(list => {
      if (list.id === listId) {
        return {
          ...list,
          items: list.items.filter(item => !(item.id === resultId && item.source === source)),
          updatedAt: new Date().toISOString(),
        };
      }
      return list;
    }));
  };

  const deleteList = (listId: string) => {
    setSavedLists(lists => lists.filter(list => list.id !== listId));
    if (viewingList?.id === listId) setViewingList(null);
    toast.success('List deleted');
  };

  // Rename list
  const renameList = (listId: string, newName: string) => {
    setSavedLists(lists => lists.map(list => {
      if (list.id === listId) {
        return { ...list, name: newName, updatedAt: new Date().toISOString() };
      }
      return list;
    }));
    if (viewingList?.id === listId) {
      setViewingList(prev => prev ? { ...prev, name: newName } : null);
    }
    toast.success('List renamed');
  };

  // Move item up in list
  const moveItemUp = (listId: string, index: number) => {
    if (index === 0) return;
    setSavedLists(lists => lists.map(list => {
      if (list.id === listId) {
        const newItems = [...list.items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        return { ...list, items: newItems, updatedAt: new Date().toISOString() };
      }
      return list;
    }));
    if (viewingList?.id === listId) {
      setViewingList(prev => {
        if (!prev) return null;
        const newItems = [...prev.items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        return { ...prev, items: newItems };
      });
    }
  };

  // Move item down in list
  const moveItemDown = (listId: string, index: number) => {
    setSavedLists(lists => lists.map(list => {
      if (list.id === listId && index < list.items.length - 1) {
        const newItems = [...list.items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return { ...list, items: newItems, updatedAt: new Date().toISOString() };
      }
      return list;
    }));
    if (viewingList?.id === listId) {
      setViewingList(prev => {
        if (!prev || index >= prev.items.length - 1) return prev;
        const newItems = [...prev.items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        return { ...prev, items: newItems };
      });
    }
  };

  // Sort list
  const sortListBy = (list: SavedList, sortBy: SortOption): SearchResult[] => {
    const items = [...list.items];
    items.sort((a, b) => {
      switch (sortBy) {
        case 'artist':
          return (a.artist || '').toLowerCase().localeCompare((b.artist || '').toLowerCase());
        case 'title':
          return (a.title || '').toLowerCase().localeCompare((b.title || '').toLowerCase());
        case 'album':
          return (a.album || '').toLowerCase().localeCompare((b.album || '').toLowerCase());
        case 'release_date':
          return (b.releaseDate || '0000').localeCompare(a.releaseDate || '0000'); // Newest first
        case 'added':
        default:
          return (a.addedAt || '').localeCompare(b.addedAt || '');
      }
    });
    return items;
  };

  // Apply sort to viewing list
  const applySortToList = (sortBy: SortOption) => {
    setSortOption(sortBy);
    if (viewingList) {
      const sortedItems = sortListBy(viewingList, sortBy);
      setViewingList({ ...viewingList, items: sortedItems });
    }
  };

  // Export functions
  const exportList = (list: SavedList, format: 'csv' | 'json' | 'excel' | 'word' | 'pdf') => {
    if (format === 'csv') {
      exportToCSV(list);
    } else if (format === 'json') {
      exportToJSON(list);
    } else if (format === 'excel') {
      exportToExcel(list);
    } else if (format === 'word') {
      exportToWord(list);
    } else if (format === 'pdf') {
      exportToPDF(list);
    }
  };

  const exportToCSV = (list: SavedList) => {
    const headers = ['#', 'Title', 'Artist', 'Album', 'ISRC', 'Release Date', 'Source', 'Duration', 'Spotify URL', 'MusicBrainz URL'];
    const rows = list.items.map((item, idx) => [
      idx + 1,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${(item.artist || '').replace(/"/g, '""')}"`,
      `"${(item.album || '').replace(/"/g, '""')}"`,
      item.isrc || '',
      item.releaseDate || '',
      item.source,
      item.duration ? formatDuration(item.duration) : '',
      item.source === 'spotify' && item.externalUrl ? item.externalUrl : '',
      item.source === 'musicbrainz' && item.externalUrl ? item.externalUrl : '',
    ]);
    const content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(content, `${list.name}.csv`, 'text/csv');
    toast.success('Exported to CSV');
  };

  const exportToJSON = (list: SavedList) => {
    const content = JSON.stringify(list, null, 2);
    downloadFile(content, `${list.name}.json`, 'application/json');
    toast.success('Exported to JSON');
  };

  const exportToExcel = (list: SavedList) => {
    // Create Excel-compatible XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles>\n';
    xml += '<Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1e40af" ss:Pattern="Solid"/></Style>\n';
    xml += '<Style ss:ID="SpotifyHeader"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#22c55e" ss:Pattern="Solid"/></Style>\n';
    xml += '<Style ss:ID="MBHeader"><Font ss:Bold="1"/><Interior ss:Color="#facc15" ss:Pattern="Solid"/></Style>\n';
    xml += '</Styles>\n';
    xml += '<Worksheet ss:Name="Metadata">\n<Table>\n';

    // Header row
    xml += '<Row>\n';
    ['#', 'Title', 'Artist', 'Album', 'ISRC', 'Release Date', 'Duration', 'Source', 'URL'].forEach(h => {
      xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>\n`;
    });
    xml += '</Row>\n';

    // Data rows
    list.items.forEach((item, idx) => {
      xml += '<Row>\n';
      xml += `<Cell><Data ss:Type="Number">${idx + 1}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${escapeXml(item.title)}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${escapeXml(item.artist)}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${escapeXml(item.album)}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${item.isrc || ''}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${item.releaseDate || ''}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${item.duration ? formatDuration(item.duration) : ''}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${item.source}</Data></Cell>\n`;
      xml += `<Cell><Data ss:Type="String">${item.externalUrl || ''}</Data></Cell>\n`;
      xml += '</Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n</Workbook>';
    downloadFile(xml, `${list.name}.xls`, 'application/vnd.ms-excel');
    toast.success('Exported to Excel');
  };

  const exportToWord = (list: SavedList) => {
    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + list.name + '</title>';
    html += '<style>';
    html += 'body { font-family: Calibri, Arial, sans-serif; padding: 40px; }';
    html += 'h1 { color: #1e40af; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }';
    html += 'table { width: 100%; border-collapse: collapse; margin-top: 20px; }';
    html += 'th { background: #1e40af; color: white; padding: 10px; text-align: left; }';
    html += 'td { padding: 8px; border: 1px solid #e2e8f0; }';
    html += 'tr:nth-child(even) { background: #f8fafc; }';
    html += '.spotify { color: #22c55e; } .musicbrainz { color: #eab308; }';
    html += '</style></head><body>';
    html += '<h1>Metadata List: ' + list.name + '</h1>';
    html += '<p><strong>' + list.items.length + '</strong> items | Exported: ' + new Date().toLocaleDateString() + '</p>';
    html += '<table><thead><tr>';
    ['#', 'Title', 'Artist', 'Album', 'ISRC', 'Release Date', 'Duration', 'Source'].forEach(h => {
      html += '<th>' + h + '</th>';
    });
    html += '</tr></thead><tbody>';
    list.items.forEach((item, idx) => {
      html += '<tr>';
      html += '<td>' + (idx + 1) + '</td>';
      html += '<td>' + (item.title || '') + '</td>';
      html += '<td>' + (item.artist || '') + '</td>';
      html += '<td>' + (item.album || '') + '</td>';
      html += '<td style="font-family: monospace;">' + (item.isrc || '') + '</td>';
      html += '<td>' + (item.releaseDate || '') + '</td>';
      html += '<td>' + (item.duration ? formatDuration(item.duration) : '') + '</td>';
      html += '<td class="' + item.source + '">' + item.source + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table></body></html>';
    downloadFile(html, `${list.name}.doc`, 'application/msword');
    toast.success('Exported to Word');
  };

  const exportToPDF = (list: SavedList) => {
    // Open print dialog with formatted HTML
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to export PDF');
      return;
    }

    let html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + list.name + '</title>';
    html += '<style>';
    html += '* { box-sizing: border-box; margin: 0; padding: 0; }';
    html += 'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; }';
    html += 'h1 { font-size: 24px; color: #1e40af; border-bottom: 3px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }';
    html += '.meta { color: #64748b; margin-bottom: 20px; }';
    html += '.item { border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; padding: 12px; page-break-inside: avoid; }';
    html += '.item-title { font-weight: 600; font-size: 14px; }';
    html += '.item-artist { color: #64748b; font-size: 13px; }';
    html += '.item-details { display: flex; gap: 16px; margin-top: 8px; font-size: 12px; color: #475569; }';
    html += '.spotify { color: #22c55e; } .musicbrainz { color: #eab308; }';
    html += '@media print { body { padding: 20px; } }';
    html += '</style></head><body>';
    html += '<h1>' + list.name + '</h1>';
    html += '<p class="meta"><strong>' + list.items.length + '</strong> items | Exported: ' + new Date().toLocaleDateString() + '</p>';

    list.items.forEach((item, idx) => {
      html += '<div class="item">';
      html += '<div class="item-title">' + (idx + 1) + '. ' + (item.title || 'Untitled') + '</div>';
      html += '<div class="item-artist">' + (item.artist || 'Unknown Artist') + (item.album ? ' — ' + item.album : '') + '</div>';
      html += '<div class="item-details">';
      if (item.isrc) html += '<span><strong>ISRC:</strong> ' + item.isrc + '</span>';
      if (item.releaseDate) html += '<span><strong>Released:</strong> ' + item.releaseDate + '</span>';
      if (item.duration) html += '<span><strong>Duration:</strong> ' + formatDuration(item.duration) + '</span>';
      html += '<span class="' + item.source + '"><strong>Source:</strong> ' + item.source + '</span>';
      html += '</div></div>';
    });

    html += '</body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
    toast.success('PDF ready - use Print dialog to save');
  };

  // Helper functions
  const escapeXml = (str: string) => (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyIsrc = (isrc: string) => {
    navigator.clipboard.writeText(isrc);
    toast.success('ISRC copied to clipboard');
  };

  // Demo data functions
  const setDemoCode = (type: 'isrc' | 'upc', code: string) => {
    if (type === 'isrc') {
      setIsrcInput(code);
      setUpcInput('');
    } else {
      setUpcInput(code);
      setIsrcInput('');
    }
  };

  const setDemoKeyword = (artist: string, track: string) => {
    setArtistInput(artist);
    setTrackInput(track);
    setAlbumInput('');
  };

  const setDemoUrl = (url: string) => {
    setUrlInput(url);
  };

  // Clear inputs when switching modes
  useEffect(() => {
    setIsrcInput('');
    setUpcInput('');
    setArtistInput('');
    setTrackInput('');
    setAlbumInput('');
    setUrlInput('');
    setYearInput('');
    setVersionInput('');
    setRecordingYearInput('');
    setFileTypeFilter('all');
    setSearchError(null);
    setPreviewResult(null);
  }, [searchMode]);

  // Real-time search with debounce - searches BOTH sources automatically
  useEffect(() => {
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Determine if we have enough input to trigger a search
    let shouldSearch = false;
    if (searchMode === 'code' && (isrcInput.trim().length >= 8 || upcInput.trim().length >= 10)) {
      shouldSearch = true;
    } else if (searchMode === 'keyword' && artistInput.trim() && (trackInput.trim() || albumInput.trim())) {
      shouldSearch = true;
    } else if (searchMode === 'url' && urlInput.trim().includes('spotify.com')) {
      shouldSearch = true;
    }

    if (shouldSearch) {
      setIsPreviewLoading(true);
      previewTimeoutRef.current = setTimeout(async () => {
        try {
          let spotifyRes: SearchResult | null = null;
          let mbRes: SearchResult | null = null;

          // Search both sources automatically
          if (searchMode === 'code') {
            if (isrcInput.trim()) {
              [spotifyRes, mbRes] = await Promise.all([
                searchSpotifyByIsrc(isrcInput.trim()),
                searchMusicBrainzByIsrc(isrcInput.trim())
              ]);
            } else if (upcInput.trim()) {
              // UPC search - only Spotify for now
              spotifyRes = await searchSpotifyByIsrc(upcInput.trim());
            }
          } else if (searchMode === 'keyword' && artistInput.trim()) {
            [spotifyRes, mbRes] = await Promise.all([
              searchSpotifyByKeywords(artistInput.trim(), trackInput.trim(), albumInput.trim()),
              searchMusicBrainzByKeywords(artistInput.trim(), trackInput.trim())
            ]);
          } else if (searchMode === 'url' && urlInput.trim()) {
            spotifyRes = await searchSpotifyByUrl(urlInput.trim());
            // Try to get MusicBrainz result using ISRC from Spotify
            if (spotifyRes?.isrc) {
              mbRes = await searchMusicBrainzByIsrc(spotifyRes.isrc);
            }
          }

          // Update preview (show Spotify result as preview)
          setPreviewResult(spotifyRes);

          // Also update full results for when user clicks
          setSpotifyResult(spotifyRes);
          setMusicbrainzResult(mbRes);

        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setIsPreviewLoading(false);
        }
      }, 500); // 500ms debounce
    } else {
      setPreviewResult(null);
      setIsPreviewLoading(false);
    }

    return () => {
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [searchMode, isrcInput, upcInput, artistInput, trackInput, albumInput, urlInput]);

  return (
    <div className="min-h-screen bg-surface pl-64">
      {/* Header */}
      <header className="border-b border-white/[0.08] bg-surface/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-theme-foreground-muted hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Metadata Index</h1>
                  <p className="text-sm text-theme-foreground-muted">Search ISRC/UPC codes, keywords, or URLs</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-theme-foreground-muted">{savedLists.length} list{savedLists.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {viewingList ? (
            // List View
            <motion.div
              key="list-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setViewingList(null)}
                    className="p-2 text-theme-foreground-muted hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-semibold text-white">{viewingList.name}</h2>
                    <p className="text-sm text-theme-foreground-muted">{viewingList.items.length} items</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Rename Button */}
                  <button
                    onClick={() => {
                      const newName = prompt('Enter new name:', viewingList.name);
                      if (newName && newName.trim()) renameList(viewingList.id, newName.trim());
                    }}
                    className="px-3 py-1.5 bg-white/[0.08] text-theme-foreground-muted rounded-lg text-sm font-medium hover:bg-white/[0.12] transition-colors flex items-center gap-1"
                  >
                    <Edit3 className="w-4 h-4" />
                    Rename
                  </button>
                  {/* Delete Button */}
                  <button
                    onClick={() => {
                      if (confirm('Delete this list?')) deleteList(viewingList.id);
                    }}
                    className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>

              {/* Sort & Export Options */}
              {viewingList.items.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-4 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                  <span className="text-xs font-semibold text-theme-foreground-muted uppercase flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    Sort:
                  </span>
                  {(['artist', 'title', 'album', 'release_date', 'added'] as SortOption[]).map(option => (
                    <button
                      key={option}
                      onClick={() => applySortToList(option)}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        sortOption === option
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-white/[0.08] text-theme-foreground-muted hover:bg-white/[0.12]'
                      }`}
                    >
                      {option === 'release_date' ? 'Date' : option.charAt(0).toUpperCase() + option.slice(1)}
                    </button>
                  ))}

                  <span className="text-white/20 mx-2">|</span>

                  <span className="text-xs font-semibold text-theme-foreground-muted uppercase flex items-center gap-1">
                    <FileDown className="w-3 h-3" />
                    Export:
                  </span>
                  <button
                    onClick={() => exportList(viewingList, 'csv')}
                    className="px-2 py-1 text-xs rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => exportList(viewingList, 'excel')}
                    className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => exportList(viewingList, 'word')}
                    className="px-2 py-1 text-xs rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors"
                  >
                    Word
                  </button>
                  <button
                    onClick={() => exportList(viewingList, 'pdf')}
                    className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => exportList(viewingList, 'json')}
                    className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 transition-colors"
                  >
                    JSON
                  </button>
                </div>
              )}

              {viewingList.items.length === 0 ? (
                <div className="text-center py-16">
                  <List className="w-12 h-12 text-theme-foreground-muted mx-auto mb-4" />
                  <p className="text-theme-foreground-muted">This list is empty</p>
                  <p className="text-sm text-theme-foreground-muted mt-1">Search for tracks and add them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {viewingList.items.map((item, index) => (
                    <motion.div
                      key={`${item.source}-${item.id}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center gap-4"
                    >
                      {item.imageUrl && (
                        <img src={item.imageUrl} alt={item.title} className="w-14 h-14 rounded-lg object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{item.title}</p>
                        <p className="text-sm text-theme-foreground-muted truncate">{item.artist}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            item.source === 'spotify' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'
                          }`}>
                            {item.source === 'spotify' ? 'Spotify' : 'MusicBrainz'}
                          </span>
                          {item.isrc && (
                            <button
                              onClick={() => copyIsrc(item.isrc!)}
                              className="text-xs text-theme-foreground-muted hover:text-white font-mono flex items-center gap-1"
                            >
                              {item.isrc}
                              <Copy className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Move up/down and delete buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => moveItemUp(viewingList.id, index)}
                          disabled={index === 0}
                          className={`p-1.5 rounded transition-colors ${
                            index === 0
                              ? 'text-white/20 cursor-not-allowed'
                              : 'text-theme-foreground-muted hover:text-blue-400 hover:bg-blue-500/10'
                          }`}
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => moveItemDown(viewingList.id, index)}
                          disabled={index === viewingList.items.length - 1}
                          className={`p-1.5 rounded transition-colors ${
                            index === viewingList.items.length - 1
                              ? 'text-white/20 cursor-not-allowed'
                              : 'text-theme-foreground-muted hover:text-blue-400 hover:bg-blue-500/10'
                          }`}
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeFromList(viewingList.id, item.id, item.source)}
                          className="p-1.5 text-theme-foreground-muted hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            // Search View
            <motion.div
              key="search-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Search Card */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] overflow-hidden">
                {/* Search Mode Tabs */}
                <div className="flex border-b border-white/[0.08]">
                  {[
                    { id: 'code' as SearchMode, label: 'Code Search (ISRC/UPC)', icon: Database },
                    { id: 'keyword' as SearchMode, label: 'Keyword Search', icon: Search },
                    { id: 'url' as SearchMode, label: 'URL Search', icon: Link2 },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSearchMode(tab.id)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                        searchMode === tab.id
                          ? 'text-white bg-white/[0.05] border-b-2 border-blue-500'
                          : 'text-theme-foreground-muted hover:text-white hover:bg-white/[0.05]'
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  ))}
                </div>

                {/* Search Forms */}
                <div className="p-6 space-y-4">
                  {searchMode === 'code' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-muted mb-1">ISRC Code</label>
                        <input
                          type="text"
                          value={isrcInput}
                          onChange={(e) => { setIsrcInput(e.target.value.toUpperCase()); setUpcInput(''); }}
                          placeholder="e.g., USRC17607839"
                          maxLength={12}
                          className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono"
                        />
                        <p className="text-xs text-theme-foreground-muted mt-1">International Standard Recording Code</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-theme-foreground-muted mb-1">UPC/EAN Code</label>
                        <input
                          type="text"
                          value={upcInput}
                          onChange={(e) => { setUpcInput(e.target.value); setIsrcInput(''); }}
                          placeholder="e.g., 886447833502"
                          maxLength={14}
                          className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 font-mono"
                        />
                        <p className="text-xs text-theme-foreground-muted mt-1">Universal Product Code for releases</p>
                      </div>
                    </div>
                  )}

                  {searchMode === 'keyword' && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-theme-foreground-muted uppercase">Mode:</span>
                        <button
                          onClick={() => setAdvancedMode(false)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            !advancedMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.08] text-theme-foreground-muted hover:bg-white/[0.12]'
                          }`}
                        >
                          Basic
                        </button>
                        <button
                          onClick={() => setAdvancedMode(true)}
                          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                            advancedMode ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.08] text-theme-foreground-muted hover:bg-white/[0.12]'
                          }`}
                        >
                          Advanced
                        </button>
                        <span className="text-xs text-theme-foreground-muted ml-2">(Advanced unlocks extra filters)</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-theme-foreground-muted mb-1">
                            Artist Name <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={artistInput}
                            onChange={(e) => setArtistInput(e.target.value)}
                            placeholder="e.g., Taylor Swift"
                            className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                          <p className="text-xs text-theme-foreground-muted mt-1">Required</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Track Title</label>
                          <input
                            type="text"
                            value={trackInput}
                            onChange={(e) => setTrackInput(e.target.value)}
                            placeholder="e.g., Anti-Hero"
                            className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                          <p className="text-xs text-theme-foreground-muted mt-1">Track title or album name required</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Album/Release Name</label>
                          <input
                            type="text"
                            value={albumInput}
                            onChange={(e) => setAlbumInput(e.target.value)}
                            placeholder="e.g., Midnights"
                            className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                          />
                          <p className="text-xs text-theme-foreground-muted mt-1">Track title or album name required</p>
                        </div>
                        {advancedMode && (
                          <div>
                            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Year of Release</label>
                            <input
                              type="text"
                              value={yearInput}
                              onChange={(e) => setYearInput(e.target.value)}
                              placeholder="e.g., 2022"
                              maxLength={4}
                              className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            />
                          </div>
                        )}
                      </div>

                      {/* Advanced fields */}
                      {advancedMode && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/[0.08]">
                          <div>
                            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Version (mix/edit)</label>
                            <input
                              type="text"
                              value={versionInput}
                              onChange={(e) => setVersionInput(e.target.value)}
                              placeholder="Radio Edit, Acoustic, etc."
                              className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Year of Recording</label>
                            <input
                              type="text"
                              value={recordingYearInput}
                              onChange={(e) => setRecordingYearInput(e.target.value)}
                              placeholder="e.g., 2021"
                              maxLength={4}
                              className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-theme-foreground-muted mb-1">File Type</label>
                            <select
                              value={fileTypeFilter}
                              onChange={(e) => setFileTypeFilter(e.target.value as 'all' | 'audio' | 'video')}
                              className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                            >
                              <option value="all">All File Types</option>
                              <option value="audio">Audio Files Only</option>
                              <option value="video">Video Files Only</option>
                            </select>
                            <p className="text-xs text-theme-foreground-muted mt-1">Filter simulated</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {searchMode === 'url' && (
                    <div>
                      <label className="block text-sm font-medium text-theme-foreground-muted mb-1">Spotify URL</label>
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://open.spotify.com/track/..."
                        className="w-full px-4 py-2.5 bg-surface border border-white/[0.08] rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                      />
                      <p className="text-xs text-theme-foreground-muted mt-1">Paste a Spotify track or album URL</p>
                    </div>
                  )}

                  {/* Search Error */}
                  {searchError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {searchError}
                    </div>
                  )}

                  {/* Search happens automatically as you type */}

                  {/* Demo Examples */}
                  <div className="pt-4 border-t border-white/[0.08]">
                    <p className="text-xs text-theme-foreground-muted mb-2">Quick examples:</p>
                    <div className="flex flex-wrap gap-2">
                      {searchMode === 'code' && (
                        <>
                          <button onClick={() => setDemoCode('isrc', 'USUM72409273')} className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-theme-foreground-muted rounded-lg text-xs font-mono transition-colors">USUM72409273</button>
                          <button onClick={() => setDemoCode('isrc', 'USRC17607839')} className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-theme-foreground-muted rounded-lg text-xs font-mono transition-colors">USRC17607839</button>
                        </>
                      )}
                      {searchMode === 'keyword' && (
                        <>
                          <button onClick={() => setDemoKeyword('Lady Gaga', 'Die With A Smile')} className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-theme-foreground-muted rounded-lg text-xs transition-colors">Lady Gaga - Die With A Smile</button>
                          <button onClick={() => setDemoKeyword('Taylor Swift', 'Anti-Hero')} className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-theme-foreground-muted rounded-lg text-xs transition-colors">Taylor Swift - Anti-Hero</button>
                        </>
                      )}
                      {searchMode === 'url' && (
                        <>
                          <button onClick={() => setDemoUrl('https://open.spotify.com/track/2plbrEY59IikOBgBGLjaoe')} className="px-3 py-1.5 bg-white/[0.08] hover:bg-white/[0.12] text-blue-400 rounded-lg text-xs truncate max-w-[200px] transition-colors">spotify.com/track/2plbrEY...</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Real-time Search Preview - Click to view details */}
                  {(isPreviewLoading || previewResult) && (
                    <div className="mt-4 pt-4 border-t border-white/[0.08]">
                      <p className="text-xs text-theme-foreground-muted mb-2 flex items-center gap-2">
                        <Search className="w-3 h-3" />
                        Search Result
                        {isPreviewLoading && <span className="text-blue-400 animate-pulse">(searching...)</span>}
                      </p>
                      {isPreviewLoading ? (
                        <div className="flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg">
                          <div className="w-12 h-12 bg-white/[0.08] rounded animate-pulse" />
                          <div className="flex-1">
                            <div className="h-4 bg-white/[0.08] rounded w-3/4 animate-pulse" />
                            <div className="h-3 bg-white/[0.08] rounded w-1/2 mt-1 animate-pulse" />
                          </div>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-blue-400 rounded-full animate-spin" />
                        </div>
                      ) : previewResult ? (
                        <button
                          onClick={() => setShowResults(true)}
                          className="w-full text-left flex items-center gap-3 p-3 bg-white/[0.04] rounded-lg border border-blue-500/30 hover:border-blue-500/50 hover:bg-white/[0.06] transition-all cursor-pointer group"
                        >
                          {previewResult.imageUrl && (
                            <img src={previewResult.imageUrl} alt="" className="w-12 h-12 rounded object-cover shadow-lg" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{previewResult.title}</p>
                            <p className="text-xs text-theme-foreground-muted truncate">{previewResult.artist}</p>
                            {previewResult.isrc && (
                              <p className="text-xs text-theme-foreground-muted font-mono mt-0.5">ISRC: {previewResult.isrc}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Match found</span>
                            <span className="text-xs text-blue-400 group-hover:text-blue-300 flex items-center gap-1">
                              View details
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                              </svg>
                            </span>
                          </div>
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* My Lists Section */}
              <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-5 h-5 text-theme-foreground-muted" />
                    <h3 className="font-medium text-white">My Lists</h3>
                    <span className="text-xs text-theme-foreground-muted">{savedLists.length} list{savedLists.length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* Pearl Button - New List */}
                  <button
                    onClick={() => {
                      const name = prompt('Enter list name:');
                      if (name) createNewList(name);
                    }}
                    className="group relative rounded-full bg-[#080808] transition-all duration-200 active:translate-y-1"
                    style={{
                      boxShadow: `
                        inset 0 0.3rem 0.9rem rgba(255, 255, 255, 0.3),
                        inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
                        inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.5),
                        0 1.5rem 1.5rem rgba(0, 0, 0, 0.3),
                        0 0.5rem 0.5rem -0.3rem rgba(0, 0, 0, 0.8)
                      `
                    }}
                  >
                    <div className="relative overflow-hidden rounded-full px-5 py-2.5">
                      {/* Top shine effect */}
                      <div
                        className="absolute left-[6%] right-[6%] top-[12%] bottom-[40%] rounded-t-2xl transition-all duration-300 group-hover:opacity-40 group-hover:translate-y-[5%]"
                        style={{
                          boxShadow: 'inset 0 10px 8px -10px rgba(255, 255, 255, 0.8)',
                          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)'
                        }}
                      />
                      {/* Gloss orb effect */}
                      <div
                        className="absolute left-[-15%] right-[-15%] bottom-[25%] top-[-100%] rounded-full bg-white/[0.12] transition-all duration-300 group-hover:-translate-y-[5%]"
                      />
                      {/* Button content */}
                      <p
                        className="relative z-10 flex items-center gap-2 text-sm font-medium text-white/70 transition-all duration-200 translate-y-[2%] group-hover:-translate-y-[4%]"
                        style={{ maskImage: 'linear-gradient(to bottom, white 40%, transparent)' }}
                      >
                        <span className="group-hover:hidden">&#10023;</span>
                        <span className="hidden group-hover:inline">&#10022;</span>
                        New List
                      </p>
                    </div>
                  </button>
                </div>

                {savedLists.length === 0 ? (
                  <p className="text-sm text-theme-foreground-muted">Create lists to organize tracks from your searches.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {savedLists.map(list => (
                      <button
                        key={list.id}
                        onClick={() => setViewingList(list)}
                        className="p-4 bg-surface border border-white/[0.05] rounded-xl text-left hover:bg-white/[0.05] hover:border-white/[0.1] transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-white">{list.name}</span>
                          <span className="text-xs text-theme-foreground-muted">{list.items.length} items</span>
                        </div>
                        <p className="text-xs text-theme-foreground-muted mt-1">
                          Updated {new Date(list.updatedAt).toLocaleDateString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Results Section */}
              {showResults && (spotifyResult || musicbrainzResult) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">Results</h2>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={getMatchStatus(spotifyResult || undefined, musicbrainzResult || undefined)} />
                      <button
                        onClick={() => setShowListModal(true)}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        Add to List
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Spotify Result */}
                    <div className={`bg-white/[0.04] border rounded-2xl overflow-hidden ${spotifyResult ? 'border-green-500/30' : 'border-white/[0.08]'}`}>
                      <div className="px-4 py-3 bg-green-500/10 border-b border-green-500/20 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <Music className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium text-green-400">Spotify</span>
                      </div>
                      {spotifyResult ? (
                        <div className="p-4">
                          <div className="flex gap-4">
                            {spotifyResult.imageUrl && (
                              <img src={spotifyResult.imageUrl} alt={spotifyResult.title} className="w-20 h-20 rounded-lg object-cover shadow-lg" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">{spotifyResult.title}</p>
                              <p className="text-sm text-theme-foreground-muted truncate">{spotifyResult.artist}</p>
                              <p className="text-xs text-theme-foreground-muted truncate">{spotifyResult.album}</p>
                            </div>
                          </div>
                          <div className="mt-4 space-y-2 text-sm">
                            {spotifyResult.isrc && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">ISRC</span>
                                <button onClick={() => copyIsrc(spotifyResult.isrc!)} className="font-mono text-white flex items-center gap-1 hover:text-blue-400 transition-colors">
                                  {spotifyResult.isrc}
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {spotifyResult.duration && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">Duration</span>
                                <span className="text-white">{formatDuration(spotifyResult.duration)}</span>
                              </div>
                            )}
                            {spotifyResult.releaseDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">Released</span>
                                <span className="text-white">{spotifyResult.releaseDate}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex gap-2">
                            {spotifyResult.previewUrl && (
                              <button
                                onClick={() => togglePreview(spotifyResult.previewUrl!)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 transition-colors ${
                                  playingPreview === spotifyResult.previewUrl
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white/[0.08] text-theme-foreground-muted hover:bg-white/[0.12]'
                                }`}
                              >
                                {playingPreview === spotifyResult.previewUrl ? (
                                  <><Pause className="w-4 h-4" /> Stop</>
                                ) : (
                                  <><Play className="w-4 h-4" /> Preview</>
                                )}
                              </button>
                            )}
                            {spotifyResult.externalUrl && (
                              <a
                                href={spotifyResult.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 bg-white/[0.08] text-theme-foreground-muted rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-white/[0.12] transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" /> Open
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <X className="w-8 h-8 text-theme-foreground-muted mx-auto mb-2" />
                          <p className="text-theme-foreground-muted">No Spotify result</p>
                        </div>
                      )}
                    </div>

                    {/* MusicBrainz Result */}
                    <div className={`bg-white/[0.04] border rounded-2xl overflow-hidden ${musicbrainzResult ? 'border-purple-500/30' : 'border-white/[0.08]'}`}>
                      <div className="px-4 py-3 bg-purple-500/10 border-b border-purple-500/20 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                          <Database className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-medium text-purple-400">MusicBrainz</span>
                      </div>
                      {musicbrainzResult ? (
                        <div className="p-4">
                          <div>
                            <p className="font-medium text-white">{musicbrainzResult.title}</p>
                            <p className="text-sm text-theme-foreground-muted">{musicbrainzResult.artist}</p>
                            {musicbrainzResult.album && <p className="text-xs text-theme-foreground-muted">{musicbrainzResult.album}</p>}
                          </div>
                          <div className="mt-4 space-y-2 text-sm">
                            {musicbrainzResult.isrc && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">ISRC</span>
                                <button onClick={() => copyIsrc(musicbrainzResult.isrc!)} className="font-mono text-white flex items-center gap-1 hover:text-blue-400 transition-colors">
                                  {musicbrainzResult.isrc}
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            {musicbrainzResult.duration && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">Duration</span>
                                <span className="text-white">{formatDuration(musicbrainzResult.duration)}</span>
                              </div>
                            )}
                            {musicbrainzResult.releaseDate && (
                              <div className="flex items-center justify-between">
                                <span className="text-theme-foreground-muted">Released</span>
                                <span className="text-white">{musicbrainzResult.releaseDate}</span>
                              </div>
                            )}
                          </div>
                          <div className="mt-4">
                            {musicbrainzResult.externalUrl && (
                              <a
                                href={musicbrainzResult.externalUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-white/[0.08] text-theme-foreground-muted rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-white/[0.12] transition-colors"
                              >
                                <ExternalLink className="w-4 h-4" /> Open in MusicBrainz
                              </a>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-8 text-center">
                          <X className="w-8 h-8 text-theme-foreground-muted mx-auto mb-2" />
                          <p className="text-theme-foreground-muted">No MusicBrainz result</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detailed Field Comparison Table */}
                  {spotifyResult && musicbrainzResult && (
                    <div className="mt-4 bg-white/[0.04] border border-white/[0.08] rounded-2xl overflow-hidden">
                      <div className="px-4 py-3 bg-white/[0.05] border-b border-white/[0.08] flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-theme-foreground-muted" />
                          <span className="font-medium text-white">Field-by-Field Comparison</span>
                        </div>
                        <StatusBadge status={getMatchStatus(spotifyResult, musicbrainzResult)} />
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.08]">
                              <th className="px-4 py-3 text-left text-theme-foreground-muted font-medium w-28">Field</th>
                              <th className="px-4 py-3 text-left bg-green-500/10 text-green-400 font-medium">Spotify</th>
                              <th className="px-4 py-3 text-left bg-purple-500/10 text-purple-400 font-medium">MusicBrainz</th>
                              <th className="px-4 py-3 text-center text-theme-foreground-muted font-medium w-24">Match</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* Title */}
                            <tr className={`border-b border-white/[0.05] ${spotifyResult.title === musicbrainzResult.title ? 'bg-green-500/5' : 'bg-yellow-500/5'}`}>
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">Title</td>
                              <td className="px-4 py-2.5 text-white">{spotifyResult.title || '—'}</td>
                              <td className="px-4 py-2.5 text-white">{musicbrainzResult.title || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {spotifyResult.title === musicbrainzResult.title ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                            {/* Artist */}
                            <tr className={`border-b border-white/[0.05] ${spotifyResult.artist === musicbrainzResult.artist ? 'bg-green-500/5' : 'bg-yellow-500/5'}`}>
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">Artist</td>
                              <td className="px-4 py-2.5 text-white">{spotifyResult.artist || '—'}</td>
                              <td className="px-4 py-2.5 text-white">{musicbrainzResult.artist || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {spotifyResult.artist === musicbrainzResult.artist ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : spotifyResult.artist?.toLowerCase() === musicbrainzResult.artist?.toLowerCase() ? (
                                  <span className="text-xs text-yellow-400">~</span>
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                            {/* Album */}
                            <tr className={`border-b border-white/[0.05] ${spotifyResult.album === musicbrainzResult.album ? 'bg-green-500/5' : 'bg-yellow-500/5'}`}>
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">Album</td>
                              <td className="px-4 py-2.5 text-white">{spotifyResult.album || '—'}</td>
                              <td className="px-4 py-2.5 text-white">{musicbrainzResult.album || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {spotifyResult.album === musicbrainzResult.album ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                            {/* ISRC */}
                            <tr className={`border-b border-white/[0.05] ${spotifyResult.isrc === musicbrainzResult.isrc ? 'bg-green-500/5' : spotifyResult.isrc && musicbrainzResult.isrc ? 'bg-red-500/5' : 'bg-yellow-500/5'}`}>
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">ISRC</td>
                              <td className="px-4 py-2.5 font-mono text-white">{spotifyResult.isrc || '—'}</td>
                              <td className="px-4 py-2.5 font-mono text-white">{musicbrainzResult.isrc || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {spotifyResult.isrc === musicbrainzResult.isrc && spotifyResult.isrc ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : !spotifyResult.isrc || !musicbrainzResult.isrc ? (
                                  <span className="text-xs text-yellow-400">?</span>
                                ) : (
                                  <X className="w-4 h-4 text-red-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                            {/* Duration */}
                            <tr className={`border-b border-white/[0.05] ${Math.abs((spotifyResult.duration || 0) - (musicbrainzResult.duration || 0)) < 2000 ? 'bg-green-500/5' : 'bg-yellow-500/5'}`}>
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">Duration</td>
                              <td className="px-4 py-2.5 text-white">{spotifyResult.duration ? formatDuration(spotifyResult.duration) : '—'}</td>
                              <td className="px-4 py-2.5 text-white">{musicbrainzResult.duration ? formatDuration(musicbrainzResult.duration) : '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {Math.abs((spotifyResult.duration || 0) - (musicbrainzResult.duration || 0)) < 2000 ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : Math.abs((spotifyResult.duration || 0) - (musicbrainzResult.duration || 0)) < 5000 ? (
                                  <span className="text-xs text-yellow-400">~</span>
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                            {/* Release Date */}
                            <tr className="border-b border-white/[0.05]">
                              <td className="px-4 py-2.5 text-theme-foreground-muted font-medium">Release Date</td>
                              <td className="px-4 py-2.5 text-white">{spotifyResult.releaseDate || '—'}</td>
                              <td className="px-4 py-2.5 text-white">{musicbrainzResult.releaseDate || '—'}</td>
                              <td className="px-4 py-2.5 text-center">
                                {spotifyResult.releaseDate === musicbrainzResult.releaseDate ? (
                                  <Check className="w-4 h-4 text-green-400 mx-auto" />
                                ) : spotifyResult.releaseDate?.substring(0, 4) === musicbrainzResult.releaseDate?.substring(0, 4) ? (
                                  <span className="text-xs text-yellow-400">~</span>
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-yellow-400 mx-auto" />
                                )}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      {/* Legend */}
                      <div className="px-4 py-2 bg-white/[0.02] border-t border-white/[0.08] flex items-center gap-4 text-xs text-theme-foreground-muted">
                        <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> Exact match</span>
                        <span className="flex items-center gap-1"><span className="text-yellow-400">~</span> Close match</span>
                        <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-yellow-400" /> Different</span>
                        <span className="flex items-center gap-1"><X className="w-3 h-3 text-red-400" /> Mismatch</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add to List Modal */}
      <AnimatePresence>
        {showListModal && (spotifyResult || musicbrainzResult) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowListModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-surface border border-white/[0.08] rounded-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-white/[0.08]">
                <h3 className="text-lg font-semibold text-white">Add to List</h3>
              </div>
              <div className="p-4 max-h-[50vh] overflow-y-auto space-y-2">
                {/* Source selection */}
                <div className="mb-4">
                  <p className="text-sm text-theme-foreground-muted mb-2">Select source:</p>
                  <div className="flex gap-2">
                    {spotifyResult && (
                      <button
                        onClick={() => setSelectedListId('spotify')}
                        className={`flex-1 p-3 rounded-xl border transition-all ${
                          selectedListId === 'spotify' ? 'bg-green-500/20 border-green-500' : 'bg-surface border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <span className="text-sm font-medium text-green-400">Spotify</span>
                      </button>
                    )}
                    {musicbrainzResult && (
                      <button
                        onClick={() => setSelectedListId('musicbrainz')}
                        className={`flex-1 p-3 rounded-xl border transition-all ${
                          selectedListId === 'musicbrainz' ? 'bg-purple-500/20 border-purple-500' : 'bg-surface border-white/[0.08] hover:border-white/[0.15]'
                        }`}
                      >
                        <span className="text-sm font-medium text-purple-400">MusicBrainz</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* List selection */}
                {savedLists.length > 0 ? (
                  savedLists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => {
                        const result = selectedListId === 'spotify' ? spotifyResult : musicbrainzResult;
                        if (result) addToList(list.id, result);
                      }}
                      disabled={!selectedListId}
                      className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-left hover:bg-white/[0.08] hover:border-white/[0.15] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-white">{list.name}</span>
                        <span className="text-xs text-theme-foreground-muted">{list.items.length} items</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-theme-foreground-muted text-center py-4">No lists yet</p>
                )}

                <button
                  onClick={() => {
                    const name = prompt('Enter list name:');
                    if (name) {
                      const list = createNewList(name);
                      const result = selectedListId === 'spotify' ? spotifyResult : musicbrainzResult;
                      if (result) addToList(list.id, result);
                    }
                  }}
                  disabled={!selectedListId}
                  className="w-full p-3 border-2 border-dashed border-white/[0.15] rounded-xl text-theme-foreground-muted hover:border-blue-500 hover:text-blue-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Create New List
                </button>
              </div>
              <div className="px-6 py-4 border-t border-white/[0.08] bg-surface/80">
                <button
                  onClick={() => setShowListModal(false)}
                  className="w-full py-2 text-theme-foreground-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
