/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    // Tremor module
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['class', "class"],
  theme: {
  	extend: {
  		colors: {
  			// Theme-aware colors (use CSS variables)
  			theme: {
  				primary: 'var(--theme-primary)',
  				'primary-hover': 'var(--theme-primary-hover)',
  				'primary-foreground': 'var(--theme-primary-foreground)',
  				'primary-glow': 'var(--theme-primary-glow)',
  				// Opacity variants for primary (used in bg-theme-primary/10, etc.)
  				'primary-5': 'color-mix(in srgb, var(--theme-primary) 5%, transparent)',
  				'primary-10': 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
  				'primary-15': 'color-mix(in srgb, var(--theme-primary) 15%, transparent)',
  				'primary-20': 'color-mix(in srgb, var(--theme-primary) 20%, transparent)',
  				'primary-30': 'color-mix(in srgb, var(--theme-primary) 30%, transparent)',
  				'primary-50': 'color-mix(in srgb, var(--theme-primary) 50%, transparent)',
  				'primary-3': 'color-mix(in srgb, var(--theme-primary) 3%, transparent)',
  				background: 'var(--theme-background)',
  				'background-alt': 'var(--theme-background-alt)',
  				'background-30': 'color-mix(in srgb, var(--theme-background) 30%, transparent)',
  				'background-50': 'color-mix(in srgb, var(--theme-background) 50%, transparent)',
  				card: 'var(--theme-card)',
  				'card-hover': 'var(--theme-card-hover)',
  				'card-50': 'color-mix(in srgb, var(--theme-card) 50%, transparent)',
  				'card-80': 'color-mix(in srgb, var(--theme-card) 80%, transparent)',
  				foreground: 'var(--theme-foreground)',
  				'foreground-secondary': 'var(--theme-foreground-secondary)',
  				'foreground-muted': 'var(--theme-foreground-muted)',
  				border: 'var(--theme-border)',
  				'border-hover': 'var(--theme-border-hover)',
  				'border-strong': 'var(--theme-border-strong)',
  				input: 'var(--theme-input)',
  				'input-focus': 'var(--theme-input-focus)',
  				success: 'var(--theme-success)',
  				'success-bg': 'var(--theme-success-bg)',
  				'success-10': 'color-mix(in srgb, var(--theme-success) 10%, transparent)',
  				'success-20': 'color-mix(in srgb, var(--theme-success) 20%, transparent)',
  				'success-30': 'color-mix(in srgb, var(--theme-success) 30%, transparent)',
  				error: 'var(--theme-error)',
  				'error-bg': 'var(--theme-error-bg)',
  				'error-10': 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
  				'error-20': 'color-mix(in srgb, var(--theme-error) 20%, transparent)',
  				'error-30': 'color-mix(in srgb, var(--theme-error) 30%, transparent)',
  				'error-80': 'color-mix(in srgb, var(--theme-error) 80%, transparent)',
  				warning: 'var(--theme-warning)',
  				'warning-bg': 'var(--theme-warning-bg)',
  				'warning-10': 'color-mix(in srgb, var(--theme-warning) 10%, transparent)',
  				'warning-20': 'color-mix(in srgb, var(--theme-warning) 20%, transparent)',
  				'warning-30': 'color-mix(in srgb, var(--theme-warning) 30%, transparent)',
  				info: 'var(--theme-info)',
  				'info-bg': 'var(--theme-info-bg)',
  				'info-10': 'color-mix(in srgb, var(--theme-info) 10%, transparent)',
  				'info-20': 'color-mix(in srgb, var(--theme-info) 20%, transparent)',
  			},
  			brand: {
  				yellow: '#FFF200',
  				blue: '#3b82f6',
  				purple: '#8b5cf6'
  			},
  			surface: {
  				'50': '#18181B',
  				'100': '#141416',
  				'200': '#0F0F11',
  				'300': '#0A0A0B',
  				'400': '#050506',
  				DEFAULT: '#0A0A0B'
  			},
  			panel: {
  				DEFAULT: 'rgba(255, 255, 255, 0.03)',
  				hover: 'rgba(255, 255, 255, 0.06)',
  				border: 'rgba(255, 255, 255, 0.08)',
  				strong: 'rgba(255, 255, 255, 0.1)'
  			},
  			text: {
  				primary: '#FAFAFA',
  				secondary: 'rgba(250, 250, 250, 0.7)',
  				muted: 'rgba(250, 250, 250, 0.4)',
  				accent: '#3b82f6'
  			},
  			primary: {
  				'50': '#eff6ff',
  				'100': '#dbeafe',
  				'200': '#bfdbfe',
  				'300': '#93c5fd',
  				'400': '#60a5fa',
  				'500': '#3b82f6',
  				'600': '#2563eb',
  				'700': '#1d4ed8',
  				'800': '#1e40af',
  				'900': '#1e3a8a',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		spacing: {
  			'18': '4.5rem',
  			'22': '5.5rem',
  			section: '8rem',
  			'section-lg': '10rem',
  			'section-xl': '12rem'
  		},
  		fontSize: {
  			'display-2xl': [
  				'4.5rem',
  				{
  					lineHeight: '1',
  					letterSpacing: '-0.02em',
  					fontWeight: '700'
  				}
  			],
  			'display-xl': [
  				'3.75rem',
  				{
  					lineHeight: '1.1',
  					letterSpacing: '-0.02em',
  					fontWeight: '700'
  				}
  			],
  			'display-lg': [
  				'3rem',
  				{
  					lineHeight: '1.1',
  					letterSpacing: '-0.02em',
  					fontWeight: '700'
  				}
  			],
  			'display-md': [
  				'2.25rem',
  				{
  					lineHeight: '1.2',
  					letterSpacing: '-0.02em',
  					fontWeight: '600'
  				}
  			],
  			'display-sm': [
  				'1.875rem',
  				{
  					lineHeight: '1.3',
  					letterSpacing: '-0.01em',
  					fontWeight: '600'
  				}
  			],
  			'body-xl': [
  				'1.25rem',
  				{
  					lineHeight: '1.75',
  					fontWeight: '400'
  				}
  			],
  			'body-lg': [
  				'1.125rem',
  				{
  					lineHeight: '1.75',
  					fontWeight: '400'
  				}
  			]
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'sans-serif'
  			],
  			display: [
  				'Inter',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			'4xl': '2rem',
  			'5xl': '2.5rem',
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		boxShadow: {
  			'glow-sm': '0 0 20px -5px rgba(59, 130, 246, 0.3)',
  			'glow-md': '0 0 40px -10px rgba(59, 130, 246, 0.4)',
  			'glow-lg': '0 0 60px -15px rgba(59, 130, 246, 0.5)',
  			'glow-yellow': '0 0 40px -10px rgba(255, 242, 0, 0.3)',
  			ambient: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  			card: '0 0 0 1px rgba(255, 255, 255, 0.05), 0 25px 50px -12px rgba(0, 0, 0, 0.4)',
  			'card-hover': '0 0 0 1px rgba(255, 255, 255, 0.1), 0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  		},
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
  			'hero-gradient': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(59, 130, 246, 0.15), transparent)',
  			'hero-gradient-yellow': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(255, 242, 0, 0.08), transparent)',
  			'section-gradient': 'linear-gradient(to bottom, transparent, rgba(59, 130, 246, 0.03), transparent)',
  			noise: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 256 256\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.65\" numOctaves=\"3\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\"/%3E%3C/svg%3E')"
  		},
  		animation: {
  			'fade-in': 'fadeIn 0.5s ease-out forwards',
  			'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
  			'fade-in-down': 'fadeInDown 0.6s ease-out forwards',
  			'scale-in': 'scaleIn 0.5s ease-out forwards',
  			'slide-up': 'slideUp 0.6s ease-out forwards',
  			'slide-down': 'slideDown 0.3s ease-out forwards',
  			float: 'float 6s ease-in-out infinite',
  			'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  			shimmer: 'shimmer 2s linear infinite',
  			'glow-pulse': 'glowPulse 2s ease-in-out infinite'
  		},
  		keyframes: {
  			fadeIn: {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			fadeInUp: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(30px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			fadeInDown: {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(-30px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			scaleIn: {
  				'0%': {
  					opacity: '0',
  					transform: 'scale(0.95)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'scale(1)'
  				}
  			},
  			slideUp: {
  				'0%': {
  					transform: 'translateY(100%)'
  				},
  				'100%': {
  					transform: 'translateY(0)'
  				}
  			},
  			slideDown: {
  				'0%': {
  					transform: 'translateY(-100%)'
  				},
  				'100%': {
  					transform: 'translateY(0)'
  				}
  			},
  			float: {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-20px)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					backgroundPosition: '-200% 0'
  				},
  				'100%': {
  					backgroundPosition: '200% 0'
  				}
  			},
  			glowPulse: {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.5'
  				}
  			}
  		},
  		transitionDuration: {
  			'400': '400ms'
  		},
  		transitionTimingFunction: {
  			smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  			'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  		},
  		backdropBlur: {
  			xs: '2px'
  		},
  		zIndex: {
  			'60': '60',
  			'70': '70',
  			'80': '80',
  			'90': '90',
  			'100': '100'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
