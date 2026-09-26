import type { Config } from 'tailwindcss';

// GeM Portal — single design-token system for the whole bidder product
// (public Home/Login and the authenticated BidderPortalShell pages).
//
// Rules:
// - Pages never use raw hex values. Add a token here instead, and only when
//   it is a genuine, reusable role (not a one-off shade).
// - Foundation = Material-style roles (primary / secondary / surface / outline).
// - Status meaning always uses the semantic families: success, warning,
//   danger, info, neutral (each: DEFAULT, container, on-container, border).
// - Brand identity: navy (government-grade deep blue) + saffron (sparingly,
//   for Indian-government trust cues only).
// - borderRadius defaults are NOT overridden so `rounded-full` stays a true
//   circle; use the named radii `rounded-control|card|panel` for components.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- Foundation roles ----
        primary: '#0b1f3a',
        'primary-container': '#0b1f3a',
        'on-primary': '#ffffff',
        'on-primary-container': '#8fa3c4',
        'primary-fixed': '#d6e3ff',
        'primary-fixed-dim': '#b5c7ea',
        secondary: '#0050d7',
        'secondary-container': '#003fb0',
        'on-secondary': '#ffffff',
        'secondary-fixed': '#e6edff',
        'secondary-fixed-dim': '#c7d6ff',
        'on-secondary-fixed': '#00174b',
        'on-secondary-fixed-variant': '#003da9',
        surface: '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f8fb',
        'surface-container': '#eef2f8',
        'surface-container-high': '#e4eaf3',
        'surface-container-highest': '#d9e1ee',
        'surface-variant': '#e4eaf3',
        'on-surface': '#0f1b2d',
        'on-surface-variant': '#5a6577',
        outline: '#8a93a3',
        'outline-variant': '#dde3ec',
        background: '#f3f5f9',
        error: '#ba1a1a',
        'error-container': '#fdecec',
        'on-error': '#ffffff',
        'on-error-container': '#9b1c1c',

        // Legacy Material keys still referenced by a few ported sections;
        // mapped onto the palette above so they stay on-system.
        'tertiary-fixed': '#fff6e5',
        'tertiary-fixed-dim': '#f5b86a',
        'on-tertiary-fixed': '#6b3a00',
        'on-tertiary-container': '#b45309',
        'tertiary-container': '#6b3a00',

        // ---- Brand identity ----
        navy: {
          DEFAULT: '#0b1f3a',
          900: '#071427',
          800: '#0b1f3a',
          700: '#14305a',
          600: '#1d4278',
        },
        saffron: {
          DEFAULT: '#ff9933',
          soft: '#ffd6a8',
        },

        // ---- Semantic status families ----
        success: {
          DEFAULT: '#138a4b',
          container: '#e8f5ee',
          'on-container': '#0f6b3a',
          border: '#b7e0c8',
        },
        warning: {
          DEFAULT: '#d97706',
          container: '#fff6e5',
          'on-container': '#8a4b00',
          border: '#f7d9a8',
        },
        danger: {
          DEFAULT: '#ba1a1a',
          container: '#fdecec',
          'on-container': '#9b1c1c',
          border: '#f5c2c2',
        },
        info: {
          DEFAULT: '#0050d7',
          container: '#e6edff',
          'on-container': '#003da9',
          border: '#c7d6ff',
        },
        neutral: {
          DEFAULT: '#5b6472',
          container: '#eef1f5',
          'on-container': '#1f2937',
          border: '#d6dbe3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        'headline-md': ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
        'headline-sm': ['Inter', 'sans-serif'],
        'headline-xl': ['Inter', 'sans-serif'],
        'headline-xl-mobile': ['Inter', 'sans-serif'],
        'label-lg': ['Inter', 'sans-serif'],
        'label-md': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'body-sm': ['Inter', 'sans-serif'],
        'display-lg': ['Inter', 'sans-serif'],
        'display-lg-mobile': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['26px', { lineHeight: '34px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg': ['44px', { lineHeight: '52px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'display-lg-mobile': ['30px', { lineHeight: '38px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-xl': ['28px', { lineHeight: '36px', letterSpacing: '-0.022em', fontWeight: '700' }],
        'headline-xl-mobile': ['22px', { lineHeight: '30px', letterSpacing: '-0.018em', fontWeight: '700' }],
        'headline-lg': ['22px', { lineHeight: '30px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '26px', letterSpacing: '0em', fontWeight: '400' }],
        'body-md': ['14px', { lineHeight: '22px', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['13px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '400' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '600' }],
        'label-md': ['13px', { lineHeight: '18px', letterSpacing: '0em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '16px', letterSpacing: '0.06em', fontWeight: '600' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        'space-2xl': '3rem',
        'space-3xl': '4rem',
        margin: '1rem',
        'margin-md': '1.5rem',
        'margin-lg': '2.5rem',
        gutter: '1rem',
        'gutter-lg': '1.5rem',
        sidebar: '232px',
        header: '60px',
        header: '64px',
      },
      borderRadius: {
        control: '8px',
        card: '14px',
        panel: '18px',
      },
      boxShadow: {
        xs: '0 1px 1px rgb(15 27 45 / 0.04)',
        card: '0 1px 2px rgb(15 27 45 / 0.04), 0 1px 3px rgb(15 27 45 / 0.05)',
        'card-hover': '0 2px 4px rgb(15 27 45 / 0.04), 0 8px 20px -6px rgb(15 27 45 / 0.10)',
        overlay: '0 24px 48px -12px rgb(15 27 45 / 0.28)',
        focus: '0 0 0 4px rgb(0 80 215 / 0.14)',
        'focus-danger': '0 0 0 4px rgb(186 26 26 / 0.14)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      maxWidth: {
        page: '1440px',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'scale-in': 'scale-in 200ms cubic-bezier(0.2,0,0,1)',
        'slide-in-left': 'slide-in-left 220ms cubic-bezier(0.2,0,0,1)',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.2,0,0,1)',
        'slide-up': 'slide-up 220ms cubic-bezier(0.2,0,0,1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
