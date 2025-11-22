import { useState } from 'react';
import axios from 'axios';
import { Upload, X, FileText } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export interface UploadedDocument {
  id?: string;
  file?: File;
  filename: string;
  originalName: string;
  fileSize: number;
  category: string;
  description?: string;
  uploading?: boolean;
  error?: string;
}

interface DocumentUploadProps {
  documents: UploadedDocument[];
  onChange: (documents: UploadedDocument[]) => void;
  placementId?: string;
  disabled?: boolean;
}

const DOCUMENT_CATEGORIES = [
  { value: 'SPLIT_SHEET', label: 'Split Sheet' },
  { value: 'PRODUCER_AGREEMENT', label: 'Producer Agreement' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'OTHER', label: 'Other' },
];

export function DocumentUpload({ documents, onChange, placementId, disabled = false }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const newDocuments: UploadedDocument[] = Array.from(files).map(file => ({
      file,
      filename: file.name,
      originalName: file.name,
      fileSize: file.size,
      category: 'SPLIT_SHEET',
      uploading: false,
    }));

    onChange([...documents, ...newDocuments]);
  };

  const removeDocument = (index: number) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: keyof UploadedDocument, value: any) => {
    const updated = [...documents];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const uploadDocument = async (index: number) => {
    const doc = documents[index];
    if (!doc.file || !placementId) return;

    try {
      updateDocument(index, 'uploading', true);
      updateDocument(index, 'error', undefined);

      const formData = new FormData();
      formData.append('file', doc.file);
      formData.append('category', doc.category);
      formData.append('placementId', placementId);
      if (doc.description) {
        formData.append('description', doc.description);
      }

      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/api/documents/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      // Update with server response
      updateDocument(index, 'id', response.data.document.id);
      updateDocument(index, 'uploading', false);
    } catch (error: any) {
      console.error('Upload error:', error);
      updateDocument(index, 'uploading', false);
      updateDocument(index, 'error', error.response?.data?.error || 'Upload failed');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Supporting Documents</h3>
        <p className="text-sm text-gray-400 mb-4">
          Upload split sheets, producer agreements, or other relevant documents (PDF, DOC, DOCX, images)
        </p>
      </div>

      {/* Drag and drop area */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
          dragActive
            ? 'border-white/30 bg-white/[0.08]'
            : 'border-white/[0.08] bg-white/[0.02]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-white/20 hover:bg-white/[0.04]'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-upload')?.click()}
      >
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="space-y-3">
          <div className="w-14 h-14 mx-auto rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
            <Upload className="w-7 h-7 text-gray-400" />
          </div>
          <div className="text-white font-medium">
            {dragActive ? 'Drop files here' : 'Drag and drop files here'}
          </div>
          <div className="text-sm text-gray-400">or click to browse</div>
          <div className="text-xs text-gray-500">PDF, DOC, DOCX, Images (Max 10MB per file)</div>
        </div>
      </div>

      {/* Uploaded documents list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.08] flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/[0.08] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">{doc.originalName}</div>
                    <div className="text-sm text-gray-400">
                      {formatFileSize(doc.fileSize)}
                      {doc.uploading && <span className="text-yellow-400"> Uploading...</span>}
                      {doc.id && <span className="text-emerald-400"> Uploaded</span>}
                      {doc.error && <span className="text-red-400"> {doc.error}</span>}
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Category</label>
                    <select
                      value={doc.category}
                      onChange={(e) => updateDocument(index, 'category', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white focus:ring-2 focus:ring-white/20 transition-all"
                      disabled={doc.uploading || doc.id !== undefined}
                    >
                      {DOCUMENT_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={doc.description || ''}
                      onChange={(e) => updateDocument(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-white/20 transition-all"
                      placeholder="Brief description"
                      disabled={doc.uploading || doc.id !== undefined}
                    />
                  </div>
                </div>

                {placementId && !doc.id && !doc.uploading && (
                  <button
                    type="button"
                    onClick={() => uploadDocument(index)}
                    className="mt-3 px-4 py-2 text-sm bg-white text-surface hover:bg-white/90 rounded-lg font-medium transition-colors"
                  >
                    Upload Now
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeDocument(index)}
                className="ml-4 p-2 text-gray-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors"
                disabled={doc.uploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
