import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { shopApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { Package, Download, ShoppingBag, Clock, CheckCircle2, XCircle, Truck, RefreshCw, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import Sidebar from '@/components/Sidebar';
import OrderReceipt from '@/components/OrderReceipt';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product: {
    id: string;
    name: string;
    slug: string;
    type: string;
    imageUrl?: string;
  };
  variation?: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  email: string;
  createdAt: string;
  paidAt?: string;
  items: OrderItem[];
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: <Clock className="w-3 h-3" /> },
  PROCESSING: { label: 'Processing', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: <RefreshCw className="w-3 h-3" /> },
  COMPLETED: { label: 'Completed', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Truck className="w-3 h-3" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: <Package className="w-3 h-3" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: <XCircle className="w-3 h-3" /> },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <RefreshCw className="w-3 h-3" /> },
};

export default function CustomerOrdersPage() {
  const [receiptModal, setReceiptModal] = useState<{ open: boolean; order: Order | null }>({ open: false, order: null });

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer-orders'],
    queryFn: async () => {
      const response = await shopApi.getOrders();
      return response.data;
    },
  });

  const orders: Order[] = data?.orders || [];

  return (
    <div className="flex h-screen bg-surface-400">
      <Sidebar activeTab="orders" onTabChange={() => {}} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-8 px-4 md:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-display-lg text-text-primary mb-2 font-display">My Orders</h1>
            <p className="text-body-lg text-text-secondary">
              View your purchase history and download digital products.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="bg-red-500/10 border-red-500/30">
              <CardContent className="py-8 text-center">
                <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-text-primary font-semibold">Failed to load orders</p>
                <p className="text-text-muted text-sm mt-1">Please try again later.</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && orders.length === 0 && (
            <Card className="bg-surface-100 border-panel-border">
              <CardContent className="py-16 text-center">
                <ShoppingBag className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-50" />
                <h3 className="text-text-primary font-semibold text-xl mb-2">No orders yet</h3>
                <p className="text-text-muted mb-6">
                  When you make a purchase, your orders will appear here.
                </p>
                <Button
                  onClick={() => window.location.href = '/shop'}
                  className="bg-primary-500 hover:bg-primary-600 text-white"
                >
                  Browse Shop
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Orders List */}
          {!isLoading && !error && orders.length > 0 && (
            <div className="space-y-6">
              {orders.map((order) => {
                const status = statusConfig[order.status] || statusConfig.PENDING;

                return (
                  <Card key={order.id} className="bg-surface-100 border-panel-border shadow-card overflow-hidden">
                    {/* Order Header */}
                    <CardHeader className="bg-surface-200 border-b border-panel-border">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-primary-500/10">
                            <Package className="w-5 h-5 text-primary-500" />
                          </div>
                          <div>
                            <CardTitle className="text-text-primary text-lg">
                              Order #{order.orderNumber}
                            </CardTitle>
                            <CardDescription className="text-text-muted">
                              {format(new Date(order.createdAt), 'MMMM d, yyyy • h:mm a')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} border flex items-center gap-1.5`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                          <span className="text-text-primary font-bold text-lg">
                            ${parseFloat(order.total).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReceiptModal({ open: true, order })}
                            className="text-primary-400 border-primary-500/30 hover:bg-primary-500/10"
                          >
                            <Receipt className="w-3 h-3 mr-1" />
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* Order Items */}
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {order.items.map((item, index) => (
                          <div key={item.id}>
                            {index > 0 && <Separator className="bg-panel-border my-4" />}
                            <div className="flex items-start gap-4">
                              {/* Product Image */}
                              <div className="w-16 h-16 rounded-lg bg-surface-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-text-muted" />
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-text-primary font-semibold truncate">
                                  {item.product.name}
                                </h4>
                                {item.variation && (
                                  <p className="text-text-muted text-sm">
                                    {item.variation.name}
                                  </p>
                                )}
                                <p className="text-text-secondary text-sm mt-1">
                                  Qty: {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                                </p>
                              </div>

                              {/* Item Actions & Price */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-text-primary font-semibold">
                                  ${parseFloat(item.totalPrice).toFixed(2)}
                                </p>
                                {item.product.type === 'DIGITAL' && order.status === 'COMPLETED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 text-primary-400 border-primary-500/30 hover:bg-primary-500/10"
                                  >
                                    <Download className="w-3 h-3 mr-1" />
                                    Download
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Order Summary */}
                      {(parseFloat(order.discount) > 0 || parseFloat(order.tax) > 0) && (
                        <>
                          <Separator className="bg-panel-border my-4" />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-text-muted">
                              <span>Subtotal</span>
                              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
                            </div>
                            {parseFloat(order.discount) > 0 && (
                              <div className="flex justify-between text-green-400">
                                <span>Discount</span>
                                <span>-${parseFloat(order.discount).toFixed(2)}</span>
                              </div>
                            )}
                            {parseFloat(order.tax) > 0 && (
                              <div className="flex justify-between text-text-muted">
                                <span>Tax</span>
                                <span>${parseFloat(order.tax).toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Order Receipt Modal */}
          <OrderReceipt
            order={receiptModal.order}
            open={receiptModal.open}
            onOpenChange={(open) => setReceiptModal({ open, order: open ? receiptModal.order : null })}
          />
        </div>
      </div>
    </div>
  );
}
