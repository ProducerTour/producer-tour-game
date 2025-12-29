import React, { useState, useEffect, useRef } from 'react';
import { audiodbApi, AudioDBArtist } from '../lib/audiodbApi';

interface AudioDBArtistAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onArtistSelect?: (artist: AudioDBArtist) => void;
  placeholder?: string;
  className?: string;
}

export const AudioDBArtistAutocomplete: React.FC<AudioDBArtistAutocompleteProps> = ({
  value,
  onChange,
  onArtistSelect,
  placeholder = 'Search for artist...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [artists, setArtists] = useState<AudioDBArtist[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (value.length < 2) {
      setArtists([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await audiodbApi.searchArtist(value);
      setArtists(results);
      setIsOpen(results.length > 0);
      setIsLoading(false);
      setSelectedIndex(-1);
    }, 300);

    return () => clearTimeout(timer);
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (artist: AudioDBArtist) => {
    onChange(artist.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    if (onArtistSelect) {
      onArtistSelect(artist);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || artists.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < artists.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < artists.length) {
          handleSelect(artists[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (artists.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={className}
          autoComplete="off"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {isOpen && artists.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-80 overflow-y-auto"
        >
          {artists.map((artist, index) => (
            <div
              key={artist.id}
              onClick={() => handleSelect(artist)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-center gap-3 p-3 cursor-pointer border-b border-slate-700 last:border-b-0 transition-colors ${
                index === selectedIndex
                  ? 'bg-blue-600/30 border-blue-500'
                  : 'hover:bg-slate-700'
              }`}
            >
              {/* Artist Thumbnail */}
              <div className="flex-shrink-0">
                {artist.thumbnail ? (
                  <img
                    src={artist.thumbnail}
                    alt={artist.name}
                    className="w-12 h-12 rounded-full object-cover bg-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {artist.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Artist Info */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{artist.name}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                  {artist.genre && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                      {artist.genre}
                    </span>
                  )}
                  {artist.country && (
                    <span className="text-slate-500">{artist.country}</span>
                  )}
                  {artist.formed && (
                    <span className="text-slate-500">Est. {artist.formed}</span>
                  )}
                </div>
              </div>

              {/* AudioDB Badge */}
              <div className="flex-shrink-0">
                <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded">
                  AudioDB
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {value.length >= 2 && !isLoading && artists.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4 text-center text-slate-400 text-sm">
          No artists found. Try a different search term.
        </div>
      )}
    </div>
  );
};
