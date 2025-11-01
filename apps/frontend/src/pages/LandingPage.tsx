import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import PublicNavigation from '../components/PublicNavigation';
import './LandingPage.css';
import nullyBeats from '@/assets/images/carousel/producers/DSC03658.webp';


// Producer data
// Add images by importing them and adding to the image field:
// import producerPhoto from '@/assets/images/carousel/producers/your-image.jpg';
const producersData = [
  {
    name: "Nully Beats",
    genre: "Rap/R&B",
    image: nullyBeats, // Add your imported image here
    gradient: "135deg, #3b82f6, #2563eb",
    stats: [
      { value: "2.5M", label: "Streams" },
      { value: "8", label: "Playlists" }
    ],
    accomplishment: "Secured placement on Spotify's Summer Hits playlist with debut track"
  },
  {
    name: "Jordan Lee",
    genre: "Hip-Hop/Trap",
    image: undefined, // Add your imported image here
    gradient: "135deg, #06b6d4, #0891b2",
    stats: [
      { value: "5.2M", label: "Streams" },
      { value: "15", label: "Collabs" }
    ],
    accomplishment: "Collaborated with 3 charting artists, earned $50K in first 6 months"
  },
  {
    name: "Sam Chen",
    genre: "Lo-Fi/Ambient",
    image: undefined, // Add your imported image here
    gradient: "135deg, #ec4899, #db2777",
    stats: [
      { value: "8.7M", label: "Streams" },
      { value: "25", label: "Releases" }
    ],
    accomplishment: "Album hit #2 on Lo-Fi charts, consistent monthly 100K+ listeners"
  },
  {
    name: "Maya Patel",
    genre: "Indie/Pop",
    image: undefined, // Add your imported image here
    gradient: "135deg, #f59e0b, #d97706",
    stats: [
      { value: "3.9M", label: "Streams" },
      { value: "12", label: "Viral Tracks" }
    ],
    accomplishment: "TikTok viral success led to 500K followers, licensed music for Netflix"
  }
];

// FAQ data
const faqData = [
  {
    category: 'getting-started',
    question: 'What terms does Producer Tour offer?',
    answer: 'Producer Tour offers an 80/20 split in your favor. You keep 80% of all streaming royalties, while we take 20% for distribution and platform services. There\'s no setup fee, no hidden charges, and you maintain 100% ownership of your music.'
  },
  {
    category: 'getting-started',
    question: 'How do I apply to Producer Tour?',
    answer: 'The application process is simple: Click "Apply Now", fill out our quick form with your basic information and music samples, submit for review, and we\'ll get back to you within 5 business days. No portfolio required – we focus on the quality of your music.'
  },
  {
    category: 'payments',
    question: 'When do I get paid?',
    answer: 'You receive monthly payouts on the last business day of each month. Payments include all royalties earned in the previous 30-45 days from all streaming platforms combined. Minimum payout is $1 – everything gets paid out.'
  },
  {
    category: 'features',
    question: 'Can I see my earnings in real-time?',
    answer: 'Yes! Our dashboard shows you real-time analytics of your streaming performance. Track plays, revenue, listener demographics, and trending songs as they happen. You\'ll always know exactly how your music is performing.'
  },
  {
    category: 'contracts',
    question: 'Is there a setup fee?',
    answer: 'No setup fees, no hidden charges. We believe in transparent pricing. You only pay our 20% commission on the royalties you actually earn. This means if your track doesn\'t generate revenue, you don\'t pay anything.'
  },
  {
    category: 'features',
    question: 'Can I work with collaborators and split royalties?',
    answer: 'Absolutely! Our smart split feature lets you allocate royalty percentages to collaborators directly in the platform. Payments are automatically distributed to each collaborator based on their configured split. No manual transfers needed.'
  },
  {
    category: 'contracts',
    question: 'What\'s your cancellation policy?',
    answer: 'You can cancel anytime with no penalties. If you decide to leave, simply request removal from your account settings. Your music will remain on streaming platforms, but you\'ll need to reassign your distribution elsewhere.'
  },
  {
    category: 'getting-started',
    question: 'How does Producer Tour distribute my music?',
    answer: 'We use enterprise-grade infrastructure with direct connections to Spotify, Apple Music, YouTube, Amazon Music, and 150+ other platforms. Your music goes live within 24-48 hours after you submit, and we handle all technical aspects of distribution and metadata management.'
  }
];

export default function LandingPage() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeAccordions, setActiveAccordions] = useState<Set<number>>(new Set([0]));
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [emailMessage, setEmailMessage] = useState<{type: 'success' | 'error' | '', text: string}>({type: '', text: ''});

  const heroRef = useRef<HTMLElement>(null);
  const carouselInterval = useRef<number>();

  // Theme toggle
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'light') {
      document.body.classList.add('light-mode');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.classList.toggle('light-mode');
  };

  // Carousel auto-advance
  useEffect(() => {
    carouselInterval.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % producersData.length);
    }, 6000) as unknown as number;

    return () => {
      if (carouselInterval.current) clearInterval(carouselInterval.current);
    };
  }, []);

  // Sticky mobile CTA
  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current && window.innerWidth <= 768) {
        const heroBottom = heroRef.current.getBoundingClientRect().bottom;
        setShowStickyCTA(heroBottom < 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  // Scroll animations
  useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const scrollObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.scroll-animate').forEach(element => {
      scrollObserver.observe(element);
    });

    return () => scrollObserver.disconnect();
  }, []);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!emailValue.trim()) {
      setEmailMessage({type: 'error', text: '✗ Email is required'});
      return;
    }

    if (!validateEmail(emailValue)) {
      setEmailMessage({type: 'error', text: '✗ Please enter a valid email'});
      return;
    }

    setEmailMessage({type: 'success', text: '✓ Thanks for subscribing! Check your email for confirmation.'});
    setEmailValue('');

    setTimeout(() => setEmailMessage({type: '', text: ''}), 5000);
  };

  const toggleAccordion = (index: number) => {
    setActiveAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const filteredFAQs = activeFilter === 'all'
    ? faqData
    : faqData.filter(faq => faq.category === activeFilter);

  // Split FAQs into two columns
  const leftColumnFAQs = filteredFAQs.filter((_, i) => i % 2 === 0);
  const rightColumnFAQs = filteredFAQs.filter((_, i) => i % 2 === 1);

  return (
    <div className="landing-page">
      {/* Navigation Header */}
      <PublicNavigation transparent={true} />

      {/* Theme Toggle Button */}
      <button className="theme-toggle" onClick={toggleTheme}>
        <span>{theme === 'dark' ? '🌙' : '☀️'}</span>
        <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
      </button>

      {/* Sticky Mobile CTA */}
      {showStickyCTA && (
        <div className="sticky-cta-mobile active">
          <Link to="/apply" className="btn btn-primary" style={{width: '100%', margin: 0}}>Apply Now</Link>
        </div>
      )}

      {/* HERO SECTION */}
      <section className="hero" ref={heroRef}>
        <div className="container">
          <div className="hero-content">
            <h1>Own Your Sound, Master Your Royalties</h1>
            <p className="hero-subtitle">
              Empower your music career with a publishing platform built for independent producers.
              Distribute globally, track earnings in real-time, and take control of your financial future.
            </p>
            <div className="hero-cta">
              <Link to="/apply" className="btn btn-primary">Apply Now</Link>
              <a href="#features" className="btn btn-secondary">Learn More</a>
            </div>
          </div>

          {/* Producer Carousel */}
          <div className="producers-carousel">
            <div className="carousel-container">
              <div
                className="carousel-track"
                style={{transform: `translateX(-${currentSlide * 100}%)`}}
              >
                {producersData.map((producer, index) => (
                  <div key={index} className="producer-slide">
                    <div className="producer-card">
                      <div
                        className="producer-image"
                        style={
                          producer.image
                            ? { backgroundImage: `url(${producer.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                            : { background: `linear-gradient(${producer.gradient})` }
                        }
                      ></div>
                      <div className="producer-info">
                        <h3>{producer.name}</h3>
                        <p className="producer-genre">{producer.genre}</p>
                        <div className="producer-stats">
                          {producer.stats.map((stat, i) => (
                            <div key={i} className="stat-item">
                              <span className="stat-value">{stat.value}</span>
                              <span className="stat-name">{stat.label}</span>
                            </div>
                          ))}
                        </div>
                        <p className="producer-accomplishment">"{producer.accomplishment}"</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <button
              className="carousel-btn carousel-prev"
              onClick={() => setCurrentSlide((prev) => (prev - 1 + producersData.length) % producersData.length)}
            >
              ‹
            </button>
            <button
              className="carousel-btn carousel-next"
              onClick={() => setCurrentSlide((prev) => (prev + 1) % producersData.length)}
            >
              ›
            </button>
            <div className="carousel-dots">
              {producersData.map((_, index) => (
                <div
                  key={index}
                  className={`dot ${index === currentSlide ? 'active' : ''}`}
                  onClick={() => setCurrentSlide(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header scroll-animate">
            <h2>Your Complete Production Powerhouse</h2>
            <p>Everything a modern music producer needs—from distribution to monetization, collaboration to analytics. Built for artists who take their craft seriously.</p>
          </div>

          <div className="features-grid">
            {[
              {
                icon: '🎵',
                title: 'One-Click Global Distribution',
                description: 'Upload once, reach 150+ platforms instantly. Spotify, Apple Music, YouTube, Amazon—your music goes live in 24-48 hours with zero hassle.'
              },
              {
                icon: '💰',
                title: 'Real-Time Earning Tracking',
                description: 'Watch your royalties come in as streams happen. See exactly which platforms and tracks are generating revenue—down to the penny.'
              },
              {
                icon: '📊',
                title: 'Pro Analytics Dashboard',
                description: 'Deep dive into listener demographics, trending regions, and performance trends. Make data-driven decisions on what to produce next.'
              },
              {
                icon: '🤝',
                title: 'Seamless Collaboration Splits',
                description: 'Set up automatic royalty splits with producers, artists, and features. Payments distribute automatically—no messy manual transfers.'
              },
              {
                icon: '⚡',
                title: 'Monthly Direct Payouts',
                description: 'Get paid every month on the last business day. Direct to your bank account with zero hidden fees, minimum $1 threshold.'
              },
              {
                icon: '🔒',
                title: '100% Artist Ownership',
                description: 'You own your music completely. No exclusivity requirements, no contracts—only an 80/20 split in your favor. Leave anytime.'
              }
            ].map((feature, index) => (
              <div key={index} className="feature-card scroll-animate">
                <div className="feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="faq-section">
        <div className="container">
          <div className="section-header" style={{marginBottom: '60px'}}>
            <h2>Frequently Asked Questions</h2>
            <p>Everything you need to know about Producer Tour and how it can help your music career.</p>
          </div>

          <div className="faq-filters">
            {['all', 'getting-started', 'payments', 'features', 'contracts'].map(filter => (
              <button
                key={filter}
                className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === 'all' ? 'All' : filter.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </button>
            ))}
          </div>

          <div className="faq-grid">
            <div className="faq-column">
              {leftColumnFAQs.map((faq, index) => {
                const globalIndex = filteredFAQs.indexOf(faq);
                return (
                  <div
                    key={index}
                    className={`accordion-item ${activeAccordions.has(globalIndex) ? 'active' : ''}`}
                  >
                    <button className="accordion-header" onClick={() => toggleAccordion(globalIndex)}>
                      <h3>{faq.question}</h3>
                      <span className="accordion-toggle">▼</span>
                    </button>
                    <div className="accordion-content">
                      <div className="accordion-body">
                        <p dangerouslySetInnerHTML={{__html: faq.answer.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}}></p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="faq-column">
              {rightColumnFAQs.map((faq, index) => {
                const globalIndex = filteredFAQs.indexOf(faq);
                return (
                  <div
                    key={index}
                    className={`accordion-item ${activeAccordions.has(globalIndex) ? 'active' : ''}`}
                  >
                    <button className="accordion-header" onClick={() => toggleAccordion(globalIndex)}>
                      <h3>{faq.question}</h3>
                      <span className="accordion-toggle">▼</span>
                    </button>
                    <div className="accordion-content">
                      <div className="accordion-body">
                        <p dangerouslySetInnerHTML={{__html: faq.answer.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}}></p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PROCESS SECTION */}
          <div className="process-section">
            <div className="process-header">
              <h2>Your Journey Starts Here</h2>
              <p>Simple steps to get your music distributed and earning</p>
            </div>

            <div className="process-grid">
              {[
                {
                  number: '1',
                  title: 'Apply',
                  description: 'Fill out a quick application with your basic info and music samples. We review submissions within 5 business days.'
                },
                {
                  number: '2',
                  title: 'Activate',
                  description: 'Once approved, activate your account and set up your artist profile, collaborators, and payment information.'
                },
                {
                  number: '3',
                  title: 'Submit Music',
                  description: 'Upload your tracks with metadata, artwork, and release information. Your music goes live within 24-48 hours.'
                },
                {
                  number: '4',
                  title: 'Get Paid',
                  description: 'Earn royalties as your music streams. Receive monthly payouts with real-time tracking and detailed analytics.'
                }
              ].map((step, index) => (
                <div key={index} className="process-card">
                  <div className="process-number">{step.number}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* EMAIL SIGNUP SECTION */}
      <section className="email-signup-section scroll-animate">
        <div className="email-signup-container">
          <h2>Stay Updated</h2>
          <p>Get the latest tips, distribution tricks, and Producer Tour updates delivered to your inbox every week.</p>
          <form className="email-signup-form" onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <input
                type="email"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                placeholder="Your email address"
              />
            </div>
            <button type="submit" className="email-signup-submit">Subscribe</button>
            {emailMessage.text && (
              <div className={`email-signup-message ${emailMessage.type}`}>
                {emailMessage.text}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* DISCORD COMMUNITY SECTION */}
      <section className="discord-section scroll-animate">
        <div className="container">
          <div className="discord-content">
            <div className="discord-header">
              <h2>Join Our Community</h2>
              <p>Connect with thousands of independent producers, share insights, get support, and stay updated on new features.</p>
            </div>
            <a href="#discord" className="btn btn-primary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.607 1.25a18.27 18.27 0 0 0-5.487 0c-.163-.386-.395-.875-.607-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.04.001-.089-.04-.106a13.107 13.107 0 0 1-1.872-.892.082.082 0 0 1-.008-.137c.126-.094.252-.192.372-.291a.074.074 0 0 1 .076-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .077.009c.12.099.246.197.373.291a.082.082 0 0 1-.006.137 12.299 12.299 0 0 1-1.873.892.083.083 0 0 0-.039.106c.352.699.764 1.365 1.225 1.994a.083.083 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-3.03.082.082 0 0 0 .032-.056c.5-4.718-.838-8.812-3.549-12.456a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-.965-2.157-2.156 0-1.193.974-2.157 2.157-2.157 1.193 0 2.156.964 2.157 2.157 0 1.19-.964 2.156-2.157 2.156zm7.975 0c-1.183 0-2.157-.965-2.157-2.156 0-1.193.974-2.157 2.157-2.157 1.193 0 2.156.964 2.157 2.157 0 1.19-.964 2.156-2.157 2.156z"/>
              </svg>
              Join Discord
            </a>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section scroll-animate">
        <div className="cta-content">
          <h2>Ready to Take Control of Your Music?</h2>
          <p>Join thousands of independent producers who are earning real money and taking ownership of their music careers. Your application takes just 5 minutes.</p>
          <div className="cta-buttons">
            <button className="btn btn-small btn-small-secondary">Get Support</button>
            <Link to="/apply" className="btn btn-small btn-small-primary">Start Applying</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#blog">Blog</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#press">Press</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="#privacy">Privacy Policy</a></li>
                <li><a href="#terms">Terms of Service</a></li>
                <li><a href="#cookies">Cookie Policy</a></li>
                <li><a href="#compliance">Compliance</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Connect</h4>
              <ul>
                <li><a href="#twitter">Twitter</a></li>
                <li><a href="#instagram">Instagram</a></li>
                <li><a href="#discord">Discord</a></li>
                <li><a href="#linkedin">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Producer Tour. All rights reserved. Empowering independent producers worldwide.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
