import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

interface Opportunity {
  id: string;
  title: string;
  brief: string;
  budget: string;
  deadline: string;
  contact: string;
  genres: string[];
  status: 'Open' | 'On Hold' | 'Closed';
  priority: 'High' | 'Medium' | 'Low';
  notes?: string;
}

export default function OpportunitiesToolPage() {
  const navigate = useNavigate();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Sample data - TODO: Fetch from backend API
  const sampleOpportunities: Opportunity[] = [
    {
      id: '1',
      title: 'Hip-Hop Beat Production',
      brief: 'Looking for fresh hip-hop beats for upcoming album release',
      budget: '$5,000 - $15,000',
      deadline: '2024-03-15',
      contact: 'artist@example.com',
      genres: ['Hip-Hop', 'Trap'],
      status: 'Open',
      priority: 'High',
      notes: 'Emphasis on trap production style',
    },
    {
      id: '2',
      title: 'Electronic Music Sync',
      brief: 'Electronic music needed for gaming soundtrack',
      budget: '$10,000 - $25,000',
      deadline: '2024-03-20',
      contact: 'studio@game.com',
      genres: ['Electronic', 'Ambient'],
      status: 'Open',
      priority: 'High',
      notes: 'Royalty splits negotiable',
    },
    {
      id: '3',
      title: 'R&B Production Suite',
      brief: 'Need 5-track R&B production for indie label',
      budget: '$3,000 - $8,000',
      deadline: '2024-04-10',
      contact: 'label@indie.com',
      genres: ['R&B', 'Soul'],
      status: 'Open',
      priority: 'Medium',
      notes: 'Production and mixing included',
    },
  ];

  useEffect(() => {
    // TODO: Fetch from backend API
    const timer = setTimeout(() => {
      setOpportunities(sampleOpportunities);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch = opp.title
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
      opp.brief.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || opp.status === statusFilter;
    const matchesGenre =
      !genreFilter || opp.genres.some((g) => g.toLowerCase() === genreFilter.toLowerCase());
    const matchesPriority = !priorityFilter || opp.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesGenre && matchesPriority;
  });

  const allGenres = Array.from(
    new Set(opportunities.flatMap((opp) => opp.genres))
  ).sort();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-green-900/30 border-green-600 text-green-300';
      case 'On Hold':
        return 'bg-yellow-900/30 border-yellow-600 text-yellow-300';
      case 'Closed':
        return 'bg-red-900/30 border-red-600 text-red-300';
      default:
        return 'bg-slate-900/30 border-slate-600 text-slate-300';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'High':
        return '🔴';
      case 'Medium':
        return '🟡';
      case 'Low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background: 'linear-gradient(135deg, #020617 0%, #0b1120 48%, #111827 100%)',
        backgroundImage: `
          linear-gradient(135deg, #020617 0%, #0b1120 48%, #111827 100%),
          radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.16), transparent 55%),
          radial-gradient(circle at 88% 12%, rgba(147, 197, 253, 0.18), transparent 58%)
        `,
      }}
    >
      {/* Back Button */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-300 hover:text-white transition flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold mb-4">Opportunities Board</h1>
          <p className="text-xl text-slate-300">
            Discover and apply to music production and publishing opportunities
          </p>
        </div>

        {/* Controls */}
        <div
          className="rounded-3xl p-8 mb-8 border border-slate-700 shadow-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <input
                type="search"
                placeholder="Search opportunities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none transition"
              >
                <option value="">All statuses</option>
                <option value="Open">Open</option>
                <option value="On Hold">On Hold</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Genre Filter */}
            <div>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none transition"
              >
                <option value="">All genres</option>
                {allGenres.map((genre) => (
                  <option key={genre} value={genre}>
                    {genre}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-xl text-slate-100 focus:border-blue-500 focus:outline-none transition"
              >
                <option value="">All priorities</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-slate-400">Loading opportunities...</div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div
            className="rounded-3xl p-16 text-center border border-dashed border-slate-600"
            style={{
              background: 'rgba(15, 23, 42, 0.55)',
            }}
          >
            <h3 className="text-2xl font-bold text-slate-200 mb-2">No opportunities found</h3>
            <p className="text-slate-400">Try adjusting your search or filters to see more results.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOpportunities.map((opp) => (
              <div
                key={opp.id}
                className="rounded-2xl p-6 border border-slate-700 hover:border-blue-500 transition transform hover:-translate-y-1 cursor-pointer group"
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  backdropFilter: 'blur(18px)',
                  WebkitBackdropFilter: 'blur(18px)',
                  boxShadow: '0 35px 70px rgba(2, 6, 23, 0.33)',
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-2xl font-bold text-slate-100">{opp.title}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadgeColor(opp.status)}`}>
                        {opp.status}
                      </span>
                    </div>
                    <p className="text-slate-300">{opp.brief}</p>
                  </div>
                  <div className="text-3xl">{getPriorityIcon(opp.priority)}</div>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 py-4 border-y border-slate-700/50">
                  <div className="bg-slate-900/45 p-3 rounded-lg border border-slate-600/30">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Budget
                    </div>
                    <div className="font-bold text-slate-200">{opp.budget}</div>
                  </div>

                  <div className="bg-slate-900/45 p-3 rounded-lg border border-slate-600/30">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Deadline
                    </div>
                    <div className="font-bold text-slate-200">{formatDate(opp.deadline)}</div>
                  </div>

                  <div className="bg-slate-900/45 p-3 rounded-lg border border-slate-600/30">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Contact
                    </div>
                    <div className="font-bold text-slate-200 truncate">{opp.contact}</div>
                  </div>

                  <div className="bg-slate-900/45 p-3 rounded-lg border border-slate-600/30">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Priority
                    </div>
                    <div className="font-bold text-slate-200">{opp.priority}</div>
                  </div>
                </div>

                {/* Genres & Notes */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {opp.genres.map((genre) => (
                      <span
                        key={genre}
                        className="px-3 py-1 bg-blue-900/30 border border-blue-600/30 text-blue-300 rounded-full text-sm font-medium"
                      >
                        {genre}
                      </span>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate('/tools/consultation')}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition transform hover:scale-105 whitespace-nowrap"
                  >
                    Apply Now
                  </button>
                </div>

                {opp.notes && (
                  <div className="mt-4 p-3 bg-blue-900/20 border-l-2 border-blue-500 text-blue-300 text-sm rounded">
                    <span className="font-semibold">Note:</span> {opp.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🎯',
              title: 'Curated Opportunities',
              desc: 'Hand-selected production and publishing gigs tailored to your skills',
            },
            {
              icon: '📅',
              title: 'Real-Time Updates',
              desc: 'New opportunities added daily. Never miss out on the next big project.',
            },
            {
              icon: '💼',
              title: 'Direct Contact',
              desc: 'Connect directly with labels, studios, and artists looking for talent.',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-slate-700 text-center"
              style={{
                background: 'rgba(15, 23, 42, 0.55)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
              }}
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="font-bold text-slate-100 mb-2">{item.title}</h3>
              <p className="text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
