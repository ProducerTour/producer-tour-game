import { useCallback, useState, useEffect } from 'react';
import { Upload, X, Music, Image as ImageIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface FileUploaderProps {
  fileType: 'Beats' | 'Images';
  acceptedFormats: string;
  onFilesAdded: (files: File[]) => void;
  files: File[];
  onRemove: (index: number) => void;
  maxFiles?: number;
}

interface FilePreviews {
  [key: string]: string;
}

export function FileUploader({
  fileType,
  acceptedFormats,
  onFilesAdded,
  files,
  onRemove,
  maxFiles = 100,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<FilePreviews>({});

  // Generate previews for files
  useEffect(() => {
    const newPreviews: FilePreviews = {};

    files.forEach((file, index) => {
      const key = `${file.name}-${index}`;

      // For images, create object URL
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newPreviews[key] = URL.createObjectURL(file);
      }
      // For audio files, we'll generate waveform using canvas
      else if (file.type.startsWith('audio/')) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const reader = new FileReader();

        reader.onload = (e) => {
          if (!e.target?.result) return;

          audioContext.decodeAudioData(
            e.target.result as ArrayBuffer,
            (buffer) => {
              // Create canvas for waveform
              const canvas = document.createElement('canvas');
              canvas.width = 200;
              canvas.height = 40;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              // Get audio data
              const data = buffer.getChannelData(0);
              const step = Math.ceil(data.length / canvas.width);
              const amp = canvas.height / 2;

              // Draw waveform
              ctx.fillStyle = '#18181b';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.strokeStyle = '#8b5cf6';
              ctx.lineWidth = 1;
              ctx.beginPath();

              for (let i = 0; i < canvas.width; i++) {
                let min = 1.0;
                let max = -1.0;
                for (let j = 0; j < step; j++) {
                  const datum = data[(i * step) + j];
                  if (datum < min) min = datum;
                  if (datum > max) max = datum;
                }
                ctx.moveTo(i, (1 + min) * amp);
                ctx.lineTo(i, (1 + max) * amp);
              }
              ctx.stroke();

              // Convert canvas to data URL
              newPreviews[key] = canvas.toDataURL();
              setPreviews(prev => ({ ...prev, [key]: newPreviews[key] }));
            },
            (error) => {
              console.error('Error decoding audio:', error);
            }
          );
        };

        reader.readAsArrayBuffer(file);
      }
    });

    setPreviews(prev => ({ ...prev, ...newPreviews }));

    // Cleanup object URLs on unmount
    return () => {
      Object.values(newPreviews).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [files]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length + files.length <= maxFiles) {
        onFilesAdded(droppedFiles);
      }
    },
    [files.length, maxFiles, onFilesAdded]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length + files.length <= maxFiles) {
          onFilesAdded(selectedFiles);
        }
      }
    },
    [files.length, maxFiles, onFilesAdded]
  );

  const Icon = fileType === 'Beats' ? Music : ImageIcon;
  const iconColor = fileType === 'Beats' ? 'text-brand-blue' : 'text-blue-400';
  const hoverColor = fileType === 'Beats' ? 'border-brand-blue bg-brand-blue/10' : 'border-blue-400 bg-blue-400/10';

  return (
    <Card className="p-6 bg-zinc-900 border-zinc-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${iconColor}`} />
          <h3 className="font-semibold">{fileType}</h3>
          {files.length > 0 && (
            <span className="text-xs text-zinc-500">({files.length})</span>
          )}
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? hoverColor
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <input
          type="file"
          multiple
          accept={acceptedFormats}
          onChange={handleFileInput}
          className="hidden"
          id={`file-input-${fileType}`}
        />
        <label htmlFor={`file-input-${fileType}`} className="cursor-pointer">
          <Upload className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
          <p className="text-zinc-400 mb-2">
            Drag and drop {fileType.toLowerCase()} here
          </p>
          <p className="text-zinc-600 text-sm mb-4">or</p>
          <Button variant="outline" className="cursor-pointer" asChild>
            <span>Browse Files</span>
          </Button>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => {
            const key = `${file.name}-${index}`;
            const preview = previews[key];

            return (
              <div
                key={key}
                className="bg-zinc-800 rounded-lg p-3 flex items-center justify-between group hover:bg-zinc-750 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Preview or Icon */}
                  <div className={`w-16 h-10 rounded overflow-hidden flex items-center justify-center ${
                    fileType === 'Beats' ? 'bg-brand-blue/20' : 'bg-blue-500/20'
                  }`}>
                    {preview ? (
                      fileType === 'Images' ? (
                        <img
                          src={preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={preview}
                          alt="waveform"
                          className="w-full h-full object-contain"
                        />
                      )
                    ) : (
                      <Icon className={`w-5 h-5 ${iconColor}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate font-medium">{file.name}</p>
                    <p className="text-xs text-zinc-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(index)}
                  className="hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
