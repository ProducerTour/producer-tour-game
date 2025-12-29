/**
 * Pairing Preview Component - Shows beat/image pairs with drag-to-reorder
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GripVertical, Music, Image, AlertCircle, Shuffle, RefreshCw, Link2, Link2Off } from 'lucide-react';
import { Button } from '../ui/Button';

interface FilePair {
  id: string;
  beat: File;
  image: File;
  beatName: string;
  imageName: string;
}

interface PairingPreviewProps {
  beats: File[];
  images: File[];
  onPairsChange: (pairs: FilePair[]) => void;
}

export function PairingPreview({ beats, images, onPairsChange }: PairingPreviewProps) {
  const [pairs, setPairs] = useState<FilePair[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Auto-pair files alphabetically when inputs change
  useEffect(() => {
    if (beats.length === 0 || images.length === 0) {
      setPairs([]);
      return;
    }

    // Sort both arrays alphabetically by name
    const sortedBeats = [...beats].sort((a, b) =>
      getBaseName(a.name).localeCompare(getBaseName(b.name))
    );
    const sortedImages = [...images].sort((a, b) =>
      getBaseName(a.name).localeCompare(getBaseName(b.name))
    );

    // Create pairs
    const newPairs: FilePair[] = [];
    const maxPairs = Math.min(sortedBeats.length, sortedImages.length);

    for (let i = 0; i < maxPairs; i++) {
      newPairs.push({
        id: `pair-${i}-${Date.now()}`,
        beat: sortedBeats[i],
        image: sortedImages[i],
        beatName: getBaseName(sortedBeats[i].name),
        imageName: getBaseName(sortedImages[i].name),
      });
    }

    setPairs(newPairs);
  }, [beats, images]);

  // Notify parent when pairs change
  useEffect(() => {
    onPairsChange(pairs);
  }, [pairs, onPairsChange]);

  // Get base name without extension
  function getBaseName(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }

  // Check if beat and image names are similar
  function areNamesSimilar(beatName: string, imageName: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(beatName) === normalize(imageName);
  }

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    // Swap image assignments
    setPairs((prev) => {
      const newPairs = [...prev];
      const draggedImage = newPairs[draggedIndex].image;
      const draggedImageName = newPairs[draggedIndex].imageName;

      newPairs[draggedIndex].image = newPairs[dropIndex].image;
      newPairs[draggedIndex].imageName = newPairs[dropIndex].imageName;
      newPairs[dropIndex].image = draggedImage;
      newPairs[dropIndex].imageName = draggedImageName;

      return newPairs;
    });

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Reset to alphabetical order
  const handleResetOrder = useCallback(() => {
    const sortedBeats = [...beats].sort((a, b) =>
      getBaseName(a.name).localeCompare(getBaseName(b.name))
    );
    const sortedImages = [...images].sort((a, b) =>
      getBaseName(a.name).localeCompare(getBaseName(b.name))
    );

    const newPairs: FilePair[] = [];
    const maxPairs = Math.min(sortedBeats.length, sortedImages.length);

    for (let i = 0; i < maxPairs; i++) {
      newPairs.push({
        id: `pair-${i}-${Date.now()}`,
        beat: sortedBeats[i],
        image: sortedImages[i],
        beatName: getBaseName(sortedBeats[i].name),
        imageName: getBaseName(sortedImages[i].name),
      });
    }

    setPairs(newPairs);
  }, [beats, images]);

  // Shuffle images randomly
  const handleShuffle = useCallback(() => {
    setPairs((prev) => {
      const shuffledImages = [...prev].map((p) => ({ image: p.image, imageName: p.imageName }));
      // Fisher-Yates shuffle
      for (let i = shuffledImages.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledImages[i], shuffledImages[j]] = [shuffledImages[j], shuffledImages[i]];
      }

      return prev.map((pair, index) => ({
        ...pair,
        image: shuffledImages[index].image,
        imageName: shuffledImages[index].imageName,
        id: `pair-${index}-${Date.now()}`,
      }));
    });
  }, []);

  // Count matching pairs
  const matchingCount = useMemo(() => {
    return pairs.filter((p) => areNamesSimilar(p.beatName, p.imageName)).length;
  }, [pairs]);

  // Image thumbnails cache
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    // Generate thumbnails for images
    images.forEach((image) => {
      if (!thumbnails[image.name] && image.type.startsWith('image/')) {
        const url = URL.createObjectURL(image);
        setThumbnails((prev) => ({ ...prev, [image.name]: url }));
      }
    });

    return () => {
      // Cleanup URLs on unmount
      Object.values(thumbnails).forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  if (beats.length === 0 || images.length === 0) {
    return null;
  }

  const unpairedBeats = beats.length - pairs.length;
  const unpairedImages = images.length - pairs.length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Link2 size={18} className="text-brand-blue" />
            File Pairings
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Drag images to swap pairings • {matchingCount}/{pairs.length} name matches
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShuffle}
            className="gap-2 border-zinc-700 hover:bg-zinc-800 text-xs"
          >
            <Shuffle size={14} />
            Shuffle
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetOrder}
            className="gap-2 border-zinc-700 hover:bg-zinc-800 text-xs"
          >
            <RefreshCw size={14} />
            Reset
          </Button>
        </div>
      </div>

      {/* Warnings */}
      {(unpairedBeats > 0 || unpairedImages > 0) && (
        <div className="p-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-2 text-xs">
          <AlertCircle size={14} className="text-orange-400" />
          <span className="text-orange-400">
            {unpairedBeats > 0 && `${unpairedBeats} beat${unpairedBeats > 1 ? 's' : ''} without images`}
            {unpairedBeats > 0 && unpairedImages > 0 && ' • '}
            {unpairedImages > 0 && `${unpairedImages} image${unpairedImages > 1 ? 's' : ''} without beats`}
          </span>
        </div>
      )}

      {/* Pairs List */}
      <div className="max-h-64 overflow-y-auto">
        {pairs.map((pair, index) => {
          const namesMatch = areNamesSimilar(pair.beatName, pair.imageName);
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <div
              key={pair.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 border-b border-zinc-800/50 last:border-0 transition-all cursor-grab active:cursor-grabbing ${
                isDragging ? 'opacity-50 bg-zinc-800/30' : ''
              } ${isDragOver ? 'bg-brand-blue/10 border-brand-blue/30' : ''}`}
            >
              {/* Drag Handle */}
              <div className="text-zinc-600 hover:text-zinc-400">
                <GripVertical size={16} />
              </div>

              {/* Index */}
              <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs text-zinc-500">
                {index + 1}
              </div>

              {/* Beat Info */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0">
                  <Music size={14} className="text-brand-blue" />
                </div>
                <span className="text-sm text-zinc-300 truncate" title={pair.beat.name}>
                  {pair.beatName}
                </span>
              </div>

              {/* Pairing Indicator */}
              <div className={`px-2 ${namesMatch ? 'text-green-400' : 'text-zinc-600'}`}>
                {namesMatch ? <Link2 size={16} /> : <Link2Off size={16} />}
              </div>

              {/* Image Info */}
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {thumbnails[pair.image.name] ? (
                    <img
                      src={thumbnails[pair.image.name]}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Image size={14} className="text-zinc-500" />
                  )}
                </div>
                <span className="text-sm text-zinc-300 truncate" title={pair.image.name}>
                  {pair.imageName}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 bg-zinc-800/30 border-t border-zinc-800 text-xs text-zinc-500">
        {pairs.length} pair{pairs.length !== 1 ? 's' : ''} will be processed
        {matchingCount === pairs.length && pairs.length > 0 && (
          <span className="text-green-400 ml-2">• All names match!</span>
        )}
      </div>
    </div>
  );
}
