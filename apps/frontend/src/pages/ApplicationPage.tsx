import { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicNavigation from '../components/PublicNavigation';
import './ApplicationPage.css';

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
    } catch (error) {
      setSubmitMessage({
        type: 'error',
        text: 'Something went wrong. Please try again later.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="application-page">
      <PublicNavigation transparent={false} />

      <div className="application-container">
        <div className="application-header">
          <Link to="/" className="back-link">
            ← Back to Home
          </Link>
          <h1>Apply to Producer Tour</h1>
          <p className="subtitle">
            Join thousands of independent producers earning real money and taking control of their music careers.
            Your application takes just 5 minutes.
          </p>
        </div>

        <div className="application-content">
          {/* Progress Indicators */}
          <div className="application-benefits">
            <h3>What You'll Get</h3>
            <ul>
              <li>
                <span className="benefit-icon">✓</span>
                <div>
                  <strong>80/20 Split in Your Favor</strong>
                  <p>Keep 80% of all streaming royalties</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">✓</span>
                <div>
                  <strong>Global Distribution</strong>
                  <p>Reach 150+ platforms in 24-48 hours</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">✓</span>
                <div>
                  <strong>Real-Time Analytics</strong>
                  <p>Track earnings and performance live</p>
                </div>
              </li>
              <li>
                <span className="benefit-icon">✓</span>
                <div>
                  <strong>Monthly Payouts</strong>
                  <p>Direct deposits with $1 minimum</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Application Form */}
          <div className="application-form-container">
            <form className="application-form" onSubmit={handleSubmit}>
              {/* Personal Information */}
              <div className="form-section">
                <h2>Personal Information</h2>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className={errors.firstName ? 'error' : ''}
                    />
                    {errors.firstName && <span className="error-message">{errors.firstName}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName">
                      Last Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className={errors.lastName ? 'error' : ''}
                    />
                    {errors.lastName && <span className="error-message">{errors.lastName}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="email">
                      Email Address <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className={errors.email ? 'error' : ''}
                    />
                    {errors.email && <span className="error-message">{errors.email}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              {/* Artist/Producer Information */}
              <div className="form-section">
                <h2>Artist/Producer Information</h2>

                <div className="form-group">
                  <label htmlFor="artistName">
                    Artist/Producer Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="artistName"
                    name="artistName"
                    value={formData.artistName}
                    onChange={handleChange}
                    className={errors.artistName ? 'error' : ''}
                    placeholder="The name you produce/release music under"
                  />
                  {errors.artistName && <span className="error-message">{errors.artistName}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="genre">
                      Primary Genre <span className="required">*</span>
                    </label>
                    <select
                      id="genre"
                      name="genre"
                      value={formData.genre}
                      onChange={handleChange}
                      className={errors.genre ? 'error' : ''}
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
                    {errors.genre && <span className="error-message">{errors.genre}</span>}
                  </div>

                  <div className="form-group">
                    <label htmlFor="yearsExperience">
                      Years of Experience <span className="required">*</span>
                    </label>
                    <select
                      id="yearsExperience"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className={errors.yearsExperience ? 'error' : ''}
                    >
                      <option value="">Select experience</option>
                      <option value="less-than-1">Less than 1 year</option>
                      <option value="1-2">1-2 years</option>
                      <option value="3-5">3-5 years</option>
                      <option value="5-10">5-10 years</option>
                      <option value="10+">10+ years</option>
                    </select>
                    {errors.yearsExperience && <span className="error-message">{errors.yearsExperience}</span>}
                  </div>
                </div>
              </div>

              {/* Music & Portfolio */}
              <div className="form-section">
                <h2>Music & Portfolio</h2>
                <p className="section-description">
                  Please provide at least one link to your music so we can review your work.
                </p>

                <div className="form-group">
                  <label htmlFor="spotifyLink">Spotify Link</label>
                  <input
                    type="url"
                    id="spotifyLink"
                    name="spotifyLink"
                    value={formData.spotifyLink}
                    onChange={handleChange}
                    className={errors.spotifyLink ? 'error' : ''}
                    placeholder="https://open.spotify.com/artist/..."
                  />
                  {errors.spotifyLink && <span className="error-message">{errors.spotifyLink}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="appleMusicLink">Apple Music Link</label>
                  <input
                    type="url"
                    id="appleMusicLink"
                    name="appleMusicLink"
                    value={formData.appleMusicLink}
                    onChange={handleChange}
                    placeholder="https://music.apple.com/..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="soundcloudLink">SoundCloud Link</label>
                  <input
                    type="url"
                    id="soundcloudLink"
                    name="soundcloudLink"
                    value={formData.soundcloudLink}
                    onChange={handleChange}
                    placeholder="https://soundcloud.com/..."
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="instagramHandle">Instagram Handle (Optional)</label>
                  <input
                    type="text"
                    id="instagramHandle"
                    name="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={handleChange}
                    placeholder="@yourhandle"
                  />
                </div>
              </div>

              {/* Additional Information */}
              <div className="form-section">
                <h2>Additional Information</h2>

                <div className="form-group">
                  <label htmlFor="monthlyStreams">
                    Approximate Monthly Streams <span className="required">*</span>
                  </label>
                  <select
                    id="monthlyStreams"
                    name="monthlyStreams"
                    value={formData.monthlyStreams}
                    onChange={handleChange}
                    className={errors.monthlyStreams ? 'error' : ''}
                  >
                    <option value="">Select range</option>
                    <option value="0-1k">0 - 1,000</option>
                    <option value="1k-10k">1,000 - 10,000</option>
                    <option value="10k-50k">10,000 - 50,000</option>
                    <option value="50k-100k">50,000 - 100,000</option>
                    <option value="100k-500k">100,000 - 500,000</option>
                    <option value="500k+">500,000+</option>
                  </select>
                  {errors.monthlyStreams && <span className="error-message">{errors.monthlyStreams}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="hasDistribution">
                    Do you currently use a distribution service? <span className="required">*</span>
                  </label>
                  <select
                    id="hasDistribution"
                    name="hasDistribution"
                    value={formData.hasDistribution}
                    onChange={handleChange}
                    className={errors.hasDistribution ? 'error' : ''}
                  >
                    <option value="">Select option</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  {errors.hasDistribution && <span className="error-message">{errors.hasDistribution}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="hearAboutUs">
                    How did you hear about Producer Tour? <span className="required">*</span>
                  </label>
                  <select
                    id="hearAboutUs"
                    name="hearAboutUs"
                    value={formData.hearAboutUs}
                    onChange={handleChange}
                    className={errors.hearAboutUs ? 'error' : ''}
                  >
                    <option value="">Select option</option>
                    <option value="social-media">Social Media</option>
                    <option value="google">Google Search</option>
                    <option value="friend">Friend/Colleague</option>
                    <option value="youtube">YouTube</option>
                    <option value="discord">Discord</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.hearAboutUs && <span className="error-message">{errors.hearAboutUs}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="additionalInfo">
                    Anything else you'd like us to know? (Optional)
                  </label>
                  <textarea
                    id="additionalInfo"
                    name="additionalInfo"
                    value={formData.additionalInfo}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us about your music career goals, notable achievements, or anything else that might be relevant..."
                  />
                </div>
              </div>

              {/* Submit Message */}
              {submitMessage.text && (
                <div className={`submit-message ${submitMessage.type}`}>
                  {submitMessage.text}
                </div>
              )}

              {/* Submit Button */}
              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary btn-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
                <p className="form-note">
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
