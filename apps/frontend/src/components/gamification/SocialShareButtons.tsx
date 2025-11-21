import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Share2, Copy, CheckCircle } from 'lucide-react';

interface SocialShareButtonsProps {
  referralCode: string;
}

export default function SocialShareButtons({ referralCode }: SocialShareButtonsProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const queryClient = useQueryClient();

  const shareUrl = `${window.location.origin}/apply?ref=${referralCode}`;
  const shareText = `Join Producer Tour and start earning from your music! Use my referral code: ${referralCode}`;

  const trackShareMutation = useMutation({
    mutationFn: async (platform: string) => {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/gamification/social-share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ platform }),
      });
      if (!response.ok) throw new Error('Failed to track share');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gamification-stats'] });
    },
  });

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
  };

  const handleShare = (platform: string, url: string) => {
    window.open(url, '_blank', 'width=600,height=400');
    trackShareMutation.mutate(platform);
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const discordUrl = `https://discord.com`; // Discord doesn't have direct share URL, users copy link

  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">Share & Earn</h3>
      </div>

      <p className="text-sm text-slate-400 mb-4">
        Share Producer Tour with your network and earn <span className="text-yellow-400 font-semibold">+100 TP</span> for each signup,
        <span className="text-green-400 font-semibold"> +250 TP</span> when they convert!
      </p>

      {/* Referral Code */}
      <div className="mb-4">
        <label className="text-xs text-slate-400 mb-2 block">Your Referral Code</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 font-mono text-lg font-bold text-white">
            {referralCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            {copiedCode ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Share Link */}
      <div className="mb-6">
        <label className="text-xs text-slate-400 mb-2 block">Your Referral Link</label>
        <div className="flex gap-2">
          <div className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-300 truncate">
            {shareUrl}
          </div>
          <button
            onClick={handleCopyLink}
            className="px-4 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Social Share Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => handleShare('TWITTER', twitterUrl)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1DA1F2] text-white rounded-lg hover:bg-[#1a8cd8] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
          </svg>
          <span className="text-sm font-medium">Twitter</span>
        </button>

        <button
          onClick={() => handleShare('FACEBOOK', facebookUrl)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4267B2] text-white rounded-lg hover:bg-[#365899] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <span className="text-sm font-medium">Facebook</span>
        </button>

        <button
          onClick={() => handleShare('LINKEDIN', linkedinUrl)}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#0077b5] text-white rounded-lg hover:bg-[#006399] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
          </svg>
          <span className="text-sm font-medium">LinkedIn</span>
        </button>

        <button
          onClick={() => {
            handleCopyLink();
            trackShareMutation.mutate('DISCORD');
          }}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#5865F2] text-white rounded-lg hover:bg-[#4752C4] transition-colors"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
          </svg>
          <span className="text-sm font-medium">Discord</span>
        </button>
      </div>

      {/* Earn More */}
      <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-xs text-blue-400">
          💡 <strong>Pro Tip:</strong> Share on multiple platforms to unlock the "Social Butterfly" achievement!
        </p>
      </div>
    </div>
  );
}
