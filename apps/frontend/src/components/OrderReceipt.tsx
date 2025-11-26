/**
 * Order Receipt Component
 * Displays a printable receipt for shop orders
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/separator';
import { Printer, Download, Package } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  product: {
    id: string;
    name: string;
    slug?: string;
    type?: string;
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
  totalAmount?: string;
  email: string;
  createdAt: string;
  paidAt?: string;
  items?: OrderItem[];
}

interface OrderReceiptProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function OrderReceipt({ order, open, onOpenChange }: OrderReceiptProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
    toast.success('Receipt sent to printer');
  };

  const handleDownload = () => {
    // Create a simple text receipt
    const items = order.items || [];
    let receipt = `
PRODUCER TOUR - ORDER RECEIPT
==============================
Order #: ${order.orderNumber}
Date: ${format(new Date(order.createdAt), 'MMMM d, yyyy h:mm a')}
Email: ${order.email}
Status: ${order.status}
==============================

ITEMS:
`;
    items.forEach((item) => {
      receipt += `
${item.product.name}${item.variation ? ` (${item.variation.name})` : ''}
  Qty: ${item.quantity} x $${parseFloat(item.unitPrice).toFixed(2)}
  Total: $${parseFloat(item.totalPrice).toFixed(2)}
`;
    });

    const subtotal = parseFloat(order.subtotal || order.totalAmount || '0');
    const discount = parseFloat(order.discount || '0');
    const tax = parseFloat(order.tax || '0');
    const total = parseFloat(order.total || order.totalAmount || '0');

    receipt += `
==============================
Subtotal: $${subtotal.toFixed(2)}`;
    if (discount > 0) receipt += `\nDiscount: -$${discount.toFixed(2)}`;
    if (tax > 0) receipt += `\nTax: $${tax.toFixed(2)}`;
    receipt += `
TOTAL: $${total.toFixed(2)}
==============================

Thank you for your purchase!
Producer Tour
https://producertour.com
`;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${order.orderNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Receipt downloaded: receipt-${order.orderNumber}.txt`);
  };

  const items = order.items || [];
  const subtotal = parseFloat(order.subtotal || order.totalAmount || '0');
  const discount = parseFloat(order.discount || '0');
  const tax = parseFloat(order.tax || '0');
  const total = parseFloat(order.total || order.totalAmount || '0');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white text-gray-900 border-gray-200 print:border-0 print:shadow-none">
        <DialogHeader className="flex flex-row items-start justify-between print:hidden">
          <DialogTitle className="text-xl font-bold text-gray-900">
            Order Receipt
          </DialogTitle>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              className="text-gray-700 border-gray-300 hover:bg-gray-100"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print
            </Button>
          </div>
        </DialogHeader>

        {/* Receipt Content - Printable */}
        <div className="space-y-6 print:p-8" id="receipt-content">
          {/* Header */}
          <div className="text-center border-b border-gray-200 pb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Producer Tour</h1>
            <p className="text-sm text-gray-500">Order Receipt</p>
          </div>

          {/* Order Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 font-medium">Order Number</p>
              <p className="text-gray-900 font-semibold">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Date</p>
              <p className="text-gray-900">{format(new Date(order.createdAt), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Email</p>
              <p className="text-gray-900">{order.email}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium">Status</p>
              <p className="text-gray-900 capitalize">{order.status.toLowerCase()}</p>
            </div>
          </div>

          <Separator className="bg-gray-200" />

          {/* Items */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Items</h3>
            {items.length > 0 ? (
              items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{item.product.name}</p>
                      {item.variation && (
                        <p className="text-sm text-gray-500">{item.variation.name}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × ${parseFloat(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900">
                    ${parseFloat(item.totalPrice).toFixed(2)}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No item details available</p>
            )}
          </div>

          <Separator className="bg-gray-200" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-green-600">-${discount.toFixed(2)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="text-gray-900">${tax.toFixed(2)}</span>
              </div>
            )}
            <Separator className="bg-gray-200" />
            <div className="flex justify-between text-lg font-bold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center pt-4 border-t border-gray-200 text-sm text-gray-500">
            <p>Thank you for your purchase!</p>
            <p className="mt-1">Questions? Contact support@producertour.com</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
