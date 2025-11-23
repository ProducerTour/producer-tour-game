import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Header } from '../components/landing/Header';

interface FormData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Artist/Producer Information
  artistName: string;
  genre: string;
  yearsExperience: string;

  // Music & Portfolio
  spotifyLink: string;
  appleMusicLink: string;
  soundcloudLink: string;
  instagramHandle: string;

  // Additional Information
  monthlyStreams: string;
  hasDistribution: string;
  hearAboutUs: string;
  additionalInfo: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function ApplicationPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    artistName: '',
    genre: '',
    yearsExperience: '',
    spotifyLink: '',
    appleMusicLink: '',
    soundcloudLink: '',
    instagramHandle: '',
    monthlyStreams: '',
    hasDistribution: '',
    hearAboutUs: '',
    additionalInfo: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{type: 'success' | 'error' | '', text: string}>({type: '', text: ''});

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Required fields
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.artistName.trim()) newErrors.artistName = 'Artist/Producer name is required';
    if (!formData.genre.trim()) newErrors.genre = 'Genre is required';
    if (!formData.yearsExperience) newErrors.yearsExperience = 'Please select your experience level';

    // At least one music link is required
    if (!formData.spotifyLink.trim() && !formData.appleMusicLink.trim() && !formData.soundcloudLink.trim()) {
      newErrors.spotifyLink = 'Please provide at least one music platform link';
    }

    if (!formData.monthlyStreams) newErrors.monthlyStreams = 'Please select your monthly streams';
    if (!formData.hasDistribution) newErrors.hasDistribution = 'Please select an option';
    if (!formData.hearAboutUs) newErrors.hearAboutUs = 'Please let us know how you found us';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      setSubmitMessage({type: 'error', text: 'Please fix the errors above'});
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage({type: '', text: ''});

    try {
      // TODO: Replace with actual API endpoint
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      setSubmitMessage({
        type: 'success',
        text: 'Application submitted successfully! We\'ll review your application and get back to you within 5 business days.'
      });

      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        artistName: '',
        genre: '',
        yearsExperience: '',
        spotifyLink: '',
        appleMusicLink: '',
        soundcloudLink: '',
        instagramHandle: '',
        monthlyStreams: '',
        hasDistribution: '',
        hearAboutUs: '',
        additionalInfo: ''
      });
    } catch {
      setSubmitMessage({
        type: 'error',
        text: 'Something went wrong. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full py-3 px-4 bg-white/10 border border-white/[0.08] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
  const inputErrorClass = "w-full py-3 px-4 bg-white/10 border border-red-500 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all";
  const selectClass = "w-full py-3 px-4 bg-white/10 border border-white/[0.08] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all [&>option]:bg-gray-900 [&>option]:text-white";
  const selectErrorClass = "w-full py-3 px-4 bg-white/10 border border-red-500 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all [&>option]:bg-gray-900 [&>option]:text-white";
  const labelClass = "block text-sm font-medium text-gray-300 mb-2";

  return (
    <div className="min-h-screen bg-surface text-white">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Header */}
        <div className="text-center mb-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium mb-6 transition-all hover:-translate-x-1"
          >
            ← Back to Home
          </Link>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            Apply to Producer Tour
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            Join thousands of independent producers earning real money and taking control of their music careers.
            Your application takes just 5 minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">
          {/* Benefits Sidebar */}
          <div className="lg:sticky lg:top-24 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-8 backdrop-blur-xl">
            <h3 className="text-xl font-semibold text-white mb-6">What You'll Get</h3>
            <ul className="space-y-6">
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </span>
                <div>
                  <strong className="block text-white text-sm font-semibold mb-1">80/20 Split in Your Favor</strong>
                  <p className="text-sm text-gray-400">Keep 80% of all streaming royalties</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </span>
                <div>
                  <strong className="block text-white text-sm font-semibold mb-1">Publishing Administration</strong>
                  <p className="text-sm text-gray-400">Collect royalties you're missing out on</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </span>
                <div>
                  <strong className="block text-white text-sm font-semibold mb-1">Real-Time Analytics</strong>
                  <p className="text-sm text-gray-400">Track earnings and performance live</p>
                </div>
              </li>
              <li className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  ✓
                </span>
                <div>
                  <strong className="block text-white text-sm font-semibold mb-1">Quarterly Payouts</strong>
                  <p className="text-sm text-gray-400">Direct deposits with $50 minimum</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Application Form */}
          <div className="rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/[0.08] p-6 sm:p-10 backdrop-blur-xl">
            <form onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="mb-10 pb-10 border-b border-white/[0.08]">
                <h2 className="text-2xl font-semibold text-white mb-6">Personal Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={errors.firstName ? inputErrorClass : inputClass}
                    />
                    {errors.firstName && <span className="text-red-500 text-sm mt-1 block">{errors.firstName}</span>}
                  </div>

                  <div>
                    <label htmlFor="lastName" className={labelClass}>
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={errors.lastName ? inputErrorClass : inputClass}
                    />
                    {errors.lastName && <span className="text-red-500 text-sm mt-1 block">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? inputErrorClass : inputClass}
                    />
                    {errors.email && <span className="text-red-500 text-sm mt-1 block">{errors.email}</span>}
                  </div>

                  <div>
                    <label htmlFor="phone" className={labelClass}>Phone Number (Optional)</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              {/* Artist/Producer Information */}
              <div className="mb-10 pb-10 border-b border-white/[0.08]">
                <h2 className="text-2xl font-semibold text-white mb-6">Artist/Producer Information</h2>

                <div className="mb-6">
                  <label htmlFor="artistName" className={labelClass}>
                    Artist/Producer Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="artistName"
                    name="artistName"
                    value={formData.artistName}
                    onChange={handleChange}
                    className={errors.artistName ? inputErrorClass : inputClass}
                    placeholder="The name you produce/release music under"
                  />
                  {errors.artistName && <span className="text-red-500 text-sm mt-1 block">{errors.artistName}</span>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="genre" className={labelClass}>
                      Primary Genre <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="genre"
                      name="genre"
                      value={formData.genre}
                      onChange={handleChange}
                      className={errors.genre ? selectErrorClass : selectClass}
                    >
                      <option value="">Select a genre</option>
                      <option value="hip-hop">Hip-Hop/Rap</option>
                      <option value="trap">Trap</option>
                      <option value="rnb">R&B</option>
                      <option value="pop">Pop</option>
                      <option value="indie">Indie</option>
                      <option value="electronic">Electronic</option>
                      <option value="lofi">Lo-Fi</option>
                      <option value="rock">Rock</option>
                      <option value="jazz">Jazz</option>
                      <option value="multi-genre">Multi-Genre</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.genre && <span className="text-red-500 text-sm mt-1 block">{errors.genre}</span>}
                  </div>

                  <div>
                    <label htmlFor="yearsExperience" className={labelClass}>
                      Years of Experience <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="yearsExperience"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className={errors.yearsExperience ? selectErrorClass : selectClass}
                    >
                      <option value="">Select experience</option>
                      <option value="less-than-1">Less than 1 year</option>
                      <option value="1-2">1-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                    {errors.yearsExperience && <span className="text-red-500 text-sm mt-1 block">{errors.yearsExperience}</span>}
                  </div>
                </div>
              </div>

              {/* Music & Portfolio */}
              <div className="mb-10 pb-10 border-b border-white/[0.08]">
                <h2 className="text-2xl font-semibold text-white mb-2">Music & Portfolio</h2>
                <p className="text-sm text-gray-400 mb-6">
                  Please provide at least one link to your music so we can review your work.
                </p>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="spotifyLink" className={labelClass}>Spotify Link</label>
                    <input
                      type="url"
                      id="spotifyLink"
                      name="spotifyLink"
                      value={formData.spotifyLink}
                      onChange={handleChange}
                      className={errors.spotifyLink ? inputErrorClass : inputClass}
                      placeholder="https://open.spotify.com/artist/..."
                    />
                    {errors.spotifyLink && <span className="text-red-500 text-sm mt-1 block">{errors.spotifyLink}</span>}
                  </div>

                  <div>
                    <label htmlFor="appleMusicLink" className={labelClass}>Apple Music Link</label>
                    <input
                      type="url"
                      id="appleMusicLink"
                      name="appleMusicLink"
                      value={formData.appleMusicLink}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="https://music.apple.com/..."
                    />
                  </div>

                  <div>
                    <label htmlFor="soundcloudLink" className={labelClass}>SoundCloud Link</label>
                    <input
                      type="url"
                      id="soundcloudLink"
                      name="soundcloudLink"
                      value={formData.soundcloudLink}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="https://soundcloud.com/..."
                    />
                  </div>

                  <div>
                    <label htmlFor="instagramHandle" className={labelClass}>Instagram Handle (Optional)</label>
                    <input
                      type="text"
                      id="instagramHandle"
                      name="instagramHandle"
                      value={formData.instagramHandle}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="@yourhandle"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mb-10">
                <h2 className="text-2xl font-semibold text-white mb-6">Additional Information</h2>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="monthlyStreams" className={labelClass}>
                      Approximate Monthly Streams <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="monthlyStreams"
                      name="monthlyStreams"
                      value={formData.monthlyStreams}
                      onChange={handleChange}
                      className={errors.monthlyStreams ? selectErrorClass : selectClass}
                    >
                      <option value="">Select range</option>
                      <option value="0-1k">0 - 1,000</option>
                      <option value="1k-10k">1,000 - 10,000</option>
                      <option value="10k-50k">10,000 - 50,000</option>
                      <option value="50k-100k">50,000 - 100,000</option>
                      <option value="100k-500k">100,000 - 500,000</option>
                      <option value="500k+">500,000+</option>
                    </select>
                    {errors.monthlyStreams && <span className="text-red-500 text-sm mt-1 block">{errors.monthlyStreams}</span>}
                  </div>

                  <div>
                    <label htmlFor="hasDistribution" className={labelClass}>
                      Do you currently use a distribution service? <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="hasDistribution"
                      name="hasDistribution"
                      value={formData.hasDistribution}
                      onChange={handleChange}
                      className={errors.hasDistribution ? selectErrorClass : selectClass}
                    >
                      <option value="">Select option</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                    {errors.hasDistribution && <span className="text-red-500 text-sm mt-1 block">{errors.hasDistribution}</span>}
                  </div>

                  <div>
                    <label htmlFor="hearAboutUs" className={labelClass}>
                      How did you hear about Producer Tour? <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="hearAboutUs"
                      name="hearAboutUs"
                      value={formData.hearAboutUs}
                      onChange={handleChange}
                      className={errors.hearAboutUs ? selectErrorClass : selectClass}
                    >
                      <option value="">Select option</option>
                      <option value="social-media">Social Media</option>
                      <option value="google">Google Search</option>
                      <option value="friend">Friend/Colleague</option>
                      <option value="youtube">YouTube</option>
                      <option value="discord">Discord</option>
                      <option value="other">Other</option>
                    </select>
                    {errors.hearAboutUs && <span className="text-red-500 text-sm mt-1 block">{errors.hearAboutUs}</span>}
                  </div>

                  <div>
                    <label htmlFor="additionalInfo" className={labelClass}>
                      Anything else you'd like us to know? (Optional)
                    </label>
                    <textarea
                      id="additionalInfo"
                      name="additionalInfo"
                      value={formData.additionalInfo}
                      onChange={handleChange}
                      rows={5}
                      className={inputClass}
                      placeholder="Tell us about your music career goals, notable achievements, or anything else that might be relevant..."
                    />
                  </div>
                </div>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`p-4 rounded-lg mb-6 text-sm font-medium border ${
                  submitMessage.type === 'success'
                    ? 'bg-green-500/10 border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}>
                  {submitMessage.text}
                </div>
              )}

              {/* Submit Button */}
              <div className="text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[240px] px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
                <p className="text-sm text-gray-500 mt-4 max-w-xl mx-auto leading-relaxed">
                  By submitting this application, you agree to our Terms of Service and Privacy Policy.
                  We'll review your application within 5 business days.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
