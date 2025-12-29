import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import './pages.css';

const BUSINESS_TYPES = [
  { value: 'record-label', label: 'Record Label' },
  { value: 'management', label: 'Artist Management' },
  { value: 'publishing', label: 'Music Publishing' },
  { value: 'distribution', label: 'Distribution Company' },
  { value: 'marketing', label: 'Marketing Agency' },
  { value: 'studio', label: 'Recording Studio' },
  { value: 'brand', label: 'Brand/Corporate' },
  { value: 'platform', label: 'Music Platform/Tech' },
  { value: 'other', label: 'Other' },
];

const SERVICES = [
  {
    value: 'catalog-production',
    title: 'Catalog Production',
    desc: 'Large-scale music production for artist rosters or catalogs',
  },
  {
    value: 'executive-production',
    title: 'Executive Production',
    desc: 'Full project oversight, A&R direction, and creative strategy',
  },
  {
    value: 'sync-licensing',
    title: 'Sync & Licensing',
    desc: 'Music production for commercials, TV, film, and media',
  },
  {
    value: 'artist-development',
    title: 'Artist Development',
    desc: 'Long-term partnerships for roster talent development',
  },
  {
    value: 'white-label',
    title: 'White Label Services',
    desc: 'Production services under your brand or label',
  },
  {
    value: 'consulting',
    title: 'Strategic Consulting',
    desc: 'Business strategy, workflow optimization, and industry insights',
  },
];

interface FormData {
  // Company Info
  companyName: string;
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  // Business Details
  businessType: string;
  companySize: string;
  budget: string;
  // Services
  services: string[];
  // Project Details
  projectScope: string;
  timeline: string;
  additionalInfo: string;
  // Terms
  agreeTerms: boolean;
}

export default function ConsultationFormPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    firstName: '',
    lastName: '',
    title: '',
    email: '',
    phone: '',
    website: '',
    businessType: '',
    companySize: '',
    budget: '',
    services: [],
    projectScope: '',
    timeline: '',
    additionalInfo: '',
    agreeTerms: false,
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleServiceChange = (serviceValue: string) => {
    setFormData((prev) => ({
      ...prev,
      services: prev.services.includes(serviceValue)
        ? prev.services.filter((s) => s !== serviceValue)
        : [...prev.services, serviceValue],
    }));
  };

  const validateForm = () => {
    if (
      !formData.companyName ||
      !formData.firstName ||
      !formData.lastName ||
      !formData.title ||
      !formData.email ||
      !formData.phone ||
      !formData.website ||
      !formData.businessType ||
      !formData.budget ||
      !formData.projectScope ||
      !formData.timeline ||
      !formData.agreeTerms
    ) {
      setError('Please fill out all required fields');
      return false;
    }
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // TODO: Integrate with backend API
      const response = await fetch('/api/consultations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        // Reset form
        setFormData({
          companyName: '',
          firstName: '',
          lastName: '',
          title: '',
          email: '',
          phone: '',
          website: '',
          businessType: '',
          companySize: '',
          budget: '',
          services: [],
          projectScope: '',
          timeline: '',
          additionalInfo: '',
          agreeTerms: false,
        });
        setTimeout(() => navigate('/admin'), 3000);
      } else {
        setError('Failed to submit form. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-3xl font-bold text-white mb-4">Thank You!</h1>
          <p className="text-slate-300 mb-8">
            Your consultation request has been submitted successfully. We'll be in touch within 24 hours.
          </p>
          <button
            onClick={() => navigate('/admin')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      style={{
        backgroundImage: `
          radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.16), transparent 55%),
          radial-gradient(circle at 88% 12%, rgba(147, 197, 253, 0.18), transparent 58%)
        `,
      }}
    >
      {/* Back Button */}
      <div className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={() => navigate('/admin')}
          className="text-slate-300 hover:text-white transition flex items-center gap-2"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div
          className="bg-white rounded-3xl p-12 mb-8 text-center shadow-2xl relative overflow-hidden"
          style={{
            backgroundImage: 'radial-gradient(circle at top, rgba(96, 165, 250, 0.08), transparent 65%)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
            style={{
              backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.32), transparent 60%)',
            }}
          >
            <span className="text-white font-bold text-lg tracking-wider">PT</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3">Business Consultation Request</h1>
          <p className="text-slate-600">
            Partner with us to grow your music business. We'll schedule a strategic consultation within 24 hours.
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-3xl p-10 border border-slate-700 shadow-2xl"
          style={{
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
          }}
        >
          {error && (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Company Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">Company Information</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Company/Brand Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleInputChange}
                    placeholder="Your company name"
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Contact First Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="John"
                      className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Contact Last Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Doe"
                      className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Your Title/Role <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    placeholder="CEO, A&R Director, Manager, etc."
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Business Email <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="contact@company.com"
                      className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-2">
                      Phone Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                      className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Company Website/Social Media <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://yourcompany.com"
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">Business Details</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Type of Business <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="businessType"
                    value={formData.businessType}
                    onChange={handleInputChange}
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 focus:border-blue-500 focus:outline-none transition"
                  >
                    <option value="">Select business type...</option>
                    {BUSINESS_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">Company Size</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {['1-10', '11-50', '51-200', '200+'].map((size) => (
                      <label key={size} className="relative flex items-center">
                        <input
                          type="radio"
                          name="companySize"
                          value={size}
                          checked={formData.companySize === size}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex-1 p-3 bg-slate-900/45 border border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 transition text-center text-slate-300 font-medium">
                          {size}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Project Budget Range <span className="text-red-400">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: '5k-15k', label: '$5K - $15K' },
                      { value: '15k-50k', label: '$15K - $50K' },
                      { value: '50k-100k', label: '$50K - $100K' },
                      { value: '100k-plus', label: '$100K+' },
                    ].map((budget) => (
                      <label key={budget.value} className="relative flex items-center">
                        <input
                          type="radio"
                          name="budget"
                          value={budget.value}
                          checked={formData.budget === budget.value}
                          onChange={handleInputChange}
                          className="sr-only"
                        />
                        <div className="flex-1 p-3 bg-slate-900/45 border border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 transition text-center text-slate-300 font-medium">
                          {budget.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Partnership Interests */}
            <div className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">Partnership Interests</h2>

              <div className="space-y-3">
                {SERVICES.map((service) => (
                  <label
                    key={service.value}
                    className="flex items-start gap-3 p-4 bg-slate-900/45 border border-slate-600 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-slate-900/60 transition"
                  >
                    <input
                      type="checkbox"
                      checked={formData.services.includes(service.value)}
                      onChange={() => handleServiceChange(service.value)}
                      className="mt-1 w-5 h-5 rounded accent-blue-500"
                    />
                    <div>
                      <div className="font-semibold text-slate-200">{service.title}</div>
                      <div className="text-sm text-slate-400">{service.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Partnership Details */}
            <div className="border-t border-slate-700 pt-8">
              <h2 className="text-2xl font-bold text-slate-100 mb-6 tracking-tight">Partnership Details</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Describe Your Business Needs <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="projectScope"
                    value={formData.projectScope}
                    onChange={handleInputChange}
                    placeholder="Tell us about your business objectives, current challenges, and what you're looking to accomplish with this partnership..."
                    rows={5}
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-2">Include information about your roster, current operations, and strategic goals</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Preferred Timeline <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="timeline"
                    value={formData.timeline}
                    onChange={handleInputChange}
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 focus:border-blue-500 focus:outline-none transition"
                  >
                    <option value="">Select timeline...</option>
                    <option value="immediate">Immediate (Within 2 weeks)</option>
                    <option value="1-month">1 Month</option>
                    <option value="2-3-months">2-3 Months</option>
                    <option value="ongoing">Ongoing Partnership</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">Additional Information</label>
                  <textarea
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleInputChange}
                    placeholder="Anything else we should know?"
                    rows={3}
                    className="w-full px-5 py-3 bg-slate-900/60 border border-slate-600 rounded-2xl text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none transition resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="border-t border-slate-700 pt-8">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 rounded accent-blue-500"
                />
                <span className="text-sm text-slate-300">
                  I agree to the terms and conditions and understand that Producer Tour will contact me within 24 hours to discuss this consultation request.
                </span>
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-2xl transition shadow-lg mt-8"
            >
              {loading ? 'Submitting...' : 'Submit Consultation Request'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}