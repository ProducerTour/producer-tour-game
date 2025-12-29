import { useState } from 'react';
import { Bug, X, Send, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import toast from 'react-hot-toast';

interface BugReportButtonProps {
  variant?: 'floating' | 'inline';
  className?: string;
}

export function BugReportButton({ variant = 'floating', className = '' }: BugReportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: 'bug',
    description: '',
    steps: '',
    expected: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Please describe the issue');
      return;
    }

    setIsSubmitting(true);

    // Gather context info
    const context = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
    };

    // Create email body
    const emailBody = `
Bug Report
==========

Type: ${formData.type === 'bug' ? 'Bug' : 'Feature Request'}

Description:
${formData.description}

${formData.steps ? `Steps to Reproduce:\n${formData.steps}\n` : ''}
${formData.expected ? `Expected Behavior:\n${formData.expected}\n` : ''}

Context:
- Page: ${context.url}
- Screen: ${context.screenSize}
- Browser: ${context.userAgent}
- Time: ${context.timestamp}
    `.trim();

    const subject = `[${formData.type === 'bug' ? 'Bug' : 'Feature'}] ${formData.description.slice(0, 50)}${formData.description.length > 50 ? '...' : ''}`;

    // Open mailto
    window.location.href = `mailto:support@producertour.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;

    setTimeout(() => {
      setIsSubmitting(false);
      setIsOpen(false);
      setFormData({ type: 'bug', description: '', steps: '', expected: '' });
      toast.success('Email client opened - please send the report!');
    }, 500);
  };

  if (variant === 'inline') {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 text-zinc-400 hover:text-orange-400 transition-colors text-sm ${className}`}
      >
        <Bug size={16} />
        <span>Report a Bug</span>
      </button>
    );
  }

  return (
    <>
      {/* Floating Button - Mobile: smaller & above bottom tab bar, Desktop: normal */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed z-40 flex items-center gap-1 sm:gap-2
          bottom-20 right-3 px-2.5 py-2 md:bottom-6 md:right-24 md:px-4 md:py-3
          bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 rounded-full shadow-lg
          transition-all hover:scale-105 group ${className}`}
        title="Report a Bug"
      >
        <Bug size={16} className="text-orange-400 md:w-5 md:h-5" />
        <span className="text-xs md:text-sm font-medium text-zinc-300 hidden md:inline group-hover:text-white">
          Report Bug
        </span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Bug size={20} className="text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Report an Issue</h2>
                  <p className="text-sm text-zinc-400">Help us improve Producer Tour</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Beta Notice */}
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <AlertCircle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-orange-200">
                  Thanks for testing the beta! Your feedback helps us improve.
                </p>
              </div>

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  What are you reporting?
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'bug' })}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      formData.type === 'bug'
                        ? 'bg-red-500/20 border-red-500/50 text-red-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    Bug / Issue
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'feature' })}
                    className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${
                      formData.type === 'feature'
                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    Feature Request
                  </button>
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="bug-description" className="block text-sm font-medium text-zinc-300 mb-2">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="bug-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder={formData.type === 'bug' ? "What went wrong?" : "What would you like to see?"}
                />
              </div>

              {/* Steps to Reproduce (Bug only) */}
              {formData.type === 'bug' && (
                <div>
                  <label htmlFor="bug-steps" className="block text-sm font-medium text-zinc-300 mb-2">
                    Steps to Reproduce <span className="text-zinc-500">(optional)</span>
                  </label>
                  <textarea
                    id="bug-steps"
                    value={formData.steps}
                    onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                  />
                </div>
              )}

              {/* Expected Behavior */}
              <div>
                <label htmlFor="bug-expected" className="block text-sm font-medium text-zinc-300 mb-2">
                  {formData.type === 'bug' ? 'Expected Behavior' : 'Additional Details'}{' '}
                  <span className="text-zinc-500">(optional)</span>
                </label>
                <textarea
                  id="bug-expected"
                  value={formData.expected}
                  onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                  placeholder={formData.type === 'bug' ? "What should have happened?" : "Any other details..."}
                />
              </div>

              {/* Context Info */}
              <div className="text-xs text-zinc-500">
                Page URL and browser info will be included automatically.
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white"
              >
                {isSubmitting ? (
                  'Opening Email...'
                ) : (
                  <>
                    <Send size={16} className="mr-2" />
                    Send Report
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
