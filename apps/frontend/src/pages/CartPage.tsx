/**
 * Cart Page - Shopping cart with product management
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, X, Package, Loader2 } from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { Container, Button as LandingButton } from '../components/landing/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '../store/cart.store';
import { shopApi } from '../lib/api';
import toast from 'react-hot-toast';

export default function CartPage() {
  const {
    items,
    couponCode,
    discountAmount,
    removeItem,
    updateQuantity,
    clearCart,
    applyCoupon,
    removeCoupon,
    getSubtotal,
    getTotal,
  } = useCartStore();

  const [couponInput, setCouponInput] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Cart - Producer Tour';
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponError(null);

    try {
      const response = await shopApi.validateCoupon(couponInput, getSubtotal());
      if (response.data.valid) {
        applyCoupon(response.data.coupon.code, response.data.discount);
        toast.success(`Coupon applied! You save $${response.data.discount.toFixed(2)}`);
        setCouponInput('');
      }
    } catch (error: any) {
      const message = error.response?.data?.error || 'Invalid coupon code';
      setCouponError(message);
      toast.error(message);
    } finally {
      setCouponLoading(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotal();

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-slate-700/10 rounded-full opacity-50" />
        </div>

        <Container>
          <div className="relative">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Your Cart</h1>
              <p className="text-text-secondary text-lg">
                {items.length === 0
                  ? 'Your cart is empty'
                  : `${items.length} item${items.length > 1 ? 's' : ''} in your cart`}
              </p>
            </motion.div>

            {items.length === 0 ? (
              /* Empty Cart State */
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center py-20"
              >
                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag className="w-12 h-12 text-text-muted" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-4">Your cart is empty</h2>
                <p className="text-text-secondary mb-8 max-w-md mx-auto">
                  Looks like you haven't added any products to your cart yet. Browse our shop to find great tools and resources.
                </p>
                <LandingButton to="/pricing" variant="primary" size="lg">
                  Browse Products
                </LandingButton>
              </motion.div>
            ) : (
              /* Cart Content */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="lg:col-span-2 space-y-4"
                >
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6"
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="w-20 h-20 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-8 h-8 text-text-muted" />
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-semibold text-white truncate">{item.name}</h3>
                              {item.variationName && (
                                <p className="text-sm text-text-secondary">{item.variationName}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs bg-slate-500/20 text-slate-300 hover:bg-slate-500/30">
                                  {item.type === 'SUBSCRIPTION'
                                    ? `${item.subscriptionInterval} subscription`
                                    : item.type}
                                </Badge>
                              </div>
                            </div>

                            {/* Remove Button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-red-400 hover:bg-white/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Price and Quantity */}
                          <div className="flex items-center justify-between mt-4">
                            {/* Quantity Controls */}
                            {item.type !== 'SUBSCRIPTION' && (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-8 h-8 bg-white/5 hover:bg-white/10"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-8 h-8 bg-white/5 hover:bg-white/10"
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {item.type === 'SUBSCRIPTION' && <div />}

                            {/* Price */}
                            <div className="text-right">
                              {item.salePrice && item.salePrice < item.price ? (
                                <>
                                  <span className="text-text-muted line-through text-sm mr-2">
                                    ${(item.price * item.quantity).toFixed(2)}
                                  </span>
                                  <span className="text-white font-semibold">
                                    ${(item.salePrice * item.quantity).toFixed(2)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-white font-semibold">
                                  ${(item.price * item.quantity).toFixed(2)}
                                </span>
                              )}
                              {item.type === 'SUBSCRIPTION' && item.subscriptionInterval && (
                                <span className="text-text-muted text-sm">
                                  /{item.subscriptionInterval.toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Clear Cart Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      clearCart();
                      toast.success('Cart cleared');
                    }}
                    className="text-muted-foreground hover:text-red-400"
                  >
                    Clear cart
                  </Button>
                </motion.div>

                {/* Order Summary */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="lg:col-span-1"
                >
                  <div className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6 sticky top-24">
                    <h2 className="text-xl font-semibold text-white mb-6">Order Summary</h2>

                    {/* Coupon Code */}
                    <div className="mb-6">
                      {couponCode ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2">
                            <Tag className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-medium">{couponCode}</span>
                          </div>
                          <button
                            onClick={() => {
                              removeCoupon();
                              toast.success('Coupon removed');
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                          >
                            <X className="w-4 h-4 text-green-400" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input
                              type="text"
                              value={couponInput}
                              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                              placeholder="Coupon code"
                              className="flex-1 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-slate-500/50"
                            />
                            <Button
                              variant="secondary"
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || !couponInput.trim()}
                              className="bg-white/10 hover:bg-white/15"
                            >
                              {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                            </Button>
                          </div>
                          {couponError && (
                            <p className="text-red-400 text-xs">{couponError}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Summary Lines */}
                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Discount</span>
                          <span>-${discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator className="bg-white/10" />
                      <div className="flex justify-between text-white font-semibold text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Checkout Button */}
                    <Button
                      asChild
                      size="lg"
                      className="w-full h-14 rounded-xl bg-white text-slate-900 font-semibold hover:bg-white/90 hover:shadow-glow-sm"
                    >
                      <Link to="/checkout">
                        Proceed to Checkout
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Link>
                    </Button>

                    <p className="text-center text-text-muted text-xs mt-4">
                      Secure checkout powered by Stripe
                    </p>
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
