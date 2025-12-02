import { useState, useRef, useEffect } from 'react';
import { StreetLandingPage } from '../components/landing-page-templates/template-2-street';
import { LabelLandingPage } from '../components/landing-page-templates/template-3-label';
import { LabelLandingV2 } from '../components/landing-page-templates/template-4-label-v2';
import { PublisherLandingPage } from '../components/landing-page-templates/template-5-publisher';
import { PublisherTealLandingPage } from '../components/landing-page-templates/template-7-publisher-teal';
import { PublisherFlameLandingPage } from '../components/landing-page-templates/template-9-publisher-flame';
import { PublisherSunriseLandingPage } from '../components/landing-page-templates/template-10-publisher-sunrise';
import { PublisherCassetteLandingPage } from '../components/landing-page-templates/template-11-publisher-cassette';
import { ChevronDown } from 'lucide-react';

/**
 * Landing Page Template Preview
 * Access at: /landing-preview
 */

type TemplateType = 'street' | 'label' | 'label-v2' | 'publisher' | 'publisher-teal' | 'publisher-flame' | 'publisher-sunrise' | 'publisher-cassette';

export default function LandingPreview() {
  const [activeTemplate, setActiveTemplate] = useState<TemplateType>('street');
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const templates: { id: TemplateType; label: string }[] = [
    { id: 'street', label: 'Street/Music' },
    { id: 'label', label: 'Label/Agency' },
    { id: 'label-v2', label: 'Label V2' },
    { id: 'publisher', label: 'Publisher (Red)' },
    { id: 'publisher-teal', label: 'Publisher (Teal)' },
    { id: 'publisher-flame', label: 'Publisher (Flame)' },
    { id: 'publisher-sunrise', label: 'Publisher (Sunrise)' },
    { id: 'publisher-cassette', label: 'Publisher (Cassette)' },
  ];

  const activeLabel = templates.find((t) => t.id === activeTemplate)?.label || 'Select Template';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Template Switcher Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed top-4 right-4 z-50"
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black/90 backdrop-blur-xl border border-white/10 text-white text-sm font-medium hover:bg-black/95 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          {activeLabel}
          <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 w-48 py-2 rounded-xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTemplate(t.id);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-all flex items-center gap-2 ${
                  activeTemplate === t.id
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {activeTemplate === t.id && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTemplate === 'street' && <StreetLandingPage />}

      {activeTemplate === 'label' && <LabelLandingPage />}

      {activeTemplate === 'label-v2' && <LabelLandingV2 />}

      {activeTemplate === 'publisher' && <PublisherLandingPage />}

      {activeTemplate === 'publisher-teal' && <PublisherTealLandingPage />}

      {activeTemplate === 'publisher-flame' && <PublisherFlameLandingPage />}

      {activeTemplate === 'publisher-sunrise' && <PublisherSunriseLandingPage />}

      {activeTemplate === 'publisher-cassette' && <PublisherCassetteLandingPage />}
    </>
  );
}
