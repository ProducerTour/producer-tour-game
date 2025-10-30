import { useAuthStore } from '../store/auth.store';

export default function AdminDashboard() {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">
                Welcome back, {user?.firstName || user?.email}
              </p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white border border-slate-600 rounded-lg hover:border-slate-500"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <DashboardCard
            title="Upload Statements"
            description="Process BMI, ASCAP, SESAC statements"
            icon="📊"
          />
          <DashboardCard
            title="Manage Writers"
            description="Add and manage writer accounts"
            icon="👥"
          />
          <DashboardCard
            title="Reports"
            description="View analytics and insights"
            icon="📈"
          />
        </div>

        <div className="mt-8 bg-slate-800 rounded-lg shadow-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
          <p className="text-gray-400">
            Statement uploads and system activity will appear here.
          </p>
        </div>
      </main>
    </div>
  );
}

function DashboardCard({ title, description, icon }: any) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-primary-500/50 transition-colors cursor-pointer">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  );
}
