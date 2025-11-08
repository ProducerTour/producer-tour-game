export default function AdminGuide() {
  return (
    <div className="prose prose-invert max-w-none">
      {/* Header */}
      <div className="text-center mb-12 pb-8 border-b border-slate-700">
        <h1 className="text-4xl font-bold text-white mb-4">📊 Producer Tour Admin Guide</h1>
        <p className="text-xl text-gray-300 mb-6">Complete Administrative Documentation</p>

        <div className="flex gap-3 justify-center mb-6">
          <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">Version 1.0</span>
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Updated November 2025</span>
          <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">Web Platform</span>
        </div>

        <p className="text-gray-400">Comprehensive guide for managing royalty statements, users, and payments</p>
      </div>

      {/* Table of Contents */}
      <div className="bg-slate-800/50 rounded-lg p-6 mb-8">
        <h2 className="text-2xl font-bold text-white mb-4">📑 Table of Contents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <a href="#getting-started" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>🚀</span> Getting Started
          </a>
          <a href="#user-management" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>👥</span> User Management
          </a>
          <a href="#publisher-settings" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>🏢</span> Publisher Settings
          </a>
          <a href="#statement-processing" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>📄</span> Statement Processing
          </a>
          <a href="#payment-processing" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>💰</span> Payment Processing
          </a>
          <a href="#commission-settings" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>⚙️</span> Commission Settings
          </a>
          <a href="#dashboard-analytics" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>📊</span> Dashboard & Analytics
          </a>
          <a href="#common-workflows" className="text-primary-400 hover:text-primary-300 flex items-center gap-2">
            <span>✅</span> Common Workflows
          </a>
        </div>
      </div>

      {/* Getting Started */}
      <section id="getting-started" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>🚀</span> Getting Started
        </h2>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔐</span> Logging In
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">1️⃣</td>
                <td className="py-3 px-4 text-gray-300">Navigate to <a href="https://www.producertour.com" className="text-primary-400 hover:underline">www.producertour.com</a></td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">2️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click <strong className="text-white">Sign In</strong> in the top right corner</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">3️⃣</td>
                <td className="py-3 px-4 text-gray-300">Enter your admin email and password</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-center w-16 text-2xl">4️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click <strong className="text-white">Sign In</strong> to access the dashboard</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>📊</span> Dashboard Overview
        </h3>

        <p className="text-gray-300 mb-4">After logging in, you'll see the Admin Dashboard featuring:</p>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Component</th>
                <th className="py-3 px-4 text-left text-white">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">💵</span>Revenue Cards</td>
                <td className="py-3 px-4 text-gray-400">Total Revenue, This Month, Last Month</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">📈</span>Timeline Chart</td>
                <td className="py-3 px-4 text-gray-400">Revenue trends over time</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">🎵</span>Platform Breakdown</td>
                <td className="py-3 px-4 text-gray-400">Spotify, Apple Music, YouTube, etc.</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">🏛️</span>Organization Split</td>
                <td className="py-3 px-4 text-gray-400">ASCAP, BMI, MLC distribution</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">⚡</span>Quick Actions</td>
                <td className="py-3 px-4 text-gray-400">Sidebar navigation</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🧭</span> Navigation Menu
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="font-mono text-sm text-gray-300 space-y-2">
            <div>┌─ 📊 Dashboard       → Overview and analytics</div>
            <div>├─ 📄 Statements      → Upload and manage royalty statements</div>
            <div>├─ 👥 Users           → Manage writers, publishers, and staff</div>
            <div>├─ 💰 Payment Summary → View and process payments</div>
            <div>└─ ⚙️  Settings       → Configure system settings</div>
          </div>
        </div>
      </section>

      {/* User Management */}
      <section id="user-management" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>👥</span> User Management
        </h2>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>➕</span> Creating a New User
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">1️⃣</td>
                <td className="py-3 px-4 text-gray-300">Navigate to <strong className="text-white">Users</strong> in the sidebar</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">2️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click the <strong className="text-white">Create New User</strong> button</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-center w-16 text-2xl">3️⃣</td>
                <td className="py-3 px-4 text-gray-300">Fill in the required user details</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="text-xl font-semibold text-white mb-3">Required Fields</h4>
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Field</th>
                <th className="py-3 px-4 text-left text-white">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">✉️</span>Email</td>
                <td className="py-3 px-4 text-gray-400">User's email address (required)</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">👤</span>First Name</td>
                <td className="py-3 px-4 text-gray-400">User's first name</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">👤</span>Last Name</td>
                <td className="py-3 px-4 text-gray-400">User's last name</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">🎭</span>Role</td>
                <td className="py-3 px-4 text-gray-400">User permission level (see below)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
          <span>🎭</span> Available Roles
        </h4>
        <div className="bg-slate-800 rounded-lg p-6 mb-6 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Role</th>
                <th className="py-3 px-4 text-left text-white">Icon</th>
                <th className="py-3 px-4 text-left text-white">Description</th>
                <th className="py-3 px-4 text-left text-white">Use Case</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">WRITER</td>
                <td className="py-3 px-4 text-center">✍️</td>
                <td className="py-3 px-4 text-gray-400">Songwriter/Producer</td>
                <td className="py-3 px-4 text-gray-400">For creative talent</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">PUBLISHER</td>
                <td className="py-3 px-4 text-center">🏢</td>
                <td className="py-3 px-4 text-gray-400">Publishing Company</td>
                <td className="py-3 px-4 text-gray-400">For publishing entities</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">ADMIN</td>
                <td className="py-3 px-4 text-center">👑</td>
                <td className="py-3 px-4 text-gray-400">Full System Access</td>
                <td className="py-3 px-4 text-gray-400">For administrators</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">STAFF</td>
                <td className="py-3 px-4 text-center">🔧</td>
                <td className="py-3 px-4 text-gray-400">Limited Admin Access</td>
                <td className="py-3 px-4 text-gray-400">For support staff</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">LEGAL</td>
                <td className="py-3 px-4 text-center">⚖️</td>
                <td className="py-3 px-4 text-gray-400">View-Only Legal</td>
                <td className="py-3 px-4 text-gray-400">For legal review</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">MANAGER</td>
                <td className="py-3 px-4 text-center">📋</td>
                <td className="py-3 px-4 text-gray-400">Manager Access</td>
                <td className="py-3 px-4 text-gray-400">For talent managers</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-300 font-semibold">VIEWER</td>
                <td className="py-3 px-4 text-center">👁️</td>
                <td className="py-3 px-4 text-gray-400">Read-Only Access</td>
                <td className="py-3 px-4 text-gray-400">For auditors/viewers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <p className="text-amber-300 flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <span><strong>Important:</strong> IPI numbers are critical for automated statement matching. Double-check for accuracy!</span>
          </p>
        </div>
      </section>

      {/* Publisher Settings */}
      <section id="publisher-settings" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>🏢</span> Publisher Settings
        </h2>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">🔑</span>
            <span><strong>Critical for MLC Statements:</strong> Publisher settings tell the system which IPI numbers belong to Producer Tour, enabling correct writer-to-publisher matching.</span>
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="font-mono text-sm text-gray-300">
            <div className="mb-2 font-semibold text-white">MLC Statement Processing Flow:</div>
            <div>  ┌─────────────────────────────────────────────┐</div>
            <div>  │ Is Publisher IPI = Producer Tour?          │</div>
            <div>  ├─────────────────────────────────────────────┤</div>
            <div>  │ ✅ YES → Split equally among PT writers    │</div>
            <div>  │ ❌ NO  → Assign 100% to external publisher │</div>
            <div>  └─────────────────────────────────────────────┘</div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔧</span> Accessing Publisher Settings
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">1️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click <strong className="text-white">Settings</strong> in the sidebar</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-center w-16 text-2xl">2️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click the <strong className="text-white">Publishers</strong> tab</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-300 flex items-start gap-2">
            <span className="text-xl">🚨</span>
            <span><strong>Required Setup (First Time):</strong> You MUST configure PT publisher IPIs before processing MLC statements!</span>
          </p>
        </div>
      </section>

      {/* Statement Processing */}
      <section id="statement-processing" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>📄</span> Statement Processing
        </h2>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>🔄</span> Processing Workflow
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Step</th>
                <th className="py-3 px-4 text-left text-white">Action</th>
                <th className="py-3 px-4 text-left text-white">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center text-2xl">1️⃣</td>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">📤</span>Upload</td>
                <td className="py-3 px-4 text-gray-400">Import CSV/TSV files from PROs</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center text-2xl">2️⃣</td>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">🎯</span>Match & Assign</td>
                <td className="py-3 px-4 text-gray-400">Link songs to writers automatically or manually</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-center text-2xl">3️⃣</td>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">✅</span>Publish</td>
                <td className="py-3 px-4 text-gray-400">Make statements visible to writers</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h4 className="text-xl font-semibold text-white mb-3">📋 Supported Formats</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🎵</div>
            <div className="text-white font-semibold">MLC</div>
            <div className="text-sm text-gray-400">Mechanical Licensing Collective CSV</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🎶</div>
            <div className="text-white font-semibold">ASCAP</div>
            <div className="text-sm text-gray-400">ASCAP Royalty Statements</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4">
            <div className="text-2xl mb-2">🎼</div>
            <div className="text-white font-semibold">BMI</div>
            <div className="text-sm text-gray-400">BMI Royalty Statements</div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">💡</span>
            <span><strong>Tip:</strong> After uploading, you must assign writers to each song before publishing.</span>
          </p>
        </div>
      </section>

      {/* Payment Processing */}
      <section id="payment-processing" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>💰</span> Payment Processing
        </h2>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>💰</span> Understanding Micropenny Display
        </h3>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">🎯</span>
            <span><strong>Smart Rounding:</strong> The system automatically displays the right precision level!</span>
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Amount Range</th>
                <th className="py-3 px-4 text-left text-white">Decimals</th>
                <th className="py-3 px-4 text-left text-white">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300 font-semibold">&lt; $0.01</td>
                <td className="py-3 px-4 text-gray-400">4 decimals</td>
                <td className="py-3 px-4 text-green-400 font-mono">$0.0024</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-300 font-semibold">≥ $0.01</td>
                <td className="py-3 px-4 text-gray-400">2 decimals</td>
                <td className="py-3 px-4 text-green-400 font-mono">$15.67</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">💡</span>
            <span><strong>Why?</strong> Streaming platforms generate tiny per-stream royalties. Displaying 4 decimals prevents rounding micro-amounts to $0.00.</span>
          </p>
        </div>
      </section>

      {/* Commission Settings */}
      <section id="commission-settings" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>⚙️</span> Commission Settings
        </h2>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">🎯</span>
            <span><strong>Purpose:</strong> The global commission rate applies to ALL users unless they have a personal override.</span>
          </p>
        </div>

        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <span>💵</span> Setting the Global Commission Rate
        </h3>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">1️⃣</td>
                <td className="py-3 px-4 text-gray-300">Navigate to <strong className="text-white">Settings</strong> in the sidebar</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">2️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click the <strong className="text-white">Commission</strong> tab</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">3️⃣</td>
                <td className="py-3 px-4 text-gray-300">Enter the commission rate (e.g., <code className="bg-slate-700 px-2 py-1 rounded text-primary-400">15</code> for 15%)</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">4️⃣</td>
                <td className="py-3 px-4 text-gray-300">Enter recipient name (e.g., <code className="bg-slate-700 px-2 py-1 rounded text-primary-400">Producer Tour LLC</code>)</td>
              </tr>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-center w-16 text-2xl">5️⃣</td>
                <td className="py-3 px-4 text-gray-300">Add description (optional)</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-center w-16 text-2xl">6️⃣</td>
                <td className="py-3 px-4 text-gray-300">Click <strong className="text-white">Update Settings</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Dashboard & Analytics */}
      <section id="dashboard-analytics" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>📊</span> Dashboard & Analytics
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <span>📈</span> Revenue Timeline
            </h3>
            <p className="text-gray-400 mb-3">Visualize revenue trends over time</p>
            <ul className="text-gray-300 space-y-2">
              <li className="flex items-center gap-2"><span>📆</span> Last 6 months</li>
              <li className="flex items-center gap-2"><span>📅</span> Last 12 months</li>
              <li className="flex items-center gap-2"><span>⏳</span> All time</li>
            </ul>
          </div>

          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <span>🎵</span> Platform Breakdown
            </h3>
            <p className="text-gray-400 mb-3">DSP distribution analysis</p>
            <ul className="text-gray-300 space-y-2">
              <li className="flex items-center gap-2"><span>🟢</span> Spotify</li>
              <li className="flex items-center gap-2"><span>🔵</span> Apple Music</li>
              <li className="flex items-center gap-2"><span>🔴</span> YouTube</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Common Workflows */}
      <section id="common-workflows" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>✅</span> Common Workflows
        </h2>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-blue-300 flex items-start gap-2">
            <span className="text-xl">🔄</span>
            <span><strong>Complete Workflow:</strong> Follow these steps each month to process royalty statements.</span>
          </p>
        </div>

        <div className="space-y-4">
          <details className="bg-slate-800 rounded-lg">
            <summary className="cursor-pointer p-4 font-semibold text-white hover:bg-slate-700 rounded-lg transition-colors">
              <span className="mr-2">📌</span> Step 1: Preparation
            </summary>
            <div className="p-4 pt-0">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Ensure all writer IPI numbers are up-to-date</li>
                <li>Verify Publisher Settings are configured (for MLC statements)</li>
                <li>Check commission rates are current</li>
              </ul>
            </div>
          </details>

          <details className="bg-slate-800 rounded-lg">
            <summary className="cursor-pointer p-4 font-semibold text-white hover:bg-slate-700 rounded-lg transition-colors">
              <span className="mr-2">📤</span> Step 2: Upload
            </summary>
            <div className="p-4 pt-0">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Download statements from PROs (ASCAP, BMI, MLC)</li>
                <li>Upload each statement to Producer Tour</li>
                <li>Verify parsing was successful</li>
                <li>Review any parsing errors or warnings</li>
              </ul>
            </div>
          </details>

          <details className="bg-slate-800 rounded-lg">
            <summary className="cursor-pointer p-4 font-semibold text-white hover:bg-slate-700 rounded-lg transition-colors">
              <span className="mr-2">🎯</span> Step 3: Matching
            </summary>
            <div className="p-4 pt-0">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Click "Smart Assign Writers" for each statement</li>
                <li>Review any low-confidence matches (70-89%)</li>
                <li>Manually assign any unmatched songs</li>
                <li>Verify split percentages for multi-writer songs</li>
                <li>Double-check MLC publisher-row assignments</li>
              </ul>
            </div>
          </details>

          <details className="bg-slate-800 rounded-lg">
            <summary className="cursor-pointer p-4 font-semibold text-white hover:bg-slate-700 rounded-lg transition-colors">
              <span className="mr-2">✅</span> Step 4: Publish
            </summary>
            <div className="p-4 pt-0">
              <ul className="list-disc list-inside text-gray-300 space-y-2">
                <li>Click "Publish Statement"</li>
                <li>Confirm publication in dialog</li>
                <li>Notify writers that statements are available</li>
              </ul>
            </div>
          </details>
        </div>

        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-6">
          <p className="text-red-300 flex items-start gap-2">
            <span className="text-xl">🚨</span>
            <span><strong>Critical:</strong> Never publish duplicate statements! This will double-count revenue and create duplicate payment obligations.</span>
          </p>
        </div>
      </section>

      {/* Support */}
      <section id="support" className="mb-12">
        <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <span>📞</span> Support & Contact
        </h2>

        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="py-3 px-4 text-left text-white">Method</th>
                <th className="py-3 px-4 text-left text-white">Use For</th>
                <th className="py-3 px-4 text-left text-white">Response Time</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-700">
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">✉️</span>Email</td>
                <td className="py-3 px-4 text-gray-400">General support and questions</td>
                <td className="py-3 px-4 text-gray-400">24-48 hours</td>
              </tr>
              <tr>
                <td className="py-3 px-4 text-gray-300"><span className="mr-2">🐛</span>Bug Reports</td>
                <td className="py-3 px-4 text-gray-400">Technical issues and bugs</td>
                <td className="py-3 px-4 text-gray-400">1-3 business days</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-300 mb-2"><strong className="text-white">Email Support:</strong></p>
          <p className="text-primary-400 font-mono">support@producertour.com</p>
        </div>
      </section>

      {/* Footer */}
      <div className="text-center pt-8 border-t border-slate-700">
        <h3 className="text-2xl font-bold text-white mb-4">🎉 You're All Set!</h3>
        <p className="text-gray-300 mb-6">This guide covers everything you need to manage Producer Tour as an admin.</p>

        <div className="bg-slate-800 rounded-lg p-6 inline-block">
          <p className="text-gray-400 mb-2">
            <span className="font-semibold text-white">📚 Document Information</span>
          </p>
          <p className="text-gray-400">Version 1.0 • November 2025</p>
          <p className="text-sm text-gray-500 mt-2">Initial admin guide with Publisher Settings</p>
        </div>

        <p className="text-gray-400 mt-8">Made with ❤️ for Producer Tour Admins</p>
      </div>
    </div>
  );
}
