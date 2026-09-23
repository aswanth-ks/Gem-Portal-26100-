import type { Config } from 'tailwindcss';

// Design tokens extracted from the Stitch screens for the CPCL e-Procurement
// Portal project (project: "GeM Portal" in Stitch), merged from all screens
// generated so far so every page shares one token set:
//   - "CPCL e-Procurement Portal - Bidder Home"       -> Material-style tokens
//   - "CPCL e-Procurement Portal - Bidder Login"       -> gov* named tokens
//   - "CPCL Bidder Portal - Enterprise Dashboard"      -> Material tokens
//     (extended set) + semantic type scale + spacing scale
// Both token sets are kept (rather than picking one) so each page's markup,
// ported close to the original Stitch HTML, keeps working unmodified. As
// more screens are implemented, prefer reusing these tokens over inventing
// new ones — extend this file instead of hard-coding new hex values.
//
// NOTE on the Dashboard screen's own inline config: its `borderRadius` scale
// (DEFAULT/lg/xl/full remapped to 2/4/8/12px) is intentionally NOT merged
// here — Bidder Home/Login already rely on Tailwind's default radius scale
// for true circles (rounded-full avatars/status dots etc.), and overriding
// `full` globally would break those. The Dashboard page uses the plain
// `rounded`/`rounded-lg`/`rounded-xl`/`rounded-full` utilities unmodified,
// which renders very slightly more rounded than the Stitch spec — an
// acceptable, and arguably more consistent, trade-off across pages.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ---- "Bidder Home" screen tokens ----
        primary: '#000615',
        'primary-container': '#0b1f3a',
        'on-primary': '#ffffff',
        'on-primary-container': '#7587a7',
        'primary-fixed': '#d6e3ff',
        'primary-fixed-dim': '#b5c7ea',
        secondary: '#0050d7',
        'secondary-container': '#1a5aa6',
        'on-secondary': '#ffffff',
        tertiary: '#0e0400',
        'tertiary-fixed': '#ffdcc2',
        'tertiary-fixed-dim': '#ffb77a',
        surface: '#f8f9ff',
        'surface-bright': '#f8f9ff',
        'surface-dim': '#d2daeb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f1f5fa',
        'surface-container': '#e5eeff',
        'surface-container-high': '#e2e8f2',
        'surface-container-highest': '#dae3f4',
        'on-surface': '#131c28',
        'on-surface-variant': '#475569',
        outline: '#75777e',
        'outline-variant': '#cbd5e1',
        background: '#f4f7fb',
        error: '#ba1a1a',
        'error-container': '#ffdad6',

        // ---- "Bidder Login" screen tokens ----
        govNavy: '#12355B',
        govBlue: '#1A5AA6',
        govBlueLight: '#EAF2F8',
        govSaffron: '#FF9933',
        govGreen: '#2E7D32',
        govWarning: '#B7791F',
        govError: '#B3261E',
        govBg: '#F5F6F8',
        govText: '#202124',
        govBorder: '#D6D9DE',

        // ---- "Enterprise Dashboard" screen tokens (new keys only; keys
        // shared with Bidder Home above keep Bidder Home's value — the
        // differences are marginal near-white/blue variants) ----
        'inverse-surface': '#28313d',
        'inverse-on-surface': '#eaf1ff',
        'inverse-primary': '#b5c7ea',
        'surface-variant': '#dae3f4',
        'surface-tint': '#4d5f7d',
        'on-background': '#131c28',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#ca7000',
        'on-tertiary-fixed': '#2e1500',
        'on-tertiary-fixed-variant': '#6d3a00',
        'tertiary-container': '#331800',
        'on-primary-fixed': '#071c36',
        'on-primary-fixed-variant': '#364764',
        'on-secondary-container': '#fefcff',
        'on-secondary-fixed': '#00174b',
        'on-secondary-fixed-variant': '#003da9',
        'secondary-fixed': '#dbe1ff',
        'secondary-fixed-dim': '#b4c5ff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        // Dashboard semantic type-scale families (all map to Inter).
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
        'headline-md': ['22px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.01em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '20px', letterSpacing: '0em', fontWeight: '400' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0em', fontWeight: '400' }],
        'display-lg-mobile': ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'body-sm': ['12px', { lineHeight: '18px', letterSpacing: '0.01em', fontWeight: '400' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.02em', fontWeight: '600' }],
        'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-xl-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '26px', letterSpacing: '0em', fontWeight: '600' }],
        'display-lg': ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '700' }],
      },
      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2.5rem',
        margin: '1rem',
        'margin-md': '1.5rem',
        'margin-lg': '2.5rem',
        gutter: '1rem',
        'gutter-lg': '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
