import { Settings } from 'lucide-react';
import { Card } from '../ui/Card';
import type { VideoFormat } from '../../types/video-maker';

interface VideoSettingsProps {
  format: VideoFormat;
  onFormatChange: (format: VideoFormat) => void;
}

export function VideoSettings({ format, onFormatChange }: VideoSettingsProps) {
  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-orange-400" />
        <h3 className="font-semibold">Output Format</h3>
      </div>

      <div className="space-y-3">
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
    </Card>
  );
}
