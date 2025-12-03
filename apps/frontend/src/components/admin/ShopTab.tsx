/**
 * Shop Tab - Admin product and order management
 * Cassette theme styling with yellow (#f0e226) accents
 */

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Plus,
  Edit,
  Trash2,
  Package,
  ShoppingCart,
  RefreshCcw,
  Tag,
  Search,
  Loader2,
  Repeat,
  Download,
  Zap,
  Receipt,
} from 'lucide-react';

// shadcn components
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

import { shopApi } from '../../lib/api';
import toast from 'react-hot-toast';
import OrderReceipt from '../OrderReceipt';

// Product types for the form
const PRODUCT_TYPES = [
  { value: 'SIMPLE', label: 'Simple Product', icon: Package },
  { value: 'VARIABLE', label: 'Variable Product', icon: Package },
  { value: 'DIGITAL', label: 'Digital Product', icon: Zap },
  { value: 'DOWNLOADABLE', label: 'Downloadable Product', icon: Download },
  { value: 'PHYSICAL', label: 'Physical Product', icon: Package },
  { value: 'SUBSCRIPTION', label: 'Subscription Product', icon: Repeat },
];

const PRODUCT_STATUSES = [
  { value: 'DRAFT', label: 'Draft', variant: 'secondary' as const, color: 'bg-white/10 text-white/60' },
  { value: 'ACTIVE', label: 'Active', variant: 'default' as const, color: 'bg-[#f0e226]/20 text-[#f0e226]' },
  { value: 'ARCHIVED', label: 'Archived', variant: 'outline' as const, color: 'bg-white/5 text-white/40' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock', variant: 'destructive' as const, color: 'bg-red-500/20 text-red-400' },
];

const SUBSCRIPTION_INTERVALS = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'YEARLY', label: 'Yearly' },
];

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', variant: 'secondary' as const, color: 'bg-white/10 text-white/60' },
  { value: 'PROCESSING', label: 'Processing', variant: 'default' as const, color: 'bg-[#f0e226]/10 text-[#f0e226]/80' },
  { value: 'COMPLETED', label: 'Completed', variant: 'default' as const, color: 'bg-[#f0e226]/20 text-[#f0e226]' },
  { value: 'CANCELLED', label: 'Cancelled', variant: 'destructive' as const, color: 'bg-red-500/20 text-red-400' },
  { value: 'REFUNDED', label: 'Refunded', variant: 'outline' as const, color: 'bg-white/5 text-white/40' },
];

// Format currency
const formatCurrency = (value: number) =>
  `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Product Form Modal
function ProductFormModal({
  product,
  open,
  onOpenChange,
  onSave,
  isLoading,
}: {
  product?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
  isLoading?: boolean;
}) {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    shortDescription: product?.shortDescription || '',
    type: product?.type || 'SIMPLE',
    status: product?.status || 'DRAFT',
    price: product?.price ? Number(product.price) : 0,
    salePrice: product?.salePrice ? Number(product.salePrice) : undefined,
    sku: product?.sku || '',
    stockQuantity: product?.stockQuantity || undefined,
    manageStock: product?.manageStock || false,
    subscriptionInterval: product?.subscriptionInterval || 'MONTHLY',
    subscriptionIntervalCount: product?.subscriptionIntervalCount || 1,
    trialDays: product?.trialDays || 0,
    featuredImageUrl: product?.featuredImageUrl || '',
    isFeatured: product?.isFeatured || false,
    isVirtual: product?.isVirtual || true,
    downloadLimit: product?.downloadLimit || undefined,
    downloadExpiry: product?.downloadExpiry || undefined,
    toolId: product?.toolId || '',
  });

  // Image upload state
  const [imagePreview, setImagePreview] = useState<string | null>(product?.featuredImageUrl || null);

  // Reset form data when product changes (fixes edit form not populating)
  useEffect(() => {
    setFormData({
      name: product?.name || '',
      description: product?.description || '',
      shortDescription: product?.shortDescription || '',
      type: product?.type || 'SIMPLE',
      status: product?.status || 'DRAFT',
      price: product?.price ? Number(product.price) : 0,
      salePrice: product?.salePrice ? Number(product.salePrice) : undefined,
      sku: product?.sku || '',
      stockQuantity: product?.stockQuantity || undefined,
      manageStock: product?.manageStock || false,
      subscriptionInterval: product?.subscriptionInterval || 'MONTHLY',
      subscriptionIntervalCount: product?.subscriptionIntervalCount || 1,
      trialDays: product?.trialDays || 0,
      featuredImageUrl: product?.featuredImageUrl || '',
      isFeatured: product?.isFeatured || false,
      isVirtual: product?.isVirtual || true,
      downloadLimit: product?.downloadLimit || undefined,
      downloadExpiry: product?.downloadExpiry || undefined,
      toolId: product?.toolId || '',
    });
    setImagePreview(product?.featuredImageUrl || null);
  }, [product]);

  // Handle image file selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      setFormData(prev => ({ ...prev, featuredImageUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#19181a] border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl font-normal text-white">
            {product ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs text-white/40 uppercase tracking-[0.15em]">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
              className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
            />
          </div>

          {/* Type and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-white/40 uppercase tracking-[0.15em]">Product Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value: string) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-black border-white/10 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#19181a] border-white/10">
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-white/40 uppercase tracking-[0.15em]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-black border-white/10 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="bg-[#19181a] border-white/10">
                  {PRODUCT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Price Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-xs text-white/40 uppercase tracking-[0.15em]">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min={0}
                step={0.01}
                required
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice" className="text-xs text-white/40 uppercase tracking-[0.15em]">Sale Price ($)</Label>
              <Input
                id="salePrice"
                type="number"
                value={formData.salePrice || ''}
                onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || undefined })}
                placeholder="Optional"
                min={0}
                step={0.01}
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
              />
            </div>
          </div>

          {/* Subscription Fields */}
          {formData.type === 'SUBSCRIPTION' && (
            <div className="bg-black/50 border border-white/10 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-white/40 uppercase tracking-[0.15em]">Billing Interval</Label>
                  <Select
                    value={formData.subscriptionInterval}
                    onValueChange={(value: string) => setFormData({ ...formData, subscriptionInterval: value })}
                  >
                    <SelectTrigger className="bg-black border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#19181a] border-white/10">
                      {SUBSCRIPTION_INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value} className="text-white hover:bg-[#f0e226]/10">
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trialDays" className="text-xs text-white/40 uppercase tracking-[0.15em]">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min={0}
                    className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SKU and Tool ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku" className="text-xs text-white/40 uppercase tracking-[0.15em]">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Optional"
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toolId" className="text-xs text-white/40 uppercase tracking-[0.15em]">Tool ID</Label>
              <Input
                id="toolId"
                value={formData.toolId}
                onChange={(e) => setFormData({ ...formData, toolId: e.target.value })}
                placeholder="e.g., type-beat-video-maker"
                className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
              />
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="shortDescription" className="text-xs text-white/40 uppercase tracking-[0.15em]">Short Description</Label>
            <Textarea
              id="shortDescription"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief product description"
              rows={2}
              className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50 resize-none"
            />
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs text-white/40 uppercase tracking-[0.15em]">Full Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed product description (supports markdown)"
              rows={4}
              className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50 resize-none"
            />
          </div>

          {/* Featured Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="featuredImage" className="text-xs text-white/40 uppercase tracking-[0.15em]">Featured Image</Label>
            {imagePreview && (
              <div className="relative w-32 h-32 group">
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="w-full h-full object-cover border border-white/10"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImagePreview(null);
                    setFormData(prev => ({ ...prev, featuredImageUrl: '' }));
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-sm"
                >
                  ×
                </button>
              </div>
            )}
            <Input
              id="featuredImage"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleImageChange}
              className="bg-black border-white/10 text-white file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-[#f0e226] file:text-black hover:file:bg-white"
            />
            <p className="text-xs text-white/30">JPEG, PNG, GIF, or WebP. Max 2MB.</p>
          </div>

          {/* Download Fields */}
          {['DIGITAL', 'DOWNLOADABLE'].includes(formData.type) && (
            <div className="bg-black/50 border border-white/10 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="downloadLimit" className="text-xs text-white/40 uppercase tracking-[0.15em]">Download Limit</Label>
                  <Input
                    id="downloadLimit"
                    type="number"
                    value={formData.downloadLimit || ''}
                    onChange={(e) => setFormData({ ...formData, downloadLimit: parseInt(e.target.value) || undefined })}
                    placeholder="Unlimited"
                    min={0}
                    className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downloadExpiry" className="text-xs text-white/40 uppercase tracking-[0.15em]">Expiry (days)</Label>
                  <Input
                    id="downloadExpiry"
                    type="number"
                    value={formData.downloadExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, downloadExpiry: parseInt(e.target.value) || undefined })}
                    placeholder="Never"
                    min={0}
                    className="bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checkboxes */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, isFeatured: checked })}
                className="border-white/20 data-[state=checked]:bg-[#f0e226] data-[state=checked]:border-[#f0e226]"
              />
              <Label htmlFor="isFeatured" className="cursor-pointer text-white/60">Featured Product</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVirtual"
                checked={formData.isVirtual}
                onCheckedChange={(checked: boolean) => setFormData({ ...formData, isVirtual: checked })}
                className="border-white/20 data-[state=checked]:bg-[#f0e226] data-[state=checked]:border-[#f0e226]"
              />
              <Label htmlFor="isVirtual" className="cursor-pointer text-white/60">Virtual (no shipping)</Label>
            </div>
          </div>

          <DialogFooter className="border-t border-white/5 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="bg-black border-white/10 text-white hover:bg-white/5 hover:border-[#f0e226]/30">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-[#f0e226] text-black hover:bg-white">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {product ? 'Update Product' : 'Create Product'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Main Shop Tab Component
export default function ShopTab() {
  const queryClient = useQueryClient();
  const [productModal, setProductModal] = useState<{ open: boolean; product?: any }>({ open: false });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300); // Debounce search to prevent excessive API calls
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; order: any | null }>({ open: false, order: null });

  // Fetch shop stats
  const { data: stats } = useQuery({
    queryKey: ['shop-stats'],
    queryFn: async () => {
      const response = await shopApi.getShopStats();
      return response.data;
    },
  });

  // Fetch products (using debounced search to prevent API spam while typing)
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', debouncedSearch, typeFilter, statusFilter],
    queryFn: async () => {
      const response = await shopApi.getProducts({
        search: debouncedSearch || undefined,
        type: typeFilter && typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
      });
      return response.data;
    },
  });

  // Fetch orders
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['shop-orders'],
    queryFn: async () => {
      const response = await shopApi.getOrders();
      return response.data;
    },
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data: any) => shopApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-stats'] });
      setProductModal({ open: false });
      toast.success('Product created successfully');
    },
    onError: () => {
      toast.error('Failed to create product');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => shopApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      setProductModal({ open: false });
      toast.success('Product updated successfully');
    },
    onError: () => {
      toast.error('Failed to update product');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => shopApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-stats'] });
      toast.success('Product deleted');
    },
    onError: () => {
      toast.error('Failed to delete product');
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => shopApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-orders'] });
      toast.success('Order status updated');
    },
  });

  const handleSaveProduct = (data: any) => {
    if (productModal.product) {
      updateProductMutation.mutate({ id: productModal.product.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const products = productsData?.products || [];
  const orders = ordersData?.orders || [];

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Total Products</p>
              <p className="text-2xl font-light text-white">{stats?.totalProducts || 0}</p>
              <p className="text-xs text-white/30 mt-1">All time</p>
            </div>
            <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center group-hover:bg-[#f0e226]/20 transition-colors">
              <Package className="h-5 w-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Active Products</p>
              <p className="text-2xl font-light text-white">{stats?.activeProducts || 0}</p>
              <p className="text-xs text-white/30 mt-1">Available for purchase</p>
            </div>
            <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center group-hover:bg-[#f0e226]/20 transition-colors">
              <Zap className="h-5 w-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute top-0 left-0 w-0 h-[2px] bg-[#f0e226] group-hover:w-full transition-all duration-500" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Total Orders</p>
              <p className="text-2xl font-light text-white">{stats?.totalOrders || 0}</p>
              <p className="text-xs text-white/30 mt-1">All time orders</p>
            </div>
            <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center group-hover:bg-[#f0e226]/20 transition-colors">
              <ShoppingCart className="h-5 w-5 text-[#f0e226]" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden bg-[#19181a] border border-white/5 border-t-2 border-t-[#f0e226] p-6 group hover:border-[#f0e226]/30 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-[#f0e226]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-[0.2em] mb-2">Total Revenue</p>
              <p className="text-2xl font-light text-[#f0e226]">{formatCurrency(stats?.totalRevenue || 0)}</p>
              <p className="text-xs text-white/30 mt-1">Lifetime earnings</p>
            </div>
            <div className="w-10 h-10 bg-[#f0e226]/10 flex items-center justify-center group-hover:bg-[#f0e226]/20 transition-colors">
              <span className="text-[#f0e226] font-bold text-lg">$</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-black border border-white/10 p-1">
            <TabsTrigger value="products" className="gap-2 text-white/60 data-[state=active]:bg-[#f0e226] data-[state=active]:text-black">
              <Package className="h-4 w-4" />
              Products
              {products.length > 0 && (
                <Badge className="ml-1 bg-black/20 text-inherit hover:bg-black/20">{products.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 text-white/60 data-[state=active]:bg-[#f0e226] data-[state=active]:text-black">
              <ShoppingCart className="h-4 w-4" />
              Orders
              {orders.length > 0 && (
                <Badge className="ml-1 bg-black/20 text-inherit hover:bg-black/20">{orders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 text-white/60 data-[state=active]:bg-[#f0e226] data-[state=active]:text-black">
              <RefreshCcw className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2 text-white/60 data-[state=active]:bg-[#f0e226] data-[state=active]:text-black">
              <Tag className="h-4 w-4" />
              Coupons
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#19181a] border border-white/5">
            <div className="flex flex-wrap gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-[#f0e226] transition-colors" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-black border-white/10 text-white placeholder:text-white/30 focus:border-[#f0e226]/50"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44 bg-black border-white/10 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent className="bg-[#19181a] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">All Types</SelectItem>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 bg-black border-white/10 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="bg-[#19181a] border-white/10">
                  <SelectItem value="all" className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">All Statuses</SelectItem>
                  {PRODUCT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setProductModal({ open: true })} className="bg-[#f0e226] text-black hover:bg-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Products Table */}
          <div className="bg-[#19181a] border border-white/5 overflow-hidden">
            {productsLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-[#f0e226]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#f0e226]" />
                </div>
                <p className="text-white/30 mt-4">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-[#f0e226]/10 flex items-center justify-center mx-auto mb-6">
                  <Package className="w-10 h-10 text-[#f0e226]" />
                </div>
                <h3 className="text-lg font-normal text-white mb-2">No products found</h3>
                <p className="text-white/40 mb-6 max-w-sm mx-auto">
                  {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first product'}
                </p>
                <Button onClick={() => setProductModal({ open: true })} className="bg-[#f0e226] text-black hover:bg-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Create your first product
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Product</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Type</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Price</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Status</TableHead>
                    <TableHead className="text-right text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: any) => {
                    const typeConfig = PRODUCT_TYPES.find((t) => t.value === product.type);
                    const statusConfig = PRODUCT_STATUSES.find((s) => s.value === product.status);
                    const TypeIcon = typeConfig?.icon || Package;
                    return (
                      <TableRow key={product.id} className="border-white/5 hover:bg-black/30">
                        <TableCell>
                          <div className="flex items-center gap-4">
                            {product.featuredImageUrl ? (
                              <img
                                src={product.featuredImageUrl}
                                alt={product.name}
                                className="w-14 h-14 object-cover border border-white/10"
                              />
                            ) : (
                              <div className="w-14 h-14 bg-[#f0e226]/10 flex items-center justify-center">
                                <TypeIcon className="w-6 h-6 text-[#f0e226]" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-white">{product.name}</p>
                              <p className="text-sm text-white/30 font-mono">{product.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1.5 bg-white/5 border-white/10 text-white/60">
                            <TypeIcon className="w-3.5 h-3.5" />
                            {typeConfig?.label?.replace(' Product', '') || product.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-white">{formatCurrency(Number(product.price))}</div>
                          {product.salePrice && (
                            <div className="text-sm text-[#f0e226] font-medium">
                              Sale: {formatCurrency(Number(product.salePrice))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig?.color || 'bg-white/10 text-white/60'} border-0`}>
                            {statusConfig?.label || product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setProductModal({ open: true, product })}
                              className="text-white/40 hover:text-[#f0e226] hover:bg-[#f0e226]/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this product?')) {
                                  deleteProductMutation.mutate(product.id);
                                }
                              }}
                              className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <div className="bg-[#19181a] border border-white/5 overflow-hidden">
            {ordersLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-[#f0e226]/10 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#f0e226]" />
                </div>
                <p className="text-white/30 mt-4">Loading orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 bg-[#f0e226]/10 flex items-center justify-center mx-auto mb-6">
                  <ShoppingCart className="w-10 h-10 text-[#f0e226]" />
                </div>
                <h3 className="text-lg font-normal text-white mb-2">No orders yet</h3>
                <p className="text-white/40 max-w-sm mx-auto">
                  Orders will appear here once customers make purchases
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Order</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Customer</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Items</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Total</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Status</TableHead>
                    <TableHead className="text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Date</TableHead>
                    <TableHead className="text-right text-xs text-white/40 uppercase tracking-[0.15em] font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => {
                    const statusConfig = ORDER_STATUSES.find((s) => s.value === order.status);
                    return (
                      <TableRow key={order.id} className="border-white/5 hover:bg-black/30">
                        <TableCell className="font-mono text-sm text-white/60">{order.orderNumber}</TableCell>
                        <TableCell className="text-white">{order.email}</TableCell>
                        <TableCell>
                          <Badge className="bg-white/5 text-white/60 border-0">
                            {order.items?.length || 0} item(s)
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-[#f0e226]">
                          {formatCurrency(Number(order.totalAmount))}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(status: string) =>
                              updateOrderStatusMutation.mutate({ id: order.id, status })
                            }
                          >
                            <SelectTrigger className={`w-36 border-0 ${statusConfig?.color || 'bg-white/10'}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#19181a] border-white/10">
                              {ORDER_STATUSES.map((status) => (
                                <SelectItem key={status.value} value={status.value} className="text-white hover:bg-[#f0e226]/10 focus:bg-[#f0e226]/10">
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-white/40">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setReceiptModal({ open: true, order })}
                            className="text-white/40 hover:text-[#f0e226] hover:bg-[#f0e226]/10"
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <div className="text-center py-14">
              <div className="w-20 h-20 bg-[#f0e226]/10 flex items-center justify-center mx-auto mb-6">
                <RefreshCcw className="w-10 h-10 text-[#f0e226]" />
              </div>
              <div className="text-5xl font-light text-[#f0e226] mb-2">
                {stats?.activeSubscriptions || 0}
              </div>
              <p className="text-lg font-normal text-white mb-4">
                Active Subscriptions
              </p>
              <p className="text-white/40 text-sm max-w-md mx-auto">
                Manage subscriptions from the Orders tab or directly in the Stripe Dashboard for detailed billing controls.
              </p>
            </div>
          </div>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <div className="relative overflow-hidden bg-[#19181a] border border-white/5 p-6">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[#f0e226] via-[#f0e226]/50 to-transparent" />
            <div className="text-center py-14">
              <div className="w-20 h-20 bg-[#f0e226]/10 flex items-center justify-center mx-auto mb-6">
                <Tag className="w-10 h-10 text-[#f0e226]" />
              </div>
              <h3 className="text-xl font-normal text-white mb-2">Coupon Management</h3>
              <p className="text-white/40 text-sm max-w-md mx-auto mb-8">
                Create and manage discount codes for your products. Coming soon!
              </p>
              <Button variant="outline" disabled className="border-white/10 text-white/40 bg-black hover:bg-black">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Modal */}
      <ProductFormModal
        product={productModal.product}
        open={productModal.open}
        onOpenChange={(open) => setProductModal({ open, product: open ? productModal.product : undefined })}
        onSave={handleSaveProduct}
        isLoading={createProductMutation.isPending || updateProductMutation.isPending}
      />

      {/* Order Receipt Modal */}
      <OrderReceipt
        order={receiptModal.order}
        open={receiptModal.open}
        onOpenChange={(open) => setReceiptModal({ open, order: open ? receiptModal.order : null })}
      />
    </div>
  );
}
