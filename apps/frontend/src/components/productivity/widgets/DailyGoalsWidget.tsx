import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productivityApi } from '../../../lib/api';
import { Plus, Check, Trash2, Loader2 } from 'lucide-react';
import type { WidgetProps, DailyGoal, GoalStats } from '../../../types/productivity.types';

/**
 * DailyGoalsWidget - Track daily tasks with progress visualization
 *
 * Features:
 * - Add/complete/delete goals
 * - Progress ring showing completion percentage
 * - Goal streak tracking
 * - Today's date header
 */
export default function DailyGoalsWidget({ isEditing }: WidgetProps) {
  const queryClient = useQueryClient();
  const [newGoalTitle, setNewGoalTitle] = useState('');

  // Fetch today's goals
  const { data: goals, isLoading: goalsLoading } = useQuery({
    queryKey: ['productivity-goals'],
    queryFn: async () => {
      const response = await productivityApi.getGoals();
      return response.data as DailyGoal[];
    },
  });

  // Fetch goal stats
  const { data: stats } = useQuery({
    queryKey: ['productivity-goal-stats'],
    queryFn: async () => {
      const response = await productivityApi.getGoalStats(7);
      return response.data as GoalStats;
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (title: string) => {
      const response = await productivityApi.createGoal(title);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
      queryClient.invalidateQueries({ queryKey: ['productivity-goal-stats'] });
      setNewGoalTitle('');
    },
  });

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      const response = await productivityApi.updateGoal(id, { isCompleted });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
      queryClient.invalidateQueries({ queryKey: ['productivity-goal-stats'] });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await productivityApi.deleteGoal(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productivity-goals'] });
      queryClient.invalidateQueries({ queryKey: ['productivity-goal-stats'] });
    },
  });

  // Handle add goal
  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoalTitle.trim()) {
      createGoalMutation.mutate(newGoalTitle.trim());
    }
  };

  // Calculate completion percentage
  const completedCount = goals?.filter(g => g.isCompleted).length || 0;
  const totalCount = goals?.length || 0;
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Progress ring calculations
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (completionPercent / 100) * circumference;

  if (goalsLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-theme-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-3">
      {/* Header with Progress Ring */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-medium text-theme-foreground">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h4>
          {stats && stats.streak > 0 && (
            <span className="text-xs text-orange-400">
              🔥 {stats.streak} day streak
            </span>
          )}
        </div>

        {/* Progress Ring */}
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90">
            {/* Background circle */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              strokeWidth="4"
              stroke="rgba(255,255,255,0.1)"
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx="32"
              cy="32"
              r={radius}
              strokeWidth="4"
              stroke={completionPercent === 100 ? '#22c55e' : '#6366f1'}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-theme-foreground">
              {completionPercent}%
            </span>
          </div>
        </div>
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {goals?.length === 0 ? (
          <div className="text-center py-4 text-theme-foreground-muted text-sm">
            No goals yet. Add one below!
          </div>
        ) : (
          goals?.map(goal => (
            <div
              key={goal.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                goal.isCompleted ? 'bg-green-500/10' : 'bg-white/5'
              }`}
            >
              {/* Checkbox */}
              <button
                onClick={() => updateGoalMutation.mutate({ id: goal.id, isCompleted: !goal.isCompleted })}
                disabled={isEditing || updateGoalMutation.isPending}
                className={`w-5 h-5 rounded border flex items-center justify-center
                  transition-colors flex-shrink-0 ${
                  goal.isCompleted
                    ? 'bg-green-500 border-green-500'
                    : 'border-white/30 hover:border-theme-primary'
                } ${isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {goal.isCompleted && <Check className="w-3 h-3 text-white" />}
              </button>

              {/* Title */}
              <span
                className={`flex-1 text-sm ${
                  goal.isCompleted
                    ? 'text-theme-foreground-muted line-through'
                    : 'text-theme-foreground'
                }`}
              >
                {goal.title}
              </span>

              {/* Delete */}
              <button
                onClick={() => deleteGoalMutation.mutate(goal.id)}
                disabled={isEditing || deleteGoalMutation.isPending}
                className="p-1 hover:bg-red-500/20 rounded transition-colors opacity-0
                  group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-white/40 hover:text-red-400" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Goal Form */}
      <form onSubmit={handleAddGoal} className="flex gap-2">
        <input
          type="text"
          value={newGoalTitle}
          onChange={(e) => setNewGoalTitle(e.target.value)}
          disabled={isEditing || createGoalMutation.isPending}
          placeholder="Add a goal..."
          className="flex-1 px-3 py-1.5 text-sm bg-white/5 border border-white/10
            rounded-lg text-theme-foreground placeholder:text-white/30
            focus:outline-none focus:ring-1 focus:ring-theme-primary/50
            disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!newGoalTitle.trim() || isEditing || createGoalMutation.isPending}
          className="p-2 bg-theme-primary hover:bg-theme-primary/90 rounded-lg
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {createGoalMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Plus className="w-4 h-4 text-white" />
          )}
        </button>
      </form>
    </div>
  );
}
