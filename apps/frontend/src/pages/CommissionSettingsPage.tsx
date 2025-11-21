import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { commissionApi } from '@/lib/api';

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
      setMessage({ type: 'success', text: 'Commission settings updated. Applies to future statements only.' });
      queryClient.invalidateQueries({ queryKey: ['commission-settings'] });
      queryClient.invalidateQueries({ queryKey: ['commission-settings-history'] });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    },
    onError: (err: any) => {
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
        <h1 className="text-2xl font-bold text-white">Commission Settings</h1>
        <p className="text-text-muted mt-1">Changes apply only to statements published after the update.</p>
      </div>

      {message.text && (
        <div className={`p-3 rounded border ${
          message.type === 'success' ? 'bg-green-500/10 border-green-600 text-green-300' : 'bg-red-500/10 border-red-600 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      {/* Current Settings */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h2 className="text-white font-semibold mb-4">Current Settings</h2>
        {loadingSettings ? (
          <div className="text-text-muted">Loading current settings...</div>
        ) : settingsData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-text-muted text-sm">Commission Rate</div>
              <div className="text-2xl text-blue-400 font-bold">{Number(settingsData.commissionRate).toFixed(2)}%</div>
            </div>
            <div>
              <div className="text-text-muted text-sm">Recipient</div>
              <div className="text-white font-medium">{settingsData.recipientName}</div>
            </div>
            <div>
              <div className="text-text-muted text-sm">Effective Date</div>
              <div className="text-white font-medium">{formatDate(settingsData.effectiveDate)}</div>
            </div>
          </div>
        ) : (
          <div className="text-text-muted">No settings found. Using defaults (0%).</div>
        )}
      </div>

      {/* Update Form */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h2 className="text-white font-semibold mb-4">Update Settings</h2>
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-text-muted text-sm mb-2">Commission Rate (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.commissionRate}
              onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
            />
          </div>
          <div>
            <label className="block text-text-muted text-sm mb-2">Recipient Name</label>
            <input
              type="text"
              value={form.recipientName}
              onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
              placeholder="e.g., Producer Tour"
            />
          </div>
          <div>
            <label className="block text-text-muted text-sm mb-2">Description (optional)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-brand-blue/50"
              placeholder="Reason for change"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>

        <p className="text-xs text-text-muted mt-3">Note: Changes only affect statements published after this update. Historical statement items remain unchanged.</p>
      </div>

      {/* History Table */}
      <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6">
        <h2 className="text-white font-semibold mb-4">Rate Change History</h2>
        {loadingHistory ? (
          <div className="text-text-muted">Loading history...</div>
        ) : historyData && historyData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] text-text-muted">
                  <th className="text-left py-2">Effective</th>
                  <th className="text-left py-2">Rate</th>
                  <th className="text-left py-2">Recipient</th>
                  <th className="text-left py-2">Description</th>
                  <th className="text-left py-2">Active</th>
                </tr>
              </thead>
              <tbody>
                {historyData.map((row) => (
                  <tr key={row.id} className="border-b border-white/[0.04]">
                    <td className="py-2 text-white">{formatDate(row.effectiveDate)}</td>
                    <td className="py-2 text-white">{Number(row.commissionRate).toFixed(2)}%</td>
                    <td className="py-2 text-text-secondary">{row.recipientName}</td>
                    <td className="py-2 text-text-secondary">{row.description || '-'}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded text-xs ${row.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/[0.08] text-text-secondary'}`}>
                        {row.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-text-muted">No history available.</div>
        )}
      </div>
    </div>
  );
}

