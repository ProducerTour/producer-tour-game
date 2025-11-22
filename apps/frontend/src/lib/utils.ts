/**
 * Utility functions for the frontend
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines clsx and tailwind-merge for clean conditional class handling
 * Use this for all component className props to avoid class conflicts
 *
 * @example
 * cn('px-4 py-2', isLarge && 'px-6 py-3', className)
 * // Properly merges classes without conflicts
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
