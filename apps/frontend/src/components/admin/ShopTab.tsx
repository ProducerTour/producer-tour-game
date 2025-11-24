/**
 * Shop Tab - Admin product and order management
 * Built with shadcn/ui components
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';

// shadcn components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/select';

import { shopApi } from '../../lib/api';
import toast from 'react-hot-toast';

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
  { value: 'DRAFT', label: 'Draft', variant: 'secondary' as const, color: 'bg-slate-500/20 text-slate-300' },
  { value: 'ACTIVE', label: 'Active', variant: 'default' as const, color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'ARCHIVED', label: 'Archived', variant: 'outline' as const, color: 'bg-amber-500/20 text-amber-400' },
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
  { value: 'PENDING', label: 'Pending', variant: 'secondary' as const, color: 'bg-amber-500/20 text-amber-400' },
  { value: 'PROCESSING', label: 'Processing', variant: 'default' as const, color: 'bg-blue-500/20 text-blue-400' },
  { value: 'COMPLETED', label: 'Completed', variant: 'default' as const, color: 'bg-emerald-500/20 text-emerald-400' },
  { value: 'CANCELLED', label: 'Cancelled', variant: 'destructive' as const, color: 'bg-red-500/20 text-red-400' },
  { value: 'REFUNDED', label: 'Refunded', variant: 'outline' as const, color: 'bg-purple-500/20 text-purple-400' },
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {product ? 'Edit Product' : 'Create New Product'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-slate-300">Product Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter product name"
              required
              className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
            />
          </div>

          {/* Type and Status Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Product Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="bg-slate-800/50 border-slate-700 text-white">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
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
              <Label htmlFor="price" className="text-slate-300">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                min={0}
                step={0.01}
                required
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salePrice" className="text-slate-300">Sale Price ($)</Label>
              <Input
                id="salePrice"
                type="number"
                value={formData.salePrice || ''}
                onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) || undefined })}
                placeholder="Optional"
                min={0}
                step={0.01}
                className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-slate-600"
              />
            </div>
          </div>

          {/* Subscription Fields */}
          {formData.type === 'SUBSCRIPTION' && (
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Billing Interval</Label>
                  <Select
                    value={formData.subscriptionInterval}
                    onValueChange={(value) => setFormData({ ...formData, subscriptionInterval: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_INTERVALS.map((interval) => (
                        <SelectItem key={interval.value} value={interval.value}>
                          {interval.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    value={formData.trialDays}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* SKU and Tool ID */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="toolId">Tool ID</Label>
              <Input
                id="toolId"
                value={formData.toolId}
                onChange={(e) => setFormData({ ...formData, toolId: e.target.value })}
                placeholder="e.g., type-beat-video-maker"
              />
            </div>
          </div>

          {/* Short Description */}
          <div className="space-y-2">
            <Label htmlFor="shortDescription">Short Description</Label>
            <Textarea
              id="shortDescription"
              value={formData.shortDescription}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief product description"
              rows={2}
            />
          </div>

          {/* Full Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed product description (supports markdown)"
              rows={4}
            />
          </div>

          {/* Featured Image URL */}
          <div className="space-y-2">
            <Label htmlFor="featuredImageUrl">Featured Image URL</Label>
            <Input
              id="featuredImageUrl"
              type="url"
              value={formData.featuredImageUrl}
              onChange={(e) => setFormData({ ...formData, featuredImageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>

          {/* Download Fields */}
          {['DIGITAL', 'DOWNLOADABLE'].includes(formData.type) && (
            <Card className="bg-slate-800/30 border-slate-700/50">
              <CardContent className="pt-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="downloadLimit">Download Limit</Label>
                  <Input
                    id="downloadLimit"
                    type="number"
                    value={formData.downloadLimit || ''}
                    onChange={(e) => setFormData({ ...formData, downloadLimit: parseInt(e.target.value) || undefined })}
                    placeholder="Unlimited"
                    min={0}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="downloadExpiry">Expiry (days)</Label>
                  <Input
                    id="downloadExpiry"
                    type="number"
                    value={formData.downloadExpiry || ''}
                    onChange={(e) => setFormData({ ...formData, downloadExpiry: parseInt(e.target.value) || undefined })}
                    placeholder="Never"
                    min={0}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Checkboxes */}
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked as boolean })}
              />
              <Label htmlFor="isFeatured" className="cursor-pointer">Featured Product</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isVirtual"
                checked={formData.isVirtual}
                onCheckedChange={(checked) => setFormData({ ...formData, isVirtual: checked as boolean })}
              />
              <Label htmlFor="isVirtual" className="cursor-pointer">Virtual (no shipping)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
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
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch shop stats
  const { data: stats } = useQuery({
    queryKey: ['shop-stats'],
    queryFn: async () => {
      const response = await shopApi.getShopStats();
      return response.data;
    },
  });

  // Fetch products
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['shop-products', searchQuery, typeFilter, statusFilter],
    queryFn: async () => {
      const response = await shopApi.getProducts({
        search: searchQuery || undefined,
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
        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Products</CardTitle>
            <div className="p-2 rounded-lg bg-slate-700/50">
              <Package className="h-4 w-4 text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.totalProducts || 0}</div>
            <p className="text-xs text-slate-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Products</CardTitle>
            <div className="p-2 rounded-lg bg-slate-700/50">
              <Zap className="h-4 w-4 text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.activeProducts || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Available for purchase</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Orders</CardTitle>
            <div className="p-2 rounded-lg bg-slate-700/50">
              <ShoppingCart className="h-4 w-4 text-slate-300" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-slate-500 mt-1">All time orders</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50 hover:border-slate-600/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Revenue</CardTitle>
            <div className="p-2 rounded-lg bg-slate-700/50">
              <span className="text-slate-300 font-bold text-sm">$</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{formatCurrency(stats?.totalRevenue || 0)}</div>
            <p className="text-xs text-slate-500 mt-1">Lifetime earnings</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="products" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-800/50 border border-slate-700/50 p-1">
            <TabsTrigger value="products" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Package className="h-4 w-4" />
              Products
              {products.length > 0 && (
                <Badge className="ml-1 bg-slate-600/50 text-slate-300 hover:bg-slate-600/50">{products.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <ShoppingCart className="h-4 w-4" />
              Orders
              {orders.length > 0 && (
                <Badge className="ml-1 bg-slate-600/50 text-slate-300 hover:bg-slate-600/50">{orders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <RefreshCcw className="h-4 w-4" />
              Subscriptions
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
              <Tag className="h-4 w-4" />
              Coupons
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
            <div className="flex flex-wrap gap-3">
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-slate-300 transition-colors" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 bg-slate-900/50 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-slate-600"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44 bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {PRODUCT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setProductModal({ open: true })} className="bg-white text-slate-900 hover:bg-slate-100">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>

          {/* Products Table */}
          <Card className="bg-slate-800/30 border-slate-700/30 overflow-hidden">
            <CardContent className="p-0">
              {productsLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  </div>
                  <p className="text-slate-500 mt-4">Loading products...</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto mb-6">
                    <Package className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No products found</h3>
                  <p className="text-slate-400 mb-6 max-w-sm mx-auto">
                    {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first product'}
                  </p>
                  <Button onClick={() => setProductModal({ open: true })} className="bg-white text-slate-900 hover:bg-slate-100">
                    <Plus className="w-4 h-4 mr-2" />
                    Create your first product
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-medium">Product</TableHead>
                      <TableHead className="text-slate-400 font-medium">Type</TableHead>
                      <TableHead className="text-slate-400 font-medium">Price</TableHead>
                      <TableHead className="text-slate-400 font-medium">Status</TableHead>
                      <TableHead className="text-right text-slate-400 font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product: any) => {
                      const typeConfig = PRODUCT_TYPES.find((t) => t.value === product.type);
                      const statusConfig = PRODUCT_STATUSES.find((s) => s.value === product.status);
                      const TypeIcon = typeConfig?.icon || Package;
                      return (
                        <TableRow key={product.id} className="border-slate-700/30 hover:bg-slate-700/20">
                          <TableCell>
                            <div className="flex items-center gap-4">
                              {product.featuredImageUrl ? (
                                <img
                                  src={product.featuredImageUrl}
                                  alt={product.name}
                                  className="w-14 h-14 rounded-xl object-cover border border-slate-700/50"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center">
                                  <TypeIcon className="w-6 h-6 text-slate-500" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-white">{product.name}</p>
                                <p className="text-sm text-slate-500 font-mono">{product.slug}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1.5 bg-slate-700/30 border-slate-600/50 text-slate-300">
                              <TypeIcon className="w-3.5 h-3.5" />
                              {typeConfig?.label?.replace(' Product', '') || product.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-white">{formatCurrency(Number(product.price))}</div>
                            {product.salePrice && (
                              <div className="text-sm text-slate-400 font-medium">
                                Sale: {formatCurrency(Number(product.salePrice))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={`${statusConfig?.color || 'bg-slate-500/20 text-slate-300'} border-0`}>
                              {statusConfig?.label || product.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setProductModal({ open: true, product })}
                                className="text-slate-400 hover:text-white hover:bg-slate-700/50"
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
                                className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card className="bg-slate-800/30 border-slate-700/30 overflow-hidden">
            <CardContent className="p-0">
              {ordersLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                  <p className="text-slate-500 mt-4">Loading orders...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-20 h-20 rounded-2xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart className="w-10 h-10 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">No orders yet</h3>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Orders will appear here once customers make purchases
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700/50 hover:bg-transparent">
                      <TableHead className="text-slate-400 font-medium">Order</TableHead>
                      <TableHead className="text-slate-400 font-medium">Customer</TableHead>
                      <TableHead className="text-slate-400 font-medium">Items</TableHead>
                      <TableHead className="text-slate-400 font-medium">Total</TableHead>
                      <TableHead className="text-slate-400 font-medium">Status</TableHead>
                      <TableHead className="text-slate-400 font-medium">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => {
                      const statusConfig = ORDER_STATUSES.find((s) => s.value === order.status);
                      return (
                        <TableRow key={order.id} className="border-slate-700/30 hover:bg-slate-700/20">
                          <TableCell className="font-mono text-sm text-slate-300">{order.orderNumber}</TableCell>
                          <TableCell className="text-white">{order.email}</TableCell>
                          <TableCell>
                            <Badge className="bg-slate-700/50 text-slate-300 border-0">
                              {order.items?.length || 0} item(s)
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-white">
                            {formatCurrency(Number(order.totalAmount))}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={order.status}
                              onValueChange={(status) =>
                                updateOrderStatusMutation.mutate({ id: order.id, status })
                              }
                            >
                              <SelectTrigger className={`w-36 border-0 ${statusConfig?.color || 'bg-slate-700/50'}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ORDER_STATUSES.map((status) => (
                                  <SelectItem key={status.value} value={status.value}>
                                    {status.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscriptions Tab */}
        <TabsContent value="subscriptions">
          <Card className="bg-slate-800/30 border-slate-700/30">
            <CardContent className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto mb-6">
                <RefreshCcw className="w-10 h-10 text-slate-400" />
              </div>
              <div className="text-5xl font-bold text-white mb-2">
                {stats?.activeSubscriptions || 0}
              </div>
              <p className="text-lg font-medium text-slate-300 mb-4">
                Active Subscriptions
              </p>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Manage subscriptions from the Orders tab or directly in the Stripe Dashboard for detailed billing controls.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coupons Tab */}
        <TabsContent value="coupons">
          <Card className="bg-slate-800/30 border-slate-700/30">
            <CardContent className="text-center py-20">
              <div className="w-20 h-20 rounded-2xl bg-slate-700/30 border border-slate-600/30 flex items-center justify-center mx-auto mb-6">
                <Tag className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Coupon Management</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                Create and manage discount codes for your products. Coming soon!
              </p>
              <Button variant="outline" disabled className="border-slate-600 text-slate-400">
                <Plus className="w-4 h-4 mr-2" />
                Create Coupon
              </Button>
            </CardContent>
          </Card>
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
    </div>
  );
}
