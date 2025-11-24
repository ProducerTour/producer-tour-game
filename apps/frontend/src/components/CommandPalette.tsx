/**
 * Command Palette
 * Quick navigation and actions via Cmd+K / Ctrl+K
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  Settings,
  FileText,
  Calculator,
  Trophy,
  Briefcase,
  LogOut,
  User,
  Shield,
  Sparkles,
  Plane,
  DollarSign,
  PenTool,
  Send,
} from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from './ui';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  keywords?: string[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  const isLoggedIn = !!user;

  // Handle keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  // Navigation items
  const navigationItems: CommandItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: <Home className="mr-3 h-4 w-4" />,
      action: () => navigate('/'),
      keywords: ['landing', 'main'],
    },
    ...(isLoggedIn ? [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <LayoutDashboard className="mr-3 h-4 w-4" />,
        shortcut: '⌘D',
        action: () => navigate('/dashboard'),
        keywords: ['home', 'overview'],
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="mr-3 h-4 w-4" />,
        shortcut: '⌘,',
        action: () => navigate('/settings'),
        keywords: ['preferences', 'account', 'profile'],
      },
      {
        id: 'tour-miles',
        label: 'Tour Miles',
        icon: <Plane className="mr-3 h-4 w-4" />,
        action: () => navigate('/tour-miles'),
        keywords: ['points', 'rewards', 'gamification'],
      },
      {
        id: 'work-registration',
        label: 'Work Registration',
        icon: <PenTool className="mr-3 h-4 w-4" />,
        action: () => navigate('/work-registration'),
        keywords: ['submit', 'song', 'music', 'register'],
      },
      {
        id: 'my-submissions',
        label: 'My Submissions',
        icon: <Send className="mr-3 h-4 w-4" />,
        action: () => navigate('/my-submissions'),
        keywords: ['works', 'songs', 'tracks'],
      },
    ] : []),
  ];

  // Tools
  const toolItems: CommandItem[] = [
    {
      id: 'pub-deal-simulator',
      label: 'Pub Deal Simulator',
      icon: <Calculator className="mr-3 h-4 w-4" />,
      action: () => navigate('/tools/pub-deal-simulator'),
      keywords: ['publishing', 'contract', 'estimate'],
    },
    {
      id: 'advance-estimator',
      label: 'Advance Estimator',
      icon: <DollarSign className="mr-3 h-4 w-4" />,
      action: () => navigate('/tools/advance-estimator'),
      keywords: ['money', 'payment', 'upfront'],
    },
    {
      id: 'opportunities',
      label: 'Opportunities Tool',
      icon: <Briefcase className="mr-3 h-4 w-4" />,
      action: () => navigate('/tools/opportunities'),
      keywords: ['jobs', 'gigs', 'sync', 'placements'],
    },
    {
      id: 'consultation',
      label: 'Book Consultation',
      icon: <Sparkles className="mr-3 h-4 w-4" />,
      action: () => navigate('/tools/consultation'),
      keywords: ['meeting', 'call', 'advice'],
    },
    {
      id: 'case-study',
      label: 'Case Studies',
      icon: <Trophy className="mr-3 h-4 w-4" />,
      action: () => navigate('/tools/case-study'),
      keywords: ['success', 'stories', 'examples'],
    },
  ];

  // Admin items
  const adminItems: CommandItem[] = isAdmin ? [
    {
      id: 'admin-dashboard',
      label: 'Admin Dashboard',
      icon: <Shield className="mr-3 h-4 w-4" />,
      action: () => navigate('/admin'),
      keywords: ['manage', 'control', 'panel'],
    },
  ] : [];

  // Actions
  const actionItems: CommandItem[] = [
    ...(isLoggedIn ? [
      {
        id: 'logout',
        label: 'Log out',
        icon: <LogOut className="mr-3 h-4 w-4" />,
        action: () => {
          logout();
          navigate('/');
        },
        keywords: ['sign out', 'exit'],
      },
    ] : [
      {
        id: 'login',
        label: 'Log in',
        icon: <User className="mr-3 h-4 w-4" />,
        action: () => navigate('/login'),
        keywords: ['sign in', 'account'],
      },
      {
        id: 'apply',
        label: 'Apply to Producer Tour',
        icon: <FileText className="mr-3 h-4 w-4" />,
        action: () => navigate('/apply'),
        keywords: ['join', 'signup', 'register'],
      },
    ]),
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => runCommand(item.action)}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.shortcut && (
                <span className="ml-auto text-xs text-gray-500">{item.shortcut}</span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Tools">
          {toolItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => runCommand(item.action)}
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        {adminItems.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Admin">
              {adminItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.keywords?.join(' ') || ''}`}
                  onSelect={() => runCommand(item.action)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.id}
              value={`${item.label} ${item.keywords?.join(' ') || ''}`}
              onSelect={() => runCommand(item.action)}
            >
              {item.icon}
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
