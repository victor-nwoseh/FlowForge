/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // === FONTS ===
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'system-ui', 'sans-serif'],
      },

      // === WARM FORGE COLOR PALETTE ===
      colors: {
        // Base blacks with warm undertones
        forge: {
          950: '#0a0908', // Deepest black (near-black with warm cast)
          900: '#121110', // Primary background
          850: '#1a1816', // Elevated surfaces
          800: '#231f1c', // Cards, panels
          700: '#2e2924', // Borders, dividers
          600: '#3d3632', // Muted elements
          500: '#524a44', // Disabled states
          400: '#6b6159', // Placeholder text
          300: '#8a7f75', // Secondary text
          200: '#b5a99d', // Muted text on dark
          100: '#d9d0c7', // Primary text on dark
          50: '#f5f2ef',  // Brightest (for contrast)
        },

        // Molten metal accent colors
        ember: {
          950: '#1a0a00',
          900: '#331400',
          800: '#4d1f00',
          700: '#662900',
          600: '#803300',
          500: '#b34700', // Base ember
          400: '#cc5200',
          300: '#e65c00', // Primary accent
          200: '#ff751a',
          100: '#ff944d',
          50: '#ffb380',
        },

        // Bronze/copper tones
        bronze: {
          950: '#0d0906',
          900: '#1f150e',
          800: '#352316',
          700: '#4a311f',
          600: '#5f3f27',
          500: '#7a5233', // Base bronze
          400: '#8b6340',
          300: '#a67c52', // Primary bronze
          200: '#c49a6c',
          100: '#d4b896',
          50: '#e8d6c0',
        },

        // Gold highlights
        gold: {
          950: '#0f0c00',
          900: '#1f1900',
          800: '#332900',
          700: '#4d3d00',
          600: '#665200',
          500: '#806600', // Base gold
          400: '#997a00',
          300: '#b38f00', // Primary gold
          200: '#cca300',
          100: '#e6b800',
          50: '#ffd11a',  // Brightest gold
        },

        // Ambient glow (for radial effects)
        glow: {
          ember: 'rgba(230, 92, 0, 0.15)',
          gold: 'rgba(255, 209, 26, 0.1)',
          bronze: 'rgba(166, 124, 82, 0.12)',
        },
      },

      // === ANIMATIONS ===
      animation: {
        // Slow ambient pulse for glows
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // Gradient shift for backgrounds
        'gradient-shift': 'gradientShift 8s ease infinite',
        // Fade in up for content reveals
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        // Subtle float for decorative elements
        'float': 'float 6s ease-in-out infinite',
        // Glow pulse for accents
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        // Star border animations
        'star-movement-bottom': 'star-movement-bottom linear infinite alternate',
        'star-movement-top': 'star-movement-top linear infinite alternate',
      },

      keyframes: {
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'star-movement-bottom': {
          '0%': { transform: 'translateX(0)', opacity: '0.8' },
          '100%': { transform: 'translateX(-700px)', opacity: '0.8' },
        },
        'star-movement-top': {
          '0%': { transform: 'translateX(0)', opacity: '0.8' },
          '100%': { transform: 'translateX(700px)', opacity: '0.8' },
        },
      },

      // === BACKDROP BLUR ===
      backdropBlur: {
        xs: '2px',
      },

      // === BOX SHADOWS (warm-tinted) ===
      boxShadow: {
        'ember-sm': '0 1px 2px 0 rgba(230, 92, 0, 0.05)',
        'ember': '0 4px 6px -1px rgba(230, 92, 0, 0.1), 0 2px 4px -2px rgba(230, 92, 0, 0.1)',
        'ember-lg': '0 10px 15px -3px rgba(230, 92, 0, 0.1), 0 4px 6px -4px rgba(230, 92, 0, 0.1)',
        'ember-glow': '0 0 20px rgba(230, 92, 0, 0.3)',
        'gold-glow': '0 0 20px rgba(255, 209, 26, 0.25)',
      },

      // === BACKGROUND IMAGE (for gradients) ===
      backgroundImage: {
        'forge-gradient': 'linear-gradient(135deg, #0a0908 0%, #121110 50%, #1a1816 100%)',
        'ember-gradient': 'linear-gradient(135deg, #b34700 0%, #e65c00 50%, #ff751a 100%)',
        'molten-gradient': 'linear-gradient(135deg, #7a5233 0%, #a67c52 25%, #b38f00 50%, #e65c00 75%, #ff751a 100%)',
      },

      // === BORDER RADIUS ===
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
