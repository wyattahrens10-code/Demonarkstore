/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ark: {
          50: '#ffe5e5',
          100: '#ffc0c0',
          200: '#ff9999',
          300: '#ff6666',
          400: '#ff4444',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#4a0e0e',
        },
        sand: {
          50: '#faf8f1',
          100: '#f2eddb',
          200: '#e5d9b5',
          300: '#d4bf88',
          400: '#c5a563',
          500: '#b89049',
          600: '#a1763d',
          700: '#855b34',
          800: '#6e4b30',
          900: '#5c3f2c',
          950: '#342016',
        },
        volcanic: {
          50: 'rgb(var(--v-50) / <alpha-value>)',
          100: 'rgb(var(--v-100) / <alpha-value>)',
          200: 'rgb(var(--v-200) / <alpha-value>)',
          300: 'rgb(var(--v-300) / <alpha-value>)',
          400: 'rgb(var(--v-400) / <alpha-value>)',
          500: 'rgb(var(--v-500) / <alpha-value>)',
          600: 'rgb(var(--v-600) / <alpha-value>)',
          700: 'rgb(var(--v-700) / <alpha-value>)',
          800: 'rgb(var(--v-800) / <alpha-value>)',
          900: 'rgb(var(--v-900) / <alpha-value>)',
          950: 'rgb(var(--v-950) / <alpha-value>)',
        },
        heading: 'rgb(var(--heading) / <alpha-value>)',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-sm': '0 0 14px rgba(239, 68, 68, 0.22)',
        'glow': '0 0 24px rgba(239, 68, 68, 0.28), 0 0 72px rgba(220, 38, 38, 0.10)',
        'glow-lg': '0 0 36px rgba(239, 68, 68, 0.34), 0 0 96px rgba(220, 38, 38, 0.14)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.45s ease-out',
        'fade-in-up': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 0.35s ease-out',
        'slide-up': 'slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'glow-pulse': 'glowPulse 3.5s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient-x': 'gradientX 5s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.8' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(239, 68, 68, 0.16)' },
          '50%': { borderColor: 'rgba(248, 113, 113, 0.44)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};

