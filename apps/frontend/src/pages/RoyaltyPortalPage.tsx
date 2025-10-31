import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface RoyaltyStatement {
  id: string;
  period: string;
  totalStreams: number;
  totalEarnings: number;
  currency: string;
  status: 'Pending' | 'Processed' | 'Paid';
  paymentDate?: string;
}

interface Track {
  id: string;
  title: string;
  artist: string;
  streams: number;
  earnings: number;
  period: string;
}

export default function RoyaltyPortalPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'statements' | 'tracks' | 'settings'>(
    'dashboard'
  );

  // Sample royalty data
  const currentStats = {
    totalEarnings: 124356.78,
    monthlyAverage: 10363.07,
    totalStreams: 42150000,
    accountBalance: 15234.50,
  };

  const statements: RoyaltyStatement[] = [
    {
      id: '1',
      period: 'December 2024',
      totalStreams: 3500000,
      totalEarnings: 10500.00,
      currency: 'USD',
      status: 'Paid',
      paymentDate: '2025-01-15',
    },
    {
      id: '2',
      period: 'November 2024',
      totalStreams: 3200000,
      totalEarnings: 9600.00,
      currency: 'USD',
      status: 'Paid',
      paymentDate: '2024-12-15',
    },
    {
      id: '3',
      period: 'October 2024',
      totalStreams: 2800000,
      totalEarnings: 8400.00,
      currency: 'USD',
      status: 'Processed',
    },
    {
      id: '4',
      period: 'September 2024',
      totalStreams: 3100000,
      totalEarnings: 9300.00,
      currency: 'USD',
      status: 'Processed',
    },
  ];

  const topTracks: Track[] = [
    {
      id: '1',
      title: 'Midnight Dreams',
      artist: 'Various Artists',
      streams: 8500000,
      earnings: 25500.00,
      period: 'All Time',
    },
    {
      id: '2',
      title: 'Neon Nights',
      artist: 'Various Artists',
      streams: 7200000,
      earnings: 21600.00,
      period: 'All Time',
    },
    {
      id: '3',
      title: 'Eternal Echo',
      artist: 'Various Artists',
      streams: 6100000,
      earnings: 18300.00,
      period: 'All Time',
    },
    {
      id: '4',
      title: 'Digital Horizon',
      artist: 'Various Artists',
      streams: 5300000,
      earnings: 15900.00,
      period: 'All Time',
    },
    {
      id: '5',
      title: 'Urban Pulse',
      artist: 'Various Artists',
      streams: 4800000,
      earnings: 14400.00,
      period: 'All Time',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-900/30 border-green-600 text-green-300';
      case 'Processed':
        return 'bg-blue-900/30 border-blue-600 text-blue-300';
      case 'Pending':
        return 'bg-yellow-900/30 border-yellow-600 text-yellow-300';
      default:
        return 'bg-slate-900/30 border-slate-600 text-slate-300';
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
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4 bg-slate-900/40 backdrop-blur">
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-300 hover:text-white transition flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold mb-2">Royalty Portal</h1>
          <p className="text-xl text-slate-300">Manage and track all your royalty statements and earnings</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 border-b border-slate-700">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'statements', label: '📋 Statements' },
            { id: 'tracks', label: '🎵 Top Tracks' },
            { id: 'settings', label: '⚙️ Settings' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-semibold whitespace-nowrap border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-4 gap-6">
              {[
                {
                  label: 'Total Earnings',
                  value: `$${currentStats.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                  icon: '💰',
                  trend: '+8.2%',
                },
                {
                  label: 'Monthly Average',
                  value: `$${currentStats.monthlyAverage.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                  icon: '📈',
                  trend: '+4.1%',
                },
                {
                  label: 'Total Streams',
                  value: `${(currentStats.totalStreams / 1000000).toFixed(1)}M`,
                  icon: '🎵',
                  trend: '+12.5%',
                },
                {
                  label: 'Account Balance',
                  value: `$${currentStats.accountBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}`,
                  icon: '🏦',
                  trend: 'Ready to withdraw',
                },
              ].map((metric, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="text-3xl mb-2">{metric.icon}</div>
                  <div className="text-slate-400 text-sm font-semibold mb-1">{metric.label}</div>
                  <div className="text-3xl font-bold mb-2">{metric.value}</div>
                  <div className="text-xs text-green-400 font-semibold">{metric.trend}</div>
                </div>
              ))}
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Recent Payments */}
              <div
                className="p-6 rounded-2xl border border-slate-700"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <h3 className="text-xl font-bold mb-4">Recent Payments</h3>
                <div className="space-y-3">
                  {statements.slice(0, 3).map((stmt) => (
                    <div key={stmt.id} className="flex justify-between items-center pb-3 border-b border-slate-700/50 last:border-0">
                      <div>
                        <div className="font-semibold">{stmt.period}</div>
                        <div className="text-xs text-slate-400">{stmt.totalStreams.toLocaleString()} streams</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-400">${stmt.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded border ${getStatusColor(stmt.status)}`}>
                          {stmt.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-4">
                <div
                  className="p-6 rounded-2xl border border-slate-700"
                  style={{
                    background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
                      Withdraw Funds
                    </button>
                    <button className="w-full px-4 py-3 border border-blue-500 text-blue-300 hover:bg-blue-900/20 font-semibold rounded-lg transition">
                      Download Statement
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="w-full px-4 py-3 border border-slate-600 text-slate-300 hover:bg-slate-900/20 font-semibold rounded-lg transition"
                    >
                      Payment Settings
                    </button>
                  </div>
                </div>

                <div
                  className="p-6 rounded-2xl border border-green-600/30 bg-green-900/20"
                  style={{
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <div className="text-3xl mb-2">🎉</div>
                  <h4 className="font-bold text-green-300 mb-2">Bonus Opportunity</h4>
                  <p className="text-sm text-green-200 mb-3">
                    You've reached 40M streams! Unlock premium distribution features.
                  </p>
                  <button className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition text-sm">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statements Tab */}
        {activeTab === 'statements' && (
          <div className="space-y-4">
            {statements.map((stmt) => (
              <div
                key={stmt.id}
                className="p-6 rounded-2xl border border-slate-700 hover:border-blue-500 transition"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{stmt.period}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-slate-400">Streams</div>
                        <div className="font-semibold">{stmt.totalStreams.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Earnings</div>
                        <div className="font-semibold text-green-400">${stmt.totalEarnings.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                      </div>
                      {stmt.paymentDate && (
                        <div>
                          <div className="text-slate-400">Payment Date</div>
                          <div className="font-semibold">{stmt.paymentDate}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-bold border ${getStatusColor(stmt.status)}`}>
                      {stmt.status}
                    </span>
                    <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition">
                      Download
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Tracks Tab */}
        {activeTab === 'tracks' && (
          <div className="space-y-3">
            {topTracks.map((track, idx) => (
              <div
                key={track.id}
                className="p-4 rounded-2xl border border-slate-700 hover:border-blue-500 transition flex items-center gap-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                <div className="text-2xl font-bold text-blue-400 min-w-fit">#{idx + 1}</div>
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{track.title}</h4>
                  <p className="text-slate-400 text-sm">{track.artist}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-400">
                    {(track.streams / 1000000).toFixed(1)}M streams
                  </div>
                  <div className="font-bold text-green-400">
                    ${track.earnings.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl">
            <div
              className="p-8 rounded-2xl border border-slate-700 space-y-6"
              style={{
                background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.65), rgba(15, 23, 42, 0.45))',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div>
                <h3 className="text-lg font-bold mb-4">Payment Method</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-900/20">
                    <input type="radio" name="payment" defaultChecked className="w-4 h-4" />
                    <span>Bank Transfer (ACH)</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-900/20">
                    <input type="radio" name="payment" className="w-4 h-4" />
                    <span>PayPal</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-600 rounded-lg cursor-pointer hover:bg-slate-900/20">
                    <input type="radio" name="payment" className="w-4 h-4" />
                    <span>Wire Transfer</span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-bold mb-4">Payout Threshold</h3>
                <p className="text-slate-400 mb-3">Automatically withdraw when balance reaches:</p>
                <select className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-100 focus:border-blue-500">
                  <option>$100</option>
                  <option>$250</option>
                  <option>$500</option>
                  <option>$1000</option>
                  <option>Manual only</option>
                </select>
              </div>

              <div className="border-t border-slate-700 pt-6">
                <h3 className="text-lg font-bold mb-4">Tax Information</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tax ID (SSN or EIN)"
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Legal Name"
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
                  Save Changes
                </button>
                <button className="flex-1 px-6 py-3 border border-slate-600 text-slate-300 hover:bg-slate-900/20 font-semibold rounded-lg transition">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}