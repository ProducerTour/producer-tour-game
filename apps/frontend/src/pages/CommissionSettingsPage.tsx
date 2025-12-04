import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { commissionApi } from '@/lib/api';
import { Percent, Save, Loader2 } from 'lucide-react';

type Settings = {
  id?: string;
  commissionRate: number;
  recipientName: string;
  description?: string | null;
  effectiveDate: string | Date;
  isActive?: boolean;
};

export default function CommissionSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ commissionRate: string; recipientName: string; description: string }>({
    commissionRate: '',
    recipientName: '',
    description: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error' | '';
    text: string } >({ type: '', text: '' });

  const { data: settingsData, isLoading: loadingSettings } = useQuery({
    queryKey: ['commission-settings'],
    queryFn: async () => {
      const res = await commissionApi.getSettings();
      return res.data as Settings;
    },
  });

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['commission-settings-history'],
    queryFn: async () => {
      const res = await commissionApi.getHistory();
      return res.data?.history as Settings[];
    },
  });

  useEffect(() => {
    if (settingsData) {
      setForm({
        commissionRate: String(settingsData.commissionRate ?? 0),
        recipientName: settingsData.recipientName ?? 'Producer Tour',
        description: settingsData.description ?? '',
      });
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (payload: { commissionRate: number; recipientName: string; description?: string }) =>
      commissionApi.updateSettings(payload),
    onSuccess: () => {
      toast.success('Commission settings updated!');
      setMessage({ type: 'success', text: 'Commission settings updated. Applies to future statements only.' });
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      queryClient.invalidateQueries({ queryKey: ['commission-settings-history'] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to update settings');
      setMessage({ type: 'error', text: err?.response?.data?.error || 'Failed to update settings' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rate = parseFloat(form.commissionRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      setMessage({ type: 'error', text: 'Commission rate must be between 0 and 100' });
      return;
    }
    if (!form.recipientName.trim()) {
      setMessage({ type: 'error', text: 'Recipient name is required' });
      return;
    }
    updateMutation.mutate({
      commissionRate: rate,
      recipientName: form.recipientName.trim(),
      description: form.description.trim() || undefined,
    });
  };

  const formatDate = (d: string | Date) => new Date(d).toLocaleString();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light text-theme-foreground flex items-center gap-3">
          <div className="w-10 h-10 bg-theme-primary/10 flex items-center justify-center">
            <Percent className="w-5 h-5 text-theme-primary" />
          </div>
          Commission Settings
        </h1>
        <p className="text-theme-foreground-muted mt-2">Changes apply only to statements published after the update.</p>
      </div>

      {message.text && (
        <div className={`p-4 border ${
          message.type === 'success' ? 'bg-theme-primary/5 border-theme-primary/20 text-theme-primary' : 'bg-theme-error-bg border-theme-error/30 text-theme-error'
        }`}>
          {message.text}
        </div>
      )}

      {/* Current Settings */}
      <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary/50 to-transparent" />
        <h2 className="text-lg font-light text-theme-foreground mb-4">Current Settings</h2>
        {loadingSettings ? (
          <div className="flex items-center gap-3 text-theme-foreground-muted">
            <div className="w-6 h-6 border-2 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin" />
            Loading current settings...
          </div>
        ) : settingsData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-theme-foreground-muted uppercase tracking-wider mb-1">Commission Rate</div>
              <div className="text-2xl text-theme-primary font-light">{Number(settingsData.commissionRate).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-xs text-theme-foreground-muted uppercase tracking-wider mb-1">Recipient</div>
              <div className="text-theme-foreground font-medium">{settingsData.recipientName}</div>
            </div>
            <div>
              <div className="text-xs text-theme-foreground-muted uppercase tracking-wider mb-1">Effective Date</div>
              <div className="text-theme-foreground font-medium">{formatDate(settingsData.effectiveDate)}</div>
            </div>
          </div>
        ) : (
          <div className="text-theme-foreground-muted">No settings found. Using defaults (0%).</div>
        )}
      </div>

      {/* Update Form */}
      <div className="relative overflow-hidden bg-theme-card border border-theme-border p-6 group hover:border-theme-border-hover transition-all duration-300">
        <div className="absolute top-0 left-0 w-0 h-[2px] bg-theme-primary group-hover:w-full transition-all duration-500" />
        <h2 className="text-lg font-light text-theme-foreground mb-4">Update Settings</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground focus:outline-none focus:border-theme-input-focus transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Recipient Name</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
              placeholder="e.g., Producer Tour"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-theme-foreground placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
              placeholder="Reason for change"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2.5 bg-theme-primary hover:bg-theme-primary-hover text-theme-primary-foreground font-medium disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>

        <p className="text-xs text-theme-foreground-muted mt-3">Note: Changes only affect statements published after this update. Historical statement items remain unchanged.</p>
      </div>

      {/* History Table */}
      <div className="relative overflow-hidden bg-theme-card border border-theme-border">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary/50 to-transparent" />
        <div className="p-6 border-b border-theme-border">
          <h2 className="text-lg font-light text-theme-foreground">Rate Change History</h2>
        </div>
        {loadingHistory ? (
          <div className="p-6 flex items-center gap-3 text-theme-foreground-muted">
            <div className="w-6 h-6 border-2 border-theme-primary/20 border-t-theme-primary rounded-full animate-spin" />
            Loading history...
          </div>
        ) : historyData && historyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-theme-border-strong">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Effective</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Rate</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Description</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border">
                {historyData.map((row) => (
                  <tr key={row.id} className="hover:bg-theme-card-hover transition-colors">
                    <td className="px-6 py-3 text-theme-foreground">{formatDate(row.effectiveDate)}</td>
                    <td className="px-6 py-3 text-theme-primary">{Number(row.commissionRate).toFixed(2)}%</td>
                    <td className="px-6 py-3 text-theme-foreground-secondary">{row.recipientName}</td>
                    <td className="px-6 py-3 text-theme-foreground-secondary">{row.description || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 text-xs ${row.isActive ? 'bg-theme-primary/10 text-theme-primary border border-theme-primary/30' : 'bg-theme-border-strong text-theme-foreground-muted border border-theme-border'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-theme-foreground-muted">No history available.</div>
        )}
      </div>
    </div>
  );
}

