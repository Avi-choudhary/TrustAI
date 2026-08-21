/** @type {import('tailwindcss').Config} */

// Every token below resolves through a CSS variable (defined in
// src/index.css as an "R G B" triplet, once for :root/light and once for
// .dark). That means every existing bg-ink / text-seal / border-ink/[0.07]
// class in the app repaints automatically when the `dark` class toggles on
// <html> — no component needs a `dark:` variant of its own. See
// src/context/ThemeContext.jsx for the toggle.
function withOpacity(variable) {
  return ({ opacityValue }) =>
    opacityValue === undefined
      ? `rgb(var(${variable}))`
      : `rgb(var(${variable}) / ${opacityValue})`
}

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: withOpacity('--color-paper'),           // page background
        paperDark: withOpacity('--color-paperDark'),   // card / panel surface
        ink: withOpacity('--color-ink'),                // primary text
        inkSoft: withOpacity('--color-inkSoft'),        // secondary text
        graphite: withOpacity('--color-graphite'),      // muted captions / labels
        graphiteFaint: withOpacity('--color-graphiteFaint'), // very muted

        low: withOpacity('--color-low'),
        lowSoft: withOpacity('--color-lowSoft'),
        medium: withOpacity('--color-medium'),
        mediumSoft: withOpacity('--color-mediumSoft'),
        high: withOpacity('--color-high'),
        highSoft: withOpacity('--color-highSoft'),

        seal: withOpacity('--color-seal'),              // brand accent
        sealHover: withOpacity('--color-sealHover'),
        sealSoft: withOpacity('--color-sealSoft'),
        violet: withOpacity('--color-violet'),          // secondary warm accent
        violetSoft: withOpacity('--color-violetSoft'),
        cyan: withOpacity('--color-cyan'),               // secondary warm accent
        cyanSoft: withOpacity('--color-cyanSoft'),

        mist: withOpacity('--color-mist'),              // alternating section bg
        mistDark: withOpacity('--color-mistDark'),      // stronger border / hover

        primary: withOpacity('--color-seal'),
        primaryDark: withOpacity('--color-sealHover')
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        display: ['"Sora"', '"Inter"', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        spectrum: 'linear-gradient(90deg, #FF6B2C 0%, #FF8A5B 50%, #A56B00 100%)',
        'spectrum-soft': 'linear-gradient(90deg, rgba(255,107,44,0.14), rgba(255,138,91,0.14), rgba(165,107,0,0.14))',
        eclipse: 'radial-gradient(circle at 50% 30%, rgba(255,107,44,0.16) 0%, rgba(255,107,44,0.08) 40%, rgba(255,107,44,0) 72%)'
      },
      boxShadow: {
        card: '0 4px 16px rgb(var(--shadow-rgb) / 0.05)',
        stamp: '0 0 40px -8px currentColor',
        glow: '0 0 30px -6px rgba(255,107,44,0.35)',
        soft: '0 4px 16px rgb(var(--shadow-rgb) / 0.05)',
        softLg: '0 12px 40px rgb(var(--shadow-rgb) / 0.08)',
        stampFloat: '0 12px 24px -8px rgba(255,107,44,0.3)'
      },
      borderRadius: {
        sm: '10px',
        card: '20px',
        feature: '24px'
      },
      keyframes: {
        stampDown: {
          '0%': { transform: 'scale(2.4) rotate(-14deg)', opacity: '0' },
          '55%': { transform: 'scale(0.94) rotate(-8deg)', opacity: '1' },
          '75%': { transform: 'scale(1.05) rotate(-10deg)' },
          '100%': { transform: 'scale(1) rotate(-8deg)', opacity: '1' }
        },
        fadeUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' }
        },
        spectrumShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.5', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.04)' }
        }
      },
      animation: {
        stampDown: 'stampDown 0.5s cubic-bezier(0.2,0.9,0.3,1.1) forwards',
        fadeUp: 'fadeUp 0.4s ease-out forwards',
        scanline: 'scanline 1.6s linear infinite',
        marquee: 'marquee 34s linear infinite',
        spectrumShift: 'spectrumShift 6s ease-in-out infinite',
        pulseGlow: 'pulseGlow 4s ease-in-out infinite'
      }
    }
  },
  plugins: []
}
