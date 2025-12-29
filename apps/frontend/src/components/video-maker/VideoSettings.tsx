import { Settings, Monitor, Sparkles, Zap, Scale } from 'lucide-react';
import { Card } from '../ui/Card';
import type { VideoFormat, VideoResolution, VideoQuality } from '../../types/video-maker';

interface VideoSettingsProps {
  format: VideoFormat;
  onFormatChange: (format: VideoFormat) => void;
  resolution: VideoResolution;
  onResolutionChange: (resolution: VideoResolution) => void;
  quality: VideoQuality;
  onQualityChange: (quality: VideoQuality) => void;
}

const QUALITY_LABELS: Record<VideoQuality, { label: string; description: string }> = {
  fast: { label: 'Fast', description: 'Quick encoding, good quality' },
  balanced: { label: 'Balanced', description: 'Recommended' },
  high: { label: 'High Quality', description: 'Slower, best quality' },
};

export function VideoSettings({
  format,
  onFormatChange,
  resolution,
  onResolutionChange,
  quality,
  onQualityChange,
}: VideoSettingsProps) {
  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">Video Settings</h3>
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 block">
          Aspect Ratio
        </label>
        <div className="space-y-2">
          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
            format === '16x9'
              ? 'bg-zinc-800 border-zinc-700'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}>
            <input
              type="radio"
              name="format"
              value="16x9"
              checked={format === '16x9'}
              onChange={(e) => onFormatChange(e.target.value as VideoFormat)}
              className="w-4 h-4 accent-brand-blue"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">16:9 Landscape</div>
              <div className="text-xs text-zinc-500">YouTube, Desktop</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
            format === '9x16'
              ? 'bg-zinc-800 border-zinc-700'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}>
            <input
              type="radio"
              name="format"
              value="9x16"
              checked={format === '9x16'}
              onChange={(e) => onFormatChange(e.target.value as VideoFormat)}
              className="w-4 h-4 accent-brand-blue"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">9:16 Portrait</div>
              <div className="text-xs text-zinc-500">TikTok, Instagram Reels</div>
            </div>
          </label>

          <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${
            format === 'both'
              ? 'bg-zinc-800 border-zinc-700'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
          }`}>
            <input
              type="radio"
              name="format"
              value="both"
              checked={format === 'both'}
              onChange={(e) => onFormatChange(e.target.value as VideoFormat)}
              className="w-4 h-4 accent-brand-blue"
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Both Formats</div>
              <div className="text-xs text-zinc-500">Generate both versions</div>
            </div>
          </label>
        </div>
      </div>

      {/* Resolution Selection */}
      <div className="mb-6">
        <label className="text-xs text-zinc-500 uppercase tracking-wide mb-2 flex items-center gap-2">
          <Monitor size={12} />
          Resolution
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onResolutionChange('720p')}
            className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
              resolution === '720p'
                ? 'bg-zinc-800 border-brand-blue text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="text-sm font-medium">720p</div>
            <div className="text-xs text-zinc-500">HD</div>
          </button>
          <button
            onClick={() => onResolutionChange('1080p')}
            className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
              resolution === '1080p'
                ? 'bg-zinc-800 border-brand-blue text-white'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <div className="text-sm font-medium">1080p</div>
            <div className="text-xs text-zinc-500">Full HD</div>
          </button>
        </div>
      </div>

      {/* Quality Slider */}
      <div>
        <label className="text-xs text-zinc-500 uppercase tracking-wide mb-3 flex items-center gap-2">
          <Sparkles size={12} />
          Encoding Quality
        </label>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-zinc-400">
              <Zap size={14} />
              <span className="text-xs">Fast</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="text-xs">Quality</span>
              <Scale size={14} />
            </div>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            value={quality === 'fast' ? 0 : quality === 'balanced' ? 1 : 2}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              onQualityChange(val === 0 ? 'fast' : val === 1 ? 'balanced' : 'high');
            }}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-brand-blue"
          />
          <div className="flex justify-between">
            {(['fast', 'balanced', 'high'] as VideoQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => onQualityChange(q)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  quality === q
                    ? 'text-brand-blue font-medium'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {QUALITY_LABELS[q].label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality info */}
        <div className="mt-3 p-2 bg-zinc-800/50 rounded-lg">
          <p className="text-xs text-zinc-400">
            <strong className="text-zinc-300">{QUALITY_LABELS[quality].label}:</strong>{' '}
            {QUALITY_LABELS[quality].description}
          </p>
        </div>
      </div>
    </Card>
  );
}
