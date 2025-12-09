import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { Loader2, Save } from 'lucide-react';
import type { WidgetProps, AdminNote } from '../../../types/productivity.types';

/**
 * NotesWidget - Quick note-taking scratchpad
 *
 * Features:
 * - Auto-save with debounce
 * - Manual save button
 * - Character count
 * - Persistent storage in database
 */
export default function NotesWidget({ isEditing }: WidgetProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch saved note
  const { data: note, isLoading } = useQuery({
    queryKey: ['productivity-note'],
    queryFn: async () => {
      const response = await productivityApi.getNote();
      return response.data as AdminNote;
    },
  });

  // Sync local content with server
  useEffect(() => {
    if (note?.content !== undefined) {
      setContent(note.content);
    }
  }, [note]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (newContent: string) => {
      const response = await productivityApi.updateNote(newContent);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-note'] });
      setHasUnsavedChanges(false);
    },
  });

  // Auto-save with debounce
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timer = setTimeout(() => {
      saveMutation.mutate(content);
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(timer);
  }, [content, hasUnsavedChanges]);

  // Handle content change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasUnsavedChanges(true);
  }, []);

  // Manual save
  const handleSave = useCallback(() => {
    saveMutation.mutate(content);
  }, [content, saveMutation]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Textarea */}
      <textarea
        value={content}
        onChange={handleChange}
        disabled={isEditing}
        placeholder="Write your notes here..."
        className="flex-1 w-full bg-transparent text-theme-foreground text-sm
          placeholder:text-white/30 resize-none focus:outline-none
          disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-white/10 mt-2">
        <span className="text-xs text-theme-foreground-muted">
          {content.length} characters
        </span>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-yellow-400">Unsaved</span>
          )}

          {saveMutation.isPending && (
            <Loader2 className="w-3 h-3 animate-spin text-theme-primary" />
          )}

          <button
            onClick={handleSave}
            disabled={!hasUnsavedChanges || saveMutation.isPending || isEditing}
            className="p-1.5 hover:bg-white/10 rounded transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed"
            title="Save notes"
          >
            <Save className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </div>
    </div>
  );
}
