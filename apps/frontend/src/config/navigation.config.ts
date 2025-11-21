/**
 * Centralized Navigation Configuration
 * Single source of truth for all sidebar navigation across roles
 */

export interface NavItem {
  id: string;
  label: string;
  icon: string;
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
      { id: 'overview', label: 'Dashboard', icon: '🏠' },
      { id: 'songs', label: 'My Songs', icon: '🎵' },
      { id: 'statements', label: 'My Statements', icon: '📊' },
      { id: 'documents', label: 'Documents', icon: '📄' },
      { id: 'payments', label: 'Payments', icon: '💳' },
      { id: 'claims', label: 'Claims', icon: '✅' },
      { id: 'tour-miles', label: 'Tour Miles', icon: '🎯', path: '/tour-miles' },
      { id: 'profile', label: 'Profile', icon: '👤' },
    ],
  },
  {
    id: 'tools',
    label: 'Tools & Apps',
    items: [
      { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
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
      { id: 'overview', label: 'Dashboard', icon: '🏠' },
      { id: 'statements', label: 'Statements', icon: '📊' },
      { id: 'users', label: 'Users', icon: '👥' },
      { id: 'analytics', label: 'Analytics', icon: '📈' },
      { id: 'payouts', label: 'Payouts', icon: '💰' },
      {
        id: 'placement-deals',
        label: 'Placement Tracker',
        icon: '🎵',
        children: [
          { id: 'pending-placements', label: 'Pending Placements', icon: '⏳' },
          { id: 'active-placements', label: 'Producer Clearances', icon: '✅' },
        ],
      },
      { id: 'documents', label: 'Documents', icon: '📄' },
      { id: 'tour-miles', label: 'Tour Miles', icon: '🎯', path: '/tour-miles' },
      { id: 'reward-redemptions', label: 'Reward Redemptions', icon: '🎁' },
      { id: 'tools', label: 'Tools Hub', icon: '🛠️' },
      { id: 'tool-permissions', label: 'Tool Permissions', icon: '🔐' },
      { id: 'commission', label: 'Commission Settings', icon: '💼' },
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
