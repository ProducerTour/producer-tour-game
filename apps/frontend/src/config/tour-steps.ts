/**
 * Tour Steps Configuration
 * Defines the guided tour steps for each dashboard type
 */

import type { TourStep } from '../components/ui/GuidedTour';

/**
 * Customer Dashboard Tour Steps
 */
export const customerDashboardSteps: TourStep[] = [
  {
    target: 'customer-welcome',
    title: 'Welcome to Your Dashboard!',
    description: 'This is your personal command center. Here you can track your progress, earn rewards, and access exclusive tools.',
    position: 'bottom',
  },
  {
    target: 'customer-tour-miles',
    title: 'Tour Miles Balance',
    description: 'Track your Tour Miles here! Earn points by engaging with the platform and redeem them for exclusive rewards and tools.',
    position: 'bottom',
  },
  {
    target: 'customer-stats',
    title: 'Your Progress at a Glance',
    description: 'View your streak, achievements, profile completion, and available tools. Keep your streak going to earn bonus Tour Miles!',
    position: 'top',
  },
  {
    target: 'customer-quick-actions',
    title: 'Quick Actions',
    description: 'Quick links to key features like Tour Miles details, your profile settings, and available tools.',
    position: 'top',
  },
  {
    target: 'nav-tour-miles',
    title: 'Tour Miles',
    description: 'Earn Tour Miles by engaging with the platform. Redeem them for exclusive tools, rewards, and perks!',
    position: 'right',
  },
  {
    target: 'nav-tools',
    title: 'Tools Hub',
    description: 'Access powerful tools to help you grow as a creator. Some tools can be unlocked with Tour Miles!',
    position: 'right',
  },
];

/**
 * Writer Dashboard Tour Steps
 */
export const writerDashboardSteps: TourStep[] = [
  {
    target: 'writer-welcome',
    title: 'Welcome to Your Dashboard!',
    description: 'This is your creative command center. Track earnings, manage songs, view statements, and access powerful tools.',
    position: 'bottom',
  },
  {
    target: 'writer-earnings',
    title: 'Your Total Earnings',
    description: 'See your total earnings at a glance. This includes all royalties from your songs across all platforms.',
    position: 'bottom',
  },
  {
    target: 'writer-stats',
    title: 'Financial Overview',
    description: 'Track your year-to-date earnings, last month\'s income, and number of songs generating royalties.',
    position: 'top',
  },
  {
    target: 'nav-statements',
    title: 'My Statements',
    description: 'View all your royalty statements. Track earnings from each PRO and see detailed breakdowns of your income.',
    position: 'right',
  },
  {
    target: 'nav-billing',
    title: 'Billing & Payments',
    description: 'Manage your payment settings, request withdrawals, and view your payout history.',
    position: 'right',
  },
  {
    target: 'nav-tools',
    title: 'Tools Hub',
    description: 'Access powerful tools like YouTube metadata generators, split sheets, and more to help your music career.',
    position: 'right',
  },
];

/**
 * Tour IDs for localStorage tracking
 */
export const TOUR_IDS = {
  CUSTOMER_DASHBOARD: 'customer-dashboard-tour',
  WRITER_DASHBOARD: 'writer-dashboard-tour',
} as const;
