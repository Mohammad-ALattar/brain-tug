import type { Config } from 'tailwindcss';

/**
 * Palette and scale are derived from the Classroom Arena reference: chunky rounded
 * cards on a pale paper background, saturated blue/red team identities, an amber
 * rope, and a yellow countdown badge.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f4f6fb',
          card: '#ffffff',
          sunk: '#eef1f7',
          line: '#dde3ee',
        },
        /**
         * Three steps of text emphasis, every one of which clears WCAG AA
         * (4.5:1) against all three surface tints. `faint` carries almost every
         * small uppercase label in the arena, and those labels are read from
         * the back of a classroom, so the earlier pale grey it used was not a
         * defensible choice even though it looked calmer.
         */
        ink: {
          DEFAULT: '#111a2e',
          muted: '#3d4861',
          faint: '#5f6d87',
        },
        blueteam: {
          50: '#eef4ff',
          100: '#dbe7ff',
          200: '#bed4ff',
          300: '#91b6ff',
          400: '#5b8dff',
          500: '#2f6bf3',
          600: '#1d4fd8',
          700: '#173eae',
          800: '#16368a',
          900: '#16306f',
        },
        redteam: {
          50: '#fff0f1',
          100: '#ffdfe1',
          200: '#ffc5c9',
          300: '#ff9da4',
          400: '#fb6672',
          500: '#ef3344',
          600: '#dc2032',
          700: '#b81627',
          800: '#981625',
          900: '#7f1725',
        },
        rope: {
          light: '#d9a15b',
          DEFAULT: '#b5762f',
          dark: '#8a5720',
        },
        field: {
          DEFAULT: '#fbfaf4',
          line: '#e6e8db',
          blue: '#eaf1ff',
          red: '#fff0f1',
        },
        track: {
          DEFAULT: '#eef6ff',
          line: '#c9d9ee',
          blue: '#d9e7ff',
          red: '#ffd9de',
        },
        timer: '#f7c93e',
        // Dark enough to be legible as text, not just as a status dot.
        good: '#147a42',
        warn: '#ad5a14',
      },
      fontFamily: {
        display: ['"Baloo 2"', '"Noto Sans Arabic"', '"Nunito"', 'system-ui', 'sans-serif'],
        sans: ['"Nunito"', '"Noto Sans Arabic"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      borderRadius: {
        chip: '999px',
        card: '18px',
        panel: '22px',
      },
      boxShadow: {
        card: '0 1px 0 0 rgba(17,26,46,0.04), 0 2px 6px -1px rgba(17,26,46,0.08)',
        panel: '0 2px 10px -2px rgba(17,26,46,0.12)',
        chip: 'inset 0 -2px 0 0 rgba(17,26,46,0.12)',
        key: '0 2px 0 0 rgba(17,26,46,0.12)',
      },
      transitionTimingFunction: {
        rope: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
