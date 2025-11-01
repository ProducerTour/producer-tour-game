import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { advanceScenarioApi } from '@/lib/api';
import './pages.css';

interface Calculation {
  upfrontAdvance: number;
  newReleaseAdvance: number | null;
  optionAdvance: number | null;
  recoupmentRate: number;
  estimatedTotal: number;
}

interface Scenario {
  id: string;
  scenarioName: string;
  catalogSize: number;
  monthlyRoyalties: number;
  contractLength: number;
  artistIncome: number;
  includeNewReleases: boolean;
  switchDistributors: boolean;
  upfrontAdvance: number;
  newReleaseAdvance: number | null;
  optionAdvance: number | null;
  recoupmentRate: number;
  estimatedTotal: number;
  createdAt: string;
}

// Animated Counter Component
function CountUp({ end, duration = 800, format }: { end: number; duration?: number; format?: (n: number) => string }) {
  const [count, setCount] = useState(end);
  const countRef = useRef(end);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = countRef.current;
    const startTime = Date.now();

    // Cancel any ongoing animation
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuad = (t: number) => t * (2 - t);
      const easedProgress = easeOutQuad(progress);

      const current = Math.floor(start + (end - start) * easedProgress);
      setCount(current);
      countRef.current = current;

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(end);
        countRef.current = end;
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    // Cleanup function to cancel animation on unmount
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration]);

  return <>{format ? format(count) : count}</>;
}

export default function AdvanceEstimatorToolPage() {
  const navigate = useNavigate();

  // Input parameters
  const [catalogSize, setCatalogSize] = useState(50);
  const [monthlyRoyalties, setMonthlyRoyalties] = useState(5000);
  const [contractLength, setContractLength] = useState(24); // in months
  const [artistIncome, setArtistIncome] = useState(50); // percentage
  const [includeNewReleases, setIncludeNewReleases] = useState(false);
  const [switchDistributors, setSwitchDistributors] = useState(false);

  // Calculation result
  const [calculation, setCalculation] = useState<Calculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  // Saved scenarios
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [scenarioName, setScenarioName] = useState('');
  const [showScenariosModal, setShowScenariosModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Debounce timer and pending state
  const debounceTimer = useRef<number | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);

  // Calculate on mount and when parameters change (with debounce)
  useEffect(() => {
    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Mark as debouncing (waiting for user to stop sliding)
    setIsDebouncing(true);

    // Set new timer - wait 500ms after user stops sliding
    debounceTimer.current = setTimeout(() => {
      setIsDebouncing(false);
      calculateAdvance();
    }, 500);

    // Cleanup on unmount
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [catalogSize, monthlyRoyalties, contractLength, artistIncome, includeNewReleases, switchDistributors]);

  // Fetch saved scenarios on mount
  useEffect(() => {
    fetchScenarios();
  }, []);

  const calculateAdvance = async () => {
    try {
      // Only show "Calculating..." on initial load (when there's no calculation yet)
      if (!calculation) {
        setCalculating(true);
      }

      const response = await advanceScenarioApi.calculate({
        catalogSize,
        monthlyRoyalties,
        contractLength,
        artistIncome,
        includeNewReleases,
        switchDistributors,
      });
      setCalculation(response.data.calculation);
    } catch (err: any) {
      console.error('Calculation error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const fetchScenarios = async () => {
    try {
      const response = await advanceScenarioApi.list();
      setScenarios(response.data.scenarios || []);
    } catch (err: any) {
      console.error('Fetch scenarios error:', err);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenarioName.trim()) {
      alert('Please enter a scenario name');
      return;
    }

    try {
      await advanceScenarioApi.create({
        scenarioName: scenarioName.trim(),
        catalogSize,
        monthlyRoyalties,
        contractLength,
        artistIncome,
        includeNewReleases,
        switchDistributors,
      });
      setShowSaveModal(false);
      setScenarioName('');
      fetchScenarios();
      alert('Scenario saved successfully!');
    } catch (err: any) {
      console.error('Save scenario error:', err);
      alert('Failed to save scenario');
    }
  };

  const handleLoadScenario = (scenario: Scenario) => {
    setCatalogSize(scenario.catalogSize);
    setMonthlyRoyalties(parseFloat(scenario.monthlyRoyalties.toString()));
    setContractLength(scenario.contractLength);
    setArtistIncome(scenario.artistIncome);
    setIncludeNewReleases(scenario.includeNewReleases);
    setSwitchDistributors(scenario.switchDistributors);
    setShowScenariosModal(false);
  };

  const handleDeleteScenario = async (id: string) => {
    try {
      await advanceScenarioApi.delete(id);
      fetchScenarios();
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Delete scenario error:', err);
      alert('Failed to delete scenario');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => navigate('/admin')}
                className="text-slate-400 hover:text-white mb-4 transition"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-4xl font-bold text-white">💰 Advance Estimator</h1>
              <p className="text-slate-400 mt-2">Calculate potential funding based on your catalog and royalties</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowScenariosModal(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                View Saved ({scenarios.length})
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Input Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <h2 className="text-white text-xl font-semibold mb-6">Funding Parameters</h2>

              {/* Catalog Size */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300 font-medium">Catalog Size</label>
                  <span className="text-white text-lg font-semibold">{catalogSize} songs</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="500"
                  value={catalogSize}
                  onChange={(e) => setCatalogSize(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1</span>
                  <span>500</span>
                </div>
              </div>

              {/* Monthly Royalties */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300 font-medium">Average Monthly Royalties</label>
                  <span className="text-white text-lg font-semibold">{formatCurrency(monthlyRoyalties)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50000"
                  step="100"
                  value={monthlyRoyalties}
                  onChange={(e) => setMonthlyRoyalties(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>$0</span>
                  <span>$50,000</span>
                </div>
              </div>

              {/* Contract Length */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300 font-medium">Contract Length</label>
                  <span className="text-white text-lg font-semibold">
                    {contractLength} months ({(contractLength / 12).toFixed(1)} years)
                  </span>
                </div>
                <input
                  type="range"
                  min="6"
                  max="60"
                  value={contractLength}
                  onChange={(e) => setContractLength(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>6 months</span>
                  <span>60 months</span>
                </div>
              </div>

              {/* Artist Income */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-slate-300 font-medium">Income Paid to You During Term</label>
                  <span className="text-white text-lg font-semibold">{artistIncome}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={artistIncome}
                  onChange={(e) => setArtistIncome(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-4 pt-4 border-t border-slate-700">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Include new releases in deal</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={includeNewReleases}
                      onChange={(e) => setIncludeNewReleases(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-slate-300">Willing to switch distributors</span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={switchDistributors}
                      onChange={(e) => setSwitchDistributors(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right: Calculation Results */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6 sticky top-4">
              <div className="text-center mb-6">
                <h3 className="text-white text-xl font-semibold mb-1">Funding Estimate</h3>
                <p className="text-slate-400 text-sm">
                  {isDebouncing ? (
                    <span className="text-blue-400 animate-pulse">Updating...</span>
                  ) : (
                    'Based on current parameters'
                  )}
                </p>
              </div>

              {calculating ? (
                <div className="text-center py-12">
                  <div className="text-slate-400">Calculating...</div>
                </div>
              ) : calculation ? (
                <div className="space-y-4">
                  {/* Upfront Advance */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Upfront Advance</div>
                    <div className="text-green-400 text-2xl font-bold">
                      <CountUp end={calculation.upfrontAdvance} format={formatCurrency} />
                    </div>
                  </div>

                  {/* New Release Advance */}
                  {calculation.newReleaseAdvance && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-slate-400 text-sm mb-1">New Release Advance</div>
                      <div className="text-blue-400 text-2xl font-bold">
                        <CountUp end={calculation.newReleaseAdvance} format={formatCurrency} />
                      </div>
                    </div>
                  )}

                  {/* Option Advance */}
                  {calculation.optionAdvance && (
                    <div className="bg-slate-700/50 rounded-lg p-4">
                      <div className="text-slate-400 text-sm mb-1">Distributor Switch Bonus</div>
                      <div className="text-purple-400 text-2xl font-bold">
                        <CountUp end={calculation.optionAdvance} format={formatCurrency} />
                      </div>
                    </div>
                  )}

                  {/* Recoupment Rate */}
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <div className="text-slate-400 text-sm mb-1">Recoupment Rate</div>
                    <div className="text-yellow-400 text-2xl font-bold">
                      <CountUp end={calculation.recoupmentRate} format={(n) => `${n}%`} />
                    </div>
                  </div>

                  {/* Total */}
                  <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mt-6">
                    <div className="text-white text-sm mb-2">Estimated Total</div>
                    <div className="text-white text-4xl font-bold">
                      <CountUp end={calculation.estimatedTotal} format={formatCurrency} duration={1000} />
                    </div>
                  </div>

                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 text-lg">💡</span>
                      <p className="text-blue-300 text-xs">
                        This is an estimate based on industry-standard calculations. Actual offers may vary based on catalog performance, growth trajectory, and market conditions.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-slate-800 rounded-lg border border-slate-700 p-6">
          <h3 className="text-white text-lg font-semibold mb-4">How This Estimate Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="text-blue-400 font-medium mb-2">Calculation Factors</h4>
              <ul className="text-slate-300 space-y-2">
                <li>• Your catalog size and historical earnings</li>
                <li>• Contract length and payment structure</li>
                <li>• Income retained during the term</li>
                <li>• New release potential and flexibility</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-400 font-medium mb-2">What You Get</h4>
              <ul className="text-slate-300 space-y-2">
                <li>• Upfront cash based on projected royalties</li>
                <li>• Additional funding for new releases (optional)</li>
                <li>• Bonus for distributor flexibility</li>
                <li>• Recoupment from future royalty earnings</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Save Scenario Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-md w-full">
            <h3 className="text-white font-semibold text-lg mb-4">Save Scenario</h3>
            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2">Scenario Name</label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="e.g., Conservative Estimate, Aggressive Deal"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setScenarioName('');
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScenario}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                Save Scenario
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Scenarios Modal */}
      {showScenariosModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-white font-semibold text-lg">Saved Scenarios</h3>
              <button
                onClick={() => setShowScenariosModal(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {scenarios.length > 0 ? (
              <div className="space-y-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-blue-500 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-white font-semibold text-lg mb-2">{scenario.scenarioName}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-slate-400">Catalog:</span>
                            <span className="text-white ml-1">{scenario.catalogSize} songs</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Monthly:</span>
                            <span className="text-white ml-1">{formatCurrency(parseFloat(scenario.monthlyRoyalties.toString()))}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Term:</span>
                            <span className="text-white ml-1">{scenario.contractLength}mo</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Income:</span>
                            <span className="text-white ml-1">{scenario.artistIncome}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-green-400 font-semibold text-xl">
                            {formatCurrency(parseFloat(scenario.estimatedTotal.toString()))}
                          </div>
                          <span className="text-slate-500 text-xs">
                            Saved {formatDate(scenario.createdAt)}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleLoadScenario(scenario)}
                          className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded transition"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(scenario.id)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm rounded transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg mb-2">No saved scenarios yet</p>
                <p className="text-sm">Save your current estimate to compare different funding options</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 max-w-sm">
            <h3 className="text-white font-semibold text-lg mb-4">Delete Scenario?</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to delete this scenario? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteScenario(deleteConfirm)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
