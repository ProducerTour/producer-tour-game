import { useState } from 'react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Image, Smile, Send } from 'lucide-react';

interface CreatePostProps {
  onPost: (content: string, image?: string) => void;
}

export function CreatePost({ onPost }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);

  const handleSubmit = () => {
    if (content.trim()) {
      onPost(content, imageUrl || undefined);
      setContent('');
      setImageUrl('');
      setShowImageInput(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
            alt="Your avatar"
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none transition-all"
            rows={3}
          />
          
          {showImageInput && (
            <div className="mt-3">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Paste image URL..."
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
              />
              {imageUrl && (
                <div className="mt-2 rounded-xl overflow-hidden">
                  <ImageWithFallback
                    src={imageUrl}
                    alt="Preview"
                    className="w-full max-h-64 object-cover"
                  />
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2">
              <button
                onClick={() => setShowImageInput(!showImageInput)}
                className={`p-2 rounded-lg transition-colors ${
                  showImageInput ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'
                }`}
                title="Add image"
              >
                <Image className="w-5 h-5" />
              </button>
              <button
                className="p-2 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors"
                title="Add emoji"
              >
                <Smile className="w-5 h-5" />
              </button>
            </div>
            
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl transition-all ${
                content.trim()
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
