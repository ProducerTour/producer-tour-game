/**
 * SaaS Icon System
 *
 * Consistent SVG icons using Lucide React for a professional SaaS look.
 * Replaces emojis with scalable, themeable icons.
 */

import { LucideIcon } from 'lucide-react';
import {
  // Music & Audio
  Music,
  Music2,
  Music4,
  Mic,
  Mic2,
  Radio,
  Disc3,
  Headphones,
  Volume2,

  // Customer Dashboard
  Heart,
  BookOpen,
  MessageCircle,

  // Financial
  DollarSign,
  Banknote,
  Wallet,
  CreditCard,
  PiggyBank,
  CircleDollarSign,
  Receipt,

  // Analytics & Data
  BarChart3,
  BarChart2,
  PieChart,
  TrendingUp,
  TrendingDown,
  LineChart,
  Activity,
  ChartArea,

  // Status & Validation
  Check,
  CheckCircle2,
  X,
  XCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ShieldCheck,
  ShieldAlert,

  // Actions & Navigation
  Search,
  Plus,
  Minus,
  Edit,
  Trash2,
  Settings,
  Settings2,
  Cog,
  Wrench,
  SlidersHorizontal,

  // Communication
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Send,

  // Files & Documents
  FileText,
  Files,
  FolderOpen,
  Upload,
  Download,
  Paperclip,

  // User & Social
  User,
  Users,
  UserPlus,
  UserCheck,
  Eye,
  EyeOff,

  // Achievement & Gamification
  Trophy,
  Award,
  Medal,
  Star,
  Crown,
  Gem,
  Target,
  Crosshair,
  Flame,
  Zap,
  Rocket,
  Sparkles,
  PartyPopper,
  Gift,

  // Time & Status
  Clock,
  Timer,
  Calendar,
  Hourglass,

  // Security
  Lock,
  Unlock,
  Shield,
  Key,

  // Business
  Briefcase,
  Building2,
  Landmark,
  ShoppingCart,

  // Misc
  Lightbulb,
  Palette,
  Tag,
  Tags,
  Hash,
  Link,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  LayoutDashboard,
  Home,
  Globe,
  Play,
  Pause,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon name type for type safety
export type IconName =
  // Music
  | 'music'
  | 'music-note'
  | 'music-alt'
  | 'mic'
  | 'mic-alt'
  | 'radio'
  | 'disc'
  | 'headphones'
  | 'volume'
  | 'play'
  | 'pause'
  // Financial
  | 'money'
  | 'dollar'
  | 'banknote'
  | 'wallet'
  | 'credit-card'
  | 'piggy-bank'
  | 'receipt'
  // Analytics
  | 'chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'trending-up'
  | 'trending-down'
  | 'line-chart'
  | 'activity'
  | 'analytics'
  // Status
  | 'check'
  | 'check-circle'
  | 'x'
  | 'x-circle'
  | 'warning'
  | 'alert'
  | 'info'
  | 'shield-check'
  | 'shield-alert'
  // Actions
  | 'search'
  | 'plus'
  | 'minus'
  | 'edit'
  | 'trash'
  | 'settings'
  | 'settings-alt'
  | 'cog'
  | 'tools'
  | 'sliders'
  // Communication
  | 'bell'
  | 'bell-ring'
  | 'mail'
  | 'message'
  | 'send'
  // Files
  | 'file'
  | 'files'
  | 'folder'
  | 'upload'
  | 'download'
  | 'attachment'
  // User
  | 'user'
  | 'users'
  | 'user-plus'
  | 'user-check'
  | 'eye'
  | 'eye-off'
  // Gamification
  | 'trophy'
  | 'award'
  | 'medal'
  | 'star'
  | 'crown'
  | 'gem'
  | 'target'
  | 'crosshair'
  | 'fire'
  | 'lightning'
  | 'rocket'
  | 'sparkles'
  | 'party'
  | 'gift'
  // Time
  | 'clock'
  | 'timer'
  | 'calendar'
  | 'hourglass'
  | 'pending'
  // Security
  | 'lock'
  | 'unlock'
  | 'shield'
  | 'key'
  // Business
  | 'briefcase'
  | 'building'
  | 'bank'
  | 'shopping-cart'
  // Misc
  | 'lightbulb'
  | 'idea'
  | 'palette'
  | 'tag'
  | 'tags'
  | 'hash'
  | 'link'
  | 'external-link'
  | 'arrow-right'
  | 'arrow-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'more'
  | 'loading'
  | 'refresh'
  | 'filter'
  | 'sort'
  | 'grid'
  | 'list'
  | 'dashboard'
  | 'home'
  | 'globe'
  | 'plane'
  // Customer
  | 'heart'
  | 'book'
  | 'chat';

// Map icon names to Lucide components
const iconMap: Record<IconName, LucideIcon> = {
  // Music
  'music': Music,
  'music-note': Music2,
  'music-alt': Music4,
  'mic': Mic,
  'mic-alt': Mic2,
  'radio': Radio,
  'disc': Disc3,
  'headphones': Headphones,
  'volume': Volume2,
  'play': Play,
  'pause': Pause,
  // Financial
  'money': CircleDollarSign,
  'dollar': DollarSign,
  'banknote': Banknote,
  'wallet': Wallet,
  'credit-card': CreditCard,
  'piggy-bank': PiggyBank,
  'receipt': Receipt,
  // Analytics
  'chart': BarChart3,
  'bar-chart': BarChart2,
  'pie-chart': PieChart,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'line-chart': LineChart,
  'activity': Activity,
  'analytics': ChartArea,
  // Status
  'check': Check,
  'check-circle': CheckCircle2,
  'x': X,
  'x-circle': XCircle,
  'warning': AlertTriangle,
  'alert': AlertCircle,
  'info': Info,
  'shield-check': ShieldCheck,
  'shield-alert': ShieldAlert,
  // Actions
  'search': Search,
  'plus': Plus,
  'minus': Minus,
  'edit': Edit,
  'trash': Trash2,
  'settings': Settings,
  'settings-alt': Settings2,
  'cog': Cog,
  'tools': Wrench,
  'sliders': SlidersHorizontal,
  // Communication
  'bell': Bell,
  'bell-ring': BellRing,
  'mail': Mail,
  'message': MessageSquare,
  'send': Send,
  // Files
  'file': FileText,
  'files': Files,
  'folder': FolderOpen,
  'upload': Upload,
  'download': Download,
  'attachment': Paperclip,
  // User
  'user': User,
  'users': Users,
  'user-plus': UserPlus,
  'user-check': UserCheck,
  'eye': Eye,
  'eye-off': EyeOff,
  // Gamification
  'trophy': Trophy,
  'award': Award,
  'medal': Medal,
  'star': Star,
  'crown': Crown,
  'gem': Gem,
  'target': Target,
  'crosshair': Crosshair,
  'fire': Flame,
  'lightning': Zap,
  'rocket': Rocket,
  'sparkles': Sparkles,
  'party': PartyPopper,
  'gift': Gift,
  // Time
  'clock': Clock,
  'timer': Timer,
  'calendar': Calendar,
  'hourglass': Hourglass,
  'pending': Hourglass,
  // Security
  'lock': Lock,
  'unlock': Unlock,
  'shield': Shield,
  'key': Key,
  // Business
  'briefcase': Briefcase,
  'building': Building2,
  'bank': Landmark,
  'shopping-cart': ShoppingCart,
  // Misc
  'lightbulb': Lightbulb,
  'idea': Lightbulb,
  'palette': Palette,
  'tag': Tag,
  'tags': Tags,
  'hash': Hash,
  'link': Link,
  'external-link': ExternalLink,
  'arrow-right': ArrowRight,
  'arrow-left': ArrowLeft,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  'more': MoreHorizontal,
  'loading': Loader2,
  'refresh': RefreshCw,
  'filter': Filter,
  'sort': SortAsc,
  'grid': Grid3X3,
  'list': List,
  'dashboard': LayoutDashboard,
  'home': Home,
  'globe': Globe,
  'plane': Plane,
  // Customer
  'heart': Heart,
  'book': BookOpen,
  'chat': MessageCircle,
};

// Emoji to icon name mapping for easy migration
export const emojiToIcon: Record<string, IconName> = {
  '🎵': 'music',
  '💰': 'money',
  '📊': 'chart',
  '✨': 'sparkles',
  '🔥': 'fire',
  '⚡': 'lightning',
  '🎯': 'target',
  '🏆': 'trophy',
  '💎': 'gem',
  '🌟': 'star',
  '📈': 'trending-up',
  '📉': 'trending-down',
  '🎨': 'palette',
  '🎤': 'mic',
  '🎹': 'music-alt',
  '🎸': 'music',
  '🔒': 'lock',
  '📝': 'file',
  '✅': 'check-circle',
  '❌': 'x-circle',
  '⚠️': 'warning',
  '🔔': 'bell',
  '📧': 'mail',
  '💼': 'briefcase',
  '🎁': 'gift',
  '🏅': 'medal',
  '🥇': 'trophy',
  '🥈': 'medal',
  '🥉': 'medal',
  '👁️': 'eye',
  '🚀': 'rocket',
  '💡': 'lightbulb',
  '🎉': 'party',
  '⏳': 'hourglass',
  '🛠️': 'tools',
  '⚙️': 'settings',
  '🔍': 'search',
  'ℹ️': 'info',
  '⏱️': 'timer',
  '🛡️': 'shield',
};

// Size presets
const sizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
  '3xl': 'w-12 h-12',
};

// Color presets matching the slate theme
const colorMap = {
  default: 'text-current',
  white: 'text-white',
  gray: 'text-gray-400',
  muted: 'text-gray-500',
  primary: 'text-white',
  success: 'text-emerald-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  accent: 'text-white/80',
};

interface SaasIconProps {
  name: IconName;
  size?: keyof typeof sizeMap | number;
  color?: keyof typeof colorMap;
  className?: string;
  strokeWidth?: number;
}

export function SaasIcon({
  name,
  size = 'md',
  color = 'default',
  className,
  strokeWidth = 2,
}: SaasIconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`SaasIcon: Unknown icon name "${name}"`);
    return null;
  }

  const sizeClass = typeof size === 'number'
    ? undefined
    : sizeMap[size];

  const style = typeof size === 'number'
    ? { width: size, height: size }
    : undefined;

  return (
    <IconComponent
      className={cn(sizeClass, colorMap[color], className)}
      style={style}
      strokeWidth={strokeWidth}
    />
  );
}

// Icon container with background - for featured icons
interface IconBadgeProps extends SaasIconProps {
  variant?: 'default' | 'solid' | 'outline' | 'ghost';
  rounded?: 'md' | 'lg' | 'xl' | 'full';
}

export function IconBadge({
  name,
  size = 'md',
  color = 'default',
  variant = 'default',
  rounded = 'lg',
  className,
  ...props
}: IconBadgeProps) {
  const roundedMap = {
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  };

  const variantStyles = {
    default: 'bg-white/[0.08] border border-white/[0.08]',
    solid: 'bg-white/[0.12]',
    outline: 'border border-white/[0.15]',
    ghost: 'bg-transparent',
  };

  const containerSizeMap = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
    '2xl': 'p-4',
    '3xl': 'p-5',
  };

  const containerSize = typeof size === 'number' ? 'p-2' : containerSizeMap[size];

  return (
    <div
      className={cn(
        'inline-flex items-center justify-center',
        containerSize,
        roundedMap[rounded],
        variantStyles[variant],
        className
      )}
    >
      <SaasIcon name={name} size={size} color={color} {...props} />
    </div>
  );
}

// Navigation icon component with optional badge
interface NavIconProps extends SaasIconProps {
  badge?: number | string;
  badgeColor?: 'default' | 'success' | 'warning' | 'error';
}

export function NavIcon({
  name,
  badge,
  badgeColor = 'default',
  ...props
}: NavIconProps) {
  const badgeColorMap = {
    default: 'bg-white/20 text-white',
    success: 'bg-emerald-500 text-white',
    warning: 'bg-yellow-500 text-black',
    error: 'bg-red-500 text-white',
  };

  return (
    <div className="relative inline-flex">
      <SaasIcon name={name} {...props} />
      {badge !== undefined && (
        <span
          className={cn(
            'absolute -top-1 -right-1 min-w-[16px] h-4 px-1 text-[10px] font-semibold rounded-full flex items-center justify-center',
            badgeColorMap[badgeColor]
          )}
        >
          {badge}
        </span>
      )}
    </div>
  );
}

// Status icon with appropriate color
interface StatusIconProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  size?: keyof typeof sizeMap;
  className?: string;
}

export function StatusIcon({ status, size = 'md', className }: StatusIconProps) {
  const statusConfig: Record<typeof status, { icon: IconName; color: keyof typeof colorMap }> = {
    success: { icon: 'check-circle', color: 'success' },
    warning: { icon: 'warning', color: 'warning' },
    error: { icon: 'x-circle', color: 'error' },
    info: { icon: 'info', color: 'info' },
    pending: { icon: 'hourglass', color: 'warning' },
  };

  const config = statusConfig[status];

  return (
    <SaasIcon
      name={config.icon}
      size={size}
      color={config.color}
      className={className}
    />
  );
}

// Helper to convert emoji string to icon component
export function EmojiToIcon({
  emoji,
  fallback,
  ...props
}: {
  emoji: string;
  fallback?: IconName;
} & Omit<SaasIconProps, 'name'>) {
  const iconName = emojiToIcon[emoji] || fallback || 'info';
  return <SaasIcon name={iconName} {...props} />;
}

export default SaasIcon;
