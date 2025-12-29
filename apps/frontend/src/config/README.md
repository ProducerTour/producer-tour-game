# Navigation Configuration

## Overview

Centralized navigation configuration for all role-based sidebars. This ensures consistency across the application and makes it easy to add/remove navigation items.

## File Structure

- **`navigation.config.ts`** - Single source of truth for all navigation

## How It Works

### Adding a New Navigation Item

To add a new tab (like "Tour Miles"), simply edit `navigation.config.ts`:

```typescript
export const writerNavigation: NavSection[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { id: 'overview', label: 'Dashboard', icon: '🏠', path: '/writer' },
      { id: 'songs', label: 'My Songs', icon: '🎵', path: '/writer' },
      // Add your new item here:
      { id: 'tour-miles', label: 'Tour Miles', icon: '🎯', path: '/tour-miles' },
      { id: 'profile', label: 'Profile', icon: '👤', path: '/writer' },
    ],
  },
];
```

**That's it!** The item will automatically appear in:
- Sidebar component
- WriterDashboard navigation
- Any other component using the navigation config

### Navigation Item Properties

```typescript
interface NavItem {
  id: string;              // Unique identifier
  label: string;           // Display text
  icon: string;            // Emoji or icon
  path?: string;           // Route path (optional)
  children?: NavItem[];    // Nested items (optional)
  badge?: number;          // Badge count (optional)
  badgeColor?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}
```

### Item Types

**1. Dashboard Tab** (no path, handled by onTabChange)
```typescript
{ id: 'overview', label: 'Dashboard', icon: '🏠', path: '/admin' }
```

**2. External Route** (uses React Router Link)
```typescript
{ id: 'tour-miles', label: 'Tour Miles', icon: '🎯', path: '/tour-miles' }
```

**3. Parent with Children**
```typescript
{
  id: 'placement-deals',
  label: 'Placement Tracker',
  icon: '🎵',
  children: [
    { id: 'pending-placements', label: 'Pending Placements', icon: '⏳' },
    { id: 'active-placements', label: 'Producer Clearances', icon: '✅' },
  ],
}
```

## Usage in Components

### Sidebar Component

```typescript
import Sidebar from '../components/Sidebar';

// Sidebar automatically uses centralized config based on user role
<Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
```

### Dashboard Components

```typescript
import { flattenNavItems, writerNavigation } from '../config/navigation.config';

// Get flat list of all nav items for tab switching
const writerTabs = flattenNavItems(writerNavigation);
```

### Getting Navigation by Role

```typescript
import { getNavigationForRole } from '../config/navigation.config';

const navigation = getNavigationForRole(user.role); // 'ADMIN' or 'WRITER'
```

## Dynamic Badges

Badges are computed dynamically in the Sidebar component:

```typescript
// In Sidebar.tsx
items: section.items.map((item) => {
  if (item.id === 'claims' && !isAdmin) {
    return {
      ...item,
      badge: approvedClaimsCount > 0 ? approvedClaimsCount : undefined,
      badgeColor: 'green',
    };
  }
  return item;
})
```

## Benefits

✅ **Single Source of Truth** - Navigation defined in one place
✅ **Easy Maintenance** - Add/remove items in one file
✅ **Type Safety** - Full TypeScript support
✅ **Role-Based** - Separate configurations for different roles
✅ **Flexible** - Supports tabs, routes, nested items, badges
✅ **DRY** - No duplicate navigation arrays across files

## Migration

**Before** (3 places to update):
- `Sidebar.tsx` (writerSections, adminSections)
- `WriterDashboard.tsx` (writerTabs)
- `AdminDashboard.tsx` (adminTabs)

**After** (1 place to update):
- `navigation.config.ts` only!

## External Routes vs Dashboard Tabs

The Sidebar automatically determines whether to use a `<Link>` or `<button>`:

- **External routes** (like `/tour-miles`, `/settings`): Render as React Router `<Link>`
- **Dashboard tabs** (like `overview`, `songs`): Render as `<button>` with `onTabChange`

This is handled automatically based on the `path` property and comparison logic in Sidebar.tsx line 207.
