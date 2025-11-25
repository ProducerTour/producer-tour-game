/**
 * Checkout Page - Stripe Checkout integration
 */

import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Lock, CreditCard, Package, Shield, Loader2 } from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { Container } from '../components/landing/ui';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCartStore } from '../store/cart.store';
import { useAuthStore } from '../store/auth.store';
import { shopApi } from '../lib/api';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, couponCode, getSubtotal, getTotal, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [email, setEmail] = useState(user?.email || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Checkout - Producer Tour';

    // Redirect to cart if no items
    if (items.length === 0) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user?.email]);

  const handleCheckout = async () => {
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      // Prepare checkout items
      const checkoutItems = items.map((item) => ({
        productId: item.productId,
        variationId: item.variationId,
        quantity: item.quantity,
        stripePriceId: item.stripePriceId,
      }));

      // Create Stripe checkout session
      const response = await shopApi.createCheckoutSession({
        items: checkoutItems,
        email,
        couponCode: couponCode || undefined,
        successUrl: `${window.location.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${window.location.origin}/checkout`,
      });

      // Redirect to Stripe Checkout
      if (response.data.url) {
        // Clear cart before redirecting (will be restored if cancelled)
        clearCart();
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.response?.data?.error || 'Failed to create checkout session');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = getSubtotal();
  const total = getTotal();

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-slate-700/10 rounded-full opacity-50" />
        </div>

        <Container>
          <div className="relative max-w-4xl mx-auto">
            {/* Back to Cart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8"
            >
              <Link
                to="/cart"
                className="inline-flex items-center gap-2 text-text-secondary hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to cart
              </Link>
            </motion.div>

            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mb-12"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Checkout</h1>
              <p className="text-text-secondary text-lg">
                Complete your purchase securely with Stripe
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Checkout Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="lg:col-span-3 space-y-6"
              >
                {/* Email Section */}
                <div className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Contact Information</h2>

                  {user ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-full bg-slate-600/30 flex items-center justify-center">
                        <span className="text-slate-300 font-semibold">
                          {user.firstName?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-text-secondary text-sm">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-muted-foreground">
                          Email address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          required
                          className="h-12 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground focus:border-slate-500/50"
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        Already have an account?{' '}
                        <Link to="/login" className="text-slate-400 hover:text-white hover:underline">
                          Log in
                        </Link>{' '}
                        for a faster checkout experience.
                      </p>
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Payment</h2>

                  <div className="flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 mb-4">
                    <CreditCard className="w-5 h-5 text-text-secondary" />
                    <span className="text-text-secondary">
                      You'll enter your payment details on the next secure page
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-4 items-center text-text-muted text-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      <span>Secure checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span>SSL encrypted</span>
                    </div>
                  </div>
                </div>

                {/* Checkout Button (Mobile) */}
                <div className="lg:hidden">
                  <Button
                    onClick={handleCheckout}
                    disabled={loading || !email}
                    size="lg"
                    className="w-full h-14 rounded-xl bg-white text-slate-900 font-semibold hover:bg-white/90 hover:shadow-glow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <Lock className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>

              {/* Order Summary Sidebar */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="lg:col-span-2"
              >
                <div className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-6 sticky top-24">
                  <h2 className="text-lg font-semibold text-white mb-4">Order Summary</h2>

                  {/* Items */}
                  <div className="space-y-4 mb-6">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3">
                        <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-5 h-5 text-text-muted" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.name}</p>
                          {item.variationName && (
                            <p className="text-text-muted text-xs">{item.variationName}</p>
                          )}
                          <p className="text-text-secondary text-xs">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white text-sm font-medium">
                            ${((item.salePrice || item.price) * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Summary Lines */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <div className="flex justify-between text-muted-foreground text-sm">
                      <span>Subtotal</span>
                      <span>${subtotal.toFixed(2)}</span>
                    </div>
                    {couponCode && (
                      <div className="flex justify-between text-green-400 text-sm">
                        <span>Discount ({couponCode})</span>
                        <span>-${(subtotal - total).toFixed(2)}</span>
                      </div>
                    )}
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between text-white font-semibold text-lg">
                      <span>Total</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Checkout Button (Desktop) */}
                  <div className="hidden lg:block mt-6">
                    <Button
                      onClick={handleCheckout}
                      disabled={loading || !email}
                      size="lg"
                      className="w-full h-14 rounded-xl bg-white text-slate-900 font-semibold hover:bg-white/90 hover:shadow-glow-sm"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Continue to Payment
                          <Lock className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-center text-text-muted text-xs mt-4">
                    By completing this purchase, you agree to our{' '}
                    <a href="#terms" className="text-slate-400 hover:text-white hover:underline">
                      Terms of Service
                    </a>
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
