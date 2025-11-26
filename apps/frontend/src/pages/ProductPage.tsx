/**
 * Product Page - Individual product display with full details
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  Download,
  Repeat,
  Check,
  Star,
  Loader2,
  Zap,
  ArrowLeft,
  Minus,
  Plus,
  Clock,
  Shield,
  CheckCircle,
} from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { Container } from '../components/landing/ui';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { useCartStore } from '../store/cart.store';
import { shopApi } from '../lib/api';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  type: 'SIMPLE' | 'VARIABLE' | 'DIGITAL' | 'DOWNLOADABLE' | 'PHYSICAL' | 'SUBSCRIPTION';
  status: string;
  price: number;
  salePrice: number | null;
  featuredImageUrl: string | null;
  isFeatured: boolean;
  subscriptionInterval: string | null;
  subscriptionIntervalCount: number | null;
  trialDays: number | null;
  stripePriceId: string | null;
  toolId: string | null;
}

const PRODUCT_TYPE_ICONS: Record<string, typeof Package> = {
  SIMPLE: Package,
  VARIABLE: Package,
  DIGITAL: Zap,
  DOWNLOADABLE: Download,
  PHYSICAL: Package,
  SUBSCRIPTION: Repeat,
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  SIMPLE: 'Product',
  VARIABLE: 'Variable',
  DIGITAL: 'Digital Tool',
  DOWNLOADABLE: 'Downloadable',
  PHYSICAL: 'Physical Product',
  SUBSCRIPTION: 'Subscription',
};

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  const { data: productData, isLoading, error } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const response = await shopApi.getProduct(slug!);
      return response.data;
    },
    enabled: !!slug,
  });

  const product: Product | null = productData?.product || null;

  useEffect(() => {
    if (product) {
      document.title = `${product.name} - Producer Tour Shop`;
    } else {
      document.title = 'Product - Producer Tour Shop';
    }
  }, [product]);

  const handleAddToCart = async () => {
    if (!product) return;

    setAddingToCart(true);

    // Check if subscription already in cart
    if (product.type === 'SUBSCRIPTION') {
      const existingSubscription = cartItems.find(
        (item) => item.productId === product.id && item.type === 'SUBSCRIPTION'
      );
      if (existingSubscription) {
        toast.error('This subscription is already in your cart');
        setAddingToCart(false);
        return;
      }
    }

    // Simulate a slight delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300));

    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      salePrice: product.salePrice ? Number(product.salePrice) : undefined,
      quantity: product.type === 'SUBSCRIPTION' ? 1 : quantity,
      type: product.type,
      image: product.featuredImageUrl || undefined,
      subscriptionInterval: product.subscriptionInterval || undefined,
      subscriptionIntervalCount: product.subscriptionIntervalCount || undefined,
      stripePriceId: product.stripePriceId || undefined,
    });

    toast.success(`${product.name} added to cart`);
    setAddingToCart(false);
  };

  const isInCart = (productId: string) => {
    return cartItems.some((item) => item.productId === productId);
  };

  const inCart = product ? isInCart(product.id) : false;

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface text-white">
        <Header />
        <main className="pt-28 pb-20">
          <Container>
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
                <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-slate-500/20 animate-ping" />
              </div>
              <p className="text-slate-500 mt-4">Loading product...</p>
            </div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  // Error or not found state
  if (error || !product) {
    return (
      <div className="min-h-screen bg-surface text-white">
        <Header />
        <main className="pt-28 pb-20">
          <Container>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-xl">
                <Package className="w-14 h-14 text-slate-600" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-4">Product not found</h2>
              <p className="text-slate-400 mb-8">
                The product you're looking for doesn't exist or has been removed.
              </p>
              <Button
                onClick={() => navigate('/shop')}
                className="bg-white text-slate-900 hover:bg-slate-100"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shop
              </Button>
            </motion.div>
          </Container>
        </main>
        <Footer />
      </div>
    );
  }

  const TypeIcon = PRODUCT_TYPE_ICONS[product.type] || Package;
  const price = Number(product.price);
  const salePrice = product.salePrice ? Number(product.salePrice) : null;
  const hasDiscount = salePrice && salePrice < price;
  const isSubscription = product.type === 'SUBSCRIPTION';

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-slate-700/20 via-slate-800/10 to-transparent rounded-full opacity-50" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-slate-600/10 rounded-full opacity-30" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                                linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
              backgroundSize: '60px 60px'
            }}
          />
        </div>

        <Container>
          <div className="relative">
            {/* Back to Shop */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Shop
              </Link>
            </motion.div>

            {/* Product Content */}
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
              {/* Product Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="relative rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/60 border border-slate-700/40 overflow-hidden aspect-square">
                  {product.featuredImageUrl ? (
                    <img
                      src={product.featuredImageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800/50 to-slate-900/50">
                      <div className="w-32 h-32 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/30">
                        <TypeIcon className="w-16 h-16 text-slate-500" />
                      </div>
                    </div>
                  )}

                  {/* Featured Badge */}
                  {product.isFeatured && (
                    <Badge className="absolute top-4 left-4 bg-slate-600/90 text-white border-0 shadow-lg">
                      <Star className="w-3 h-3 mr-1 fill-current" />
                      Featured
                    </Badge>
                  )}

                  {/* Sale Badge */}
                  {hasDiscount && (
                    <Badge className="absolute top-4 right-4 bg-emerald-500/90 text-white border-0 shadow-lg">
                      {Math.round(((price - salePrice!) / price) * 100)}% Off
                    </Badge>
                  )}
                </div>
              </motion.div>

              {/* Product Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex flex-col"
              >
                {/* Type Badge */}
                <Badge variant="outline" className="w-fit mb-4 bg-slate-900/80 text-slate-300 border-slate-700/50">
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {PRODUCT_TYPE_LABELS[product.type]}
                </Badge>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {product.name}
                </h1>

                {/* Short Description */}
                {product.shortDescription && (
                  <p className="text-lg text-slate-400 mb-6">
                    {product.shortDescription}
                  </p>
                )}

                {/* Price */}
                <div className="flex items-baseline gap-3 mb-6">
                  {hasDiscount ? (
                    <>
                      <span className="text-4xl font-bold text-white">
                        ${salePrice!.toFixed(2)}
                      </span>
                      <span className="text-xl text-slate-500 line-through">
                        ${price.toFixed(2)}
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      ${price.toFixed(2)}
                    </span>
                  )}
                  {isSubscription && product.subscriptionInterval && (
                    <span className="text-slate-400">
                      /{product.subscriptionInterval.toLowerCase()}
                    </span>
                  )}
                </div>

                {/* Trial Days */}
                {isSubscription && product.trialDays && product.trialDays > 0 && (
                  <div className="flex items-center gap-3 mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Clock className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400 font-medium">
                      {product.trialDays}-day free trial included
                    </span>
                  </div>
                )}

                {/* Quantity Selector (for non-subscriptions) */}
                {!isSubscription && (
                  <div className="flex items-center gap-4 mb-6">
                    <span className="text-slate-400">Quantity:</span>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 rounded-lg bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-12 text-center text-lg font-semibold">
                        {quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-10 h-10 rounded-lg bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={addingToCart || (isSubscription && inCart)}
                  variant={inCart && isSubscription ? 'outline' : 'default'}
                  className={`w-full h-14 rounded-xl font-semibold text-lg transition-all duration-300 mb-6 ${
                    inCart && isSubscription
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                      : 'bg-white text-slate-900 hover:bg-slate-100 hover:shadow-lg hover:shadow-white/10'
                  }`}
                >
                  {addingToCart ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : inCart && isSubscription ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      In Cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Add to Cart
                      {!isSubscription && quantity > 1 && ` (${quantity})`}
                    </>
                  )}
                </Button>

                {/* View Cart Button */}
                {inCart && (
                  <Button
                    variant="outline"
                    onClick={() => navigate('/cart')}
                    className="w-full h-12 rounded-xl bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50 mb-6"
                  >
                    View Cart
                  </Button>
                )}

                {/* Trust Badges */}
                <div className="flex flex-wrap gap-4 pt-6 border-t border-slate-700/50">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Shield className="w-4 h-4 text-slate-500" />
                    Secure Checkout
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <CheckCircle className="w-4 h-4 text-slate-500" />
                    Instant Access
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Full Description */}
            {product.description && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-16"
              >
                <h2 className="text-2xl font-bold text-white mb-6">About this product</h2>
                <div className="rounded-2xl bg-gradient-to-b from-slate-800/40 to-slate-900/60 border border-slate-700/40 p-8">
                  <div className="prose prose-invert prose-slate max-w-none">
                    <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {product.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
