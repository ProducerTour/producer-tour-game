import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { documentApi, userApi } from '../lib/api';
import { FileText, Upload, Download, Trash2, X, Loader2 } from 'lucide-react';

const CATEGORY_LABELS: Record<string, string> = {
  PRE_PROCESSED_STATEMENT: 'Pre-Processed Statement',
  PROCESSED_STATEMENT: 'Processed Statement',
  CONTRACT: 'Contract',
  AGREEMENT: 'Agreement',
  INVOICE: 'Invoice',
  TAX_DOCUMENT: 'Tax Document',
  OTHER: 'Other'
};

const VISIBILITY_LABELS: Record<string, string> = {
  ADMIN_ONLY: 'Admin Only',
  USER_SPECIFIC: 'Specific User',
  ALL_WRITERS: 'All Writers'
};

export default function DocumentsTab() {
  const queryClient = useQueryClient();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterVisibility, setFilterVisibility] = useState<string>('');

  const { data: documentsData, isLoading } = useQuery({
    queryKey: ['admin-documents', filterCategory, filterVisibility],
    queryFn: async () => {
      const params: any = {};
      if (filterCategory) params.category = filterCategory;
      if (filterVisibility) params.visibility = filterVisibility;
      const response = await documentApi.list(params);
      return response.data;
    }
  });

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-for-documents'],
    queryFn: async () => {
      const response = await userApi.list();
      return response.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
      toast.success('Document deleted');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete document');
    },
  });

  const handleDownload = async (id: string, filename: string) => {
    try {
      const response = await documentApi.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-light text-theme-foreground flex items-center gap-3">
            <div className="w-10 h-10 bg-theme-primary-10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-theme-primary" />
            </div>
            Document Management
          </h3>
          <p className="text-sm text-theme-foreground-muted mt-2">
            Upload and manage documents for statements, contracts, and agreements
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover transition-colors flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
            Category
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-theme-input border border-theme-border-strong text-white focus:outline-none focus:border-theme-input-focus transition-colors"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
            Visibility
          </label>
          <select
            value={filterVisibility}
            onChange={(e) => setFilterVisibility(e.target.value)}
            className="px-3 py-2 bg-theme-input border border-theme-border-strong text-white focus:outline-none focus:border-theme-input-focus transition-colors"
          >
            <option value="">All Visibility</option>
            {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-theme-foreground-muted">
          <div className="w-6 h-6 border-2 border-theme-primary-20 border-t-theme-primary rounded-full animate-spin" />
          Loading documents...
        </div>
      ) : documentsData?.documents?.length > 0 ? (
        <div className="relative overflow-hidden bg-theme-card border border-theme-border">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />
          <table className="w-full">
            <thead className="bg-white/[0.04]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Document
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Visibility
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Uploaded
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium text-theme-foreground-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {documentsData.documents.map((doc: any) => (
                <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-theme-foreground">{doc.originalName}</div>
                      {doc.description && (
                        <div className="text-xs text-theme-foreground-muted mt-1">{doc.description}</div>
                      )}
                      {doc.relatedUser && (
                        <div className="text-xs text-theme-primary mt-1">
                          User: {doc.relatedUser.firstName} {doc.relatedUser.lastName} ({doc.relatedUser.email})
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-theme-primary-10 text-theme-primary border border-theme-border-hover">
                      {CATEGORY_LABELS[doc.category] || doc.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium ${
                      doc.visibility === 'ADMIN_ONLY' ? 'bg-red-500/10 text-red-400 border border-red-500/30' :
                      doc.visibility === 'USER_SPECIFIC' ? 'bg-theme-primary-10 text-theme-primary border border-theme-border-hover' :
                      'bg-white/5 text-theme-foreground-secondary border border-theme-border-strong'
                    }`}>
                      {VISIBILITY_LABELS[doc.visibility] || doc.visibility}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-theme-foreground-muted">
                    {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-theme-foreground-secondary">
                      {formatDate(doc.createdAt)}
                      <div className="text-xs text-theme-foreground-muted">
                        by {doc.uploadedBy.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex gap-3 justify-end">
                      <button
                        onClick={() => handleDownload(doc.id, doc.originalName)}
                        className="text-theme-primary hover:text-white transition-colors flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${doc.originalName}?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-theme-foreground-muted py-12">
          No documents found. Upload your first document to get started.
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          users={usersData?.users || []}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-documents'] });
            setShowUploadModal(false);
          }}
        />
      )}
    </div>
  );
}

function UploadDocumentModal({ users, onClose, onSuccess }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');
  const [visibility, setVisibility] = useState('ADMIN_ONLY');
  const [description, setDescription] = useState('');
  const [relatedUserId, setRelatedUserId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    if (!category) {
      setError('Please select a category');
      return;
    }

    setUploading(true);
    setError('');

    try {
      await documentApi.upload(file, {
        category,
        description,
        visibility,
        relatedUserId: relatedUserId || undefined
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-theme-card border border-theme-border-strong p-6 w-full max-w-lg">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-theme-primary via-theme-primary-50 to-transparent" />

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-light text-theme-foreground flex items-center gap-2">
            <div className="w-8 h-8 bg-theme-primary-10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-theme-primary" />
            </div>
            Upload Document
          </h3>
          <button onClick={onClose} className="p-2 text-theme-foreground-muted hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
              File <span className="text-red-400">*</span>
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-theme-foreground-secondary
                file:mr-4 file:py-2 file:px-4
                file:border-0
                file:text-sm file:font-medium
                file:bg-theme-primary file:text-black
                hover:file:bg-theme-primary-hover
                file:cursor-pointer cursor-pointer"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.gif"
            />
            <p className="text-xs text-theme-foreground-muted mt-1">
              Accepted: PDF, DOC, DOCX, XLS, XLSX, CSV, TXT, JPG, PNG, GIF (Max 10MB)
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-white focus:outline-none focus:border-theme-input-focus transition-colors"
            >
              <option value="">Select category...</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
              Visibility <span className="text-red-400">*</span>
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-white focus:outline-none focus:border-theme-input-focus transition-colors"
            >
              {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {visibility === 'USER_SPECIFIC' && (
            <div>
              <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
                Related User <span className="text-red-400">*</span>
              </label>
              <select
                value={relatedUserId}
                onChange={(e) => setRelatedUserId(e.target.value)}
                className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-white focus:outline-none focus:border-theme-input-focus transition-colors"
              >
                <option value="">Select user...</option>
                {users.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName || user.lastName
                      ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                      : user.email}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-theme-foreground-muted uppercase tracking-wider mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-theme-input border border-theme-border-strong text-white placeholder-theme-foreground-muted focus:outline-none focus:border-theme-input-focus transition-colors"
              placeholder="Add a description for this document..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2.5 bg-theme-primary text-theme-primary-foreground font-medium hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload Document
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 text-theme-foreground-secondary font-medium hover:bg-white/10 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
