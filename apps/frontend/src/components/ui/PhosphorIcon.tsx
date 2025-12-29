/**
 * Phosphor Icons Utility
 *
 * Comprehensive icon system using Phosphor Icons.
 * Phosphor supports 6 weights: thin, light, regular, bold, fill, duotone
 *
 * Usage:
 * import { Icon, IconBadge } from '@/components/ui/PhosphorIcon';
 * <Icon.MusicNote size={24} weight="bold" />
 * <IconBadge icon="check" variant="success" />
 */

import * as React from 'react';
import {
  // Music & Media
  MusicNote,
  MusicNotes,
  Microphone,
  SpeakerHigh,
  Headphones,
  Disc,
  Playlist,
  Radio,
  Waveform,
  Play,
  Pause,
  Stop,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,

  // Users & People
  User,
  UserCircle,
  Users,
  UsersThree,
  UserPlus,
  UserMinus,
  UserGear,
  IdentificationCard,

  // Documents & Files
  File,
  FileText,
  FilePdf,
  FileDoc,
  FileXls,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Upload,
  Download,
  CloudArrowUp,
  CloudArrowDown,
  Paperclip,

  // Finance & Money
  CurrencyDollar,
  Money,
  Wallet,
  CreditCard,
  Bank,
  Receipt,
  ChartLine,
  ChartBar,
  ChartPie,
  TrendUp,
  TrendDown,
  Percent,
  Calculator,

  // Status & Validation
  Check,
  CheckCircle,
  X,
  XCircle,
  Warning,
  WarningCircle,
  Info,
  Question,
  ShieldCheck,
  ShieldWarning,
  Seal,
  SealCheck,

  // Actions & Navigation
  MagnifyingGlass,
  Plus,
  Minus,
  PencilSimple,
  Trash,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CaretRight,
  CaretLeft,
  CaretUp,
  CaretDown,
  DotsThree,
  DotsThreeVertical,
  List,
  SquaresFour,
  Rows,
  Columns,
  ArrowsClockwise,
  ArrowClockwise,

  // Communication
  Envelope,
  EnvelopeOpen,
  Bell,
  BellRinging,
  ChatCircle,
  ChatDots,
  Phone,
  PhoneCall,
  Share,
  ShareNetwork,
  Link,
  LinkBreak,

  // UI Elements
  House,
  Gear,
  GearSix,
  Sliders,
  SlidersHorizontal,
  FunnelSimple,
  SortAscending,
  SortDescending,
  Eye,
  EyeSlash,
  Copy,
  ClipboardText,
  Star,
  Heart,
  BookmarkSimple,
  Flag,
  Tag,

  // Gamification & Rewards
  Trophy,
  Medal,
  Crown,
  Fire,
  Lightning,
  Target,
  Crosshair,
  GameController,
  Sparkle,
  Gift,
  Confetti,
  Rocket,

  // Time & Calendar
  Clock,
  Timer,
  Calendar,
  CalendarBlank,
  CalendarCheck,
  Hourglass,

  // Security
  Lock,
  LockOpen,
  Shield,
  Key,
  Fingerprint,

  // Business & Work
  Briefcase,
  Buildings,
  Building,
  Storefront,
  Factory,
  Handshake,
  Certificate,

  // Misc
  Globe,
  GlobeHemisphereWest,
  MapPin,
  Image,
  Camera,
  Video,
  Code,
  Terminal,
  Database,
  Cloud,
  Sun,
  Moon,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Spinner,
  CircleNotch,

  type IconProps,
} from '@phosphor-icons/react';

// Re-export all icons for direct use
export {
  // Music & Media
  MusicNote,
  MusicNotes,
  Microphone,
  SpeakerHigh,
  Headphones,
  Disc,
  Playlist,
  Radio,
  Waveform,
  Play,
  Pause,
  Stop,
  SkipForward,
  SkipBack,
  Shuffle,
  Repeat,

  // Users & People
  User,
  UserCircle,
  Users,
  UsersThree,
  UserPlus,
  UserMinus,
  UserGear,
  IdentificationCard,

  // Documents & Files
  File,
  FileText,
  FilePdf,
  FileDoc,
  FileXls,
  Files,
  Folder,
  FolderOpen,
  FolderPlus,
  Upload,
  Download,
  CloudArrowUp,
  CloudArrowDown,
  Paperclip,

  // Finance & Money
  CurrencyDollar,
  Money,
  Wallet,
  CreditCard,
  Bank,
  Receipt,
  ChartLine,
  ChartBar,
  ChartPie,
  TrendUp,
  TrendDown,
  Percent,
  Calculator,

  // Status & Validation
  Check,
  CheckCircle,
  X,
  XCircle,
  Warning,
  WarningCircle,
  Info,
  Question,
  ShieldCheck,
  ShieldWarning,
  Seal,
  SealCheck,

  // Actions & Navigation
  MagnifyingGlass,
  Plus,
  Minus,
  PencilSimple,
  Trash,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  CaretRight,
  CaretLeft,
  CaretUp,
  CaretDown,
  DotsThree,
  DotsThreeVertical,
  List,
  SquaresFour,
  Rows,
  Columns,
  ArrowsClockwise,
  ArrowClockwise,

  // Communication
  Envelope,
  EnvelopeOpen,
  Bell,
  BellRinging,
  ChatCircle,
  ChatDots,
  Phone,
  PhoneCall,
  Share,
  ShareNetwork,
  Link,
  LinkBreak,

  // UI Elements
  House,
  Gear,
  GearSix,
  Sliders,
  SlidersHorizontal,
  FunnelSimple,
  SortAscending,
  SortDescending,
  Eye,
  EyeSlash,
  Copy,
  ClipboardText,
  Star,
  Heart,
  BookmarkSimple,
  Flag,
  Tag,

  // Gamification & Rewards
  Trophy,
  Medal,
  Crown,
  Fire,
  Lightning,
  Target,
  Crosshair,
  GameController,
  Sparkle,
  Gift,
  Confetti,
  Rocket,

  // Time & Calendar
  Clock,
  Timer,
  Calendar,
  CalendarBlank,
  CalendarCheck,
  Hourglass,

  // Security
  Lock,
  LockOpen,
  Shield,
  Key,
  Fingerprint,

  // Business & Work
  Briefcase,
  Buildings,
  Building,
  Storefront,
  Factory,
  Handshake,
  Certificate,

  // Misc
  Globe,
  GlobeHemisphereWest,
  MapPin,
  Image,
  Camera,
  Video,
  Code,
  Terminal,
  Database,
  Cloud,
  Sun,
  Moon,
  Circle,
  Square,
  Triangle,
  Hexagon,
  Spinner,
  CircleNotch,
};

// Export IconProps type for use elsewhere
export type { IconProps };

// Icon name type for dynamic rendering
export type IconName =
  | 'music' | 'musicNotes' | 'microphone' | 'speaker' | 'headphones' | 'disc' | 'playlist' | 'waveform'
  | 'play' | 'pause' | 'stop' | 'skipForward' | 'skipBack' | 'shuffle' | 'repeat'
  | 'user' | 'userCircle' | 'users' | 'usersThree' | 'userPlus' | 'userMinus' | 'userGear'
  | 'file' | 'fileText' | 'filePdf' | 'files' | 'folder' | 'folderOpen' | 'upload' | 'download' | 'paperclip'
  | 'dollar' | 'money' | 'wallet' | 'creditCard' | 'bank' | 'receipt' | 'chartLine' | 'chartBar' | 'chartPie'
  | 'trendUp' | 'trendDown' | 'percent' | 'calculator'
  | 'check' | 'checkCircle' | 'x' | 'xCircle' | 'warning' | 'warningCircle' | 'info' | 'question'
  | 'shieldCheck' | 'shieldWarning' | 'seal' | 'sealCheck'
  | 'search' | 'plus' | 'minus' | 'edit' | 'trash' | 'arrowRight' | 'arrowLeft' | 'arrowUp' | 'arrowDown'
  | 'caretRight' | 'caretLeft' | 'caretUp' | 'caretDown' | 'dots' | 'dotsVertical' | 'list' | 'grid' | 'refresh'
  | 'envelope' | 'bell' | 'bellRinging' | 'chat' | 'phone' | 'share' | 'link' | 'linkBreak'
  | 'home' | 'settings' | 'sliders' | 'filter' | 'sortAsc' | 'sortDesc' | 'eye' | 'eyeOff' | 'copy' | 'clipboard'
  | 'star' | 'heart' | 'bookmark' | 'flag' | 'tag'
  | 'trophy' | 'medal' | 'crown' | 'fire' | 'lightning' | 'target' | 'crosshair' | 'gamepad' | 'sparkle' | 'gift' | 'confetti' | 'rocket'
  | 'clock' | 'timer' | 'calendar' | 'calendarCheck' | 'hourglass'
  | 'lock' | 'lockOpen' | 'shield' | 'key' | 'fingerprint'
  | 'briefcase' | 'buildings' | 'building' | 'store' | 'factory' | 'handshake' | 'certificate'
  | 'globe' | 'mapPin' | 'image' | 'camera' | 'video' | 'code' | 'terminal' | 'database' | 'cloud'
  | 'sun' | 'moon' | 'circle' | 'square' | 'spinner';

// Icon mapping for dynamic rendering
const iconMap: Record<IconName, React.ComponentType<IconProps>> = {
  music: MusicNote,
  musicNotes: MusicNotes,
  microphone: Microphone,
  speaker: SpeakerHigh,
  headphones: Headphones,
  disc: Disc,
  playlist: Playlist,
  waveform: Waveform,
  play: Play,
  pause: Pause,
  stop: Stop,
  skipForward: SkipForward,
  skipBack: SkipBack,
  shuffle: Shuffle,
  repeat: Repeat,

  user: User,
  userCircle: UserCircle,
  users: Users,
  usersThree: UsersThree,
  userPlus: UserPlus,
  userMinus: UserMinus,
  userGear: UserGear,

  file: File,
  fileText: FileText,
  filePdf: FilePdf,
  files: Files,
  folder: Folder,
  folderOpen: FolderOpen,
  upload: Upload,
  download: Download,
  paperclip: Paperclip,

  dollar: CurrencyDollar,
  money: Money,
  wallet: Wallet,
  creditCard: CreditCard,
  bank: Bank,
  receipt: Receipt,
  chartLine: ChartLine,
  chartBar: ChartBar,
  chartPie: ChartPie,
  trendUp: TrendUp,
  trendDown: TrendDown,
  percent: Percent,
  calculator: Calculator,

  check: Check,
  checkCircle: CheckCircle,
  x: X,
  xCircle: XCircle,
  warning: Warning,
  warningCircle: WarningCircle,
  info: Info,
  question: Question,
  shieldCheck: ShieldCheck,
  shieldWarning: ShieldWarning,
  seal: Seal,
  sealCheck: SealCheck,

  search: MagnifyingGlass,
  plus: Plus,
  minus: Minus,
  edit: PencilSimple,
  trash: Trash,
  arrowRight: ArrowRight,
  arrowLeft: ArrowLeft,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  caretRight: CaretRight,
  caretLeft: CaretLeft,
  caretUp: CaretUp,
  caretDown: CaretDown,
  dots: DotsThree,
  dotsVertical: DotsThreeVertical,
  list: List,
  grid: SquaresFour,
  refresh: ArrowsClockwise,

  envelope: Envelope,
  bell: Bell,
  bellRinging: BellRinging,
  chat: ChatCircle,
  phone: Phone,
  share: Share,
  link: Link,
  linkBreak: LinkBreak,

  home: House,
  settings: GearSix,
  sliders: Sliders,
  filter: FunnelSimple,
  sortAsc: SortAscending,
  sortDesc: SortDescending,
  eye: Eye,
  eyeOff: EyeSlash,
  copy: Copy,
  clipboard: ClipboardText,
  star: Star,
  heart: Heart,
  bookmark: BookmarkSimple,
  flag: Flag,
  tag: Tag,

  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  fire: Fire,
  lightning: Lightning,
  target: Target,
  crosshair: Crosshair,
  gamepad: GameController,
  sparkle: Sparkle,
  gift: Gift,
  confetti: Confetti,
  rocket: Rocket,

  clock: Clock,
  timer: Timer,
  calendar: Calendar,
  calendarCheck: CalendarCheck,
  hourglass: Hourglass,

  lock: Lock,
  lockOpen: LockOpen,
  shield: Shield,
  key: Key,
  fingerprint: Fingerprint,

  briefcase: Briefcase,
  buildings: Buildings,
  building: Building,
  store: Storefront,
  factory: Factory,
  handshake: Handshake,
  certificate: Certificate,

  globe: Globe,
  mapPin: MapPin,
  image: Image,
  camera: Camera,
  video: Video,
  code: Code,
  terminal: Terminal,
  database: Database,
  cloud: Cloud,
  sun: Sun,
  moon: Moon,
  circle: Circle,
  square: Square,
  spinner: CircleNotch,
};

// Dynamic icon component
interface DynamicIconProps extends Omit<IconProps, 'ref'> {
  name: IconName;
}

export function Icon({ name, ...props }: DynamicIconProps) {
  const IconComponent = iconMap[name];
  if (!IconComponent) {
    console.warn(`Icon "${name}" not found`);
    return null;
  }
  return <IconComponent {...props} />;
}

// Icon badge variants
type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-white/10 text-white border-white/[0.08]',
  success: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  error: 'bg-red-500/20 text-red-400 border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  primary: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
};

interface IconBadgeProps {
  icon: IconName;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  weight?: IconProps['weight'];
  className?: string;
}

export function IconBadge({
  icon,
  variant = 'default',
  size = 'md',
  weight = 'regular',
  className = ''
}: IconBadgeProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20,
  };

  return (
    <div className={`${sizeClasses[size]} rounded-lg border flex items-center justify-center ${badgeVariants[variant]} ${className}`}>
      <Icon name={icon} size={iconSizes[size]} weight={weight} />
    </div>
  );
}

// Nav icon helper
interface NavIconProps {
  icon: IconName;
  active?: boolean;
  weight?: IconProps['weight'];
  className?: string;
}

export function NavIcon({ icon, active = false, weight, className = '' }: NavIconProps) {
  return (
    <Icon
      name={icon}
      size={20}
      weight={weight || (active ? 'fill' : 'regular')}
      className={`transition-colors ${active ? 'text-primary-400' : 'text-gray-400'} ${className}`}
    />
  );
}

// Status icon helper
interface StatusIconProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending';
  size?: number;
  className?: string;
}

export function StatusIcon({ status, size = 16, className = '' }: StatusIconProps) {
  const statusConfig = {
    success: { icon: CheckCircle, color: 'text-green-400', weight: 'fill' as const },
    warning: { icon: WarningCircle, color: 'text-yellow-400', weight: 'fill' as const },
    error: { icon: XCircle, color: 'text-red-400', weight: 'fill' as const },
    info: { icon: Info, color: 'text-blue-400', weight: 'fill' as const },
    pending: { icon: Clock, color: 'text-gray-400', weight: 'regular' as const },
  };

  const config = statusConfig[status];
  const IconComponent = config.icon;

  return (
    <IconComponent
      size={size}
      weight={config.weight}
      className={`${config.color} ${className}`}
    />
  );
}

// Loading spinner
interface SpinnerProps {
  size?: number;
  className?: string;
}

export function LoadingSpinner({ size = 20, className = '' }: SpinnerProps) {
  return (
    <CircleNotch
      size={size}
      className={`animate-spin text-primary-400 ${className}`}
    />
  );
}

export default iconMap;
