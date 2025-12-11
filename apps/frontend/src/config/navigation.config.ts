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
      { id: 'tour-profile', label: 'My Tour Profile', icon: 'plane', path: '/my-profile' },
      { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
      { id: 'placements', label: 'My Placements', icon: 'music' },
      { id: 'statements', label: 'My Statements', icon: 'chart' },
      { id: 'documents', label: 'Documents', icon: 'file' },
      { id: 'billing', label: 'Billing & Payments', icon: 'credit-card' },
      { id: 'tour-miles', label: 'Tour Miles', icon: 'target', path: '/tour-miles' },
      { id: 'profile', label: 'User Info', icon: 'user' },
      { id: 'tools', label: 'Tools Hub', icon: 'tools' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Apps',
    items: [
      { id: 'tools', label: 'Tools Hub', icon: 'tools' },
    ],
  },
  {
    id: 'earn',
    label: 'Earn',
    items: [
      { id: 'affiliates', label: 'Affiliates', icon: 'users', path: '/affiliates' },
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
      { id: 'shop', label: 'Shop', icon: 'shopping-cart' },
      { id: 'insights', label: 'Insights', icon: 'trending-up' },
      {
        id: 'analytics',
        label: 'Analytics',
        icon: 'trending-up',
        children: [
          { id: 'all-analytics', label: 'All Analytics', icon: 'chart' },
          { id: 'mlc-analytics', label: 'MLC Analytics', icon: 'music' },
          { id: 'bmi-analytics', label: 'BMI Analytics', icon: 'music' },
        ],
      },
      {
        id: 'users',
        label: 'Users',
        icon: 'users',
        children: [
          { id: 'affiliate-management', label: 'Affiliate Management', icon: 'users', path: '/admin/affiliates' },
          { id: 'contacts', label: 'Contacts', icon: 'user' },
        ],
      },
      {
        id: 'tour-miles-management',
        label: 'Tour Miles Management',
        icon: 'target',
        children: [
          { id: 'tour-miles-config', label: 'Tour Miles Config', icon: 'settings' },
          { id: 'tour-miles', label: 'Tour Miles', icon: 'target', path: '/tour-miles' },
          { id: 'gamification-analytics', label: 'Gamification KPIs', icon: 'chart' },
          { id: 'reward-redemptions', label: 'Reward Redemptions', icon: 'gift' },
          { id: 'tour-billing', label: 'Tour Billing', icon: 'credit-card' },
        ],
      },
      { id: 'statements', label: 'Statements', icon: 'chart' },
      { id: 'billing-hub', label: 'Billing Hub', icon: 'credit-card' },
      { id: 'payouts', label: 'Payouts', icon: 'money' },
      {
        id: 'placement-deals',
        label: 'Placement Tracker',
        icon: 'music',
        children: [
          { id: 'pending-placements', label: 'Pending Placements', icon: 'hourglass' },
          { id: 'manage-placements', label: 'Manage Placements', icon: 'list' },
          { id: 'active-placements', label: 'Producer Clearances', icon: 'check-circle' },
        ],
      },
      {
        id: 'tools',
        label: 'Tools Hub',
        icon: 'tools',
        children: [
          { id: 'tool-permissions', label: 'Tool Permissions', icon: 'lock' },
        ],
      },
      { id: 'commission', label: 'Commission Settings', icon: 'briefcase' },
      { id: 'documents', label: 'Documents', icon: 'file' },
      { id: 'productivity', label: 'Productivity', icon: 'sparkles' },
    ],
  },
];

/**
 * Customer Navigation Configuration
 * Simplified sidebar for customers - no earnings/statements/placements
 * Focus on discovery, community, learning, and tools
 */
export const customerNavigation: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: 'dashboard' },
      { id: 'tour-profile', label: 'My Tour Profile', icon: 'plane', path: '/my-profile' },
      { id: 'orders', label: 'My Orders', icon: 'shopping-cart', path: '/customer/orders' },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    items: [
      { id: 'discover', label: 'Discover Playlists', icon: 'headphones' },
      { id: 'events', label: 'Community Events', icon: 'calendar' },
      { id: 'learning', label: 'Learning Center', icon: 'book' },
      { id: 'wishlist', label: 'Wishlist', icon: 'heart' },
    ],
  },
  {
    id: 'rewards',
    label: 'Rewards & Tools',
    items: [
      { id: 'tour-miles', label: 'Tour Miles', icon: 'target', path: '/customer/tour-miles' },
      { id: 'tools', label: 'Tools Hub', icon: 'tools' },
    ],
  },
  {
    id: 'support',
    label: 'Support',
    items: [
      { id: 'chat-support', label: 'Chat Support', icon: 'chat', path: '/customer/support' },
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
    case 'CUSTOMER':
      return customerNavigation;
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
