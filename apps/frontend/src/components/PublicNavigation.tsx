import { useState } from 'react';
import { Link } from 'react-router-dom';
import './PublicNavigation.css';
import whiteLogo from '@/assets/images/logos/whitetransparentpt.png';

interface PublicNavigationProps {
  transparent?: boolean;
}

export default function PublicNavigation({ transparent = false }: PublicNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '/' },
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'Pricing', href: '/#pricing' },
  ];

  return (
    <nav className={`public-nav ${transparent ? 'transparent' : 'opaque'}`}>
      <div className="public-nav-content">
        <div className="public-nav-inner">
          {/* Logo and Brand */}
          <Link to="/" className="public-nav-logo">
            <img
              src={whiteLogo}
              alt="Producer Tour"
              className="h-14 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="public-nav-desktop">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="public-nav-link"
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* Desktop CTA Buttons */}
          <div className="public-nav-cta">
            <Link
              to="/login"
              className="nav-btn nav-btn-secondary"
            >
              Sign In
            </Link>
            <Link
              to="/apply"
              className="nav-btn nav-btn-primary"
            >
              Apply Now
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`public-nav-mobile ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-menu-link"
            >
              {link.name}
            </a>
          ))}
          <div className="mobile-menu-divider">
            <div className="mobile-menu-btn-group">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-btn-mobile nav-btn-mobile-secondary"
              >
                Sign In
              </Link>
              <Link
                to="/apply"
                onClick={() => setMobileMenuOpen(false)}
                className="nav-btn-mobile nav-btn-mobile-primary"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
