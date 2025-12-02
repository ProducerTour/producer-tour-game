/**
 * Cart Page - Shopping cart with product management
 * Styled with cassette theme (black bg, yellow accents)
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, X, Package, Loader2 } from 'lucide-react';
import { Header, Footer } from '../components/landing';
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
    <div className="min-h-screen bg-black text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Noise texture overlay */}
        <div
          className="pointer-events-none fixed inset-0 z-10 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="max-w-6xl mx-auto px-4 relative z-20">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 uppercase tracking-wide">Your Cart</h1>
            <p className="text-white/60 text-lg">
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
              <div className="w-24 h-24 border border-[#f0e226]/30 flex items-center justify-center mx-auto mb-6">
                <ShoppingBag className="w-12 h-12 text-[#f0e226]/50" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-4 uppercase tracking-wide">Your cart is empty</h2>
              <p className="text-white/60 mb-8 max-w-md mx-auto">
                Looks like you haven't added any products to your cart yet. Browse our shop to find great tools and resources.
              </p>
              <Link
                to="/shop"
                className="inline-block px-8 py-4 bg-[#f0e226] text-black font-semibold uppercase tracking-wider hover:bg-white transition-all"
              >
                Browse Products
              </Link>
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
                    className="bg-[#19181a] border border-white/10 p-6 hover:border-[#f0e226]/20 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-[#0f0f0f] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-[#f0e226]/50" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-white truncate">{item.name}</h3>
                            {item.variationName && (
                              <p className="text-sm text-white/60">{item.variationName}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs px-2 py-1 bg-[#f0e226]/10 text-[#f0e226] uppercase tracking-wider">
                                {item.type === 'SUBSCRIPTION'
                                  ? `${item.subscriptionInterval} subscription`
                                  : item.type}
                              </span>
                            </div>
                          </div>

                          {/* Remove Button */}
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Price and Quantity */}
                        <div className="flex items-center justify-between mt-4">
                          {/* Quantity Controls */}
                          {item.type !== 'SUBSCRIPTION' && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-8 h-8 border border-white/20 flex items-center justify-center hover:border-[#f0e226] hover:text-[#f0e226] transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-8 h-8 border border-white/20 flex items-center justify-center hover:border-[#f0e226] hover:text-[#f0e226] transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                          {item.type === 'SUBSCRIPTION' && <div />}

                          {/* Price */}
                          <div className="text-right">
                            {item.salePrice && item.salePrice < item.price ? (
                              <>
                                <span className="text-white/40 line-through text-sm mr-2">
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
                              <span className="text-white/40 text-sm">
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
                <button
                  onClick={() => {
                    clearCart();
                    toast.success('Cart cleared');
                  }}
                  className="text-white/40 text-sm uppercase tracking-wider hover:text-red-400 transition-colors"
                >
                  Clear cart
                </button>
              </motion.div>

              {/* Order Summary */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-1"
              >
                <div className="bg-[#19181a] border border-white/10 p-6 sticky top-24">
                  <h2 className="text-xl font-semibold text-white mb-6 uppercase tracking-wide">Order Summary</h2>

                  {/* Coupon Code */}
                  <div className="mb-6">
                    {couponCode ? (
                      <div className="flex items-center justify-between p-3 bg-[#f0e226]/10 border border-[#f0e226]/30">
                        <div className="flex items-center gap-2">
                          <Tag className="w-4 h-4 text-[#f0e226]" />
                          <span className="text-[#f0e226] font-medium">{couponCode}</span>
                        </div>
                        <button
                          onClick={() => {
                            removeCoupon();
                            toast.success('Coupon removed');
                          }}
                          className="p-1 hover:bg-white/10 transition-colors"
                        >
                          <X className="w-4 h-4 text-[#f0e226]" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            placeholder="Coupon code"
                            className="flex-1 px-4 py-3 bg-[#0f0f0f] border border-white/10 text-white placeholder:text-white/40 focus:border-[#f0e226]/50 focus:outline-none transition-colors"
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponInput.trim()}
                            className="px-4 py-3 border border-[#f0e226] text-[#f0e226] uppercase tracking-wider text-sm font-medium hover:bg-[#f0e226] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                          </button>
                        </div>
                        {couponError && (
                          <p className="text-red-400 text-xs">{couponError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Summary Lines */}
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-white/60">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-[#f0e226]">
                        <span>Discount</span>
                        <span>-${discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-3">
                      <div className="flex justify-between text-white font-semibold text-lg">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Link
                    to="/checkout"
                    className="w-full h-14 bg-[#f0e226] text-black font-semibold uppercase tracking-wider hover:bg-white transition-all flex items-center justify-center gap-2"
                  >
                    Proceed to Checkout
                    <ArrowRight className="w-5 h-5" />
                  </Link>

                  <p className="text-center text-white/40 text-xs mt-4 uppercase tracking-wider">
                    Secure checkout powered by Stripe
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
