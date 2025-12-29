import { ReactNode, forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// ============================================
// CONTAINER
// ============================================

interface ContainerProps {
  children: ReactNode;
  className?: string;
  size?: 'default' | 'lg' | 'xl' | 'full';
}

export function Container({ children, className = '', size = 'default' }: ContainerProps) {
  const sizes = {
    default: 'max-w-6xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[1400px]',
    full: 'max-w-full'
  };

  return (
    <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${sizes[size]} ${className}`}>
      {children}
    </div>
  );
}

// ============================================
// SECTION
// ============================================

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  padding?: 'default' | 'lg' | 'xl' | 'none';
}

export function Section({ children, className = '', id, padding = 'default' }: SectionProps) {
  const paddings = {
    none: '',
    default: 'py-section',
    lg: 'py-section-lg',
    xl: 'py-section-xl'
  };

  return (
    <section id={id} className={`relative ${paddings[padding]} ${className}`}>
      {children}
    </section>
  );
}

// ============================================
// SECTION HEADER
// ============================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ title, subtitle, centered = true, className = '' }: SectionHeaderProps) {
  return (
    <div className={`${centered ? 'text-center' : ''} mb-16 md:mb-20 ${className}`}>
      <h2 className="text-display-lg md:text-display-xl text-white mb-6">
        {title}
      </h2>
      {subtitle && (
        <p className="text-body-lg text-text-secondary max-w-2xl mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ============================================
// BUTTON
// ============================================

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'cassette';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  href?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  href,
  to,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  icon,
  iconPosition = 'right'
}, ref) => {
  const baseStyles = `
    inline-flex items-center justify-center gap-2
    font-semibold rounded-xl
    transition-all duration-300 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      bg-white text-surface
      hover:bg-white/90 hover:shadow-glow-sm hover:-translate-y-0.5
      focus:ring-white/50
      active:translate-y-0
    `,
    secondary: `
      bg-white/10 text-white border border-white/10
      hover:bg-white/15 hover:border-white/20 hover:-translate-y-0.5
      focus:ring-white/30
      active:translate-y-0
    `,
    ghost: `
      text-text-secondary
      hover:text-white hover:bg-white/5
      focus:ring-white/20
    `,
    outline: `
      border-2 border-white/20 text-white
      hover:border-white/40 hover:bg-white/5 hover:-translate-y-0.5
      focus:ring-white/30
      active:translate-y-0
    `,
    cassette: `
      relative border border-theme-primary text-theme-primary bg-transparent
      uppercase tracking-wider font-medium
      hover:bg-theme-primary hover:text-black hover:-translate-y-0.5
      focus:ring-theme-primary-50
      active:translate-y-0
      before:absolute before:left-2 before:top-1/2 before:-translate-y-1/2
      before:w-1.5 before:h-1.5 before:rounded-full before:bg-theme-primary
      after:absolute after:right-2 after:top-1/2 after:-translate-y-1/2
      after:w-1.5 after:h-1.5 after:rounded-full after:bg-theme-primary
      hover:before:bg-black hover:after:bg-black
      !pl-6 !pr-6
    `
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-lg'
  };

  const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  const content = (
    <>
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={classes} ref={ref as any}>
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
      ref={ref as any}
    >
      {content}
    </button>
  );
});

Button.displayName = 'Button';

// ============================================
// CARD
// ============================================

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  padding?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({
  children,
  className = '',
  hover = true,
  glow = false,
  padding = 'lg'
}: CardProps) {
  const paddings = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10'
  };

  return (
    <motion.div
      className={`
        relative rounded-2xl
        bg-gradient-to-b from-white/[0.08] to-white/[0.02]
        border border-white/[0.08]
        backdrop-blur-sm
        ${hover ? 'transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] hover:-translate-y-1 hover:shadow-card-hover' : ''}
        ${glow ? 'shadow-glow-sm' : ''}
        ${paddings[padding]}
        ${className}
      `}
      whileHover={hover ? { scale: 1.02 } : undefined}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// BADGE
// ============================================

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-white/80 border-white/10',
    primary: 'bg-brand-blue/20 text-brand-blue border-brand-blue/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    warning: 'bg-brand-yellow/20 text-brand-yellow border-brand-yellow/30'
  };

  return (
    <span className={`
      inline-flex items-center px-3 py-1
      text-xs font-medium rounded-full
      border ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  );
}

// ============================================
// ICON BOX
// ============================================

interface IconBoxProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'gradient';
  className?: string;
}

export function IconBox({ children, size = 'md', variant = 'default', className = '' }: IconBoxProps) {
  const sizes = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-18 h-18 text-3xl'
  };

  const variants = {
    default: 'bg-white/5 border border-white/10',
    primary: 'bg-brand-blue/20 border border-brand-blue/30',
    gradient: 'bg-gradient-to-br from-brand-blue/30 to-brand-purple/30 border border-white/10'
  };

  return (
    <div className={`
      ${sizes[size]} ${variants[variant]}
      rounded-xl flex items-center justify-center
      ${className}
    `}>
      {children}
    </div>
  );
}

// ============================================
// DIVIDER
// ============================================

interface DividerProps {
  className?: string;
}

export function Divider({ className = '' }: DividerProps) {
  return (
    <div className={`h-px bg-gradient-to-r from-transparent via-white/10 to-transparent ${className}`} />
  );
}

// ============================================
// AMBIENT BACKGROUND
// ============================================

interface AmbientBackgroundProps {
  className?: string;
  variant?: 'hero' | 'section' | 'subtle';
}

export function AmbientBackground({ className = '', variant = 'hero' }: AmbientBackgroundProps) {
  if (variant === 'hero') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        {/* Main gradient orb */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-brand-blue/20 rounded-full blur-[120px]" />
        {/* Secondary orb */}
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px]" />
        {/* Tertiary orb */}
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-brand-blue/10 rounded-full blur-[80px]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
            backgroundSize: '100px 100px'
          }}
        />
      </div>
    );
  }

  if (variant === 'section') {
    return (
      <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-blue/5 rounded-full blur-[100px]" />
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-brand-blue/5 rounded-full blur-[80px]" />
    </div>
  );
}

// ============================================
// GLOW EFFECT
// ============================================

interface GlowProps {
  children: ReactNode;
  className?: string;
  color?: 'blue' | 'yellow' | 'purple';
}

export function Glow({ children, className = '', color = 'blue' }: GlowProps) {
  const colors = {
    blue: 'shadow-glow-md',
    yellow: 'shadow-glow-yellow',
    purple: 'shadow-[0_0_40px_-10px_rgba(139,92,246,0.4)]'
  };

  return (
    <div className={`${colors[color]} ${className}`}>
      {children}
    </div>
  );
}
