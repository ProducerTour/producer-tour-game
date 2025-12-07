import { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, User } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import ptLogo from '../assets/images/logos/whitetransparentpt.png';

// Cassette theme colors
// #000000 - Pure Black (background)
// #19181a - Soft Black (cards)
// #f0e226 - Yellow (accent)

// Yellow accent text component
function YellowText({ children }: { children: React.ReactNode }) {
  return <span className="text-[#f0e226]">{children}</span>;
}

// Magnetic button component
function MagneticButton({
  children,
  type = 'button',
  onClick,
  disabled,
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const baseStyles =
    variant === 'primary'
      ? 'bg-[#f0e226] text-black hover:bg-white'
      : 'border border-[#f0e226] text-[#f0e226] hover:bg-[#f0e226] hover:text-black';

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ x: springX, y: springY }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center justify-center gap-3 px-8 py-4 font-medium uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${baseStyles} ${className}`}
    >
      {children}
    </motion.button>
  );
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuth } = useAuthStore();

  // Get return URL from query params (for redirecting after login)
  const returnUrl = searchParams.get('returnUrl');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        // Validation for sign up
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 10) {
          setError('Password must be at least 10 characters');
          setLoading(false);
          return;
        }

        // Register new user (defaults to CUSTOMER role)
        const response = await authApi.register({
          email,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        });
        setAuth(response.data.user, response.data.token, rememberMe);
      } else {
        // Login existing user - pass rememberMe to get appropriate token expiration
        const response = await authApi.login(email, password, rememberMe);
        setAuth(response.data.user, response.data.token, rememberMe);
      }

      // Wait for Zustand persist to complete before navigating
      setTimeout(() => {
        // Redirect to return URL if provided, otherwise dashboard
        const redirectTo = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
        navigate(redirectTo);
      }, 100);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error;
      if (Array.isArray(errorMsg)) {
        setError(errorMsg[0]?.message || 'An error occurred');
      } else {
        setError(errorMsg || (isSignUp ? 'Registration failed' : 'Login failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-black flex">
      {/* Noise texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-50">
        <svg className="w-full h-full">
          <filter id="loginNoise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#loginNoise)" />
        </svg>
      </div>

      {/* Left Side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 border-r border-white/5">
        {/* Subtle yellow glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#f0e226]/5 rounded-full blur-[150px]" />

        <div className="relative z-10 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className="inline-flex items-center gap-4 mb-12 group">
              <img src={ptLogo} alt="Producer Tour" className="h-12 w-auto" />
            </Link>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-px bg-[#f0e226]" />
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Welcome</span>
              <div className="w-12 h-px bg-[#f0e226]" />
            </div>

            <h1 className="text-4xl lg:text-5xl font-normal text-white mb-6 leading-[1.1]">
              Your royalties,{' '}
              <YellowText>simplified</YellowText>
            </h1>

            <p className="text-lg text-white/60 mb-12 leading-relaxed">
              Join thousands of producers who've taken control of their publishing royalties. Track, manage, and collect what you're owed.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8">
              <div>
                <div className="text-3xl font-light text-white mb-1">500+</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Active Producers</div>
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-1">$2M+</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Royalties Tracked</div>
              </div>
              <div>
                <div className="text-3xl font-light text-white mb-1">98%</div>
                <div className="text-xs uppercase tracking-[0.2em] text-white/40">Satisfaction</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        {/* Subtle yellow glow for mobile */}
        <div className="lg:hidden absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#f0e226]/5 rounded-full blur-[100px]" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/" className="inline-block">
              <img src={ptLogo} alt="Producer Tour" className="h-10 w-auto mx-auto" />
            </Link>
          </div>

          {/* Login/SignUp Card */}
          <div className="bg-[#19181a] border border-white/10 p-8 sm:p-10">
            <div className="mb-8">
              <h2 className="text-2xl font-normal text-white mb-2">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-white/40">
                {isSignUp ? 'Sign up to get started with Producer Tour' : 'Sign in to access your dashboard'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 p-4"
                >
                  <p className="text-sm text-red-400">{error}</p>
                </motion.div>
              )}

              {/* Name Fields (Sign Up only) */}
              {isSignUp && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                      First Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="w-4 h-4 text-white/40" />
                      </div>
                      <input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226] transition-colors"
                        placeholder="John"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226] transition-colors"
                      placeholder="Doe"
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs uppercase tracking-[0.2em] text-white/40">
                    Password
                  </label>
                  {!isSignUp && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#f0e226] hover:text-white transition-colors"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-white/40" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226] transition-colors"
                    placeholder={isSignUp ? 'Create a password (min 10 chars)' : 'Enter your password'}
                  />
                </div>
              </div>

              {/* Confirm Password Field (Sign Up only) */}
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-xs uppercase tracking-[0.2em] text-white/40 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-white/40" />
                    </div>
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-black border border-white/20 text-white placeholder-white/30 focus:outline-none focus:border-[#f0e226] transition-colors"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>
              )}

              {/* Remember Me Checkbox */}
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 border-white/20 bg-black text-[#f0e226] focus:ring-[#f0e226]/50 focus:ring-offset-0 cursor-pointer accent-[#f0e226]"
                />
                <label htmlFor="rememberMe" className="ml-3 text-sm text-white/40 cursor-pointer select-none">
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <MagneticButton
                type="submit"
                disabled={loading}
                variant="primary"
                className="w-full text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </>
                ) : (
                  <>
                    {isSignUp ? 'Create Account' : 'Sign in'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </MagneticButton>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-[#19181a] text-white/40 uppercase tracking-wider">
                  {isSignUp ? 'Already have an account?' : 'New to Producer Tour?'}
                </span>
              </div>
            </div>

            {/* Toggle Sign Up / Sign In */}
            <MagneticButton
              onClick={toggleMode}
              variant="secondary"
              className="w-full text-sm"
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
              <ArrowRight className="w-4 h-4" />
            </MagneticButton>

            {/* Apply Link (for writers) */}
            {!isSignUp && (
              <>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-4 bg-[#19181a] text-white/40 uppercase tracking-wider">Looking for writer membership?</span>
                  </div>
                </div>
                <Link
                  to="/apply"
                  className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-[#f0e226]/10 text-[#f0e226] font-medium uppercase tracking-wider text-sm border border-[#f0e226]/20 hover:bg-[#f0e226]/20 hover:border-[#f0e226]/30 transition-all"
                >
                  Apply for writer membership
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Footer Links */}
          <div className="mt-8 text-center">
            <p className="text-xs text-white/30">
              By signing in, you agree to our{' '}
              <a href="#terms" className="text-white/50 hover:text-[#f0e226] transition-colors">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#privacy" className="text-white/50 hover:text-[#f0e226] transition-colors">
                Privacy Policy
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
