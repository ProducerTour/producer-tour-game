import { useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './pages.css';

interface AuthModal {
  isOpen: boolean;
  type: 'login' | 'register';
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

interface PasswordStrength {
  score: number; // 0-3
  label: string;
  color: string;
}

export default function CaseStudyPage() {
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<AuthModal>({ isOpen: false, type: 'login' });
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, label: '', color: '' });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('services');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [expandedAdvantage, setExpandedAdvantage] = useState<number | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Password strength calculation
  const calculatePasswordStrength = (password: string): PasswordStrength => {
    if (!password) return { score: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[!@#$%^&*]/.test(password)) score++;
    
    const strengths = [
      { score: 0, label: '', color: '' },
      { score: 1, label: 'Weak', color: 'bg-red-500' },
      { score: 2, label: 'Fair', color: 'bg-yellow-500' },
      { score: 3, label: 'Good', color: 'bg-blue-500' },
      { score: 4, label: 'Strong', color: 'bg-green-500' },
    ];
    return strengths[Math.min(score, 4)];
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    
    if (authModal.type === 'register' && !formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      console.log('Form submitted:', { ...formData, rememberMe });
      // TODO: Integrate with backend auth API
      setAuthModal({ ...authModal, isOpen: false });
      setFormData({ email: '', password: '', name: '' });
      setRememberMe(false);
      setShowPassword(false);
    }
  };

  // Scroll tracking for active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['services', 'projects'];
      let current = 'services';
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element && element.getBoundingClientRect().top <= 200) {
          current = section;
        }
      }
      setActiveSection(current);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Password strength update
  useEffect(() => {
    setPasswordStrength(calculatePasswordStrength(formData.password));
  }, [formData.password]);

  // Handle slider movement
  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const percentage = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
    setSliderPosition(percentage);
  };

  // PDF Download function
  const downloadPDF = () => {
    const element = document.getElementById('case-study-content');
    if (!element) return;
    
    // Using a simple approach - in production, use jsPDF or similar
    const printWindow = window.open('', '', 'height=600,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Case Study - Jerome Grace</title>');
      printWindow.document.write('<style>body { font-family: Arial; margin: 20px; } h2 { color: #1e40af; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(element.innerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.print();
    }
  };

  // Toggle modal
  const toggleModal = (type?: 'login' | 'register') => {
    if (type) {
      setAuthModal({ isOpen: true, type });
      setFormData({ email: '', password: '', name: '' });
      setFormErrors({});
      setShowPassword(false);
    } else {
      setAuthModal({ ...authModal, isOpen: false });
    }
  };

  return (
    <div className="case-study-page">
      {/* Auth Modal - ENHANCED */}
      {authModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center transition-opacity duration-300 p-4">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {authModal.type === 'login' ? 'Client Login' : 'Register'}
              </h3>
              <button
                onClick={() => toggleModal()}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              {/* Name Field (Register Only) */}
              {authModal.type === 'register' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      formErrors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  {formErrors.name && <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>}
                </div>
              )}

              {/* Email Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                    formErrors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {formErrors.email && <p className="text-red-600 text-sm mt-1">{formErrors.email}</p>}
              </div>

              {/* Password Field with Strength Indicator */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition ${
                      formErrors.password ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-600 hover:text-gray-900"
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-600 text-sm mt-1">{formErrors.password}</p>}

                {/* Password Strength Indicator */}
                {authModal.type === 'register' && formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password Strength</span>
                      {passwordStrength.label && (
                        <span className={`text-xs font-semibold ${
                          passwordStrength.color === 'bg-red-500' ? 'text-red-600' :
                          passwordStrength.color === 'bg-yellow-500' ? 'text-yellow-600' :
                          passwordStrength.color === 'bg-blue-500' ? 'text-blue-600' :
                          'text-green-600'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${passwordStrength.color}`}
                        style={{ width: `${(passwordStrength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Remember Me / Forgot Password */}
              <div className="flex items-center justify-between mb-6">
                {authModal.type === 'login' ? (
                  <>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="mr-2 w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                      Remember me
                    </label>
                    <a href="#" className="text-sm text-blue-700 hover:text-blue-800">
                      Forgot password?
                    </a>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">
                    At least 8 characters with mixed case and numbers
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full px-5 py-2 rounded-full font-semibold text-white bg-blue-700 hover:bg-blue-800 transition duration-200"
              >
                {authModal.type === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            {/* Social Login Options */}
            <div className="mt-6">
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
                  title="Google"
                >
                  🔍
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
                  title="Apple"
                >
                  🍎
                </button>
                <button
                  type="button"
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center"
                  title="GitHub"
                >
                  💻
                </button>
              </div>
            </div>

            {/* Toggle Between Login/Register */}
            <p className="text-center text-gray-500 mt-6 text-sm">
              {authModal.type === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => toggleModal('register')}
                    className="text-blue-700 hover:text-blue-800 font-semibold"
                  >
                    Register
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => toggleModal('login')}
                    className="text-blue-700 hover:text-blue-800 font-semibold"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Header & Navigation - ENHANCED */}
      <header className="sticky top-0 z-40 bg-white shadow-md">
        <div className="px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/admin')}
              className="text-gray-600 hover:text-gray-900 mr-4 transition"
              title="Back to Dashboard"
            >
              ← Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Jerome Grace</h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8 items-center text-lg font-medium text-gray-700">
            <a 
              href="#services" 
              className={`transition duration-150 pb-1 border-b-2 ${
                activeSection === 'services' 
                  ? 'text-blue-700 border-blue-700' 
                  : 'hover:text-blue-700 border-transparent'
              }`}
            >
              Services
            </a>
            <a 
              href="#projects" 
              className={`transition duration-150 pb-1 border-b-2 ${
                activeSection === 'projects' 
                  ? 'text-blue-700 border-blue-700' 
                  : 'hover:text-blue-700 border-transparent'
              }`}
            >
              Project
            </a>
            <button
              onClick={downloadPDF}
              className="px-4 py-1 text-sm text-gray-600 hover:text-blue-700 transition border border-gray-300 rounded-lg"
              title="Download as PDF"
            >
              📥 PDF
            </button>
            <button
              onClick={() => toggleModal('login')}
              className="px-5 py-2 rounded-full font-semibold text-white bg-blue-700 hover:bg-blue-800 transition duration-200 shadow-lg"
            >
              Login
            </button>
            <button
              onClick={() => toggleModal('register')}
              className="px-5 py-2 rounded-full font-semibold border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white transition duration-200"
            >
              Register
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-gray-700 hover:text-blue-700 transition"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-gray-50 border-t border-gray-200 px-4 py-4 space-y-4">
            <a 
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition ${
                activeSection === 'services' 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Services
            </a>
            <a 
              href="#projects"
              onClick={() => setMobileMenuOpen(false)}
              className={`block py-2 px-4 rounded-lg transition ${
                activeSection === 'projects' 
                  ? 'text-blue-700 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Project
            </a>
            <button
              onClick={() => {
                downloadPDF();
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left py-2 px-4 rounded-lg text-gray-700 hover:bg-gray-100 transition"
            >
              📥 Download PDF
            </button>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  toggleModal('login');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-4 py-2 rounded-full font-semibold text-white bg-blue-700 hover:bg-blue-800 transition"
              >
                Login
              </button>
              <button
                onClick={() => {
                  toggleModal('register');
                  setMobileMenuOpen(false);
                }}
                className="flex-1 px-4 py-2 rounded-full font-semibold border-2 border-blue-700 text-blue-700 hover:bg-blue-700 hover:text-white transition"
              >
                Register
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-gray-50">
          <div className="px-4 sm:px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-4 text-gray-900">
              Structure. <span className="text-blue-700">Strategy.</span> Scale.
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-8">
              High-impact management and consulting services for <strong>artists, producers, record labels, and publishers</strong> seeking disciplined, measurable growth.
            </p>
            <a
              href="#projects"
              className="inline-block px-10 py-4 text-lg font-semibold rounded-full bg-blue-700 hover:bg-blue-800 text-white shadow-xl transition duration-300 transform hover:scale-105"
            >
              See The Artist Starter Kit
            </a>
          </div>
        </section>

        {/* Impact Metrics Section */}
        <section className="py-12 md:py-16 bg-blue-50 border-b border-blue-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-700 mb-2">+45%</div>
                <p className="text-gray-700 font-medium">Revenue Growth</p>
                <p className="text-sm text-gray-600 mt-1">In first 6 months</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-700 mb-2">8/10</div>
                <p className="text-gray-700 font-medium">Platforms Optimized</p>
                <p className="text-sm text-gray-600 mt-1">From scattered presence</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-blue-700 mb-2">4</div>
                <p className="text-gray-700 font-medium">Phase Implementation</p>
                <p className="text-sm text-gray-600 mt-1">Structured roadmap</p>
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-16 md:py-24 bg-white">
          <div className="px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">What We Deliver</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Service 1 */}
              <div className="bg-gray-50 p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-blue-500/30">
                <div className="text-3xl mb-3">💡</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Consulting Services</h3>
                <p className="text-gray-600">
                  Custom, full-cycle campaigns—from foundational setup to market saturation. Includes focused, high-value sessions to tackle specific roadblocks like DSP optimization or revenue leakage, plus complete career blueprints.
                </p>
              </div>

              {/* Service 2 */}
              <div className="bg-gray-50 p-6 rounded-xl shadow-lg transition duration-300 hover:shadow-blue-500/30">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Management Services</h3>
                <p className="text-gray-600">
                  Dedicated, ongoing oversight of strategic execution, team coordination, and monetization efforts, ensuring your long-term vision is realized with discipline and measurable results.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Case Study Section */}
        <section id="projects" className="py-16 md:py-24 bg-gray-50">
          <div className="px-4 sm:px-6 lg:px-8">
            <h2 className="text-4xl font-bold text-center mb-16 text-gray-900">Our Project in Action</h2>
            <h3 className="text-3xl font-semibold text-center mb-12 text-gray-900">
              CASE STUDY: LAUNCHING THE <span className="text-blue-700">FLOGO (@BAYFLOGO)</span> LEGACY
            </h3>

            <div id="case-study-content" className="bg-white rounded-2xl p-8 lg:p-12 shadow-2xl space-y-10 border border-gray-200">
              {/* Team & Problem Summary */}
              <div className="text-center mb-8">
                <p className="text-gray-600 italic max-w-4xl mx-auto">
                  This campaign is led by <strong>Publius Global</strong> under the direction of <strong>O. Mouton</strong>, in coordination with <strong>ArtRevSol</strong> and <strong>Organic Music Marketing</strong>, forming a stellar 4G label team dedicated to elevating Flogo's music career and beyond.
                </p>
              </div>

              {/* The Problem */}
              <div className="border-b border-blue-700 pb-8">
                <h4 className="text-2xl font-bold text-blue-700 mb-4">THE PROBLEM: A SCATTERED PRESENCE</h4>
                <p className="text-lg text-gray-700 mb-6">
                  Your current digital footprint is fragmented, which dilutes your brand and creates missed opportunities. This section breaks down the key challenges we've identified that are holding back your growth.
                </p>

                {/* Before/After Comparison Slider */}
                <div className="mb-8 bg-gradient-to-r from-red-50 to-blue-50 p-6 rounded-xl">
                  <p className="text-center text-sm text-gray-600 mb-4 font-semibold">Drag to see the transformation →</p>
                  <div
                    ref={sliderRef}
                    className="relative h-64 bg-gray-200 rounded-lg overflow-hidden cursor-col-resize"
                    onMouseMove={handleSliderMove}
                    onTouchMove={handleSliderMove}
                    onMouseLeave={() => {}}
                  >
                    {/* Before (Left) */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-100 to-red-50 flex flex-col items-center justify-center">
                      <div className="text-red-700 text-center">
                        <div className="text-3xl font-bold mb-2">❌</div>
                        <p className="text-lg font-bold">BEFORE</p>
                        <p className="text-sm mt-2">Scattered profiles</p>
                        <p className="text-sm">Lost revenue</p>
                        <p className="text-sm">No strategy</p>
                      </div>
                    </div>

                    {/* After (Right) */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-green-100 to-blue-50 flex flex-col items-center justify-center"
                      style={{ width: `${100 - sliderPosition}%`, right: 0 }}
                    >
                      <div className="text-green-700 text-center">
                        <div className="text-3xl font-bold mb-2">✅</div>
                        <p className="text-lg font-bold">AFTER</p>
                        <p className="text-sm mt-2">Unified presence</p>
                        <p className="text-sm">Revenue growth</p>
                        <p className="text-sm">Clear strategy</p>
                      </div>
                    </div>

                    {/* Slider Handle */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg transition-none"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-gray-400 rounded-full p-2 shadow-lg">
                        <div className="w-1 h-6 bg-gray-400"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      problem: { title: 'PROFILE DUPLICATION', desc: 'Multiple profiles on Spotify, Pandora, and Chartmetric create confusion.' },
                      solution: { title: 'UNIFIED PROFILES', desc: 'Single verified profiles across all platforms with consistent branding.' }
                    },
                    {
                      problem: { title: 'UNCLAIMED PLATFORMS', desc: 'Key profiles on Tidal, Deezer, and Amazon are unclaimed.' },
                      solution: { title: 'CLAIMED OWNERSHIP', desc: 'Full control and revenue access on every platform.' }
                    },
                    {
                      problem: { title: 'NO CENTRAL HUB', desc: "Without an official Flogo.com, fans have nowhere to go." },
                      solution: { title: 'OFFICIAL FLOGO.COM', desc: 'Centralized hub for fans, merch, and booking inquiries.' }
                    },
                    {
                      problem: { title: 'DISORGANIZED CONTENT', desc: 'Fragmented YouTube preventing revenue capitalization.' },
                      solution: { title: 'ORGANIZED STRATEGY', desc: 'Coherent content across all channels maximizing revenue.' }
                    },
                  ].map((item, idx) => {
                    const problemOpacity = Math.max(0, sliderPosition / 100);
                    const solutionOpacity = Math.max(0, (100 - sliderPosition) / 100);
                    
                    return (
                      <div key={idx} className="p-4 rounded-lg border-l-4 shadow-sm relative overflow-hidden transition-all duration-200">
                        {/* Problem State (Left) */}
                        <div 
                          className="absolute inset-0 bg-red-50 border-l-4 border-red-500"
                          style={{ opacity: problemOpacity }}
                        />
                        
                        {/* Solution State (Right) */}
                        <div 
                          className="absolute inset-0 bg-green-50 border-l-4 border-green-500"
                          style={{ opacity: solutionOpacity }}
                        />
                        
                        {/* Content */}
                        <div className="relative z-10">
                          {/* Problem Text */}
                          <div style={{ opacity: problemOpacity, pointerEvents: problemOpacity === 0 ? 'none' : 'auto' }}>
                            <span className="font-bold text-red-700">{idx + 1}. {item.problem.title}:</span>
                            <p className="text-red-600 text-sm mt-1">{item.problem.desc}</p>
                          </div>
                          
                          {/* Solution Text */}
                          <div style={{ opacity: solutionOpacity, pointerEvents: solutionOpacity === 0 ? 'none' : 'auto', marginTop: solutionOpacity > 0 ? '0' : '-100%' }}>
                            <span className="font-bold text-green-700">{idx + 1}. {item.solution.title}:</span>
                            <p className="text-green-600 text-sm mt-1">{item.solution.desc}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* The Solution */}
              <div className="border-b border-blue-700 pb-8">
                <h4 className="text-2xl font-bold text-blue-700 mb-6">THE SOLUTION: THE ARTIST STARTER KIT</h4>
                <p className="text-lg text-gray-700 mb-8 max-w-4xl mx-auto">
                  The <strong>Artist Starter Kit</strong> is our unified, seamless methodology designed to ensure your past work is preserved and your future momentum is maximized.
                </p>

                {/* Archive & Amplify */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-400">
                    <div className="text-3xl font-extrabold text-blue-700 mb-2">ARCHIVE</div>
                    <h5 className="text-xl font-bold text-gray-900 mb-2">Legacy Preservation & Foundation Building</h5>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      <li>Meticulously catalog and protect master works and IP.</li>
                      <li>Unify and claim all scattered digital profiles and data sources.</li>
                      <li>Standardize metadata and branding for long-term consistency.</li>
                    </ul>
                  </div>

                  <div className="bg-blue-50 p-6 rounded-xl border border-blue-400">
                    <div className="text-3xl font-extrabold text-blue-700 mb-2">AMPLIFY</div>
                    <h5 className="text-xl font-bold text-gray-900 mb-2">Maximizing Output, Reach, and Earnings</h5>
                    <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm">
                      <li>Develop data-driven content release schedules.</li>
                      <li>Strategically adapt content for viral trends without compromising integrity.</li>
                      <li>Execute targeted ad campaigns for measurable ROI and fan acquisition.</li>
                    </ul>
                  </div>
                </div>

                {/* Phases - Timeline */}
                <h5 className="text-xl font-bold text-gray-900 mb-8 border-b pb-2">Starter Kit Phases (The Execution Roadmap)</h5>
                
                {/* Timeline Container */}
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="hidden md:block absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-blue-300 to-blue-500" />
                  
                  {/* Phases Grid */}
                  <div className="grid md:grid-cols-4 gap-6 md:gap-2">
                    {[
                      {
                        phase: 'PHASE 1',
                        title: 'CLAIMS & OPTIMIZATION',
                        desc: 'Secure all unclaimed profiles and standardize existing ones.',
                        duration: 'Weeks 1-4',
                        icon: '🔐',
                      },
                      {
                        phase: 'PHASE 2',
                        title: 'STRATEGIC PLANNING',
                        desc: 'Develop release schedule for new music and legacy content.',
                        duration: 'Weeks 5-8',
                        icon: '📋',
                      },
                      {
                        phase: 'PHASE 3',
                        title: 'IMPLEMENTATION & LAUNCH',
                        desc: 'Oversee content rollout, digital ads, and brand initiatives.',
                        duration: 'Weeks 9-16',
                        icon: '🚀',
                      },
                      {
                        phase: 'PHASE 4',
                        title: 'OBSERVATION & TRACKING',
                        desc: 'Continuous monitoring and iterative refinement.',
                        duration: 'Ongoing',
                        icon: '📊',
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="relative md:pt-28 hover:scale-105 transition-transform duration-300"
                      >
                        {/* Timeline Circle */}
                        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 -top-2 w-8 h-8 bg-white border-4 border-blue-500 rounded-full items-center justify-center text-blue-700 font-bold text-xs z-10">
                          {idx + 1}
                        </div>
                        
                        {/* Phase Card */}
                        <div className="bg-white border-2 border-blue-200 rounded-xl p-5 h-full hover:border-blue-500 hover:shadow-lg transition">
                          <div className="text-3xl mb-2 text-center">{item.icon}</div>
                          <h6 className="text-xs font-bold text-blue-600 mb-1">{item.phase}</h6>
                          <h5 className="text-sm font-bold text-gray-900 mb-2">{item.title}</h5>
                          <p className="text-xs text-gray-600 mb-3">{item.desc}</p>
                          <p className="text-xs text-blue-700 font-semibold">⏱️ {item.duration}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategic Advantages - INTERACTIVE */}
              <div>
                <h4 className="text-2xl font-bold text-blue-700 mb-4">STRATEGIC ADVANTAGES: YOUR UNMATCHED READINESS</h4>
                <p className="text-lg text-gray-700 mb-6">
                  Flogo, your current level of preparedness significantly boosts the viability of this ambitious plan. We are poised for extraordinary impact.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    {
                      title: 'Authentic Fan Base',
                      icon: '👥',
                      details: 'Genuine, engaged community that trusts your vision and actively supports releases.',
                    },
                    {
                      title: 'Proven Track Record',
                      icon: '🏆',
                      details: 'Demonstrated success with consistent releases and growing platform presence.',
                    },
                    {
                      title: 'Strategic Partners',
                      icon: '🤝',
                      details: 'Established relationships with industry leaders amplifying reach and credibility.',
                    },
                    {
                      title: 'Technical Infrastructure',
                      icon: '⚙️',
                      details: 'Robust systems and tools ready for high-volume distribution and analytics.',
                    },
                    {
                      title: 'Market Positioning',
                      icon: '🎯',
                      details: 'Unique positioning in the market with clear differentiation from competitors.',
                    },
                    {
                      title: 'Growth Potential',
                      icon: '📈',
                      details: 'Significant untapped opportunities for revenue growth and audience expansion.',
                    },
                  ].map((advantage, idx) => (
                    <div
                      key={idx}
                      onClick={() => setExpandedAdvantage(expandedAdvantage === idx ? null : idx)}
                      className={`p-4 rounded-lg border-l-4 border-blue-700 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-lg ${
                        expandedAdvantage === idx
                          ? 'bg-blue-100 border-l-8 scale-105'
                          : 'bg-blue-50 hover:bg-blue-75'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <span className="text-2xl">{advantage.icon}</span>
                        <div className="flex-1">
                          <p className="font-bold text-blue-700">{advantage.title}</p>
                          {expandedAdvantage === idx && (
                            <p className="text-sm text-gray-700 mt-2 animate-in fade-in duration-300">
                              {advantage.details}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2 text-right">
                        {expandedAdvantage === idx ? '▼' : '▶'} Click to {expandedAdvantage === idx ? 'collapse' : 'expand'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-blue-700">
          <div className="px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Structure. Strategy. Scale.</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">
              Let's discuss how the Artist Starter Kit can transform your music career.
            </p>
            <button
              onClick={() => toggleModal('login')}
              className="px-10 py-4 text-lg font-semibold rounded-full bg-white text-blue-700 hover:bg-gray-100 shadow-xl transition duration-300 transform hover:scale-105"
            >
              Get Started Today
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}