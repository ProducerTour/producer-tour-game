/**
 * Checkout Success Page - Order confirmation
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Download, ArrowRight, Home, Mail } from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { Container, Button } from '../components/landing/ui';

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Order Confirmed - Producer Tour';

    // You could fetch order details here using the session_id
    // For now, we'll show a generic success message
    if (sessionId) {
      setOrderNumber(`PT-${Date.now().toString(36).toUpperCase()}`);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-slate-700/10 rounded-full opacity-50" />
        </div>

        <Container>
          <div className="relative max-w-2xl mx-auto text-center">
            {/* Success Animation */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-8"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <CheckCircle className="w-12 h-12 text-green-400" />
              </motion.div>
            </motion.div>

            {/* Thank You Message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Thank You for Your Order!
              </h1>
              <p className="text-xl text-theme-foreground-muted mb-8">
                Your payment was successful and your order has been confirmed.
              </p>
            </motion.div>

            {/* Order Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="rounded-xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] p-8 mb-8"
            >
              {orderNumber && (
                <div className="mb-6">
                  <p className="text-text-muted text-sm mb-1">Order Number</p>
                  <p className="text-white font-mono text-lg">{orderNumber}</p>
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-theme-foreground-muted mb-6">
                <Mail className="w-5 h-5" />
                <span>A confirmation email has been sent to your inbox</span>
              </div>

              {/* What's Next */}
              <div className="border-t border-white/10 pt-6">
                <h2 className="text-lg font-semibold text-white mb-4">What's Next?</h2>
                <div className="space-y-4 text-left">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-600/30 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Digital Products</p>
                      <p className="text-theme-foreground-muted text-sm">
                        Access your digital purchases immediately in your dashboard
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Download className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Downloadable Files</p>
                      <p className="text-theme-foreground-muted text-sm">
                        Download links have been sent to your email
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button to="/dashboard" variant="primary" size="lg">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button to="/" variant="secondary" size="lg">
                <Home className="w-5 h-5 mr-2" />
                Return Home
              </Button>
            </motion.div>

            {/* Support Link */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-text-muted text-sm mt-8"
            >
              Need help?{' '}
              <Link to="/apply" className="text-slate-400 hover:text-white hover:underline">
                Contact our support team
              </Link>
            </motion.p>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
