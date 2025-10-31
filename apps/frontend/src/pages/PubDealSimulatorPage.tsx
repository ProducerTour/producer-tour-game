import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './pages.css';

type DealModel = 'unpub' | 'copub' | 'admin';

interface GlobalInputs {
  gross: number;
  advance: number;
  priorRecouped: number;
  writerOwnership: number;
  withholdingTax: boolean;
  withholdingPct: number;
  otherDeds: number;
}

interface UnpubInputs {
  adminPct: number;
}

interface CopubInputs {
  writerShare: number;
  publisherShare: number;
  writerShareOfPublisher: number;
  recoupWriterShare: boolean;
  adminPct: number;
  overheadPct: number;
}

interface AdminInputs {
  adminPct: number;
}

interface CalculationResult {
  adjGross: number;
  recouped: number;
  advRemaining: number;
  netWriter: number;
}

export default function PubDealSimulatorPage() {
  const navigate = useNavigate();
  const [activeModel, setActiveModel] = useState<DealModel>('unpub');

  const [global, setGlobal] = useState<GlobalInputs>({
    gross: 100000,
    advance: 0,
    priorRecouped: 0,
    writerOwnership: 100,
    withholdingTax: false,
    withholdingPct: 0,
    otherDeds: 0,
  });

  const [unpub, setUnpub] = useState<UnpubInputs>({
    adminPct: 0,
  });

  const [copub, setCopub] = useState<CopubInputs>({
    writerShare: 50,
    publisherShare: 50,
    writerShareOfPublisher: 50,
    recoupWriterShare: false,
    adminPct: 0,
    overheadPct: 0,
  });

  const [admin, setAdmin] = useState<AdminInputs>({
    adminPct: 15,
  });

  const [result, setResult] = useState<CalculationResult>({
    adjGross: 0,
    recouped: 0,
    advRemaining: 0,
    netWriter: 0,
  });

  const fmt = (n: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(n);
  };

  const fmtShort = (n: number) => {
    if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `$${(n / 1000).toFixed(1)}K`;
    return fmt(n);
  };

  const clampPct = (n: number) => Math.min(100, Math.max(0, n));

  const calculateAdjustedGross = (): number => {
    let g = global.gross;
    if (global.withholdingTax) {
      g = g * (1 - clampPct(global.withholdingPct) / 100);
    }
    g = Math.max(0, g - global.otherDeds);
    return g;
  };

  const applyOwnership = (amount: number): number => {
    return amount * (clampPct(global.writerOwnership) / 100);
  };

  const recoup = (
    available: number,
    advance: number,
    prior: number,
    includeWriterShare: boolean,
    writerSharePool?: number
  ): [number, number, number] => {
    const unrecouped = Math.max(0, advance - prior);
    if (unrecouped <= 0) return [0, 0, available];

    let recoupable = includeWriterShare
      ? available
      : typeof writerSharePool === 'number'
      ? writerSharePool
      : available;

    const toRecoup = Math.min(unrecouped, recoupable);
    const remaining = unrecouped - toRecoup;
    const net = available - toRecoup;

    return [toRecoup, remaining, net];
  };

  useEffect(() => {
    compute();
  }, [activeModel, global, unpub, copub, admin]);

  const compute = () => {
    const g0 = calculateAdjustedGross();
    const adv = global.advance;
    const prior = global.priorRecouped;
    const ownScaledGross = applyOwnership(g0);

    let netWriter = 0;
    let recouped = 0;
    let advRemain = Math.max(0, adv - prior);

    if (activeModel === 'unpub') {
      const adminPct = clampPct(unpub.adminPct) / 100;
      const adminFee = ownScaledGross * adminPct;
      const netBeforeRecoup = Math.max(0, ownScaledGross - adminFee);
      const [r, remain, netAfterRecoup] = recoup(netBeforeRecoup, adv, prior, true);
      recouped = r;
      advRemain = remain;
      netWriter = netAfterRecoup;
    }

    if (activeModel === 'copub') {
      const adminPct = clampPct(copub.adminPct) / 100;
      const overheadPct = clampPct(copub.overheadPct) / 100;
      const wsPct = clampPct(copub.writerShare) / 100;
      const psPct = clampPct(copub.publisherShare) / 100;
      const wspPct = clampPct(copub.writerShareOfPublisher) / 100;
      const recoupWriterShare = copub.recoupWriterShare;

      const adminFee = ownScaledGross * adminPct;
      const postAdmin = Math.max(0, ownScaledGross - adminFee);

      const writerBucket = postAdmin * wsPct;
      const publisherBucketBeforeOH = postAdmin * psPct;
      const publisherOverhead = publisherBucketBeforeOH * overheadPct;
      const publisherBucket = Math.max(0, publisherBucketBeforeOH - publisherOverhead);

      const writerPubPortion = publisherBucket * wspPct;
      const grossPayableToWriter = writerBucket + writerPubPortion;

      const recoupPool = recoupWriterShare ? grossPayableToWriter : writerPubPortion;
      const [r, remain, netAfterRecoup] = recoup(
        grossPayableToWriter,
        adv,
        prior,
        recoupWriterShare,
        recoupPool
      );
      recouped = r;
      advRemain = remain;
      netWriter = netAfterRecoup;
    }

    if (activeModel === 'admin') {
      const adminPct = clampPct(admin.adminPct) / 100;
      const adminFee = ownScaledGross * adminPct;
      const netBeforeRecoup = Math.max(0, ownScaledGross - adminFee);
      const [r, remain, netAfterRecoup] = recoup(netBeforeRecoup, adv, prior, true);
      recouped = r;
      advRemain = remain;
      netWriter = netAfterRecoup;
    }

    setResult({
      adjGross: g0,
      recouped,
      advRemaining: advRemain,
      netWriter,
    });
  };

  const handleReset = () => {
    setGlobal({
      gross: 100000,
      advance: 0,
      priorRecouped: 0,
      writerOwnership: 100,
      withholdingTax: false,
      withholdingPct: 0,
      otherDeds: 0,
    });
    setUnpub({ adminPct: 0 });
    setCopub({
      writerShare: 50,
      publisherShare: 50,
      writerShareOfPublisher: 50,
      recoupWriterShare: false,
      adminPct: 0,
      overheadPct: 0,
    });
    setAdmin({ adminPct: 15 });
  };

  const getBarBreakdown = () => {
    const total = result.adjGross;
    if (total === 0) return [];

    const recoupPct = (result.recouped / total) * 100;
    const advRemainPct = (result.advRemaining / total) * 100;
    const netPct = (result.netWriter / total) * 100;

    return [
      { label: 'Recouped', value: result.recouped, percent: recoupPct, color: 'bg-cyan-400' },
      {
        label: 'Advance Remaining',
        value: result.advRemaining,
        percent: advRemainPct,
        color: 'bg-purple-400',
      },
      { label: 'Net to Writer', value: result.netWriter, percent: netPct, color: 'bg-pink-400' },
    ];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Gradient Header */}
      <div className="h-32 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 opacity-30"></div>

      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-6 -mt-20 relative z-10">
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-300 hover:text-white transition flex items-center gap-2 text-sm font-medium mb-6"
        >
          ← Back to Dashboard
        </button>

        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-3 text-white">Publishing Deal Simulator</h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto">
            Model catalog income under different publishing structures
          </p>
        </header>

        {/* Deal Type Selection */}
        <div className="mb-12">
          <h2 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
            Select a deal type:
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'unpub',
                label: 'UNPUBLISHED',
                desc: 'No deal with a publisher or administrator',
              },
              {
                id: 'copub',
                label: 'CO-PUBLISHING',
                desc: 'A deal in which a publisher co-owns your pub catalog',
              },
              { id: 'admin', label: 'ADMIN', desc: 'A deal in which a company collects royalties without owning copyright' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveModel(tab.id as DealModel)}
                className={`p-6 rounded-xl border transition-all text-left ${
                  activeModel === tab.id
                    ? 'bg-slate-700 border-slate-600'
                    : 'bg-slate-800 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <div className="text-white font-bold text-lg mb-2">{tab.label}</div>
                <div className="text-slate-400 text-sm leading-relaxed">{tab.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-16">
          {/* Left Column - Inputs */}
          <div className="space-y-6">
            {/* Publishing Income Slider */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <label className="text-white font-semibold text-sm uppercase tracking-wider flex items-center gap-2">
                  Publishing Income
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-700 text-slate-400 text-xs">
                    i
                  </span>
                </label>
              </div>
              <div className="text-center mb-4">
                <div className="text-4xl font-bold text-white">{fmtShort(global.gross)}</div>
                <div className="text-slate-400 text-xs mt-1">Total gross publishing revenue</div>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="1000"
                value={global.gross}
                onChange={(e) => setGlobal({ ...global, gross: parseInt(e.target.value) })}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                    (global.gross / 500000) * 100
                  }%, #334155 ${(global.gross / 500000) * 100}%, #334155 100%)`,
                }}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>$0</span>
                <span>$500K</span>
              </div>
            </div>

            {/* Advance & Recoupment */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                Advance & Recoupment
              </h3>

              <div className="space-y-6">
                {/* Outstanding Advance */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm">Outstanding Advance</label>
                    <span className="text-white font-semibold">{fmt(global.advance)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200000"
                    step="1000"
                    value={global.advance}
                    onChange={(e) => setGlobal({ ...global, advance: parseInt(e.target.value) })}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                        (global.advance / 200000) * 100
                      }%, #334155 ${(global.advance / 200000) * 100}%, #334155 100%)`,
                    }}
                  />
                </div>

                {/* Prior Recouped */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-slate-300 text-sm">Prior Recouped</label>
                    <span className="text-white font-semibold">{fmt(global.priorRecouped)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={global.advance}
                    step="100"
                    value={global.priorRecouped}
                    onChange={(e) =>
                      setGlobal({ ...global, priorRecouped: parseInt(e.target.value) })
                    }
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                        global.advance > 0 ? (global.priorRecouped / global.advance) * 100 : 0
                      }%, #334155 ${
                        global.advance > 0 ? (global.priorRecouped / global.advance) * 100 : 0
                      }%, #334155 100%)`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Writer Ownership */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-semibold text-sm uppercase tracking-wider">
                  Writer Ownership
                </label>
                <span className="text-white font-bold text-xl">{global.writerOwnership}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={global.writerOwnership}
                onChange={(e) =>
                  setGlobal({ ...global, writerOwnership: parseInt(e.target.value) })
                }
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${global.writerOwnership}%, #334155 ${global.writerOwnership}%, #334155 100%)`,
                }}
              />
              <div className="text-slate-400 text-xs mt-2">Your share of the composition</div>
            </div>

            {/* Model-Specific Settings */}
            {activeModel === 'unpub' && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                  Unpublished Settings
                </h3>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-sm">Admin Fee</label>
                  <span className="text-white font-semibold">{unpub.adminPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={unpub.adminPct}
                  onChange={(e) => setUnpub({ ...unpub, adminPct: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      (unpub.adminPct / 30) * 100
                    }%, #334155 ${(unpub.adminPct / 30) * 100}%, #334155 100%)`,
                  }}
                />
                <div className="text-slate-400 text-xs mt-2">
                  Third-party admin fee (10-20% typical)
                </div>
              </div>
            )}

            {activeModel === 'copub' && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                  Co-Publishing Settings
                </h3>

                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 text-sm">Writer's Share</label>
                      <span className="text-white font-semibold">{copub.writerShare}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={copub.writerShare}
                      onChange={(e) =>
                        setCopub({ ...copub, writerShare: parseFloat(e.target.value) })
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${copub.writerShare}%, #334155 ${copub.writerShare}%, #334155 100%)`,
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 text-sm">Publisher's Share</label>
                      <span className="text-white font-semibold">{copub.publisherShare}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={copub.publisherShare}
                      onChange={(e) =>
                        setCopub({ ...copub, publisherShare: parseFloat(e.target.value) })
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${copub.publisherShare}%, #334155 ${copub.publisherShare}%, #334155 100%)`,
                      }}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-300 text-sm">Writer's Share of Publisher</label>
                      <span className="text-white font-semibold">
                        {copub.writerShareOfPublisher}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={copub.writerShareOfPublisher}
                      onChange={(e) =>
                        setCopub({
                          ...copub,
                          writerShareOfPublisher: parseFloat(e.target.value),
                        })
                      }
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${copub.writerShareOfPublisher}%, #334155 ${copub.writerShareOfPublisher}%, #334155 100%)`,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      id="recoupWriterShare"
                      checked={copub.recoupWriterShare}
                      onChange={(e) =>
                        setCopub({ ...copub, recoupWriterShare: e.target.checked })
                      }
                      className="w-5 h-5 cursor-pointer accent-blue-500"
                    />
                    <label
                      htmlFor="recoupWriterShare"
                      className="text-sm text-slate-300 cursor-pointer"
                    >
                      Recoup from Writer's Share too
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeModel === 'admin' && (
              <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                  Admin Deal Settings
                </h3>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-sm">Admin Fee</label>
                  <span className="text-white font-semibold">{admin.adminPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={admin.adminPct}
                  onChange={(e) => setAdmin({ ...admin, adminPct: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      (admin.adminPct / 30) * 100
                    }%, #334155 ${(admin.adminPct / 30) * 100}%, #334155 100%)`,
                  }}
                />
                <div className="text-slate-400 text-xs mt-2">
                  Typical 10-20% of gross, non-recoupable
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  Adjusted Gross
                </div>
                <div className="text-white text-2xl font-bold">{fmt(result.adjGross)}</div>
              </div>

              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  Recouped
                </div>
                <div className="text-white text-2xl font-bold">{fmt(result.recouped)}</div>
              </div>

              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  Advance Left
                </div>
                <div className="text-orange-400 text-2xl font-bold">{fmt(result.advRemaining)}</div>
              </div>

              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-2">
                  Net to Writer
                </div>
                <div className="text-green-400 text-2xl font-bold">{fmt(result.netWriter)}</div>
              </div>
            </div>

            {/* Visual Breakdown */}
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-6">
                Payment Breakdown
              </h3>

              <div className="space-y-6">
                {getBarBreakdown().map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-300 text-sm font-medium">{item.label}</span>
                      <span className="text-white font-bold">{fmt(item.value)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full ${item.color} transition-all duration-500`}
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                      <span className="text-slate-400 text-xs font-medium w-12 text-right">
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
              >
                Reset
              </button>
              <button
                onClick={() => {
                  const txt = `Publishing Deal Simulator\nAdjusted Gross: ${fmt(
                    result.adjGross
                  )}\nRecouped: ${fmt(result.recouped)}\nAdvance Left: ${fmt(
                    result.advRemaining
                  )}\nNet to Writer: ${fmt(result.netWriter)}`;
                  navigator.clipboard.writeText(txt);
                }}
                className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                Copy Results
              </button>
            </div>

            {/* Info */}
            <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
              <p className="text-slate-400 text-xs leading-relaxed">
                These outputs are estimates for educational purposes only and not legal or
                accounting advice. Actual deal terms vary based on negotiation and market
                conditions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
