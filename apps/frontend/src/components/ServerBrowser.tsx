/**
 * Server Browser Component
 * Rust/GTA-style server browser with favorites, ping, and sorting
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Star, RefreshCw, X, Server, Users, Wifi, Globe, Zap } from 'lucide-react';
import { useServerStore, GameServer, measurePing } from '../stores/serverStore';

type SortField = 'name' | 'players' | 'ping' | 'region';
type SortDirection = 'asc' | 'desc';

interface ServerBrowserProps {
  onJoin: (server: GameServer) => void;
  onClose: () => void;
  isInGame?: boolean; // If true, show confirmation before joining
}

export default function ServerBrowser({ onJoin, onClose, isInGame = false }: ServerBrowserProps) {
  const {
    servers,
    isLoading,
    error,
    fetchServers,
    toggleFavorite,
    isFavorite,
    updatePing,
  } = useServerStore();

  const [selectedServer, setSelectedServer] = useState<GameServer | null>(null);
  const [sortField, setSortField] = useState<SortField>('players');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [regionFilter, setRegionFilter] = useState<string>('all');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isPingingServers, setIsPingingServers] = useState(false);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Measure ping to all servers
  const measureAllPings = useCallback(async () => {
    setIsPingingServers(true);
    for (const server of servers) {
      const ping = await measurePing(server.host, server.port);
      updatePing(server.id, ping);
    }
    setIsPingingServers(false);
  }, [servers, updatePing]);

  // Measure pings after initial fetch
  useEffect(() => {
    if (servers.length > 0 && !isPingingServers) {
      measureAllPings();
    }
  }, [servers.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get unique regions
  const regions = useMemo(() => {
    const uniqueRegions = new Set(servers.map((s) => s.region));
    return Array.from(uniqueRegions).sort();
  }, [servers]);

  // Filter and sort servers
  const filteredServers = useMemo(() => {
    let result = [...servers];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.region.toLowerCase().includes(query) ||
          s.gameMode.toLowerCase().includes(query)
      );
    }

    // Apply region filter
    if (regionFilter !== 'all') {
      result = result.filter((s) => s.region === regionFilter);
    }

    // Sort - favorites first, then by selected field
    result.sort((a, b) => {
      // Favorites always on top
      const aFav = isFavorite(a.id);
      const bFav = isFavorite(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;

      // Then sort by selected field
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'players':
          comparison = a.playerCount - b.playerCount;
          break;
        case 'ping':
          comparison = (a.ping ?? 999) - (b.ping ?? 999);
          break;
        case 'region':
          comparison = a.region.localeCompare(b.region);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [servers, searchQuery, regionFilter, sortField, sortDirection, isFavorite]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Handle server row click
  const handleServerClick = (server: GameServer) => {
    setSelectedServer(server);
  };

  // Handle server row double click
  const handleServerDoubleClick = (server: GameServer) => {
    if (isInGame) {
      setSelectedServer(server);
      setShowConfirmDialog(true);
    } else {
      onJoin(server);
    }
  };

  // Handle join button click
  const handleJoinClick = () => {
    if (!selectedServer) return;

    if (isInGame) {
      setShowConfirmDialog(true);
    } else {
      onJoin(selectedServer);
    }
  };

  // Handle quick join (best ping server)
  const handleQuickJoin = () => {
    const bestServer = filteredServers.find((s) => s.status === 'online');
    if (bestServer) {
      if (isInGame) {
        setSelectedServer(bestServer);
        setShowConfirmDialog(true);
      } else {
        onJoin(bestServer);
      }
    }
  };

  // Confirm join dialog
  const handleConfirmJoin = () => {
    if (selectedServer) {
      onJoin(selectedServer);
    }
    setShowConfirmDialog(false);
  };

  // Get ping color
  const getPingColor = (ping?: number) => {
    if (ping === undefined) return 'text-gray-500';
    if (ping < 50) return 'text-green-400';
    if (ping < 100) return 'text-yellow-400';
    if (ping < 150) return 'text-orange-400';
    return 'text-red-400';
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'maintenance':
        return 'bg-yellow-500';
      default:
        return 'bg-red-500';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 rounded-lg shadow-2xl w-full max-w-4xl border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <Server className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">Server Browser</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-slate-700 bg-slate-800/30">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Region Filter */}
          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Regions</option>
            {regions.map((region) => (
              <option key={region} value={region}>
                {region.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => {
              fetchServers();
              measureAllPings();
            }}
            disabled={isLoading || isPingingServers}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${(isLoading || isPingingServers) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Server List */}
        <div className="max-h-96 overflow-y-auto">
          {error && (
            <div className="px-6 py-4 text-red-400 text-center">{error}</div>
          )}

          {isLoading && servers.length === 0 && (
            <div className="px-6 py-8 text-slate-400 text-center">
              Loading servers...
            </div>
          )}

          {!isLoading && filteredServers.length === 0 && (
            <div className="px-6 py-8 text-slate-400 text-center">
              No servers found
            </div>
          )}

          <table className="w-full">
            <thead className="bg-slate-800/50 sticky top-0">
              <tr className="text-left text-sm text-slate-400">
                <th className="w-10 px-4 py-3"></th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-2">
                    Server Name
                    {sortField === 'name' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('players')}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Players
                    {sortField === 'players' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('ping')}
                >
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4" />
                    Ping
                    {sortField === 'ping' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('region')}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Region
                    {sortField === 'region' && (
                      <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3">Mode</th>
              </tr>
            </thead>
            <tbody>
              {filteredServers.map((server) => (
                <tr
                  key={server.id}
                  className={`border-b border-slate-800 cursor-pointer transition-colors ${
                    selectedServer?.id === server.id
                      ? 'bg-blue-600/30'
                      : 'hover:bg-slate-800/50'
                  }`}
                  onClick={() => handleServerClick(server)}
                  onDoubleClick={() => handleServerDoubleClick(server)}
                >
                  {/* Favorite */}
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(server.id);
                      }}
                      className="text-slate-500 hover:text-yellow-400 transition-colors"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          isFavorite(server.id) ? 'fill-yellow-400 text-yellow-400' : ''
                        }`}
                      />
                    </button>
                  </td>

                  {/* Server Name */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(server.status)}`} />
                      <span className="text-white font-medium">{server.name}</span>
                    </div>
                  </td>

                  {/* Players */}
                  <td className="px-4 py-3 text-slate-300">
                    {server.playerCount}/{server.maxPlayers}
                  </td>

                  {/* Ping */}
                  <td className={`px-4 py-3 ${getPingColor(server.ping)}`}>
                    {server.ping !== undefined ? `${server.ping}ms` : '---'}
                  </td>

                  {/* Region */}
                  <td className="px-4 py-3 text-slate-300 uppercase text-sm">
                    {server.region}
                  </td>

                  {/* Mode */}
                  <td className="px-4 py-3 text-slate-400 capitalize">
                    {server.gameMode.replace('-', ' ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700 bg-slate-800/30">
          <div className="text-sm text-slate-400">
            {filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''} found
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleQuickJoin}
              disabled={filteredServers.filter((s) => s.status === 'online').length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-lg text-white transition-colors"
            >
              <Zap className="w-4 h-4" />
              Quick Join
            </button>
            <button
              onClick={handleJoinClick}
              disabled={!selectedServer || selectedServer.status !== 'online'}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-white font-medium transition-colors"
            >
              Join Server
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && selectedServer && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative bg-slate-800 rounded-lg p-6 max-w-sm w-full border border-slate-600">
            <h3 className="text-lg font-bold text-white mb-2">Switch Server?</h3>
            <p className="text-slate-400 mb-4">
              You will leave your current server and join "{selectedServer.name}".
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmJoin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium transition-colors"
              >
                Switch Server
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
