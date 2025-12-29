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
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700 border border-amber-200', icon: <Clock className="w-3 h-3" /> },
  PROCESSING: { label: 'Processing', color: 'bg-blue-100 text-blue-700 border border-blue-200', icon: <RefreshCw className="w-3 h-3" /> },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: <CheckCircle2 className="w-3 h-3" /> },
  SHIPPED: { label: 'Shipped', color: 'bg-purple-100 text-purple-700 border border-purple-200', icon: <Truck className="w-3 h-3" /> },
  DELIVERED: { label: 'Delivered', color: 'bg-emerald-100 text-emerald-700 border border-emerald-200', icon: <Package className="w-3 h-3" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700 border border-red-200', icon: <XCircle className="w-3 h-3" /> },
  REFUNDED: { label: 'Refunded', color: 'bg-gray-100 text-gray-600 border border-gray-200', icon: <RefreshCw className="w-3 h-3" /> },
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
    <div className="flex h-screen bg-slate-50">
      <Sidebar activeTab="orders" onTabChange={() => {}} />

      <div className="flex-1 overflow-y-auto ml-0 md:ml-64">
        <div className="max-w-5xl mx-auto py-8 px-4 md:px-8 pt-16 md:pt-8 pb-24 md:pb-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl text-gray-900 mb-2 font-bold">My Orders</h1>
            <p className="text-gray-500">
              View your purchase history and download digital products.
            </p>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card className="bg-red-50 border border-red-200 shadow-sm">
              <CardContent className="py-8 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-900 font-semibold">Failed to load orders</p>
                <p className="text-gray-500 text-sm mt-1">Please try again later.</p>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!isLoading && !error && orders.length === 0 && (
            <Card className="bg-white border border-gray-100 shadow-sm">
              <CardContent className="py-16 text-center">
                <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-900 font-semibold text-xl mb-2">No orders yet</h3>
                <p className="text-gray-500 mb-6">
                  When you make a purchase, your orders will appear here.
                </p>
                <Button
                  onClick={() => window.location.href = '/shop'}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
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
                  <Card key={order.id} className="bg-white border border-gray-100 shadow-sm overflow-hidden">
                    {/* Order Header */}
                    <CardHeader className="bg-gray-50 border-b border-gray-100">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-blue-100">
                            <Package className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-gray-900 text-lg">
                              Order #{order.orderNumber}
                            </CardTitle>
                            <CardDescription className="text-gray-500">
                              {format(new Date(order.createdAt), 'MMMM d, yyyy • h:mm a')}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${status.color} flex items-center gap-1.5`}>
                            {status.icon}
                            {status.label}
                          </Badge>
                          <span className="text-gray-900 font-bold text-lg">
                            ${parseFloat(order.total).toFixed(2)}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReceiptModal({ open: true, order })}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
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
                            {index > 0 && <Separator className="bg-gray-100 my-4" />}
                            <div className="flex items-start gap-4">
                              {/* Product Image */}
                              <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {item.product.imageUrl ? (
                                  <img
                                    src={item.product.imageUrl}
                                    alt={item.product.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-gray-400" />
                                )}
                              </div>

                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <h4 className="text-gray-900 font-semibold truncate">
                                  {item.product.name}
                                </h4>
                                {item.variation && (
                                  <p className="text-gray-500 text-sm">
                                    {item.variation.name}
                                  </p>
                                )}
                                <p className="text-gray-600 text-sm mt-1">
                                  Qty: {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                                </p>
                              </div>

                              {/* Item Actions & Price */}
                              <div className="text-right flex-shrink-0">
                                <p className="text-gray-900 font-semibold">
                                  ${parseFloat(item.totalPrice).toFixed(2)}
                                </p>
                                {item.product.type === 'DIGITAL' && order.status === 'COMPLETED' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
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
                          <Separator className="bg-gray-100 my-4" />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-500">
                              <span>Subtotal</span>
                              <span>${parseFloat(order.subtotal).toFixed(2)}</span>
                            </div>
                            {parseFloat(order.discount) > 0 && (
                              <div className="flex justify-between text-emerald-600">
                                <span>Discount</span>
                                <span>-${parseFloat(order.discount).toFixed(2)}</span>
                              </div>
                            )}
                            {parseFloat(order.tax) > 0 && (
                              <div className="flex justify-between text-gray-500">
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
