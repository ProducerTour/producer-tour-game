/**
 * Shop Page - Public product browsing and add to cart
 * Styled with slate grey theme to match the rest of the platform
 */

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  ShoppingCart,
  Package,
  Download,
  Repeat,
  Check,
  Star,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Header, Footer } from '../components/landing';
import { Container, Button as LandingButton } from '../components/landing/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  DIGITAL: 'Digital',
  DOWNLOADABLE: 'Download',
  PHYSICAL: 'Physical',
  SUBSCRIPTION: 'Subscription',
};

const PRODUCT_TYPE_COLORS: Record<string, string> = {
  SIMPLE: 'from-slate-500/20 to-slate-600/10',
  VARIABLE: 'from-slate-500/20 to-slate-600/10',
  DIGITAL: 'from-slate-500/20 to-slate-600/10',
  DOWNLOADABLE: 'from-emerald-500/20 to-green-500/10',
  PHYSICAL: 'from-amber-500/20 to-orange-500/10',
  SUBSCRIPTION: 'from-slate-600/20 to-slate-700/10',
};

export default function ShopPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  useEffect(() => {
    document.title = 'Shop - Producer Tour';
  }, []);

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['shop-products', searchQuery, typeFilter],
    queryFn: async () => {
      const params: any = { status: 'ACTIVE' };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;
      const response = await shopApi.getProducts(params);
      return response.data;
    },
  });

  const products: Product[] = productsData?.products || [];

  const handleAddToCart = async (product: Product) => {
    setAddingToCart(product.id);

    // Check if subscription already in cart
    if (product.type === 'SUBSCRIPTION') {
      const existingSubscription = cartItems.find(
        (item) => item.productId === product.id && item.type === 'SUBSCRIPTION'
      );
      if (existingSubscription) {
        toast.error('This subscription is already in your cart');
        setAddingToCart(null);
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
      quantity: 1,
      type: product.type,
      image: product.featuredImageUrl || undefined,
      subscriptionInterval: product.subscriptionInterval || undefined,
      subscriptionIntervalCount: product.subscriptionIntervalCount || undefined,
      stripePriceId: product.stripePriceId || undefined,
    });

    toast.success(`${product.name} added to cart`);
    setAddingToCart(null);
  };

  const isInCart = (productId: string) => {
    return cartItems.some((item) => item.productId === productId);
  };

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <main className="pt-28 pb-20">
        {/* Background Effects - Slate Grey Theme */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-radial from-slate-700/20 via-slate-800/10 to-transparent rounded-full opacity-50" />
          <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-slate-600/10 rounded-full opacity-30" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-slate-700/10 rounded-full opacity-40" />
          {/* Subtle grid pattern */}
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
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4 text-slate-400" />
                Producer Tools & Resources
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
                Shop
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Tools, resources, and subscriptions to help you grow your music career
              </p>
            </motion.div>

            {/* Search and Filters */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex flex-col md:flex-row gap-4 mb-12 max-w-2xl mx-auto"
            >
              {/* Search */}
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-foreground transition-colors z-10" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="pl-12 h-12 rounded-xl bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 focus:border-slate-600 focus:bg-slate-900/80"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px] h-12 rounded-xl bg-slate-900/60 border-slate-700/50 text-white focus:border-slate-600">
                  <Filter className="w-5 h-5 text-muted-foreground mr-2" />
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="SUBSCRIPTION">Subscriptions</SelectItem>
                  <SelectItem value="DIGITAL">Digital</SelectItem>
                  <SelectItem value="DOWNLOADABLE">Downloads</SelectItem>
                  <SelectItem value="PHYSICAL">Physical</SelectItem>
                </SelectContent>
              </Select>
            </motion.div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                  <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-slate-500/20 animate-ping" />
                </div>
                <p className="text-slate-500 mt-4">Loading products...</p>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && products.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-20"
              >
                <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-6 shadow-xl">
                  <Package className="w-14 h-14 text-slate-600" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-4">No products found</h2>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  {searchQuery || typeFilter
                    ? 'Try adjusting your search or filter criteria'
                    : 'Check back soon for new products and tools'}
                </p>
                {(searchQuery || (typeFilter && typeFilter !== 'all')) && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                    }}
                    className="bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:text-white"
                  >
                    Clear filters
                  </Button>
                )}
              </motion.div>
            )}

            {/* Products Grid */}
            {!isLoading && products.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, index) => {
                  const TypeIcon = PRODUCT_TYPE_ICONS[product.type] || Package;
                  const inCart = isInCart(product.id);
                  const isAdding = addingToCart === product.id;
                  const price = Number(product.price);
                  const salePrice = product.salePrice ? Number(product.salePrice) : null;
                  const hasDiscount = salePrice && salePrice < price;
                  const typeGradient = PRODUCT_TYPE_COLORS[product.type] || PRODUCT_TYPE_COLORS.SIMPLE;

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      whileHover={{ y: -6, transition: { duration: 0.2 } }}
                      className="group relative rounded-2xl bg-gradient-to-b from-slate-800/40 to-slate-900/60 border border-slate-700/40 overflow-hidden hover:border-slate-600/60 hover:shadow-2xl hover:shadow-slate-900/50 transition-all duration-300"
                    >
                      {/* Subtle glow effect on hover */}
                      <div className="absolute inset-0 bg-gradient-to-b from-slate-700/0 to-slate-700/0 group-hover:from-slate-700/10 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

                      {/* Product Image */}
                      <div className={`relative h-52 bg-gradient-to-br ${typeGradient} overflow-hidden`}>
                        {product.featuredImageUrl ? (
                          <img
                            src={product.featuredImageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-slate-700/30">
                              <TypeIcon className="w-10 h-10 text-slate-500" />
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
                            Sale
                          </Badge>
                        )}

                        {/* Type Badge */}
                        <Badge variant="outline" className="absolute bottom-4 left-4 bg-slate-900/80 text-slate-300 border-slate-700/50">
                          <TypeIcon className="w-3 h-3 mr-1" />
                          {PRODUCT_TYPE_LABELS[product.type]}
                        </Badge>
                      </div>

                      {/* Product Info */}
                      <div className="relative p-6">
                        <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-slate-100 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-slate-400 text-sm mb-5 line-clamp-2 leading-relaxed">
                          {product.shortDescription || product.description}
                        </p>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mb-5">
                          {hasDiscount ? (
                            <>
                              <span className="text-2xl font-bold text-white">
                                ${salePrice!.toFixed(2)}
                              </span>
                              <span className="text-slate-500 line-through text-sm">
                                ${price.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="text-2xl font-bold text-white">
                              ${price.toFixed(2)}
                            </span>
                          )}
                          {product.type === 'SUBSCRIPTION' && product.subscriptionInterval && (
                            <span className="text-slate-500 text-sm">
                              /{product.subscriptionInterval.toLowerCase()}
                            </span>
                          )}
                        </div>

                        {/* Trial Days */}
                        {product.type === 'SUBSCRIPTION' && product.trialDays && product.trialDays > 0 && (
                          <div className="flex items-center gap-2 mb-5">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-emerald-400 text-sm font-medium">
                              {product.trialDays}-day free trial
                            </span>
                          </div>
                        )}

                        {/* Add to Cart Button */}
                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={isAdding || (product.type === 'SUBSCRIPTION' && inCart)}
                          variant={inCart && product.type === 'SUBSCRIPTION' ? 'outline' : 'default'}
                          className={`w-full h-12 rounded-xl font-semibold transition-all duration-300 ${
                            inCart && product.type === 'SUBSCRIPTION'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                              : 'bg-white text-slate-900 hover:bg-slate-100 hover:shadow-lg hover:shadow-white/10'
                          }`}
                        >
                          {isAdding ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Adding...
                            </>
                          ) : inCart && product.type === 'SUBSCRIPTION' ? (
                            <>
                              <Check className="w-5 h-5 mr-2" />
                              In Cart
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="w-5 h-5 mr-2" />
                              Add to Cart
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-24 text-center"
            >
              <div className="relative rounded-2xl bg-gradient-to-b from-slate-800/50 to-slate-900/70 border border-slate-700/40 p-10 md:p-14 max-w-2xl mx-auto overflow-hidden">
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-slate-600/10 rounded-full opacity-50" />
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-slate-700/20 rounded-full opacity-40" />
                </div>

                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Looking for something specific?</h3>
                  <p className="text-slate-400 mb-8 max-w-md mx-auto">
                    Check out our pricing page for subscription bundles and tool packages designed for producers.
                  </p>
                  <LandingButton to="/pricing" variant="primary" size="lg">
                    View Pricing Plans
                  </LandingButton>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
