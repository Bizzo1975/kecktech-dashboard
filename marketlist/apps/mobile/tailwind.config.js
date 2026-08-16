/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#1A1F1C',
        'ink-muted': '#5C6B63',
        'ink-on-dark': '#F7FAF8',
        'ink-muted-dark': '#9AAB9F',
        sage: '#E8F0EA',
        'sage-deep': '#C5D9CB',
        citrus: '#E8A317',
        'citrus-pressed': '#C9890F',
        surface: '#F7FAF8',
        'surface-dark': '#121512',
        'surface-dark-elevated': '#1C211E',
        'border-dark': '#2A322C',
        danger: '#C44536',
        success: '#2F6F4E',
        border: '#D5E0D8',
      },
      fontFamily: {
        display: ['Fraunces_700Bold'],
        ui: ['DMSans_400Regular'],
        'ui-medium': ['DMSans_500Medium'],
        'ui-bold': ['DMSans_700Bold'],
      },
    },
  },
  plugins: [],
};
