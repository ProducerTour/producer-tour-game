import { useAuthStore } from '../store/auth.store';
import { X, Eye } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, user, stopImpersonation } = useAuthStore();

  if (!isImpersonating) {
    return null;
  }

  const userName = user?.firstName || user?.lastName
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : user?.email || 'Unknown User';

  return (
    <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Eye className="h-5 w-5" />
          <div>
            <p className="font-semibold">
              Viewing as: {userName}
            </p>
            <p className="text-xs text-cyan-100">
              You are viewing the dashboard as this user. Admin privileges are maintained.
            </p>
          </div>
        </div>

        <button
          onClick={stopImpersonation}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
        >
          <X className="h-4 w-4" />
          Return to Admin
        </button>
      </div>
    </div>
  );
}
