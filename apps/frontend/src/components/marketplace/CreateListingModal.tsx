import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Image, Music, File, Loader2 } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { marketplaceApi } from '../../lib/api';
import toast from 'react-hot-toast';

interface CreateListingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES = [
  { value: 'BEATS', label: 'Beats' },
  { value: 'SAMPLES', label: 'Sample Packs' },
  { value: 'PRESETS', label: 'Presets' },
  { value: 'STEMS', label: 'Stems' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'TEMPLATES', label: 'Templates' },
  { value: 'COURSES', label: 'Courses' },
  { value: 'OTHER', label: 'Other' },
];

export function CreateListingModal({ isOpen, onClose }: CreateListingModalProps) {
  const queryClient = useQueryClient();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('BEATS');
  const [price, setPrice] = useState('');
  const [tags, setTags] = useState('');

  // File state
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [audioPreview, setAudioPreview] = useState<File | null>(null);
  const [audioPreviewName, setAudioPreviewName] = useState<string | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [productFileName, setProductFileName] = useState<string | null>(null);

  // Cover image dropzone
  const {
    getRootProps: getCoverRootProps,
    getInputProps: getCoverInputProps,
    isDragActive: isCoverDragActive,
  } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setCoverImage(file);
        setCoverImagePreview(URL.createObjectURL(file));
      }
    },
  });

  // Audio preview dropzone
  const {
    getRootProps: getAudioRootProps,
    getInputProps: getAudioInputProps,
    isDragActive: isAudioDragActive,
  } = useDropzone({
    accept: { 'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'] },
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setAudioPreview(file);
        setAudioPreviewName(file.name);
      }
    },
  });

  // Product file dropzone
  const {
    getRootProps: getProductRootProps,
    getInputProps: getProductInputProps,
    isDragActive: isProductDragActive,
  } = useDropzone({
    maxFiles: 1,
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setProductFile(file);
        setProductFileName(file.name);
      }
    },
  });

  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: async () => {
      // Create FormData for file uploads
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('price', price);
      if (tags) formData.append('tags', tags);
      if (coverImage) formData.append('coverImage', coverImage);
      if (audioPreview) formData.append('audioPreview', audioPreview);
      if (productFile) formData.append('productFile', productFile);

      const response = await marketplaceApi.createListing(formData);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Listing created successfully!');
      queryClient.invalidateQueries({ queryKey: ['marketplace-listings'] });
      handleClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create listing');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      toast.error('Valid price is required');
      return;
    }
    if (!productFile) {
      toast.error('Product file is required');
      return;
    }

    createListingMutation.mutate();
  };

  const handleClose = () => {
    // Reset form
    setTitle('');
    setDescription('');
    setCategory('BEATS');
    setPrice('');
    setTags('');
    setCoverImage(null);
    setCoverImagePreview(null);
    setAudioPreview(null);
    setAudioPreviewName(null);
    setProductFile(null);
    setProductFileName(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-2xl font-bold text-white">
              Create Marketplace Listing
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </Dialog.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Dark Trap Beat - 'Midnight'"
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product, what's included, usage rights, etc."
                rows={4}
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors resize-none"
                maxLength={1000}
              />
              <p className="text-xs text-slate-400 mt-1">
                {description.length}/1000 characters
              </p>
            </div>

            {/* Category and Price Row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="29.99"
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Tags (optional)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="trap, dark, 808, melody (comma-separated)"
                className="w-full px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Cover Image (optional)
              </label>
              <div
                {...getCoverRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isCoverDragActive
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 hover:border-purple-500/50'
                }`}
              >
                <input {...getCoverInputProps()} />
                {coverImagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverImage(null);
                        setCoverImagePreview(null);
                      }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Image className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-400">
                      Drag & drop or click to upload cover image
                    </p>
                    <p className="text-xs text-slate-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Preview Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Audio Preview (optional)
              </label>
              <div
                {...getAudioRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isAudioDragActive
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 hover:border-purple-500/50'
                }`}
              >
                <input {...getAudioInputProps()} />
                {audioPreviewName ? (
                  <div className="space-y-3">
                    <Music className="w-12 h-12 text-green-400 mx-auto" />
                    <p className="text-sm text-white">{audioPreviewName}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioPreview(null);
                        setAudioPreviewName(null);
                      }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove Audio
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Music className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-400">
                      Drag & drop or click to upload audio preview
                    </p>
                    <p className="text-xs text-slate-500">MP3, WAV, OGG up to 10MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product File Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Product File *
              </label>
              <div
                {...getProductRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isProductDragActive
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-white/20 hover:border-purple-500/50'
                }`}
              >
                <input {...getProductInputProps()} />
                {productFileName ? (
                  <div className="space-y-3">
                    <File className="w-12 h-12 text-blue-400 mx-auto" />
                    <p className="text-sm text-white">{productFileName}</p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProductFile(null);
                        setProductFileName(null);
                      }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Remove File
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="w-12 h-12 text-slate-400 mx-auto" />
                    <p className="text-sm text-slate-400">
                      Drag & drop or click to upload product file
                    </p>
                    <p className="text-xs text-slate-500">
                      ZIP, WAV, MP3, or any file format
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                disabled={createListingMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createListingMutation.isPending}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createListingMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Listing'
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
