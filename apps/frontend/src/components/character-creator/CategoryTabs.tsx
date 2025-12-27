/**
 * CategoryTabs
 * Navigation between customization categories: Body, Face, Hair
 */

import { motion } from 'framer-motion';
import { User, Smile, Scissors } from 'lucide-react';
import {
  useCharacterCreatorStore,
  type CustomizeCategory,
} from '../../stores/characterCreator.store';

interface CategoryTabsProps {
  horizontal?: boolean;
}

const CATEGORIES: {
  id: CustomizeCategory;
  label: string;
  icon: typeof User;
  description: string;
}[] = [
  {
    id: 'body',
    label: 'Body',
    icon: User,
    description: 'Skin, height, build',
  },
  {
    id: 'face',
    label: 'Face',
    icon: Smile,
    description: 'Features & details',
  },
  {
    id: 'hair',
    label: 'Hair',
    icon: Scissors,
    description: 'Style & color',
  },
];

export function CategoryTabs({ horizontal = false }: CategoryTabsProps) {
  const category = useCharacterCreatorStore((s) => s.customizeCategory);
  const setCategory = useCharacterCreatorStore((s) => s.setCustomizeCategory);

  if (horizontal) {
    return (
      <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`
                relative flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap
                ${isActive
                  ? 'text-white'
                  : 'text-white/50 hover:text-white/70 hover:bg-white/5'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="category-indicator-h"
                  className="absolute inset-0 bg-white/10 border border-white/20 rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <Icon className="w-4 h-4 relative z-10" />
              <span className="text-sm relative z-10">{cat.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {CATEGORIES.map((cat) => {
        const isActive = category === cat.id;
        const Icon = cat.icon;

        return (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id)}
            className={`
              relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left
              ${isActive
                ? 'text-white'
                : 'text-white/50 hover:text-white/70 hover:bg-white/5'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId="category-indicator-v"
                className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <div
              className={`
                relative z-10 w-9 h-9 rounded-lg flex items-center justify-center
                ${isActive ? 'bg-white/20' : 'bg-white/5'}
              `}
            >
              <Icon className="w-4 h-4" />
            </div>
            <div className="relative z-10">
              <p className="font-medium text-sm">{cat.label}</p>
              <p className="text-xs text-white/40">{cat.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
