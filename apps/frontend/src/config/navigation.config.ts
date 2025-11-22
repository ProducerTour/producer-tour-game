/**
 * Centralized Navigation Configuration
 * Single source of truth for all sidebar navigation across roles
 *
 * Icon names map to SaasIcon component (see components/ui/SaasIcon.tsx)
 */

import { IconName } from '@/components/ui/SaasIcon';

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  path?: string;
  children?: NavItem[];
  badge?: number | (() => Promise<number>);
  badgeColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/**
 * Writer Navigation Configuration
 * Note: Dashboard tab items do NOT have paths - they use onTabChange callbacks
 * Only standalone route items (like /tour-miles) have paths
 */
export const writerNavigation: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
      { id: 'songs', label: 'My Songs', icon: 'music' },
      { id: 'statements', label: 'My Statements', icon: 'chart' },
      { id: 'documents', label: 'Documents', icon: 'file' },
      { id: 'payments', label: 'Payments', icon: 'credit-card' },
      { id: 'claims', label: 'Claims', icon: 'check-circle' },
      { id: 'tour-miles', label: 'Tour Miles', icon: 'target', path: '/tour-miles' },
      { id: 'profile', label: 'Profile', icon: 'user' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Apps',
    items: [
      { id: 'tools', label: 'Tools Hub', icon: 'tools' },
    ],
  },
];

/**
 * Admin Navigation Configuration
 * Note: Dashboard tab items do NOT have paths - they use onTabChange callbacks
 * Only standalone route items (like /tour-miles) have paths
 */
export const adminNavigation: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
      { id: 'statements', label: 'Statements', icon: 'chart' },
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'analytics', label: 'Analytics', icon: 'trending-up' },
      { id: 'payouts', label: 'Payouts', icon: 'money' },
      {
        id: 'placement-deals',
        label: 'Placement Tracker',
        icon: 'music',
        children: [
          { id: 'pending-placements', label: 'Pending Placements', icon: 'hourglass' },
          { id: 'active-placements', label: 'Producer Clearances', icon: 'check-circle' },
        ],
      },
      { id: 'documents', label: 'Documents', icon: 'file' },
      {
        id: 'tour-miles-management',
        label: 'Tour Miles Management',
        icon: 'target',
        children: [
          { id: 'tour-miles-config', label: 'Tour Miles Config', icon: 'settings' },
          { id: 'tour-miles', label: 'Tour Miles', icon: 'target', path: '/tour-miles' },
          { id: 'gamification-analytics', label: 'Gamification KPIs', icon: 'chart' },
          { id: 'reward-redemptions', label: 'Reward Redemptions', icon: 'gift' },
        ],
      },
      { id: 'tools', label: 'Tools Hub', icon: 'tools' },
      { id: 'tool-permissions', label: 'Tool Permissions', icon: 'lock' },
      { id: 'commission', label: 'Commission Settings', icon: 'briefcase' },
    ],
  },
];

/**
 * Get navigation sections based on user role
 */
export const getNavigationForRole = (role: string): NavSection[] => {
  switch (role) {
    case 'ADMIN':
      return adminNavigation;
    case 'WRITER':
      return writerNavigation;
    default:
      return writerNavigation;
  }
};

/**
 * Flatten navigation items for easy tab lookup
 * Removes children property from parent items to avoid duplicate rendering
 */
export const flattenNavItems = (sections: NavSection[]): NavItem[] => {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => {
      if (item.children) {
        // Return parent without children property, plus all children as separate items
        const { children, ...parentWithoutChildren } = item;
        return [parentWithoutChildren, ...children];
      }
      return [item];
    })
  );
};
