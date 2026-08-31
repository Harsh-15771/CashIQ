/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // CashIQ unique palette — midnight indigo identity
        canvas:    '#050508',
        surface:   '#0D0D14',
        elevated:  '#131320',
        'surface-border': 'rgba(255,255,255,0.06)',

        accent: {
          DEFAULT: '#6366F1',
          hover:   '#818CF8',
          muted:   'rgba(99,102,241,0.15)',
          subtle:  'rgba(99,102,241,0.08)',
        },

        // Semantic — ONLY for status meaning
        success:   '#10B981',
        warning:   '#F59E0B',
        danger:    '#EF4444',
        info:      '#3B82F6',

        // Text hierarchy
        'tx-primary':   '#F9FAFB',
        'tx-secondary': '#9CA3AF',
        'tx-tertiary':  '#4B5563',
        'tx-data':      '#E5E7EB',

        // Legacy compatibility
        brand: {
          50: '#eef6ff', 100: '#d9eaff',
          500: '#6366F1', 600: '#4F46E5',
          700: '#4338CA', 900: '#312E81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'hero': ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'mega': ['3.5rem', { lineHeight: '1.05', fontWeight: '800' }],
      },
      borderRadius: {
        'sm-cashiq': '6px',
        'md-cashiq': '10px',
        'lg-cashiq': '16px',
        'xl-cashiq': '24px',
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        'elevated': '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)',
        'glow':     '0 0 40px rgba(99,102,241,0.12)',
        'glow-lg':  '0 0 60px rgba(99,102,241,0.18)',
        'accent-sm':'0 4px 16px rgba(99,102,241,0.3)',
      },
      animation: {
        'fade-up':    'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up-1':  'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 60ms both',
        'fade-up-2':  'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 120ms both',
        'fade-up-3':  'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 180ms both',
        'fade-up-4':  'fadeSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) 240ms both',
        'shimmer':    'shimmer 1.5s ease-in-out infinite',
        'expand':     'expand 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'pulse-dot':  'pulseDot 2s ease-in-out infinite',
        'count-up':   'countUp 0.6s ease-out both',
        'slide-in-left': 'slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
      keyframes: {
        fadeSlideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '100% 0' },
          '100%': { backgroundPosition: '-100% 0' },
        },
        expand: {
          '0%':   { opacity: '0', maxHeight: '0', transform: 'scaleY(0.95)' },
          '100%': { opacity: '1', maxHeight: '500px', transform: 'scaleY(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(1.3)' },
        },
        countUp: {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%':   { opacity: '0', transform: 'translateX(-100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
